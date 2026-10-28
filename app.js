// Renders the flows in flows.js as a progressive, conditional form.
// One flow per screen; inside a screen each section unlocks once the one before it is
// complete. Answers are kept in this browser only (localStorage) and can be downloaded.

const FLOW = Object.fromEntries(FLOWS.map((f) => [f.flow_id, f]));
const STEPS = ["Intervention", "Period", "Project", "Site", "Activity", "Indicators", "Review"];
const STORE = "impact-form-draft";

let state = load();
if (!state || !FLOW[state.current]) state = fresh();

// Rebuilt on every screen render.
let controls = [];
let conds = [];
let sections = [];
let derived = [];
let watchers = []; // extra updates run on every refresh (e.g. a modal's Save button)
let uid = 0;

function fresh() {
  return { current: FLOWS[0].flow_id, history: [], values: {}, active: {}, summary: {} };
}
function load() {
  try { return JSON.parse(localStorage.getItem(STORE)); } catch { return null; }
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* storage unavailable */ }
}

const vals = (flowId) => (state.values[flowId] ??= {});
const get = (flowId, fieldId) => state.values[flowId]?.[fieldId];

/* ------------------------------------------------------------------ */
/* DOM + text helpers                                                  */
/* ------------------------------------------------------------------ */
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...children.flat(Infinity).filter((c) => c != null && c !== false));
  return el;
}
const $ = (sel) => document.querySelector(sel);

const humanize = (v) => LABELS[v] ?? String(v).replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const opts = (list) => (list ?? []).map((o) =>
  typeof o === "object" ? { ...o, label: o.label ?? humanize(o.value) } : { value: o, label: humanize(o) });
const num = (x) => (typeof x === "number" && !Number.isNaN(x) ? x : null);

function pickedName(flowId, field, createField, source) {
  const v = get(flowId, field);
  if (v === "__new") return get(flowId, createField) || "";
  return SOURCES[source](get).find((o) => o.value === v)?.name ?? "";
}
const CONTEXT = {
  intervention_name: () => intervention(get)?.name || "This intervention",
  project_name: () => project(get)?.name || "this project",
  cadence: () => humanize(intervention(get)?.cadence ?? "").toLowerCase(),
  site_name: () => pickedName("FLOW-03", "site_id", "site_name", "existing_sites_in_project") || "this site",
};
const fill = (s) => s?.replace(/\{(\w+)\}/g, (_, k) => CONTEXT[k]?.() ?? k);

function periodEnd() {
  const period = get("FLOW-01B", "period");
  return period ? periodRange(period).end : null;
}
function monthsSince(date) {
  const end = periodEnd();
  if (!date || !end) return null;
  const d = new Date(date);
  return (end.getFullYear() - d.getFullYear()) * 12 + (end.getMonth() - d.getMonth());
}

/* ------------------------------------------------------------------ */
/* Conditions: "a < b", "x = 'v'", "list CONTAINS 'v'", joined by AND / OR */
/* ------------------------------------------------------------------ */
function test(cond, v) {
  if (!cond) return true;
  return cond.split(/\s+OR\s+/).some((any) => any.split(/\s+AND\s+/).every((clause) => {
    const m = clause.trim().match(/^(\w+)\s*(<=|>=|!=|=|<|>|CONTAINS)\s*(.+)$/);
    if (!m) { console.warn("Unreadable condition:", clause); return true; }
    const [, left, op, rawRight] = m;
    const raw = rawRight.trim();
    const a = v[left];
    const b = /^'.*'$/.test(raw) ? raw.slice(1, -1) : Number.isFinite(Number(raw)) ? Number(raw) : v[raw];
    if (op === "CONTAINS") return Array.isArray(a) && a.includes(b);
    if (op === "=") return a === b;
    if (op === "!=") return a != null && a !== "" && a !== b;
    if (num(a) == null || num(b) == null) return false;
    return op === "<" ? a < b : op === ">" ? a > b : op === "<=" ? a <= b : a >= b;
  }));
}

