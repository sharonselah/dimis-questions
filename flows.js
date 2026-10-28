// Flow spec for the impact reporting form, rendered by app.js.
// Mirrors docs/json.md with the agreed changes:
//   - Hierarchy: intervention (e.g. SPARK) → project (e.g. SPARK-001) → site(s).
//     The spec's "programme" level is the intervention.
//   - The user is signed in: they start from their interventions, pick the reporting period
//     (offered from the intervention's cadence, with what's due or already reported), then
//     the project and site
//   - Countries narrow down the chain: intervention → project → site
//   - Location asks "what does this record cover?" instead of assuming a site; no maps
//   - The jobs breakdown only appears once a total is entered
//   - 05C counts every input type; 05D separates the currency from the GBP equivalent,
//     which is calculated from the period-end rate rather than typed in
//   - New interventions are added in a modal. Their fields run name, description (required),
//     thematic focus, countries, capital, cadence; "funding envelope" is "capital committed"
//   - FLOW-05G is a placeholder until it's written; FLOW-06 is a review screen
// Shared blocks (jobs, location, linking) are defined once and reused by every activity flow.

/* ------------------------------------------------------------------ */
/* Field helpers                                                       */
/* ------------------------------------------------------------------ */
const count = (field_id, label, required = true, extra = {}) =>
  ({ field_id, label, type: "number", required, min: 0, step: 1, ...extra });
const amount = (field_id, label, required = false, extra = {}) =>
  ({ field_id, label, type: "number", required, min: 0, ...extra });
const text = (field_id, label, required = true, extra = {}) =>
  ({ field_id, label, type: "text", required, ...extra });
const group = (fields, condition) => ({ type: "group", fields, condition });
const note = (textValue, condition) => ({ type: "note", text: textValue, condition });

const benefits = (value, ...fields) => ({ condition: `beneficiary_types CONTAINS '${value}'`, fields });
const otherBeneficiary = benefits("other",
  text("other_beneficiary_description", "Describe the beneficiary"),
  count("other_beneficiary_count", "Number of beneficiaries"));
const FARMER_TYPE = { field_id: "farmer_type", label: "Farmer type", type: "select", required: true, options: ["smallholder", "commercial"] };
const ACCESS_TYPE = { field_id: "access_type", label: "Access type", type: "select", required: true, options: ["reliable_power", "first_time_access", "clean_energy_replacing_diesel", "backup_power"] };

/* ------------------------------------------------------------------ */
/* Reference lists                                                     */
/* ------------------------------------------------------------------ */
const COUNTRIES = [
  "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cabo Verde", "Cameroon",
  "Central African Republic", "Chad", "Comoros", "Congo", "Côte d'Ivoire", "Democratic Republic of the Congo",
  "Djibouti", "Egypt", "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "Gabon", "Gambia", "Ghana",
  "Guinea", "Guinea-Bissau", "Kenya", "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi", "Mali",
  "Mauritania", "Mauritius", "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria", "Rwanda",
  "São Tomé and Príncipe", "Senegal", "Seychelles", "Sierra Leone", "Somalia", "South Africa", "South Sudan",
  "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda", "Zambia", "Zimbabwe",
].map((c) => ({ value: c, label: c }));
const asOptions = (names = []) => names.map((c) => ({ value: c, label: c }));
const CURRENCIES = ["GBP", "USD", "EUR", "KES", "UGX", "TZS", "RWF", "ETB", "NGN", "GHS", "ZAR", "ZMW"]
  .map((c) => ({ value: c, label: c }));
// Units of each currency per 1 GBP. Sample values: a backend would supply the closing rate
// for the end of the reporting period.
const FX_PER_GBP = {
  GBP: 1, USD: 1.34, EUR: 1.17, KES: 173, UGX: 4900, TZS: 3400, RWF: 1900,
  ETB: 190, NGN: 2050, GHS: 15.5, ZAR: 24, ZMW: 33,
};

const PRECISION = [
  { value: "P1", label: "Exact building / plot (P1)" },
  { value: "P2", label: "Premises / vicinity (P2)" },
  { value: "P3", label: "Village / cluster (P3)" },
  { value: "P4", label: "Ward (P4)" },
  { value: "P5", label: "Sub-county / municipality (P5)" },
  { value: "P6", label: "County / district (P6)" },
  { value: "P7", label: "Country (P7)" },
];

// Readable labels for option codes used across the spec. Anything missing is humanised.
const LABELS = {
  quarterly: "Quarterly", bi_annual: "Bi-annual",
  carbon: "Carbon", nature: "Nature", energy: "Energy", gender: "Gender", finance: "Finance",
  reliable_power: "More reliable power", first_time_access: "First-time access",
  clean_energy_replacing_diesel: "Clean energy replacing diesel", backup_power: "Backup power",
  demand_not_at_full_capacity: "Demand not yet at full capacity", grid_connection_pending: "Grid connection pending",
  seasonal_variation: "Seasonal variation",
  surveyed: "Surveyed", gps: "GPS reading", parcel_match: "Matched to land parcel", as_built: "As-built drawings",
  address_match: "Matched from address", administrative_record: "Administrative record",
  programme_records: "Programme records", field_survey: "Field survey",
  mfi: "Microfinance institution (MFI)", community_centre: "Community centre",
  clearing_house: "Clearing house", data_platform: "Data platform",
};