/* ------------------------------------------------------------------ */
/* Cross-field rules. Each returns a message when the rule is broken.  */
/* Rules named in a flow's `validation` without an entry here need a   */
/* backend (e.g. R2, R8, R9) and are skipped in this template.         */
/* ------------------------------------------------------------------ */
const fte = (x) => `${+x.toFixed(2)}`;
const RULES = {
  R1: (a) => {
    const total = num(a.total_jobs_fte);
    const sum = (num(a.direct_jobs_fte) ?? 0) + (num(a.indirect_jobs_fte) ?? 0);
    if (total != null && sum > total) return `Direct + indirect jobs (${fte(sum)}) can't be more than total jobs (${fte(total)}).`;
  },
  R1b: (a) => {
    const total = num(a.total_jobs_fte), p = num(a.permanent_jobs_fte), t = num(a.temporary_jobs_fte);
    if (total != null && p != null && t != null && Math.abs(p + t - total) > 1e-9)
      return `Permanent + temporary jobs (${fte(p + t)}) must equal total jobs (${fte(total)}).`;
  },
  R1c: (a) => {
    const total = num(a.total_jobs_fte);
    if (total == null) return;
    const over = [["Female", a.female_jobs_fte], ["Youth", a.youth_jobs_fte], ["Green", a.green_jobs_fte]]
      .filter(([, x]) => num(x) != null && x > total).map(([k]) => k);
    if (over.length) return `${over.join(", ")} jobs can't be more than total jobs (${fte(total)}).`;
  },
  K3: (a) => {
    if (num(a.utilized_capacity_kw) != null && num(a.installed_capacity_kw) != null && a.utilized_capacity_kw > a.installed_capacity_kw)
      return "Utilized capacity can't be more than installed capacity.";
  },
  K4: (a) => {
    const end = periodEnd();
    if (a.commissioning_date && end && new Date(a.commissioning_date) > end)
      return `Commissioning date is after the end of the reporting period (${end.toLocaleDateString()}).`;
  },
  K5: (a) => {
    if (a.commissioning_date && new Date(a.commissioning_date) > new Date()) return "Commissioning date can't be in the future.";
  },
  R13: (a) => {
    if (DERIVED.underutilization_flag.calc(a))
      return "Utilization is under 50% more than 12 months after commissioning. This record will be flagged for review.";
  },
  R15: (a) => {
    if (num(a.utilized_capacity_kw) != null && num(a.installed_capacity_kw) != null && a.utilized_capacity_kw < a.installed_capacity_kw && !a.utilization_reason)
      return "Utilized capacity is below installed. Adding a reason helps reviewers.";
  },
  C1: (a) => {
    if (num(a.residents_count) != null && num(a.households_count) != null && a.residents_count < a.households_count)
      return "There are fewer residents than households. Check the counts.";
  },
  T1: (a) => {
    const people = num(a.people_trained_count);
    if (people == null) return;
    const over = [["Female", a.female_trained_count], ["Youth", a.youth_trained_count]]
      .filter(([, x]) => num(x) != null && x > people).map(([k]) => k);
    if (over.length) return `${over.join(" and ")} trainees can't be more than people trained (${people}).`;
  },
  S6: (a) => {
    if (["P1", "P2"].includes(a.precision_level) && ["address_match", "administrative_record", "programme_records"].includes(a.location_source))
      return "Exact precision (P1–P2) usually needs a survey, GPS, parcel match or as-built source.";
  },
};

function runRules(flow, a) {
  return (flow.validation ?? []).flatMap((r) => {
    const msg = RULES[r.rule_id]?.(a);
    return msg ? [{ id: r.rule_id, msg, hard: r.severity === "hard" }] : [];
  });
}

/* System-derived values shown live (FLOW-05A). */
const DERIVED = {
  utilization_rate: {
    label: "Utilization rate",
    calc: (a) => (num(a.installed_capacity_kw) > 0 && num(a.utilized_capacity_kw) != null ? (a.utilized_capacity_kw / a.installed_capacity_kw) * 100 : null),
    format: (x) => `${Math.round(x)}%`,
  },
  capacity_age_months: {
    label: "Capacity age",
    calc: (a) => monthsSince(a.commissioning_date),
    format: (x) => `${x} month${x === 1 ? "" : "s"}`,
  },
  ramp_up_flag: {
    label: "Ramping up", tone: "info", flag: true,
    calc: (a) => lowUse(a) && DERIVED.capacity_age_months.calc(a) < 6,
  },
  underutilization_flag: {
    label: "Under-utilized", tone: "warn", flag: true,
    calc: (a) => lowUse(a) && DERIVED.capacity_age_months.calc(a) > 12,
  },
};
// Both flags need a known rate and age; null < 50 would otherwise be true.
function lowUse(a) {
  const rate = DERIVED.utilization_rate.calc(a);
  return rate != null && rate < 50 && DERIVED.capacity_age_months.calc(a) != null;
}

/* ------------------------------------------------------------------ */
/* Field builders                                                      */
/* ------------------------------------------------------------------ */
function wrapCond(el, cond) {
  if (cond) { el.classList.add("cond"); el._cond = cond; conds.push(el); }
  return el;
}

function renderGroup(cond, fields, ctx) {
  return wrapCond(h("div", { class: "reveal" }, fields.map((f) => renderField(f, ctx))), cond);
}

function renderField(spec, ctx) {
  if (spec.type === "group") return wrapCond(h("div", { class: "grid" }, spec.fields.map((f) => renderField(f, ctx))), spec.condition);
  if (spec.type === "note") return wrapCond(h("p", { class: "note", text: fill(spec.text) }), spec.condition);

  const v = vals(ctx.flow.flow_id);
  const id = `f${++uid}`;
  const err = h("small", { class: "error" });
  const ctl = { spec, section: ctx.section, err, complete: () => true, display: () => fmt(v[spec.field_id]) };
  const builder = BUILDERS[spec.type] ?? inputBuilder;
  const { control, extras = [], labelFor = false } = builder(spec, v, id, ctl, ctx);

  ctl.el = wrapCond(h("div", { class: "field" },
    h(labelFor ? "label" : "span", { class: "field-label", for: labelFor ? id : null },
      spec.label, !spec.required && h("em", { text: " (optional)" })),
    control,
    spec.hint && h("small", { class: "hint", text: fill(spec.hint) }),
    err), spec.condition);
  ctx.section.controls.push(ctl);
  controls.push(ctl);
  return [ctl.el, ...extras];
}

const fmt = (x) => (Array.isArray(x) ? x.map(humanize).join(", ") : typeof x === "number" ? x.toLocaleString() : x ?? "");

function inputBuilder(spec, v, id, ctl) {
  const key = spec.field_id;
  const isNum = spec.type === "number";
  const tag = spec.type === "textarea" ? "textarea" : "input";
  const input = h(tag, {
    id, name: key,
    type: tag === "input" ? (isNum ? "number" : spec.type === "date" ? "date" : "text") : null,
    required: spec.required, min: spec.min, max: spec.max, step: isNum ? spec.step ?? "any" : null,
    pattern: spec.pattern, minlength: spec.minlength, placeholder: spec.placeholder,
    inputmode: isNum ? "decimal" : null, rows: tag === "textarea" ? 3 : null,
  });
  if (v[key] != null) input.value = v[key];

  const showError = () => { ctl.err.textContent = input.validity.valid ? "" : spec.error ?? input.validationMessage; };
  input.addEventListener("input", () => {
    v[key] = isNum ? (input.value === "" ? null : input.valueAsNumber) : input.value;
    showError();
    refresh();
  });
  input.addEventListener("blur", showError);

  let escape;
  if (spec.escape) {
    escape = h("input", { type: "checkbox" });
    escape.checked = !!v[`${key}__escaped`];
    input.disabled = escape.checked;
    escape.addEventListener("change", () => {
      v[`${key}__escaped`] = escape.checked;
      input.disabled = escape.checked;
      if (escape.checked) { input.value = ""; v[key] = null; ctl.err.textContent = ""; }
      refresh();
    });
  }

  ctl.complete = () => escape?.checked || input.checkValidity();
  ctl.display = () => (escape?.checked ? spec.escape.label : fmt(v[key]));
  const control = escape
    ? h("div", { class: "stack" }, input, h("label", { class: "check" }, escape, h("span", { text: spec.escape.label })))
    : input;
  return { control, labelFor: true };
}

function chipGroup(options, { name, multi, cards, checked, onChange }) {
  return h("div", { class: cards ? "chips cards" : "chips", role: multi ? "group" : "radiogroup" },
    options.map((o) => {
      const input = h("input", { type: multi ? "checkbox" : "radio", name, value: o.value });
      input.checked = checked(o);
      input.addEventListener("change", () => onChange(o, input.checked));
      return h("label", { class: "chip" }, input,
        h("span", {}, cards
          ? [cardArt(o), h("b", { text: o.label }), o.meta && h("small", { text: o.meta }), o.countries?.length && flags(o.countries),
            o.badge && h("span", { class: `badge ${o.tone ?? ""}`, text: o.badge })]
          : [OPTION_ICON[o.value] && h("i", { class: "icon", style: `--icon: ${iconUrl(OPTION_ICON[o.value])}` }), o.label]));
    }));
}

const flag = (country) => flagSrc(country) && h("img", { class: "flag", src: flagSrc(country), alt: country, title: country });
const flags = (countries) => h("span", { class: "flags" }, countries.map(flag));