/* ------------------------------------------------------------------ */
/* Sample data (no backend: this stands in for existing records)       */
/* ------------------------------------------------------------------ */
const MOCK = {
  user: { name: "Jordan Mwangi", org: "Qwetu Energy Ltd" },
  // The signed-in user's interventions. `last` is the last period reported.
  interventions: [
    { id: "SPARK", name: "SPARK", about: "Clean energy for housing and clinics", countries: ["Kenya", "Uganda", "Tanzania"], cadence: "quarterly", last: "2026-Q2" },
    { id: "GROW", name: "GROW", about: "Climate-smart agriculture", countries: ["Kenya", "Tanzania", "Ethiopia"], cadence: "bi_annual", last: "2025-H2" },
  ],
  projects: [
    { id: "SPARK-001", intervention: "SPARK", name: "Qwetu student residences", countries: ["Kenya"], sites: 3 },
    { id: "SPARK-002", intervention: "SPARK", name: "Rural clinic mini-grids", countries: ["Kenya", "Uganda"], sites: 1 },
    { id: "GROW-004", intervention: "GROW", name: "Smallholder seedling scheme", countries: ["Tanzania"], sites: 2 },
  ],
  sites: [
    { id: "s1", project: "SPARK-001", name: "Ruaraka rooftop A", type: "rooftop_solar", last: "Q2 2026" },
    { id: "s2", project: "SPARK-001", name: "Ruaraka rooftop B", type: "rooftop_solar", last: "Q2 2026" },
    { id: "s3", project: "SPARK-001", name: "Parklands residence", type: "rooftop_solar", last: "Q1 2026" },
    { id: "s4", project: "SPARK-002", name: "Kibwezi clinic grid", type: "mini_grid", last: "Q2 2026" },
    { id: "s5", project: "GROW-004", name: "Arusha farmer cluster", type: "farmer_cluster", last: "H2 2025" },
    { id: "s6", project: "GROW-004", name: "Moshi nursery", type: "nursery", last: "Never" },
  ],
  outcomes: [
    "Lower energy costs for residents",
    "Reduced diesel generator use",
    "Higher farm yields",
    "Improved access to credit",
  ],
};

/* ------------------------------------------------------------------ */
/* Reporting periods                                                   */
/* ------------------------------------------------------------------ */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PERIOD_MONTHS = { Q1: [1, 3], Q2: [4, 6], Q3: [7, 9], Q4: [10, 12], H1: [1, 6], H2: [7, 12] };

// "2026-Q3" → its label, months and last day.
function periodRange(value) {
  const [year, part] = value.split("-");
  const [from, to] = PERIOD_MONTHS[part];
  return { label: `${part} ${year}`, months: `${MONTHS[from - 1]} – ${MONTHS[to - 1]}`, end: new Date(+year, to, 0) };
}