// Every card gets one spot of colour: its photo, or an orb with a short tag.
function cardArt(o) {
  const photo = photoFor(o);
  if (photo) return h("span", { class: "thumb" }, h("img", { src: photo.src, alt: "", loading: "lazy" }));
  if (o.add) return h("span", { class: "orb add", "aria-hidden": "true", text: "+" });
  const tag = /^\S{1,3}\s/.test(o.label) ? o.label.split(" ")[0] : o.label.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const hue = [...String(o.value)].reduce((a, c) => a + c.charCodeAt(0), 0) % 6;
  return h("span", { class: `orb g${hue}`, "aria-hidden": "true", text: tag });
}

function screenHead(flow, title, note) {
  const photo = PHOTOS[SCREEN_PHOTO[flow.flow_id]];
  return h("header", { class: photo ? "screen-head hero" : "screen-head" },
    photo && h("img", { class: "hero-img", src: photo.src, alt: "" }),
    photo && h("small", { class: "credit", text: `Photo: ${photo.credit}` }),
    h("p", { class: "overline", text: flow.name }),
    h("h1", { text: title }),
    note && h("p", { class: "muted", text: note }));
}

function selectBuilder(spec, v, id, ctl, ctx) {
  const key = spec.field_id;
  const options = spec.options_source ? SOURCES[spec.options_source](get) : opts(spec.options);
  const mode = spec.display ?? (options.length <= 5 ? "chips" : "dropdown");
  ctl.complete = () => !spec.required || !!v[key];
  ctl.display = () => options.find((o) => o.value === v[key])?.label ?? "";

  const extras = [
    spec.free_text_if && renderGroup(`${key} = '${spec.free_text_if}'`, [text(`${key}_other`, "Please describe")], ctx),
    ...options.filter((o) => o.extra_fields).map((o) =>
      renderGroup(`${key} = '${o.value}'`, o.extra_fields.map((f) => EXTRA_FIELDS[f]), ctx)),
  ].filter(Boolean);

  if (mode === "dropdown") {
    const select = h("select", { id, required: spec.required },
      h("option", { value: "", text: spec.required ? "Choose…" : "None" }),
      options.map((o) => h("option", { value: o.value, text: o.label })));
    select.value = v[key] ?? "";
    select.addEventListener("change", () => { v[key] = select.value; refresh(); });
    return { control: select, extras, labelFor: true };
  }
  const cards = (list) => chipGroup(list, {
    name: id, multi: false, cards: mode !== "chips",
    checked: (o) => v[key] === o.value,
    onChange: (o) => { v[key] = o.value; refresh(); },
  });
  return { control: mode === "priority" ? priorityCards(options, v, key, cards) : cards(options), extras };
}

// Options with a status (due / overdue / earlier), most urgent first: what's due gets a
// featured card and is picked for you, overdue ones follow, and the rest fold away.
function priorityCards(options, v, key, cards) {
  const by = (status) => options.filter((o) => o.status === status);
  const [due, overdue, past] = [by("due"), by("overdue"), by("earlier")];
  if (!v[key] && due.length) v[key] = due[0].value;

  const featured = due.length > 0 && cards(due);
  if (featured) featured.classList.add("featured");
  const earlier = past.length > 0 && h("details", { class: "earlier", open: !due.length && !overdue.length || past.some((o) => o.value === v[key]) },
    h("summary", { text: `Earlier periods (${past.length})` }),
    cards(past));
  return h("div", { class: "stack priority" },
    featured,
    !due.length && !overdue.length && h("p", { class: "note", text: "You're up to date. Pick an earlier period to add to it." }),
    overdue.length > 0 && cards(overdue),
    earlier);
}

function multiBuilder(spec, v, id, ctl) {
  const key = spec.field_id;
  const options = spec.options_source ? SOURCES[spec.options_source](get)
    : spec.type === "multi_select_country" ? COUNTRIES : opts(spec.options);
  const escapes = opts(spec.escape_options);
  const all = [...options, ...escapes];
  const escapeValues = new Set(escapes.map((o) => o.value));
  if (!Array.isArray(v[key])) v[key] = [];

  ctl.complete = () => !spec.required || v[key].length > 0;
  ctl.display = () => v[key].map((x) => all.find((o) => o.value === x)?.label ?? x).join(", ");

  const control = chipGroup(all, {
    name: id, multi: true,
    checked: (o) => v[key].includes(o.value),
    onChange: (o, on) => {
      // Escape options ("Too early", "Don't know") exclude everything else.
      let next = v[key].filter((x) => x !== o.value);
      if (on) next = escapeValues.has(o.value) ? [o.value] : [...next.filter((x) => !escapeValues.has(x)), o.value];
      v[key] = next;
      control.querySelectorAll("input").forEach((i) => (i.checked = next.includes(i.value)));
      refresh();
    },
  });
  const empty = spec.options_source && !options.length && h("p", { class: "hint", text: "Nothing reported in this project yet." });
  return { control: empty ? h("div", { class: "stack" }, empty, control) : control };
}

function pickOrCreateBuilder(spec, v, id, ctl, ctx) {
  const key = spec.field_id;
  const options = SOURCES[spec.options_source](get);
  if (spec.create_in === "modal") return modalCreate(spec, v, id, ctl, ctx, options);
  if (!options.length) v[key] = "__new";
  const all = [...options, { value: "__new", add: true, label: spec.create_label ?? "+ Create new", meta: options.length ? "Not in the list? Add it" : "Nothing here yet. Add it" }];

  ctl.complete = () => !!v[key];
  ctl.display = () => (v[key] === "__new" ? "New (details below)" : options.find((o) => o.value === v[key])?.label ?? "");

  const control = chipGroup(all, {
    name: id, multi: false, cards: true,
    checked: (o) => v[key] === o.value,
    onChange: (o) => { v[key] = o.value; refresh(); },
  });
  return { control, extras: [renderGroup(`${key} = '__new'`, spec.create_fields, ctx)] };
}

// Existing items as cards, with a button underneath that opens the create fields in a modal.
// Once saved, the new item joins the cards (built from spec.create_card) and is selected.
function modalCreate(spec, v, id, ctl, ctx, options) {
  const key = spec.field_id;
  const card = spec.create_card;
  const savedKey = `${key}__saved`;
  const created = v[savedKey] && { value: "__new", label: v[card.label], meta: v[card.meta], countries: v[card.countries] };
  const all = created ? [...options, created] : options;

  ctl.complete = () => !!v[key];
  ctl.display = () => all.find((o) => o.value === v[key])?.label ?? "";

  const cards = chipGroup(all, {
    name: id, multi: false, cards: true,
    checked: (o) => v[key] === o.value,
    onChange: (o) => { v[key] = o.value; refresh(); },
  });

  // The create fields only count while the new item is selected, so opening the modal selects it.
  const fields = renderGroup(`${key} = '__new'`, spec.create_fields, ctx);
  const hint = h("span", { class: "nav-hint" });
  const saveButton = h("button", { type: "button", class: "btn", text: "Save", onclick: save });
  let previous;
  const dialog = h("dialog", { class: "modal", "aria-labelledby": `${id}-title` },
    h("h2", { id: `${id}-title`, text: created ? `Edit ${created.label}` : spec.create_label }),
    fields,
    h("div", { class: "actions end" },
      hint,
      h("button", { type: "button", class: "btn ghost", text: "Cancel", onclick: cancel }),
      saveButton));

  // Save stays disabled until every required field in the modal is filled, like Continue.
  const incomplete = () => ctx.section.controls.some((c) => dialog.contains(c.el) && visible(c) && !c.complete());
  watchers.push(() => {
    saveButton.disabled = incomplete();
    hint.textContent = saveButton.disabled ? "Fill in the required fields to save." : "";
  });

  function save() {
    if (incomplete()) return;
    v[savedKey] = true;
    dialog.close();
    render();
  }
  // Closing without saving (Cancel, Esc) puts the earlier choice back.
  function cancel() {
    v[key] = previous;
    dialog.close();
    refresh();
  }
  dialog.addEventListener("cancel", (e) => { e.preventDefault(); cancel(); });

  const open = h("button", { type: "button", class: "btn soft add-cta" },
    !created && h("span", { "aria-hidden": "true", text: "+" }), created ? `Edit ${created.label}` : spec.create_label);
  open.addEventListener("click", () => {
    previous = v[key];
    v[key] = "__new";
    refresh();
    dialog.showModal();
  });

  return { control: h("div", { class: "stack" }, all.length > 0 && cards, open), extras: [dialog] };
}