// Periods that have ended, newest first. The one in progress can't be reported yet.
function pastPeriods(cadence, count = 6, today = new Date()) {
  const parts = cadence === "bi_annual" ? ["H1", "H2"] : ["Q1", "Q2", "Q3", "Q4"];
  let year = today.getFullYear();
  let i = parts.findIndex((p) => periodRange(`${year}-${p}`).end >= today);
  const back = () => { if (--i < 0) { i = parts.length - 1; year--; } };
  const out = [];
  back();
  while (out.length < count) {
    out.push(`${year}-${parts[i]}`);
    back();
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Option sources named in the spec. `get(flowId, fieldId)` reads      */
/* earlier answers.                                                    */
/* ------------------------------------------------------------------ */
// The chosen intervention (FLOW-01) and project (FLOW-02), picked or newly created.
function intervention(get) {
  const id = get("FLOW-01", "intervention_id");
  if (!id) return null;
  if (id !== "__new") return MOCK.interventions.find((x) => x.id === id);
  return {
    id: get("FLOW-01", "intervention_name"), name: get("FLOW-01", "intervention_name"),
    countries: get("FLOW-01", "intervention_countries") ?? [], cadence: get("FLOW-01", "cadence"), last: null,
  };
}
function project(get) {
  const id = get("FLOW-02", "project_id");
  if (!id) return null;
  if (id !== "__new") return MOCK.projects.find((x) => x.id === id);
  return { id: get("FLOW-02", "project_code"), name: get("FLOW-02", "project_name"), countries: get("FLOW-02", "project_countries") ?? [] };
}

const SOURCES = {
  my_interventions: () => MOCK.interventions.map((iv) =>
    ({ value: iv.id, label: iv.name, name: iv.name, meta: iv.about, countries: iv.countries })),
  projects_in_intervention: (get) =>
    MOCK.projects.filter((p) => p.intervention === get("FLOW-01", "intervention_id")).map((p) => ({
      value: p.id, label: `${p.id} ${p.name}`, name: p.name,
      meta: `${p.sites} site${p.sites === 1 ? "" : "s"} · ${p.countries.join(", ")}`,
    })),
  intervention_countries: (get) => asOptions(intervention(get)?.countries),
  project_countries: (get) => asOptions(project(get)?.countries),
  reporting_periods: (get) => {
    const iv = intervention(get);
    if (!iv?.cadence) return [];
    // The newest unreported period is due. Older unreported ones are overdue, unless the
    // intervention is new and has never reported: then they're just earlier periods.
    let dueShown = false;
    return pastPeriods(iv.cadence).map((p) => {
      const r = periodRange(p);
      const option = { value: p, label: r.label, meta: r.months };
      if (iv.last && p <= iv.last) return { ...option, status: "earlier", meta: `${r.months} · Reported, you can add to it` };
      if (!dueShown) { dueShown = true; return { ...option, status: "due", badge: "Due now", tone: "brand" }; }
      if (!iv.last) return { ...option, status: "earlier" };
      return { ...option, status: "overdue", badge: "Overdue", tone: "warn" };
    });
  },
  existing_sites_in_project: (get) =>
    MOCK.sites.filter((s) => s.project === get("FLOW-02", "project_id"))
      .map((s) => ({ value: s.id, label: s.name, name: s.name, meta: `${LABELS[s.type] ?? s.type.replace(/_/g, " ")} · last reported ${s.last}` })),
  outcomes_already_reported_in_project: (get) =>
    get("FLOW-02", "project_id") === "__new" ? [] : MOCK.outcomes.map((o) => ({ value: o, label: o })),
  transactions_or_outputs_in_project: (get) =>
    get("FLOW-02", "project_id") === "__new" ? [] : ["Solar installation at site", "Farmer input loans", "Clinic equipment upgrade"].map((o) => ({ value: o, label: o })),
};

// Extra questions revealed by site type (FLOW-03).
const EXTRA_FIELDS = {
  rooftop_area_m2: amount("rooftop_area_m2", "Rooftop area (m²)", true),
  building_type: { field_id: "building_type", label: "Building type", type: "select", required: true, options: ["residential", "commercial", "industrial", "public", "other"] },
  land_area_ha: amount("land_area_ha", "Land area (ha)", true),
  households_connected: count("households_connected", "Households connected"),
  service_area_km2: amount("service_area_km2", "Service area (km²)", true),
  units_distributed: count("units_distributed", "Units distributed"),
  floor_area_m2: amount("floor_area_m2", "Floor area (m²)", true),
  production_type: text("production_type", "What is produced here?"),
  branch_count: count("branch_count", "Number of branches"),
  room_count: count("room_count", "Number of rooms"),
  student_count: count("student_count", "Number of students"),
  staff_count: count("staff_count", "Number of staff"),
  bed_count: count("bed_count", "Number of beds"),
  patient_count: count("patient_count", "Patients per year"),
  plot_size_ha: amount("plot_size_ha", "Plot size (ha)", true),
  crop: text("crop", "Main crop"),
  farmer_count: count("farmer_count", "Number of farmers"),
  seedling_capacity: count("seedling_capacity", "Seedling capacity"),
  storage_capacity_m3: amount("storage_capacity_m3", "Storage capacity (m³)", true),
  capacity_m3_day: amount("capacity_m3_day", "Capacity (m³ per day)", true),
  description: { field_id: "site_description", label: "Describe the site", type: "textarea", required: true },
};

/* ------------------------------------------------------------------ */
/* Shared sections                                                     */
/* ------------------------------------------------------------------ */
const jobsSection = ({ name = "Jobs", allRequired = false } = {}) => {
  const gate = allRequired ? undefined : "total_jobs_fte > 0";
  return {
    section_name: name,
    fields: [
      amount("total_jobs_fte", "Total jobs created (FTE)", allRequired, {
        hint: allRequired ? undefined : "Leave blank if no jobs were created. The breakdown appears once you enter a total.",
      }),
      group([
        amount("direct_jobs_fte", "Direct jobs (FTE)", true, { hint: "Facility level (P1–P2)" }),
        amount("indirect_jobs_fte", "Indirect jobs (FTE), modelled", false, { hint: "Administrative level only (P5–P6)" }),
      ], gate),
      group([
        amount("permanent_jobs_fte", "Permanent jobs (FTE)", true),
        amount("temporary_jobs_fte", "Temporary jobs (FTE)", true),
      ], gate),
      group([
        amount("female_jobs_fte", "Of which female (FTE)"),
        amount("youth_jobs_fte", "Of which youth under 35 (FTE)"),
        amount("green_jobs_fte", "Of which green jobs (FTE)"),
      ], gate),
    ],
  };
};

// "programme" keeps the spec's value; it's the intervention level.
const LEVELS = { site: "This site only", cluster: "A cluster of sites", project: "The whole project", programme: "The whole intervention" };
const LEVEL_FIELDS = {
  cluster: [
    text("cluster_area", "Which area does the cluster cover?", true, { placeholder: "e.g. Ruaraka ward, Nairobi" }),
    group([
      { field_id: "cluster_precision", label: "How precisely?", type: "select", required: true, options: PRECISION.slice(2, 5) },
      { field_id: "cluster_source", label: "Source", type: "select", required: true, options: ["programme_records", "field_survey", "administrative_record"] },
    ]),
  ],
  project: [
    text("project_area", "Which counties or districts does the project cover?"),
    note("Recorded at county / district precision (P6)."),
  ],
  programme: [
    { field_id: "record_countries", label: "Which countries?", type: "multi_select_country", options_source: "intervention_countries", required: true },
    note("Recorded at country precision (P7)."),
  ],
};
const locationSection = (levels = ["cluster", "project", "programme"]) => ({
  section_name: "Location",
  fields: [
    {
      field_id: "record_level", label: "What does this record cover?", type: "select", display: "chips", required: true,
      options: ["site", ...levels].map((value) => ({ value, label: LEVELS[value] })),
    },
    note("Location is inherited from {site_name}. Nothing else to add.", "record_level = 'site'"),
  ],
  conditional_fields: levels.map((level) => ({ condition: `record_level = '${level}'`, fields: LEVEL_FIELDS[level] })),
});

const linkingSection = ({
  label = "What change did this produce for people or the market?",
  source = "outcomes_already_reported_in_project",
  escapes = [{ value: "too_early", label: "Too early, not yet producing outcomes" }, { value: "dont_know", label: "Don't know / not sure" }],
} = {}) => ({
  section_name: "Linking",
  fields: [{ field_id: "linked_outcome_ids", label, type: "multi_select_from_existing", required: false, options_source: source, escape_options: escapes }],
});

const JOB_RULES = [
  { rule_id: "R1", rule: "direct + indirect ≤ total jobs", severity: "hard" },
  { rule_id: "R1b", rule: "permanent + temporary = total jobs", severity: "hard" },
  { rule_id: "R1c", rule: "female ≤ total; youth ≤ total; green ≤ total", severity: "hard" },
];

/* ------------------------------------------------------------------ */
/* Flows                                                               */
/* ------------------------------------------------------------------ */
const FLOWS = [
  {
    flow_id: "FLOW-01",
    step: 0,
    name: "Your interventions",
    screen_title: "Which intervention are you reporting on?",
    fields: [
      {
        field_id: "intervention_id", label: "Intervention", type: "select_or_create", required: true, options_source: "my_interventions",
        create_label: "Add another intervention", create_in: "modal",
        // Once saved, the new intervention shows as a card built from these fields.
        create_card: { label: "intervention_name", meta: "intervention_description", countries: "intervention_countries" },
        create_fields: [
          text("intervention_name", "Intervention name", true, { placeholder: "e.g. SPARK" }),
          { field_id: "intervention_description", label: "Description", type: "textarea", required: true, placeholder: "e.g. Clean energy for housing and clinics" },
          { field_id: "thematic_focus", label: "Thematic focus", type: "multi_select", required: true, options: ["carbon", "nature", "energy", "gender", "finance", "other"] },
          { field_id: "intervention_countries", label: "Countries of operation", type: "multi_select_country", required: true },
          amount("capital_committed_gbp", "Capital committed (GBP)", false, { hint: "Total capital committed to this intervention." }),
          { field_id: "cadence", label: "Reporting cadence", type: "select", required: true, options: ["quarterly", "bi_annual"] },
        ],
      },
    ],
    on_continue: { next_flow: "FLOW-01B" },
    validation: [{ rule_id: "H0", rule: "intervention must exist or be created", severity: "hard" }],
  },

  {
    flow_id: "FLOW-01B",
    step: 1,
    name: "Reporting period",
    screen_title: "Which period are you reporting for?",
    note: "{intervention_name} reports {cadence}.",
    fields: [
      { field_id: "period", label: "Period", type: "select", display: "priority", required: true, options_source: "reporting_periods" },
    ],
    on_continue: { next_flow: "FLOW-02" },
  },

  {
    flow_id: "FLOW-02",
    step: 2,
    name: "Project",
    screen_title: "Which project under {intervention_name}?",
    fields: [
      {
        field_id: "project_id", label: "Project", type: "select_or_create", required: true, options_source: "projects_in_intervention",
        create_label: "+ Add a new project",
        create_fields: [
          text("project_name", "Project name", true, { placeholder: "e.g. Qwetu student residences" }),
          text("project_code", "Project code", true, { pattern: "^[A-Z]+-[0-9]{3}$", placeholder: "e.g. SPARK-001", error: "Use capital letters, a dash and three digits, e.g. SPARK-001." }),
          {
            field_id: "project_countries", label: "Countries it works in", type: "multi_select_country", required: true,
            options_source: "intervention_countries", hint: "Only {intervention_name}'s countries are offered.",
          },
          text("implementing_partner", "Implementing partner", false),
          { field_id: "project_description", label: "Description", type: "textarea", required: false },
        ],
      },
    ],
    on_continue: { next_flow: "FLOW-03" },
    validation: [{ rule_id: "H6", rule: "a project cannot belong to two interventions", severity: "hard" }],
  },

  {
    flow_id: "FLOW-03",
    step: 3,
    name: "Site",
    screen_title: "Which site is this data about?",
    note: "New sites record their location and precision here. Activity records at this site inherit them.",
    fields: [
      {
        field_id: "site_id", label: "Site", type: "select_or_create", required: true, options_source: "existing_sites_in_project",
        create_fields: [
          text("site_name", "Site name", true, { placeholder: "e.g. Ruaraka rooftop A" }),
          {
            field_id: "site_type", label: "What kind of site is this?", type: "select", display: "dropdown", required: true,
            options: [
              { value: "rooftop_solar", label: "Rooftop solar installation", extra_fields: ["rooftop_area_m2", "building_type"] },
              { value: "ground_mounted_solar", label: "Ground-mounted solar", extra_fields: ["land_area_ha"] },
              { value: "mini_grid", label: "Mini-grid", extra_fields: ["households_connected", "service_area_km2"] },
              { value: "off_grid_system", label: "Off-grid system", extra_fields: ["units_distributed"] },
              { value: "factory", label: "Factory / industrial", extra_fields: ["floor_area_m2", "production_type"] },
              { value: "retail", label: "Retail / commercial", extra_fields: ["floor_area_m2", "branch_count"] },
              { value: "hotel", label: "Hotel / hospitality", extra_fields: ["room_count"] },
              { value: "school", label: "School / university", extra_fields: ["student_count", "staff_count"] },
              { value: "hospital", label: "Hospital / clinic", extra_fields: ["bed_count", "patient_count"] },
              { value: "farm_plot", label: "Farm plot", extra_fields: ["plot_size_ha", "crop"] },
              { value: "farmer_cluster", label: "Farmer cluster / cooperative", extra_fields: ["farmer_count", "crop"] },
              { value: "nursery", label: "Nursery (tree / plant)", extra_fields: ["seedling_capacity"] },
              { value: "warehouse", label: "Warehouse / storage", extra_fields: ["storage_capacity_m3"] },
              { value: "water_facility", label: "Water facility", extra_fields: ["capacity_m3_day"] },
              { value: "other", label: "Other (describe)", extra_fields: ["description"] },
            ],
          },
          { field_id: "parent_site_id", label: "Is this site inside another site?", type: "select_optional", options_source: "existing_sites_in_project", hint: "For nested sites, e.g. a farm plot inside a farmer cluster." },
          { field_id: "precision_level", label: "How precisely do you know this location?", type: "select", display: "dropdown", required: true, options: PRECISION },
          group([
            amount("latitude", "Latitude", true, { min: -90, max: 90, placeholder: "-1.2345" }),
            amount("longitude", "Longitude", true, { min: -180, max: 180, placeholder: "36.8765" }),
          ], "precision_level = 'P1' OR precision_level = 'P2'"),
          { field_id: "location_source", label: "Source of location", type: "select", display: "dropdown", required: true, options: ["surveyed", "gps", "parcel_match", "as_built", "address_match", "administrative_record", "programme_records"] },
          group([
            { field_id: "admin_country", label: "Country", type: "select_country", required: true, options_source: "project_countries" },
            text("admin_county", "County / district"),
            text("admin_ward", "Ward", false),
          ]),
        ],
      },
    ],
    on_continue: { next_flow: "FLOW-04" },
    validation: [
      { rule_id: "S1", rule: "coordinates exist when precision is P1 or P2", severity: "hard" },
      { rule_id: "S6", rule: "source method justifies precision", severity: "soft_then_hard" },
    ],
  },

  {
    flow_id: "FLOW-04",
    step: 4,
    name: "Activity",
    screen_title: "What did you do at {site_name}?",
    note: "The activity decides which indicator questions come next.",
    fields: [
      {
        field_id: "activity_type", label: "Activity", type: "select", display: "cards", required: true,
        options: [
          { value: "installed_renewable_energy_capacity", label: "Installed renewable energy capacity", meta: "Solar, mini-grids, other generation", next_flow: "FLOW-05A" },
          { value: "provided_energy_access", label: "Provided energy access", meta: "People or facilities newly or better connected", next_flow: "FLOW-05B" },
          { value: "distributed_seedlings_inputs", label: "Distributed seedlings / inputs", meta: "Seedlings, seed, fertiliser, tools", next_flow: "FLOW-05C" },
          { value: "provided_finance", label: "Provided finance", meta: "Loans, grants, guarantees, equity", next_flow: "FLOW-05D" },
          { value: "built_upgraded_facility", label: "Built / upgraded facility", meta: "Schools, clinics, registries, platforms", next_flow: "FLOW-05E" },
          { value: "delivered_training", label: "Delivered training", meta: "Capacity building for people or institutions", next_flow: "FLOW-05F" },
          { value: "other", label: "Something else", meta: "Describe it", next_flow: "FLOW-05G" },
        ],
      },
    ],
    on_continue: { action: "route_to_activity_flow", rule: "next_flow = selected_option.next_flow" },
  },

  {
    flow_id: "FLOW-05A",
    step: 5,
    name: "Installed renewable energy capacity",
    screen_title: "Installed renewable energy capacity at {site_name}",
    sections: [
      {
        section_name: "Capacity",
        fields: [
          group([
            amount("installed_capacity_kw", "Installed capacity (kW)", true),
            amount("utilized_capacity_kw", "Utilized capacity (kW)", true, { escape: { label: "Not yet measured" } }),
          ]),
          { field_id: "commissioning_date", label: "Commissioning date", type: "date", required: true },
          {
            field_id: "utilization_reason", label: "Utilized is below installed. Why?", type: "select", display: "dropdown", required: false,
            options: ["demand_not_at_full_capacity", "grid_connection_pending", "maintenance", "seasonal_variation", "other"],
            condition: "utilized_capacity_kw < installed_capacity_kw", free_text_if: "other",
          },
        ],
        system_derived: ["utilization_rate", "capacity_age_months", "ramp_up_flag", "underutilization_flag"],
      },
      {
        section_name: "Who benefits",
        fields: [{
          field_id: "beneficiary_types", label: "Who benefits from this installation?", type: "multi_select_checkbox", required: true,
          options: [
            { value: "residents_households", label: "Residents / households" }, { value: "students", label: "Students" },
            { value: "staff", label: "Staff" }, { value: "patients", label: "Patients" },
            { value: "businesses_institutions", label: "Businesses / institutions" }, { value: "public_facilities", label: "Public facilities" },
            { value: "farmers", label: "Farmers" }, { value: "other", label: "Other" },
          ],
        }],
      },
      {
        section_name: "Beneficiary counts",
        fields_revealed_by: "beneficiary_types",
        conditional_fields: [
          benefits("residents_households",
            group([count("households_count", "Households with improved access"), count("residents_count", "Residents with improved access")]),
            ACCESS_TYPE),
          benefits("students", count("students_count", "Students with improved access")),
          benefits("staff", count("staff_access_count", "Staff with improved access")),
          benefits("patients", count("patients_count", "Patients with improved access")),
          benefits("businesses_institutions", group([count("businesses_count", "Businesses / institutions"), text("business_type", "Type")])),
          benefits("public_facilities", group([count("facilities_count", "Public facilities"), { field_id: "facility_type", label: "Facility type", type: "select", display: "dropdown", required: true, options: ["school", "clinic", "hospital", "community_centre", "other"] }])),
          benefits("farmers", group([count("farmers_count", "Farmers"), FARMER_TYPE])),
          otherBeneficiary,
        ],
      },
      jobsSection(),
      { section_name: "Finance", fields: [amount("capital_mobilised_gbp", "Capital mobilised (GBP)")] },
      locationSection(),
      linkingSection(),
    ],
    on_continue: { next_flow: "FLOW-06" },
    validation: [
      ...JOB_RULES,
      { rule_id: "K3", rule: "utilized capacity ≤ installed capacity", severity: "hard" },
      { rule_id: "K4", rule: "commissioning date ≤ period end", severity: "hard" },
      { rule_id: "K5", rule: "commissioning date not in future", severity: "hard" },
      { rule_id: "R13", rule: "utilization < 50% and age > 12 months → flag", severity: "soft" },
      { rule_id: "R15", rule: "utilized < installed and no reason → encourage reason", severity: "soft" },
      { rule_id: "C1", rule: "residents ≥ households", severity: "soft" },
      { rule_id: "R2", rule: "component never more precise than parent", severity: "hard" },
      { rule_id: "R8", rule: "capacity needs an asset", severity: "hard" },
    ],
  },

  {
    flow_id: "FLOW-05B",
    step: 5,
    name: "Provided energy access",
    screen_title: "Energy access provided at {site_name}",
    sections: [
      {
        section_name: "Who benefits",
        fields: [
          {
            field_id: "beneficiary_types", label: "Who gained access?", type: "multi_select_checkbox", required: true,
            options: [
              { value: "residents_households", label: "Residents / households" }, { value: "students", label: "Students" },
              { value: "patients", label: "Patients" }, { value: "businesses_institutions", label: "Businesses / institutions" },
              { value: "public_facilities", label: "Public facilities" }, { value: "farmers", label: "Farmers" },
              { value: "other", label: "Other" },
            ],
          },
          ACCESS_TYPE,
        ],
      },
      {
        section_name: "Beneficiary counts",
        fields_revealed_by: "beneficiary_types",
        conditional_fields: [
          benefits("residents_households", group([count("households_count", "Number of households"), count("residents_count", "Number of residents")])),
          benefits("students", count("students_count", "Number of students")),
          benefits("patients", count("patients_count", "Number of patients")),
          benefits("businesses_institutions", group([count("businesses_count", "Number of businesses"), text("business_type", "Type")])),
          benefits("public_facilities", group([count("facilities_count", "Number of facilities"), { field_id: "facility_type", label: "Facility type", type: "select", display: "dropdown", required: true, options: ["school", "clinic", "hospital", "community_centre", "other"] }])),
          benefits("farmers", group([count("farmers_count", "Number of farmers"), FARMER_TYPE])),
          otherBeneficiary,
        ],
      },
      {
        section_name: "Capacity (if a system was installed)",
        fields: [
          amount("installed_capacity_kw", "Installed capacity (kW)", false, { hint: "Leave blank if no system was installed." }),
          group([
            amount("utilized_capacity_kw", "Utilized capacity (kW)", false, { escape: { label: "Not yet measured" } }),
            { field_id: "commissioning_date", label: "Commissioning date", type: "date", required: false },
          ], "installed_capacity_kw > 0"),
          {
            field_id: "utilization_reason", label: "Utilized is below installed. Why?", type: "select", display: "dropdown", required: false,
            options: ["demand_not_at_full_capacity", "grid_connection_pending", "maintenance", "seasonal_variation", "other"],
            condition: "utilized_capacity_kw < installed_capacity_kw", free_text_if: "other",
          },
        ],
      },
      jobsSection(),
      { section_name: "Finance", fields: [amount("capital_mobilised_gbp", "Capital mobilised (GBP)")] },
      locationSection(),
      linkingSection({ label: "What change did this produce?" }),
    ],
    on_continue: { next_flow: "FLOW-06" },
    validation: [
      ...JOB_RULES,
      { rule_id: "K3", rule: "utilized ≤ installed", severity: "hard" },
      { rule_id: "K4", rule: "commissioning date ≤ period end", severity: "hard" },
      { rule_id: "C1", rule: "residents ≥ households", severity: "soft" },
      { rule_id: "R9", rule: "reach needs an intervention", severity: "hard" },
    ],
  },

  {
    flow_id: "FLOW-05C",
    step: 5,
    name: "Distributed seedlings / agricultural inputs",
    screen_title: "Seedlings and inputs distributed at {site_name}",
    sections: [
      {
        section_name: "Inputs",
        fields: [
          { field_id: "input_types", label: "What was distributed?", type: "multi_select", required: true, options: ["seedlings", "seeds", "fertilizer", "tools", "other"] },
        ],
        conditional_fields: [
          { condition: "input_types CONTAINS 'seedlings'", fields: [count("seedlings_distributed", "Seedlings distributed (count)")] },
          { condition: "input_types CONTAINS 'seeds'", fields: [amount("seeds_kg", "Seed distributed (kg)", true)] },
          { condition: "input_types CONTAINS 'fertilizer'", fields: [amount("fertilizer_kg", "Fertilizer distributed (kg)", true)] },
          { condition: "input_types CONTAINS 'tools'", fields: [count("tools_count", "Tools distributed (count)")] },
          {
            condition: "input_types CONTAINS 'other'",
            fields: [
              text("other_input_description", "Describe the input"),
              group([amount("other_input_quantity", "Quantity", true), text("other_input_unit", "Unit", true, { placeholder: "e.g. litres, bags" })]),
            ],
          },
        ],
      },
      {
        section_name: "Who benefits",
        fields: [{
          field_id: "beneficiary_types", label: "Who received the inputs?", type: "multi_select_checkbox", required: true,
          options: [
            { value: "farmers", label: "Farmers" }, { value: "households", label: "Households" },
            { value: "cooperatives", label: "Cooperatives / farmer groups" }, { value: "other", label: "Other" },
          ],
        }],
      },
      {
        section_name: "Beneficiary counts",
        fields_revealed_by: "beneficiary_types",
        conditional_fields: [
          benefits("farmers", group([count("farmers_count", "Number of farmers"), FARMER_TYPE])),
          benefits("households", group([count("households_count", "Number of households"), count("people_count", "Number of people")])),
          benefits("cooperatives", count("cooperatives_count", "Number of cooperatives")),
          otherBeneficiary,
        ],
      },
      {
        section_name: "Productive assets and food security",
        fields: [
          count("farmers_with_increased_productive_assets", "Farmers with increased productive assets", false),
          count("people_with_improved_food_security", "People with improved food security", false),
        ],
      },
      { section_name: "Finance", fields: [amount("capital_advanced_gbp", "Capital mobilised and advanced to farmers (GBP)")] },
      jobsSection(),
      locationSection(["cluster", "programme"]),
      linkingSection({ label: "What change did this produce?" }),
    ],
    on_continue: { next_flow: "FLOW-06" },
    validation: [...JOB_RULES, { rule_id: "R9", rule: "reach needs an intervention", severity: "hard" }],
  },

  {
    flow_id: "FLOW-05D",
    step: 5,
    name: "Provided finance",
    screen_title: "Finance provided at {site_name}",
    sections: [
      {
        section_name: "Finance",
        fields: [
          group([
            amount("finance_amount", "Amount mobilised and advanced", true),
            { field_id: "currency", label: "Currency", type: "select_currency", required: true },
          ]),
          { field_id: "capital_mobilised_gbp", label: "GBP equivalent", type: "gbp_equivalent", amount_field: "finance_amount", currency_field: "currency", rate_field: "fx_rate_per_gbp", condition: "currency != 'GBP'" },
          { field_id: "finance_type", label: "Finance type", type: "select", required: true, options: ["loan", "grant", "guarantee", "equity", "other"], free_text_if: "other" },
        ],
      },
      {
        section_name: "Who benefits",
        fields: [{
          field_id: "beneficiary_types", label: "Who received the finance?", type: "multi_select_checkbox", required: true,
          options: [{ value: "farmers", label: "Farmers" }, { value: "businesses", label: "Businesses" }, { value: "households", label: "Households" }, { value: "other", label: "Other" }],
        }],
      },
      {
        section_name: "Beneficiary counts",
        fields_revealed_by: "beneficiary_types",
        conditional_fields: [
          benefits("farmers", group([count("farmers_count", "Farmers accessing finance"), FARMER_TYPE])),
          benefits("businesses", group([count("businesses_count", "Businesses accessing finance"), text("business_type", "Type")])),
          benefits("households", count("households_count", "Households accessing finance")),
          otherBeneficiary,
        ],
      },
      jobsSection(),
      locationSection(),
      linkingSection({
        label: "What did this finance lead to?",
        source: "transactions_or_outputs_in_project",
        escapes: [{ value: "not_yet_deployed", label: "Not yet deployed" }, { value: "dont_know", label: "Don't know" }],
      }),
    ],
    on_continue: { next_flow: "FLOW-06" },
    validation: [
      ...JOB_RULES,
      { rule_id: "R4", rule: "if local currency, currency code required", severity: "hard" },
      { rule_id: "R6", rule: "transactions link to a site or admin area", severity: "hard" },
    ],
  },

  {
    flow_id: "FLOW-05E",
    step: 5,
    name: "Built / upgraded facility",
    screen_title: "Facility built or upgraded at {site_name}",
    sections: [
      {
        section_name: "Facility",
        fields: [
          { field_id: "facility_type", label: "Facility type", type: "select", display: "dropdown", required: true, options: ["exchange", "clearing_house", "registry", "data_platform", "school", "clinic", "warehouse", "other"], free_text_if: "other" },
          group([
            amount("facility_capacity", "Capacity (if applicable)"),
            text("facility_capacity_unit", "Capacity unit", true, { placeholder: "e.g. students, beds, tonnes", condition: "facility_capacity > 0" }),
          ]),
          { field_id: "commissioning_date", label: "Commissioning date", type: "date", required: true },
        ],
      },
      {
        section_name: "Who benefits",
        fields: [{
          field_id: "beneficiary_types", label: "Who benefits from this facility?", type: "multi_select_checkbox", required: true,
          options: [
            { value: "residents_households", label: "Residents / households" }, { value: "students", label: "Students" },
            { value: "patients", label: "Patients" }, { value: "businesses", label: "Businesses" },
            { value: "public", label: "General public" }, { value: "other", label: "Other" },
          ],
        }],
      },
      {
        section_name: "Beneficiary counts",
        fields_revealed_by: "beneficiary_types",
        conditional_fields: [
          benefits("residents_households", group([count("households_count", "Number of households"), count("residents_count", "Number of residents")])),
          benefits("students", count("students_count", "Number of students")),
          benefits("patients", count("patients_count", "Number of patients")),
          benefits("businesses", count("businesses_count", "Number of businesses")),
          benefits("public", count("public_count", "Number of people")),
          otherBeneficiary,
        ],
      },
      jobsSection({ allRequired: true }),
      { section_name: "Finance", fields: [amount("capital_mobilised_gbp", "Capital mobilised (GBP)")] },
      locationSection(["project", "programme"]),
      linkingSection(),
    ],
    on_continue: { next_flow: "FLOW-06" },
    validation: [
      ...JOB_RULES,
      { rule_id: "K4", rule: "commissioning date ≤ period end", severity: "hard" },
      { rule_id: "K5", rule: "commissioning date not in future", severity: "hard" },
      { rule_id: "C1", rule: "residents ≥ households", severity: "soft" },
      { rule_id: "R8", rule: "capacity needs an asset", severity: "hard" },
    ],
  },

  {
    flow_id: "FLOW-05F",
    step: 5,
    name: "Delivered training / capacity building",
    screen_title: "Training delivered at {site_name}",
    sections: [
      {
        section_name: "Training",
        fields: [
          text("training_type", "What was the training about?"),
          group([amount("training_duration_days", "Duration (days)"), count("session_count", "Number of sessions", false)]),
        ],
      },
      {
        section_name: "Who benefits",
        fields: [{
          field_id: "beneficiary_types", label: "Who was trained?", type: "multi_select_checkbox", required: true,
          options: [{ value: "institutions", label: "Institutions" }, { value: "individuals", label: "Individuals" }, { value: "businesses", label: "Businesses" }, { value: "other", label: "Other" }],
        }],
      },
      {
        section_name: "Beneficiary counts",
        fields_revealed_by: "beneficiary_types",
        conditional_fields: [
          benefits("institutions", group([count("institutions_count", "Institutions reached"), { field_id: "institution_type", label: "Institution type", type: "select", required: true, options: ["bank", "regulator", "mfi", "other"] }])),
          benefits("individuals",
            count("people_trained_count", "People trained"),
            group([count("female_trained_count", "Of which female", false), count("youth_trained_count", "Of which youth under 35", false)])),
          benefits("businesses", count("businesses_count", "Number of businesses")),
          otherBeneficiary,
        ],
      },
      jobsSection({ name: "Jobs (if training led to jobs)" }),
      locationSection(["cluster", "programme"]),
      linkingSection(),
    ],
    on_continue: { next_flow: "FLOW-06" },
    validation: [
      ...JOB_RULES,
      { rule_id: "T1", rule: "female and youth trained ≤ people trained", severity: "hard" },
      { rule_id: "R9", rule: "reach needs an intervention", severity: "hard" },
    ],
  },

  {
    flow_id: "FLOW-05G",
    step: 5,
    name: "Other activity",
    screen_title: "Tell us about the activity at {site_name}",
    note: "Placeholder until FLOW-05G is written in the spec.",
    sections: [
      {
        section_name: "Activity",
        fields: [
          { field_id: "activity_description", label: "Describe what you did", type: "textarea", required: true, minlength: 20, error: "A sentence or two, please (20+ characters)." },
          group([text("beneficiary_description", "Who benefited?"), count("beneficiary_count", "How many?")]),
        ],
      },
      jobsSection(),
      locationSection(),
      linkingSection(),
    ],
    on_continue: { next_flow: "FLOW-06" },
    validation: JOB_RULES,
  },

  {
    flow_id: "FLOW-06",
    step: 6,
    name: "Review",
    screen_type: "review",
    screen_title: "Review and submit",
  },
];