// Type-to-search picker (countries). Matches names starting with what's typed first,
// then names with a word starting with it ("gu" → Guinea, then Equatorial Guinea).
// Options can come from a source, so a site only offers its intervention's countries.
const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function comboBuilder(spec, v, id, ctl) {
  const key = spec.field_id;
  const multi = spec.type === "multi_select_country";
  const options = () => (spec.options_source ? SOURCES[spec.options_source](get) : COUNTRIES);
  const labelOf = (val) => options().find((o) => o.value === val)?.label ?? val;
  if (multi && !Array.isArray(v[key])) v[key] = [];
  const chosen = () => (multi ? v[key] : v[key] ? [v[key]] : []);

  // Only one possible answer (e.g. a single-country intervention): pick it for them.
  const initial = options();
  if (initial.length === 1 && !chosen().length) v[key] = multi ? [initial[0].value] : initial[0].value;

  const listId = `${id}-list`;
  const input = h("input", {
    id, type: "text", role: "combobox", autocomplete: "off",
    "aria-autocomplete": "list", "aria-expanded": "false", "aria-controls": listId,
    placeholder: multi ? "Type to add a country…" : "Type to search…",
  });
  const list = h("ul", { id: listId, role: "listbox", class: "combo-list", hidden: true });
  const tags = h("div", { class: "combo-tags" });
  let matches = [];
  let active = -1;
  let query = "";

  const highlight = (label) => (query && fold(label).startsWith(query)
    ? [h("b", { text: label.slice(0, query.length) }), label.slice(query.length)]
    : label);

  function drawSelected() {
    if (!multi) { input.value = v[key] ? labelOf(v[key]) : ""; return; }
    tags.replaceChildren(...v[key].map((val) => h("span", { class: "tag" }, flag(val), labelOf(val),
      h("button", {
        type: "button", "aria-label": `Remove ${labelOf(val)}`, text: "×",
        onclick: () => { v[key] = v[key].filter((x) => x !== val); drawSelected(); refresh(); },
      }))));
  }

  function draw() {
    const pool = options().filter((o) => !(multi && v[key].includes(o.value)));
    const starts = pool.filter((o) => fold(o.label).startsWith(query));
    const words = query ? pool.filter((o) => !starts.includes(o) && fold(o.label).split(/[\s-]+/).some((w) => w.startsWith(query))) : [];
    matches = [...starts, ...words];
    active = Math.min(active, matches.length - 1);
    list.replaceChildren(...(matches.length
      ? matches.map((o, i) => h("li", {
        id: `${id}-o${i}`, role: "option", class: i === active ? "active" : null,
        "aria-selected": chosen().includes(o.value) ? "true" : "false",
        onmousedown: (e) => { e.preventDefault(); pick(o); },
      }, highlight(o.label)))
      : [h("li", { class: "empty", text: options().length ? "No matching country" : "No countries to choose from yet" })]));
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    if (active >= 0) {
      input.setAttribute("aria-activedescendant", `${id}-o${active}`);
      list.children[active]?.scrollIntoView?.({ block: "nearest" });
    } else input.removeAttribute("aria-activedescendant");
  }

  function close() {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    active = -1;
    query = "";
    if (!multi) drawSelected(); // put the chosen name back if they typed and left
  }

  function pick(o) {
    if (multi) {
      v[key] = [...v[key], o.value];
      input.value = query = "";
      drawSelected();
      draw();
    } else {
      v[key] = o.value;
      close();
    }
    refresh();
  }

  input.addEventListener("focus", () => { query = multi ? fold(input.value.trim()) : ""; draw(); if (!multi) input.select(); });
  input.addEventListener("blur", close);
  input.addEventListener("input", () => {
    query = fold(input.value.trim());
    active = query ? 0 : -1;
    if (!multi && !input.value.trim() && v[key]) { v[key] = ""; refresh(); }
    draw();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); if (list.hidden) draw(); active = Math.min(active + 1, matches.length - 1); draw(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); draw(); }
    else if (e.key === "Enter") { e.preventDefault(); if (!list.hidden && matches[active]) pick(matches[active]); }
    else if (e.key === "Escape") close();
    else if (e.key === "Backspace" && multi && !input.value && v[key].length) { v[key] = v[key].slice(0, -1); drawSelected(); draw(); refresh(); }
  });

  drawSelected();
  ctl.complete = () => {
    const allowed = options().map((o) => o.value);
    return chosen().every((val) => allowed.includes(val)) && (!spec.required || chosen().length > 0);
  };
  ctl.display = () => chosen().map(labelOf).join(", ");
  return { control: h("div", { class: "combo" }, multi && tags, input, list), labelFor: true };
}

// Read-only: converts an amount to GBP at the period-end rate as the user types.
function gbpBuilder(spec, v, id, ctl) {
  const key = spec.field_id;
  const out = h("output", { id, class: "computed", text: "—" });
  const rateNote = h("small", { class: "hint" });
  const gbp = (x) => `£${x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  ctl.update = () => {
    const amt = num(v[spec.amount_field]), cur = v[spec.currency_field];
    const rate = FX_PER_GBP[cur] ?? null;
    v[key] = amt != null && rate ? Math.round((amt / rate) * 100) / 100 : null;
    v[spec.rate_field] = rate;
    out.textContent = v[key] == null ? "—" : gbp(v[key]);
    const end = periodEnd();
    rateNote.textContent = rate && cur !== "GBP"
      ? `Calculated for you at 1 GBP = ${rate.toLocaleString()} ${cur}${end ? `, the rate on ${end.toLocaleDateString()}` : ""}.`
      : "";
  };
  ctl.also = [spec.rate_field];
  ctl.complete = () => v[key] != null;
  ctl.display = () => (v[key] == null ? "" : gbp(v[key]));
  return { control: h("div", { class: "stack" }, out, rateNote), labelFor: true };
}

const BUILDERS = {
  text: inputBuilder, textarea: inputBuilder, number: inputBuilder, date: inputBuilder,
  select: selectBuilder,
  select_optional: (s, ...rest) => selectBuilder({ ...s, required: false, display: "dropdown" }, ...rest),
  select_country: comboBuilder,
  multi_select_country: comboBuilder,
  select_currency: (s, ...rest) => selectBuilder({ ...s, options: CURRENCIES, display: "dropdown" }, ...rest),
  multi_select: multiBuilder, multi_select_checkbox: multiBuilder,
  multi_select_from_existing: multiBuilder,
  select_or_create: pickOrCreateBuilder,
  gbp_equivalent: gbpBuilder,
};

/* ------------------------------------------------------------------ */
/* Screens                                                             */
/* ------------------------------------------------------------------ */
function renderSection(sec, index, flow, single) {
  const section = { controls: [] };
  const ctx = { flow, section };
  const body = h("div", { class: "section-body" },
    (sec.fields ?? []).map((f) => renderField(f, ctx)),
    (sec.conditional_fields ?? []).map((g) => renderGroup(g.condition, g.fields, ctx)));

  if (sec.fields_revealed_by) {
    section.emptyHint = h("p", { class: "hint", text: "Pick who benefits above and the matching questions appear here." });
    body.prepend(section.emptyHint);
    section.body = body;
  }
  if (sec.system_derived) body.append(renderDerived(sec.system_derived));

  section.el = h("section", { class: "section" },
    !single && h("h2", { class: "section-title" }, h("span", { class: "num", text: index + 1 }), sec.section_name),
    body);
  sections.push(section);
  return section.el;
}

function renderDerived(keys) {
  const tiles = keys.filter((k) => !DERIVED[k].flag).map((k) => {
    const value = h("div", { class: "tile-value", text: "—" });
    derived.push({ def: DERIVED[k], el: value });
    return h("div", { class: "tile" }, h("div", { class: "overline", text: DERIVED[k].label }), value);
  });
  const badges = keys.filter((k) => DERIVED[k].flag).map((k) => {
    const badge = h("span", { class: `badge ${DERIVED[k].tone}`, text: DERIVED[k].label, hidden: true });
    derived.push({ def: DERIVED[k], el: badge });
    return badge;
  });
  return h("div", { class: "derived" },
    h("p", { class: "overline", text: "Calculated for you" }),
    h("div", { class: "tiles" }, tiles),
    h("div", { class: "badges" }, badges));
}

function render() {
  controls = []; conds = []; sections = []; derived = []; watchers = []; uid = 0;
  const flow = FLOW[state.current];
  renderStepper(flow);

  const screen = $("#screen");
  screen.replaceChildren();
  $("#issues").replaceChildren();

  if (flow.screen_type === "review") {
    screen.append(...renderReview(flow).flat());
    $("#back").disabled = !state.history.length;
    $("#next").hidden = true;
    $("#next-hint").textContent = "";
    save();
    return;
  }

  $("#next").hidden = false;
  screen.append(screenHead(flow, fill(flow.screen_title), fill(flow.note)));

  const list = flow.sections ?? [{ fields: flow.fields }];
  list.forEach((sec, i) => screen.append(renderSection(sec, i, flow, list.length === 1)));

  $("#back").disabled = !state.history.length;
  refresh();
}

const visible = (c) => !c.el.closest(".cond[hidden]");

function collect() {
  const v = vals(state.current);
  const active = {};
  controls.filter(visible).forEach((c) => {
    active[c.spec.field_id] = v[c.spec.field_id];
    if (v[`${c.spec.field_id}__escaped`]) active[c.spec.field_id] = null;
    c.also?.forEach((k) => (active[k] = v[k]));
  });
  return active;
}

function refresh() {
  const flow = FLOW[state.current];
  if (flow.screen_type === "review") return;
  const v = vals(flow.flow_id);

  controls.forEach((c) => c.update?.());
  conds.forEach((el) => (el.hidden = !test(el._cond, v)));

  // Progressive: each section opens once every visible question before it is answered.
  let open = true;
  let allDone = true;
  sections.forEach((s) => {
    s.el.hidden = !open;
    if (s.emptyHint) s.emptyHint.hidden = !!s.body.querySelector(":scope > .cond:not([hidden])");
    const done = s.controls.filter(visible).every((c) => c.complete());
    s.el.classList.toggle("done", done);
    if (!done) { open = false; allDone = false; }
  });

  const active = collect();
  const issues = runRules(flow, active);
  $("#issues").replaceChildren(...issues.map((i) =>
    h("div", { class: `issue ${i.hard ? "hard" : "soft"}` }, h("span", { text: i.msg }), h("code", { text: i.id }))));

  watchers.forEach((update) => update());
  derived.forEach(({ def, el }) => {
    const x = def.calc(active);
    if (def.flag) el.hidden = !x;
    else el.textContent = x == null || Number.isNaN(x) ? "—" : def.format(x);
  });

  const hardIssue = issues.some((i) => i.hard);
  $("#next").disabled = !allDone || hardIssue;
  $("#next-hint").textContent = !allDone ? "Answer the required questions to continue." : hardIssue ? "Fix the issues above to continue." : "";
  save();
}

function next() {
  const flow = FLOW[state.current];
  state.active[flow.flow_id] = collect();
  state.summary[flow.flow_id] = controls.filter(visible)
    .map((c) => [c.spec.label, c.display()])
    .filter(([, value]) => value !== "" && value != null);

  let target = flow.on_continue?.next_flow;
  if (flow.on_continue?.rule) {
    const field = flow.fields[0];
    target = field.options.find((o) => o.value === vals(flow.flow_id)[field.field_id])?.next_flow;
  }
  state.history.push(flow.flow_id);
  state.current = FLOW[target] ? target : "FLOW-06";
  render();
  window.scrollTo({ top: 0 });
}

function back() {
  if (!state.history.length) return;
  state.current = state.history.pop();
  render();
  window.scrollTo({ top: 0 });
}

function renderStepper(flow) {
  $("#steps").replaceChildren(...STEPS.map((_, i) => h("span", { class: i <= flow.step ? "on" : null })));
  $("#step-label").replaceChildren(`Step ${flow.step + 1} of ${STEPS.length} · `, h("b", { text: STEPS[flow.step] }));
}

/* ------------------------------------------------------------------ */
/* Review                                                              */
/* ------------------------------------------------------------------ */
function renderReview(flow) {
  const jump = (i) => {
    state.current = state.history[i];
    state.history = state.history.slice(0, i);
    render();
    window.scrollTo({ top: 0 });
  };
  // Keep the intervention and period, clear everything from `flowId` on.
  const restartFrom = (flowId) => {
    const i = state.history.indexOf(flowId);
    state.history.slice(i).forEach((id) => { delete state.values[id]; delete state.active[id]; delete state.summary[id]; });
    jump(i);
  };
  const download = () => {
    const record = {
      exported_at: new Date().toISOString(),
      reporting_period_end: periodEnd()?.toISOString().slice(0, 10) ?? null,
      flows: Object.fromEntries(state.history.map((id) => [id, state.active[id] ?? {}])),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: "application/json" }));
    const link = h("a", { href: url, download: "impact-record.json" });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return [
    screenHead(flow, flow.screen_title, "Check each screen. Nothing is sent anywhere: this is a template, so download the record to see the data it would save."),
    state.history.map((id, i) => h("section", { class: "card section done" },
      h("div", { class: "section-title" },
        h("span", { class: "num" }),
        h("span", { class: "grow", text: FLOW[id].name }),
        h("button", { type: "button", class: "link", text: "Edit", onclick: () => jump(i) })),
      h("dl", { class: "summary" },
        (state.summary[id] ?? []).map(([k, val]) => h("div", {}, h("dt", { text: fill(k) }), h("dd", { text: val })))))),
    h("div", { class: "actions" },
      h("button", { type: "button", class: "btn", text: "Download record (JSON)", onclick: download }),
      h("button", { type: "button", class: "btn soft", text: "Another activity at this site", onclick: () => restartFrom("FLOW-04") }),
      h("button", { type: "button", class: "btn soft", text: "Report at another site", onclick: () => restartFrom("FLOW-03") })),
  ];
}

/* ------------------------------------------------------------------ */
/* Wire up                                                             */
/* ------------------------------------------------------------------ */
$("#user").textContent = `Signed in as ${MOCK.user.name} · ${MOCK.user.org}`;
$("#screen").addEventListener("submit", (e) => e.preventDefault());
$("#next").addEventListener("click", next);
$("#back").addEventListener("click", back);
$("#reset").addEventListener("click", () => {
  if (!confirm("Clear all answers and start again?")) return;
  state = fresh();
  render();
});
render();
