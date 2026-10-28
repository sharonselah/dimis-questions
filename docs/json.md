{
  "user_flow_spec": {
    "version": "1.0",
    "description": "FSD Africa impact reporting — full user flow, screen by screen",
    "hierarchy": ["programme", "project", "site", "activity", "indicator_record"],
    "cadence": ["quarterly", "bi_annual"],
    "flows": []
  }
}



{
  "flow_id": "FLOW-01",
  "step": 1,
  "name": "Programme Selection",
  "screen_title": "Which programme is this data about?",
  "screen_type": "selection_or_create",
  "entry_point": "user logs in and starts a new reporting round",
  "fields": [
    {
      "field_id": "programme_id",
      "label": "Programme",
      "type": "select_or_create",
      "required": true,
      "options_source": "existing_programmes",
      "create_fields": [
        { "field_id": "programme_name", "label": "Programme name", "type": "text", "required": true },
        { "field_id": "countries", "label": "Countries of operation", "type": "multi_select_country", "required": true },
        { "field_id": "thematic_focus", "label": "Thematic focus", "type": "multi_select", "options": ["carbon", "nature", "energy", "gender", "finance", "other"], "required": true },
        { "field_id": "funding_envelope_gbp", "label": "Funding envelope (GBP)", "type": "number", "required": false },
        { "field_id": "description", "label": "Description", "type": "textarea", "required": false }
      ]
    }
  ],
  "on_continue": {
    "action": "save_programme_selection",
    "next_flow": "FLOW-02"
  },
  "validation": [
    { "rule": "programme_id must exist or be created", "severity": "hard" }
  ]
}

{
  "flow_id": "FLOW-02",
  "step": 2,
  "name": "Project Selection",
  "screen_title": "Which project under {programme_name}?",
  "screen_type": "selection_or_create",
  "depends_on": ["FLOW-01"],
  "fields": [
    {
      "field_id": "project_id",
      "label": "Project",
      "type": "select_or_create",
      "required": true,
      "options_source": "existing_projects_in_programme",
      "display_hint": "show site count next to each project, e.g. 'SPARK-001 Qwetu student residences [8 sites]'",
      "create_fields": [
        { "field_id": "project_name", "label": "Project name", "type": "text", "required": true },
        { "field_id": "project_code", "label": "Project code", "type": "text", "required": true, "pattern": "^[A-Z]+-[0-9]{3}$" },
        { "field_id": "country", "label": "Country", "type": "select_country", "required": true },
        { "field_id": "implementing_partner", "label": "Implementing partner", "type": "text", "required": false },
        { "field_id": "description", "label": "Description", "type": "textarea", "required": false }
      ]
    }
  ],
  "on_continue": {
    "action": "save_project_selection",
    "next_flow": "FLOW-03"
  },
  "validation": [
    { "rule": "project_id must exist in selected programme or be created", "severity": "hard" },
    { "rule": "project cannot belong to two programmes", "severity": "hard", "rule_id": "H6" }
  ]
}

{
  "flow_id": "FLOW-03",
  "step": 3,
  "name": "Site Selection",
  "screen_title": "Which site is this data about?",
  "screen_type": "selection_or_create",
  "depends_on": ["FLOW-02"],
  "note": "This is where location and precision are entered. Site-level records inherit them.",
  "fields": [
    {
      "field_id": "site_id",
      "label": "Site",
      "type": "select_or_create",
      "required": true,
      "options_source": "existing_sites_in_project",
      "display_hint": "show site type and last reported period next to each site",
      "create_fields": [
        {
          "field_id": "site_name",
          "label": "Site name",
          "type": "text",
          "required": true,
          "example": "Ruaraka rooftop A"
        },
        {
          "field_id": "site_type",
          "label": "What kind of site is this?",
          "type": "select",
          "required": true,
          "options": [
            { "value": "rooftop_solar", "label": "Rooftop solar installation", "extra_fields": ["rooftop_area_m2", "building_type"] },
            { "value": "ground_mounted_solar", "label": "Ground-mounted solar", "extra_fields": ["land_area_ha"] },
            { "value": "mini_grid", "label": "Mini-grid", "extra_fields": ["households_connected", "service_area_km2"] },
            { "value": "off_grid_system", "label": "Off-grid system", "extra_fields": ["units_distributed"] },
            { "value": "factory", "label": "Factory / industrial", "extra_fields": ["floor_area_m2", "production_type"] },
            { "value": "retail", "label": "Retail / commercial", "extra_fields": ["floor_area_m2", "branch_count"] },
            { "value": "hotel", "label": "Hotel / hospitality", "extra_fields": ["room_count"] },
            { "value": "school", "label": "School / university", "extra_fields": ["student_count", "staff_count"] },
            { "value": "hospital", "label": "Hospital / clinic", "extra_fields": ["bed_count", "patient_count"] },
            { "value": "farm_plot", "label": "Farm plot", "extra_fields": ["plot_size_ha", "crop"] },
            { "value": "farmer_cluster", "label": "Farmer cluster / cooperative", "extra_fields": ["farmer_count", "crop"] },
            { "value": "nursery", "label": "Nursery (tree/plant)", "extra_fields": ["seedling_capacity"] },
            { "value": "warehouse", "label": "Warehouse / storage", "extra_fields": ["storage_capacity_m3"] },
            { "value": "water_facility", "label": "Water facility", "extra_fields": ["capacity_m3_day"] },
            { "value": "other", "label": "Other (describe)", "extra_fields": ["description"], "free_text": true }
          ]
        },
        {
          "field_id": "parent_site_id",
          "label": "Is this site inside another site?",
          "type": "select_optional",
          "required": false,
          "options_source": "existing_sites_in_project",
          "note": "Used for nested sites — e.g. a farm plot inside a farmer cluster"
        },
        {
          "field_id": "geometry",
          "label": "Where is this site?",
          "type": "map_pin_or_polygon_or_admin",
          "required": true,
          "input_modes": ["drop_pin", "draw_polygon", "search_address", "pick_admin_area"]
        },
        {
          "field_id": "precision_level",
          "label": "How precisely do you know this location?",
          "type": "select",
          "required": true,
          "options": [
            { "value": "P1", "label": "Exact building / plot (P1)" },
            { "value": "P2", "label": "Premises / vicinity (P2)" },
            { "value": "P3", "label": "Village / cluster (P3)" },
            { "value": "P4", "label": "Ward (P4)" },
            { "value": "P5", "label": "Sub-county / municipality (P5)" },
            { "value": "P6", "label": "County / district (P6)" },
            { "value": "P7", "label": "Country (P7)" }
          ]
        },
        {
          "field_id": "location_source",
          "label": "Source of location",
          "type": "select",
          "required": true,
          "options": ["surveyed", "gps", "parcel_match", "as_built", "address_match", "administrative_record", "programme_records"]
        },
        {
          "field_id": "admin_codes",
          "label": "Administrative location",
          "type": "auto_filled_editable",
          "required": true,
          "fields": ["country", "county", "ward"],
          "note": "Auto-filled from map, editable"
        }
      ],
      "extra_fields_revealed_by_site_type": true
    }
  ],
  "on_continue": {
    "action": "save_site_selection",
    "next_flow": "FLOW-04"
  },
  "validation": [
    { "rule_id": "S1", "rule": "coordinates exist when precision is P1 or P2", "severity": "hard" },
    { "rule_id": "S2", "rule": "coordinate system declared; reproject to EPSG:4326", "severity": "hard" },
    { "rule_id": "S3", "rule": "geometry valid — no self-intersecting polygons, no empty points", "severity": "hard" },
    { "rule_id": "S4", "rule": "point inside claimed country, tested with covers", "severity": "hard" },
    { "rule_id": "S5", "rule": "geometry type matches claimed precision", "severity": "hard" },
    { "rule_id": "S6", "rule": "source method justifies precision", "severity": "soft_then_hard" },
    { "rule_id": "S7", "rule": "no duplicate geometry for same indicator", "severity": "soft" },
    { "rule_id": "S8", "rule": "boundary codes current", "severity": "hard" },
    { "rule_id": "S9", "rule": "centroid marked display-only", "severity": "hard" },
    { "rule_id": "H5", "rule": "a site belongs to one project only", "severity": "hard" }
  ]
}

{
  "flow_id": "FLOW-04",
  "step": 4,
  "name": "Activity Selection",
  "screen_title": "What did you do at this site?",
  "screen_type": "select",
  "depends_on": ["FLOW-03"],
  "note": "The activity type determines which indicator questions appear next.",
  "fields": [
    {
      "field_id": "activity_type",
      "label": "What did you do at this site?",
      "type": "select",
      "required": true,
      "options": [
        { "value": "installed_renewable_energy_capacity", "label": "Installed renewable energy capacity", "next_flow": "FLOW-05A" },
        { "value": "provided_energy_access", "label": "Provided energy access", "next_flow": "FLOW-05B" },
        { "value": "distributed_seedlings_inputs", "label": "Distributed seedlings / agricultural inputs", "next_flow": "FLOW-05C" },
        { "value": "provided_finance", "label": "Provided finance", "next_flow": "FLOW-05D" },
        { "value": "built_upgraded_facility", "label": "Built / upgraded facility", "next_flow": "FLOW-05E" },
        { "value": "delivered_training", "label": "Delivered training / capacity building", "next_flow": "FLOW-05F" },
        { "value": "other", "label": "Other (describe)", "next_flow": "FLOW-05G" }
      ]
    }
  ],
  "on_continue": {
    "action": "route_to_activity_flow",
    "rule": "next_flow = selected_option.next_flow"
  }
}

{
  "flow_id": "FLOW-05A",
  "step": 5,
  "name": "Installed Renewable Energy Capacity",
  "screen_title": "Installed renewable energy capacity at {site_name}",
  "depends_on": ["FLOW-04"],
  "sections": [
    {
      "section_id": "A",
      "section_name": "Capacity",
      "fields": [
        { "field_id": "installed_capacity_kw", "label": "Installed capacity (kW)", "type": "number", "required": true, "min": 0 },
        { "field_id": "utilized_capacity_kw", "label": "Utilized capacity (kW)", "type": "number", "required": true, "min": 0, "escape": { "label": "Not yet measured", "value": null } },
        { "field_id": "commissioning_date", "label": "Commissioning date", "type": "date", "required": true },
        { "field_id": "utilization_reason", "label": "If utilized < installed, why?", "type": "select", "required": false, "options": ["demand_not_at_full_capacity", "grid_connection_pending", "maintenance", "seasonal_variation", "other"], "condition": "utilized_capacity_kw < installed_capacity_kw", "free_text_if": "other" }
      ],
      "system_derived": [
        { "field_id": "utilization_rate", "formula": "utilized_capacity_kw / installed_capacity_kw * 100", "unit": "percent" },
        { "field_id": "capacity_age_months", "formula": "months_between(commissioning_date, reporting_period_end)" },
        { "field_id": "ramp_up_flag", "formula": "utilization_rate < 50 AND capacity_age_months < 6" },
        { "field_id": "underutilization_flag", "formula": "utilization_rate < 50 AND capacity_age_months > 12" }
      ]
    },
    {
      "section_id": "B",
      "section_name": "Who benefits",
      "fields": [
        {
          "field_id": "beneficiary_types",
          "label": "Who benefits from this installation?",
          "type": "multi_select_checkbox",
          "required": true,
          "options": [
            { "value": "residents_households", "label": "Residents / households" },
            { "value": "students", "label": "Students" },
            { "value": "staff", "label": "Staff" },
            { "value": "patients", "label": "Patients" },
            { "value": "businesses_institutions", "label": "Businesses / institutions" },
            { "value": "public_facilities", "label": "Public facilities" },
            { "value": "farmers", "label": "Farmers" },
            { "value": "other", "label": "Other (describe)", "free_text": true }
          ]
        }
      ]
    },
    {
      "section_id": "C",
      "section_name": "Beneficiary counts",
      "fields_revealed_by": "beneficiary_types",
      "conditional_fields": [
        {
          "condition": "beneficiary_types CONTAINS 'residents_households'",
          "fields": [
            { "field_id": "households_count", "label": "Number of households with improved access", "type": "number", "required": true, "min": 0 },
            { "field_id": "residents_count", "label": "Number of residents with improved access", "type": "number", "required": true, "min": 0 },
            { "field_id": "access_type", "label": "Access type", "type": "select", "required": true, "options": ["reliable_power", "first_time_access", "clean_energy_replacing_diesel", "backup_power"] }
          ]
        },
        {
          "condition": "beneficiary_types CONTAINS 'students'",
          "fields": [
            { "field_id": "students_count", "label": "Number of students with improved access", "type": "number", "required": true, "min": 0 },
            { "field_id": "staff_count", "label": "Number of staff with improved access", "type": "number", "required": false, "min": 0 }
          ]
        },
        {
          "condition": "beneficiary_types CONTAINS 'staff'",
          "fields": [
            { "field_id": "staff_access_count", "label": "Number of staff with improved access", "type": "number", "required": true, "min": 0 }
          ]
        },
        {
          "condition": "beneficiary_types CONTAINS 'patients'",
          "fields": [
            { "field_id": "patients_count", "label": "Number of patients with improved access", "type": "number", "required": true, "min": 0 }
          ]
        },
        {
          "condition": "beneficiary_types CONTAINS 'businesses_institutions'",
          "fields": [
            { "field_id": "businesses_count", "label": "Number of businesses / institutions", "type": "number", "required": true, "min": 0 },
            { "field_id": "business_type", "label": "Type", "type": "text", "required": true }
          ]
        },
        {
          "condition": "beneficiary_types CONTAINS 'public_facilities'",
          "fields": [
            { "field_id": "facilities_count", "label": "Number of public facilities", "type": "number", "required": true, "min": 0 },
            { "field_id": "facility_type", "label": "Facility type", "type": "select", "required": true, "options": ["school", "clinic", "hospital", "community_centre", "other"] }
          ]
        },
        {
          "condition": "beneficiary_types CONTAINS 'farmers'",
          "fields": [
            { "field_id": "farmers_count", "label": "Number of farmers", "type": "number", "required": true, "min": 0 },
            { "field_id": "farmer_type", "label": "Farmer type", "type": "select", "required": true, "options": ["smallholder", "commercial"] }
          ]
        },
        {
          "condition": "beneficiary_types CONTAINS 'other'",
          "fields": [
            { "field_id": "other_beneficiary_description", "label": "Describe the beneficiary", "type": "text", "required": true },
            { "field_id": "other_beneficiary_count", "label": "Number of beneficiaries", "type": "number", "required": true, "min": 0 }
          ]
        }
      ]
    },
    {
      "section_id": "D",
      "section_name": "Jobs (full disaggregation)",
      "fields": [
        { "field_id": "total_jobs_fte", "label": "Total jobs created (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "direct_jobs_fte", "label": "Direct jobs (FTE)", "type": "number", "required": true, "min": 0, "condition": "total_jobs_fte > 0", "precision_hint": "P1–P2 — facility level" },
        { "field_id": "indirect_jobs_fte", "label": "Indirect jobs (FTE) — modelled", "type": "number", "required": false, "min": 0, "precision_hint": "P5–P6 — administrative level only" },
        { "field_id": "permanent_jobs_fte", "label": "Permanent jobs (FTE)", "type": "number", "required": true, "min": 0, "condition": "total_jobs_fte > 0" },
        { "field_id": "temporary_jobs_fte", "label": "Temporary jobs (FTE)", "type": "number", "required": true, "min": 0, "condition": "total_jobs_fte > 0" },
        { "field_id": "female_jobs_fte", "label": "Female jobs (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "youth_jobs_fte", "label": "Youth jobs under 35 (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "green_jobs_fte", "label": "Green jobs (FTE)", "type": "number", "required": false, "min": 0 }
      ]
    },
    {
      "section_id": "E",
      "section_name": "Finance",
      "fields": [
        { "field_id": "capital_mobilised_gbp", "label": "Capital mobilised (GBP)", "type": "number", "required": false, "min": 0 }
      ]
    },
    {
      "section_id": "F",
      "section_name": "Location",
      "fields": [],
      "logic": {
        "if_record_level": "site",
        "action": "inherit_from_site",
        "ask_nothing": true
      },
      "conditional_fields": [
        {
          "condition": "record_level = 'cluster'",
          "fields": [
            { "field_id": "cluster_geometry", "label": "Where is this cluster?", "type": "map_pin_or_polygon_or_admin", "required": true },
            { "field_id": "cluster_precision", "label": "How precisely?", "type": "select", "required": true, "options": ["P3", "P4", "P5"] },
            { "field_id": "cluster_source", "label": "Source", "type": "select", "required": true, "options": ["programme_records", "field_survey", "administrative_record"] }
          ]
        },
        {
          "condition": "record_level = 'project'",
          "fields": [
            { "field_id": "project_geometry", "label": "Project footprint", "type": "map_polygon_or_admin", "required": true },
            { "field_id": "project_precision", "label": "Precision", "type": "select", "required": true, "options": ["P6"] }
          ]
        },
        {
          "condition": "record_level = 'programme'",
          "fields": [
            { "field_id": "programme_countries", "label": "Countries of operation", "type": "multi_select_country", "required": true },
            { "field_id": "programme_precision", "label": "Precision", "type": "select", "required": true, "options": ["P7"] }
          ]
        }
      ]
    },
    {
      "section_id": "G",
      "section_name": "Linking",
      "fields": [
        {
          "field_id": "linked_outcome_ids",
          "label": "What change did this produce for people or the market?",
          "type": "multi_select_from_existing",
          "required": false,
          "options_source": "outcomes_already_reported_in_project",
          "escape_options": [
            { "value": "too_early", "label": "Too early — not yet producing outcomes" },
            { "value": "dont_know", "label": "Don't know / not sure" }
          ]
        }
      ]
    }
  ],
  "on_continue": {
    "action": "save_activity_record",
    "next_flow": "FLOW-06"
  },
  "validation": [
    { "rule_id": "R1", "rule": "direct + indirect ≤ total jobs", "severity": "hard" },
    { "rule_id": "R1b", "rule": "permanent + temporary = total jobs", "severity": "hard" },
    { "rule_id": "R1c", "rule": "female ≤ total; youth ≤ total; green ≤ total", "severity": "hard" },
    { "rule_id": "R2", "rule": "component never more precise than parent", "severity": "hard" },
    { "rule_id": "R8", "rule": "capacity needs an asset — MW links to asset record", "severity": "hard" },
    { "rule_id": "R12", "rule": "installed ≥ utilized; utilized ≥ 0; commissioning date ≤ period end and not in future", "severity": "hard" },
    { "rule_id": "R13", "rule": "utilization < 50% and age > 12 months → flag", "severity": "soft" },
    { "rule_id": "R14", "rule": "capacity reported but commissioning date blank → flag", "severity": "soft" },
    { "rule_id": "R15", "rule": "utilized < installed and no reason → encourage reason", "severity": "soft" },
    { "rule_id": "J6", "rule": "direct jobs precision ≤ P2", "severity": "hard" },
    { "rule_id": "J7", "rule": "indirect jobs precision ≥ P5", "severity": "hard" },
    { "rule_id": "K3", "rule": "utilized capacity ≤ installed capacity", "severity": "hard" },
    { "rule_id": "K4", "rule": "commissioning date ≤ period end", "severity": "hard" },
    { "rule_id": "K5", "rule": "commissioning date not in future", "severity": "hard" }
  ]
}

{
  "flow_id": "FLOW-05B",
  "step": 5,
  "name": "Provided Energy Access",
  "screen_title": "Energy access provided at {site_name}",
  "depends_on": ["FLOW-04"],
  "sections": [
    {
      "section_id": "B",
      "section_name": "Who benefits",
      "fields": [
        {
          "field_id": "beneficiary_types",
          "label": "Who gained access?",
          "type": "multi_select_checkbox",
          "required": true,
          "options": [
            { "value": "residents_households", "label": "Residents / households" },
            { "value": "students", "label": "Students" },
            { "value": "patients", "label": "Patients" },
            { "value": "businesses_institutions", "label": "Businesses / institutions" },
            { "value": "public_facilities", "label": "Public facilities" },
            { "value": "farmers", "label": "Farmers" },
            { "value": "other", "label": "Other (describe)", "free_text": true }
          ]
        },
        { "field_id": "access_type", "label": "Access type", "type": "select", "required": true, "options": ["reliable_power", "first_time_access", "clean_energy_replacing_diesel", "backup_power"] }
      ]
    },
    {
      "section_id": "C",
      "section_name": "Beneficiary counts",
      "fields_revealed_by": "beneficiary_types",
      "conditional_fields": [
        { "condition": "beneficiary_types CONTAINS 'residents_households'", "fields": [{ "field_id": "households_count", "label": "Number of households", "type": "number", "required": true, "min": 0 }, { "field_id": "residents_count", "label": "Number of residents", "type": "number", "required": true, "min": 0 }] },
        { "condition": "beneficiary_types CONTAINS 'students'", "fields": [{ "field_id": "students_count", "label": "Number of students", "type": "number", "required": true, "min": 0 }] },
        { "condition": "beneficiary_types CONTAINS 'patients'", "fields": [{ "field_id": "patients_count", "label": "Number of patients", "type": "number", "required": true, "min": 0 }] },
        { "condition": "beneficiary_types CONTAINS 'businesses_institutions'", "fields": [{ "field_id": "businesses_count", "label": "Number of businesses", "type": "number", "required": true, "min": 0 }, { "field_id": "business_type", "label": "Type", "type": "text", "required": true }] },
        { "condition": "beneficiary_types CONTAINS 'public_facilities'", "fields": [{ "field_id": "facilities_count", "label": "Number of facilities", "type": "number", "required": true, "min": 0 }, { "field_id": "facility_type", "label": "Facility type", "type": "select", "required": true, "options": ["school", "clinic", "hospital", "community_centre", "other"] }] },
        { "condition": "beneficiary_types CONTAINS 'farmers'", "fields": [{ "field_id": "farmers_count", "label": "Number of farmers", "type": "number", "required": true, "min": 0 }, { "field_id": "farmer_type", "label": "Farmer type", "type": "select", "required": true, "options": ["smallholder", "commercial"] }] },
        { "condition": "beneficiary_types CONTAINS 'other'", "fields": [{ "field_id": "other_beneficiary_description", "label": "Describe", "type": "text", "required": true }, { "field_id": "other_beneficiary_count", "label": "Number", "type": "number", "required": true, "min": 0 }] }
      ]
    },
    {
      "section_id": "A",
      "section_name": "Capacity (if a system was installed)",
      "fields": [
        { "field_id": "installed_capacity_kw", "label": "Installed capacity (kW)", "type": "number", "required": false, "min": 0 },
        { "field_id": "utilized_capacity_kw", "label": "Utilized capacity (kW)", "type": "number", "required": false, "min": 0, "condition": "installed_capacity_kw > 0", "escape": { "label": "Not yet measured", "value": null } },
        { "field_id": "commissioning_date", "label": "Commissioning date", "type": "date", "required": false, "condition": "installed_capacity_kw > 0" },
        { "field_id": "utilization_reason", "label": "If utilized < installed, why?", "type": "select", "required": false, "options": ["demand_not_at_full_capacity", "grid_connection_pending", "maintenance", "seasonal_variation", "other"], "condition": "utilized_capacity_kw < installed_capacity_kw" }
      ]
    },
    {
      "section_id": "D",
      "section_name": "Jobs (full disaggregation)",
      "fields": [
        { "field_id": "total_jobs_fte", "label": "Total jobs created (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "direct_jobs_fte", "label": "Direct jobs (FTE)", "type": "number", "required": true, "min": 0, "condition": "total_jobs_fte > 0" },
        { "field_id": "indirect_jobs_fte", "label": "Indirect jobs (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "permanent_jobs_fte", "label": "Permanent jobs (FTE)", "type": "number", "required": true, "min": 0, "condition": "total_jobs_fte > 0" },
        { "field_id": "temporary_jobs_fte", "label": "Temporary jobs (FTE)", "type": "number", "required": true, "min": 0, "condition": "total_jobs_fte > 0" },
        { "field_id": "female_jobs_fte", "label": "Female jobs (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "youth_jobs_fte", "label": "Youth jobs (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "green_jobs_fte", "label": "Green jobs (FTE)", "type": "number", "required": false, "min": 0 }
      ]
    },
    {
      "section_id": "E",
      "section_name": "Finance",
      "fields": [{ "field_id": "capital_mobilised_gbp", "label": "Capital mobilised (GBP)", "type": "number", "required": false, "min": 0 }]
    },
    {
      "section_id": "F",
      "section_name": "Location",
      "logic": { "if_record_level": "site", "action": "inherit_from_site" },
      "conditional_fields": [
        { "condition": "record_level = 'cluster'", "fields": [{ "field_id": "cluster_geometry", "label": "Cluster location", "type": "map_pin_or_polygon_or_admin", "required": true }, { "field_id": "cluster_precision", "label": "Precision", "type": "select", "required": true, "options": ["P3", "P4", "P5"] }] },
        { "condition": "record_level = 'project'", "fields": [{ "field_id": "project_geometry", "label": "Project footprint", "type": "map_polygon_or_admin", "required": true }, { "field_id": "project_precision", "label": "Precision", "type": "select", "required": true, "options": ["P6"] }] },
        { "condition": "record_level = 'programme'", "fields": [{ "field_id": "programme_countries", "label": "Countries", "type": "multi_select_country", "required": true }, { "field_id": "programme_precision", "label": "Precision", "type": "select", "required": true, "options": ["P7"] }] }
      ]
    },
    {
      "section_id": "G",
      "section_name": "Linking",
      "fields": [{ "field_id": "linked_outcome_ids", "label": "What change did this produce?", "type": "multi_select_from_existing", "required": false, "options_source": "outcomes_already_reported_in_project", "escape_options": [{ "value": "too_early", "label": "Too early" }, { "value": "dont_know", "label": "Don't know" }] }]
    }
  ],
  "on_continue": { "action": "save_activity_record", "next_flow": "FLOW-06" },
  "validation": [
    { "rule_id": "R1", "rule": "direct + indirect ≤ total jobs", "severity": "hard" },
    { "rule_id": "R1b", "rule": "permanent + temporary = total jobs", "severity": "hard" },
    { "rule_id": "R9", "rule": "reach needs an intervention", "severity": "hard" },
    { "rule_id": "K3", "rule": "utilized ≤ installed", "severity": "hard" }
  ]
}

{
  "flow_id": "FLOW-05C",
  "step": 5,
  "name": "Distributed Seedlings / Agricultural Inputs",
  "screen_title": "Seedlings and inputs distributed at {site_name}",
  "depends_on": ["FLOW-04"],
  "sections": [
    {
      "section_id": "A",
      "section_name": "Inputs",
      "fields": [
        { "field_id": "input_type", "label": "Input type", "type": "select", "required": true, "options": ["seedlings", "fertilizer", "seeds", "tools", "other"] },
        { "field_id": "seedlings_distributed", "label": "Seedlings distributed (count)", "type": "number", "required": true, "min": 0, "condition": "input_type = 'seedlings'" },
        { "field_id": "other_input_description", "label": "Describe the input", "type": "text", "required": false, "condition": "input_type = 'other'" },
        { "field_id": "other_input_quantity", "label": "Quantity", "type": "number", "required": false, "condition": "input_type = 'other'" }
      ]
    },
    {
      "section_id": "B",
      "section_name": "Who benefits",
      "fields": [
        {
          "field_id": "beneficiary_types",
          "label": "Who received the inputs?",
          "type": "multi_select_checkbox",
          "required": true,
          "options": [
            { "value": "farmers", "label": "Farmers" },
            { "value": "households", "label": "Households" },
            { "value": "cooperatives", "label": "Cooperatives / farmer groups" },
            { "value": "other", "label": "Other (describe)", "free_text": true }
          ]
        }
      ]
    },
    {
      "section_id": "C",
      "section_name": "Beneficiary counts",
      "fields_revealed_by": "beneficiary_types",
      "conditional_fields": [
        { "condition": "beneficiary_types CONTAINS 'farmers'", "fields": [{ "field_id": "farmers_count", "label": "Number of farmers", "type": "number", "required": true, "min": 0 }, { "field_id": "farmer_type", "label": "Farmer type", "type": "select", "required": true, "options": ["smallholder", "commercial"] }] },
        { "condition": "beneficiary_types CONTAINS 'households'", "fields": [{ "field_id": "households_count", "label": "Number of households", "type": "number", "required": true, "min": 0 }, { "field_id": "people_count", "label": "Number of people", "type": "number", "required": true, "min": 0 }] },
        { "condition": "beneficiary_types CONTAINS 'cooperatives'", "fields": [{ "field_id": "cooperatives_count", "label": "Number of cooperatives", "type": "number", "required": true, "min": 0 }] },
        { "condition": "beneficiary_types CONTAINS 'other'", "fields": [{ "field_id": "other_beneficiary_description", "label": "Describe", "type": "text", "required": true }, { "field_id": "other_beneficiary_count", "label": "Number", "type": "number", "required": true, "min": 0 }] }
      ]
    },
    {
      "section_id": "D",
      "section_name": "Productive assets and food security",
      "fields": [
        { "field_id": "farmers_with_increased_productive_assets", "label": "Farmers with increased productive assets", "type": "number", "required": false, "min": 0 },
        { "field_id": "people_with_improved_food_security", "label": "People with improved access to food security", "type": "number", "required": false, "min": 0 }
      ]
    },
    {
      "section_id": "E",
      "section_name": "Finance",
      "fields": [{ "field_id": "capital_advanced_gbp", "label": "Capital mobilised and advanced to farmers (GBP)", "type": "number", "required": false, "min": 0 }]
    },
    {
      "section_id": "F",
      "section_name": "Jobs (full disaggregation)",
      "fields": [
        { "field_id": "total_jobs_fte", "label": "Total jobs created (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "direct_jobs_fte", "label": "Direct jobs (FTE)", "type": "number", "required": true, "min": 0, "condition": "total_jobs_fte > 0" },
        { "field_id": "indirect_jobs_fte", "label": "Indirect jobs (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "permanent_jobs_fte", "label": "Permanent jobs (FTE)", "type": "number", "required": true, "min": 0, "condition": "total_jobs_fte > 0" },
        { "field_id": "temporary_jobs_fte", "label": "Temporary jobs (FTE)", "type": "number", "required": true, "min": 0, "condition": "total_jobs_fte > 0" },
        { "field_id": "female_jobs_fte", "label": "Female jobs (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "youth_jobs_fte", "label": "Youth jobs (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "green_jobs_fte", "label": "Green jobs (FTE)", "type": "number", "required": false, "min": 0 }
      ]
    },
    {
      "section_id": "G",
      "section_name": "Location",
      "logic": { "if_record_level": "site", "action": "inherit_from_site" },
      "conditional_fields": [
        { "condition": "record_level = 'cluster'", "fields": [{ "field_id": "cluster_geometry", "label": "Cluster location", "type": "map_pin_or_polygon_or_admin", "required": true }, { "field_id": "cluster_precision", "label": "Precision", "type": "select", "required": true, "options": ["P3", "P4", "P5"] }] },
        { "condition": "record_level = 'programme'", "fields": [{ "field_id": "programme_countries", "label": "Countries", "type": "multi_select_country", "required": true }, { "field_id": "programme_precision", "label": "Precision", "type": "select", "required": true, "options": ["P7"] }] }
      ]
    },
    {
      "section_id": "H",
      "section_name": "Linking",
      "fields": [{ "field_id": "linked_outcome_ids", "label": "What change did this produce?", "type": "multi_select_from_existing", "required": false, "options_source": "outcomes_already_reported_in_project", "escape_options": [{ "value": "too_early", "label": "Too early" }, { "value": "dont_know", "label": "Don't know" }] }]
    }
  ],
  "on_continue": { "action": "save_activity_record", "next_flow": "FLOW-06" },
  "validation": [
    { "rule_id": "R1", "rule": "direct + indirect ≤ total jobs", "severity": "hard" },
    { "rule_id": "R1b", "rule": "permanent + temporary = total jobs", "severity": "hard" },
    { "rule_id": "R9", "rule": "reach needs an intervention", "severity": "hard" }
  ]
}

{
  "flow_id": "FLOW-05D",
  "step": 5,
  "name": "Provided Finance",
  "screen_title": "Finance provided at {site_name}",
  "depends_on": ["FLOW-04"],
  "sections": [
    {
      "section_id": "A",
      "section_name": "Finance",
      "fields": [
        { "field_id": "capital_mobilised_gbp", "label": "Capital mobilised and advanced (GBP)", "type": "number", "required": true, "min": 0 },
        { "field_id": "finance_type", "label": "Finance type", "type": "select", "required": true, "options": ["loan", "grant", "guarantee", "equity", "other"] },
        { "field_id": "currency", "label": "Currency", "type": "select_currency", "required": true }
      ]
    },
    {
      "section_id": "B",
      "section_name": "Who benefits",
      "fields": [
        {
          "field_id": "beneficiary_types",
          "label": "Who received the finance?",
          "type": "multi_select_checkbox",
          "required": true,
          "options": [
            { "value": "farmers", "label": "Farmers" },
            { "value": "businesses", "label": "Businesses" },
            { "value": "households", "label": "Households" },
            { "value": "other", "label": "Other (describe)", "free_text": true }
          ]
        }
      ]
    },
    {
      "section_id": "C",
      "section_name": "Beneficiary counts",
      "fields_revealed_by": "beneficiary_types",
      "conditional_fields": [
        { "condition": "beneficiary_types CONTAINS 'farmers'", "fields": [{ "field_id": "farmers_count", "label": "Number of farmers accessing finance", "type": "number", "required": true, "min": 0 }, { "field_id": "farmer_type", "label": "Farmer type", "type": "select", "required": true, "options": ["smallholder", "commercial"] }] },
        { "condition": "beneficiary_types CONTAINS 'businesses'", "fields": [{ "field_id": "businesses_count", "label": "Number of businesses accessing finance", "type": "number", "required": true, "min": 0 }, { "field_id": "business_type", "label": "Type", "type": "text", "required": true }] },
        { "condition": "beneficiary_types CONTAINS 'households'", "fields": [{ "field_id": "households_count", "label": "Number of households accessing finance", "type": "number", "required": true, "min": 0 }] },
        { "condition": "beneficiary_types CONTAINS 'other'", "fields": [{ "field_id": "other_beneficiary_description", "label": "Describe", "type": "text", "required": true }, { "field_id": "other_beneficiary_count", "label": "Number", "type": "number", "required": true, "min": 0 }] }
      ]
    },
    {
      "section_id": "D",
      "section_name": "Jobs (full disaggregation)",
      "fields": [
        { "field_id": "total_jobs_fte", "label": "Total jobs created (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "direct_jobs_fte", "label": "Direct jobs (FTE)", "type": "number", "required": true, "min": 0, "condition": "total_jobs_fte > 0" },
        { "field_id": "indirect_jobs_fte", "label": "Indirect jobs (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "permanent_jobs_fte", "label": "Permanent jobs (FTE)", "type": "number", "required": true, "min": 0, "condition": "total_jobs_fte > 0" },
        { "field_id": "temporary_jobs_fte", "label": "Temporary jobs (FTE)", "type": "number", "required": true, "min": 0, "condition": "total_jobs_fte > 0" },
        { "field_id": "female_jobs_fte", "label": "Female jobs (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "youth_jobs_fte", "label": "Youth jobs (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "green_jobs_fte", "label": "Green jobs (FTE)", "type": "number", "required": false, "min": 0 }
      ]
    },
    {
      "section_id": "E",
      "section_name": "Location",
      "logic": { "if_record_level": "site", "action": "inherit_from_site" },
      "conditional_fields": [
        { "condition": "record_level = 'cluster'", "fields": [{ "field_id": "cluster_geometry", "label": "Cluster location", "type": "map_pin_or_polygon_or_admin", "required": true }, { "field_id": "cluster_precision", "label": "Precision", "type": "select", "required": true, "options": ["P3", "P4", "P5"] }] },
        { "condition": "record_level = 'project'", "fields": [{ "field_id": "project_geometry", "label": "Project footprint", "type": "map_polygon_or_admin", "required": true }, { "field_id": "project_precision", "label": "Precision", "type": "select", "required": true, "options": ["P6"] }] },
        { "condition": "record_level = 'programme'", "fields": [{ "field_id": "programme_countries", "label": "Countries", "type": "multi_select_country", "required": true }, { "field_id": "programme_precision", "label": "Precision", "type": "select", "required": true, "options": ["P7"] }] }
      ]
    },
    {
      "section_id": "F",
      "section_name": "Linking",
      "fields": [{ "field_id": "linked_outcome_ids", "label": "What did this finance lead to?", "type": "multi_select_from_existing", "required": false, "options_source": "transactions_or_outputs_in_project", "escape_options": [{ "value": "not_yet_deployed", "label": "Not yet deployed" }, { "value": "dont_know", "label": "Don't know" }] }]
    }
  ],
  "on_continue": { "action": "save_activity_record", "next_flow": "FLOW-06" },
  "validation": [
    { "rule_id": "R1", "rule": "direct + indirect ≤ total jobs", "severity": "hard" },
    { "rule_id": "R1b", "rule": "permanent + temporary = total jobs", "severity": "hard" },
    { "rule_id": "R4", "rule": "if local currency, currency code required", "severity": "hard" },
    { "rule_id": "R6", "rule": "transactions link to a site or admin area", "severity": "hard" }
  ]
}

{
  "flow_id": "FLOW-05E",
  "step": 5,
  "name": "Built / Upgraded Facility",
  "screen_title": "Facility built or upgraded at {site_name}",
  "depends_on": ["FLOW-04"],
  "sections": [
    {
      "section_id": "A",
      "section_name": "Facility",
      "fields": [
        { "field_id": "facility_type", "label": "Facility type", "type": "select", "required": true, "options": ["exchange", "clearing_house", "registry", "data_platform", "school", "clinic", "warehouse", "other"] },
        { "field_id": "facility_capacity", "label": "Capacity (if applicable)", "type": "number", "required": false, "min": 0 },
        { "field_id": "facility_capacity_unit", "label": "Capacity unit", "type": "text", "required": false },
        { "field_id": "commissioning_date", "label": "Commissioning date", "type": "date", "required": true }
      ]
    },
    {
      "section_id": "B",
      "section_name": "Who benefits",
      "fields": [
        {
          "field_id": "beneficiary_types",
          "label": "Who benefits from this facility?",
          "type": "multi_select_checkbox",
          "required": true,
          "options": [
            { "value": "residents_households", "label": "Residents / households" },
            { "value": "students", "label": "Students" },
            { "value": "patients", "label": "Patients" },
            { "value": "businesses", "label": "Businesses" },
            { "value": "public", "label": "General public" },
            { "value": "other", "label": "Other (describe)", "free_text": true }
          ]
        }
      ]
    },
    {
      "section_id": "C",
      "section_name": "Beneficiary counts",
      "fields_revealed_by": "beneficiary_types",
      "conditional_fields": [
        { "condition": "beneficiary_types CONTAINS 'residents_households'", "fields": [{ "field_id": "households_count", "label": "Number of households", "type": "number", "required": true, "min": 0 }, { "field_id": "residents_count", "label": "Number of residents", "type": "number", "required": true, "min": 0 }] },
        { "condition": "beneficiary_types CONTAINS 'students'", "fields": [{ "field_id": "students_count", "label": "Number of students", "type": "number", "required": true, "min": 0 }] },
        { "condition": "beneficiary_types CONTAINS 'patients'", "fields": [{ "field_id": "patients_count", "label": "Number of patients", "type": "number", "required": true, "min": 0 }] },
        { "condition": "beneficiary_types CONTAINS 'businesses'", "fields": [{ "field_id": "businesses_count", "label": "Number of businesses", "type": "number", "required": true, "min": 0 }] },
        { "condition": "beneficiary_types CONTAINS 'public'", "fields": [{ "field_id": "public_count", "label": "Number of people", "type": "number", "required": true, "min": 0 }] },
        { "condition": "beneficiary_types CONTAINS 'other'", "fields": [{ "field_id": "other_beneficiary_description", "label": "Describe", "type": "text", "required": true }, { "field_id": "other_beneficiary_count", "label": "Number", "type": "number", "required": true, "min": 0 }] }
      ]
    },
    {
      "section_id": "D",
      "section_name": "Jobs (full disaggregation — required)",
      "fields": [
        { "field_id": "total_jobs_fte", "label": "Total jobs created (FTE)", "type": "number", "required": true, "min": 0 },
        { "field_id": "direct_jobs_fte", "label": "Direct jobs (FTE)", "type": "number", "required": true, "min": 0 },
        { "field_id": "indirect_jobs_fte", "label": "Indirect jobs (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "permanent_jobs_fte", "label": "Permanent jobs (FTE)", "type": "number", "required": true, "min": 0 },
        { "field_id": "temporary_jobs_fte", "label": "Temporary jobs (FTE)", "type": "number", "required": true, "min": 0 },
        { "field_id": "female_jobs_fte", "label": "Female jobs (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "youth_jobs_fte", "label": "Youth jobs (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "green_jobs_fte", "label": "Green jobs (FTE)", "type": "number", "required": false, "min": 0 }
      ]
    },
    {
      "section_id": "E",
      "section_name": "Finance",
      "fields": [{ "field_id": "capital_mobilised_gbp", "label": "Capital mobilised (GBP)", "type": "number", "required": false, "min": 0 }]
    },
    {
      "section_id": "F",
      "section_name": "Location",
      "logic": { "if_record_level": "site", "action": "inherit_from_site" },
      "conditional_fields": [
        { "condition": "record_level = 'project'", "fields": [{ "field_id": "project_geometry", "label": "Project footprint", "type": "map_polygon_or_admin", "required": true }, { "field_id": "project_precision", "label": "Precision", "type": "select", "required": true, "options": ["P6"] }] },
        { "condition": "record_level = 'programme'", "fields": [{ "field_id": "programme_countries", "label": "Countries", "type": "multi_select_country", "required": true }, { "field_id": "programme_precision", "label": "Precision", "type": "select", "required": true, "options": ["P7"] }] }
      ]
    },
    {
      "section_id": "G",
      "section_name": "Linking",
      "fields": [{ "field_id": "linked_outcome_ids", "label": "What change did this produce?", "type": "multi_select_from_existing", "required": false, "options_source": "outcomes_already_reported_in_project", "escape_options": [{ "value": "too_early", "label": "Too early" }, { "value": "dont_know", "label": "Don't know" }] }]
    }
  ],
  "on_continue": { "action": "save_activity_record", "next_flow": "FLOW-06" },
  "validation": [
    { "rule_id": "R1", "rule": "direct + indirect ≤ total jobs", "severity": "hard" },
    { "rule_id": "R1b", "rule": "permanent + temporary = total jobs", "severity": "hard" },
    { "rule_id": "R8", "rule": "capacity needs an asset", "severity": "hard" }
  ]
}

{
  "flow_id": "FLOW-05F",
  "step": 5,
  "name": "Delivered Training / Capacity Building",
  "screen_title": "Training delivered at {site_name}",
  "depends_on": ["FLOW-04"],
  "sections": [
    {
      "section_id": "A",
      "section_name": "Training",
      "fields": [
        { "field_id": "training_type", "label": "Training type", "type": "text", "required": true },
        { "field_id": "training_duration_days", "label": "Duration (days)", "type": "number", "required": false, "min": 0 },
        { "field_id": "session_count", "label": "Number of sessions", "type": "number", "required": false, "min": 0 }
      ]
    },
    {
      "section_id": "B",
      "section_name": "Who benefits",
      "fields": [
        {
          "field_id": "beneficiary_types",
          "label": "Who was trained?",
          "type": "multi_select_checkbox",
          "required": true,
          "options": [
            { "value": "institutions", "label": "Institutions" },
            { "value": "individuals", "label": "Individuals" },
            { "value": "businesses", "label": "Businesses" },
            { "value": "other", "label": "Other (describe)", "free_text": true }
          ]
        }
      ]
    },
    {
      "section_id": "C",
      "section_name": "Beneficiary counts",
      "fields_revealed_by": "beneficiary_types",
      "conditional_fields": [
        { "condition": "beneficiary_types CONTAINS 'institutions'", "fields": [{ "field_id": "institutions_count", "label": "Number of institutions reached", "type": "number", "required": true, "min": 0 }, { "field_id": "institution_type", "label": "Institution type", "type": "select", "required": true, "options": ["bank", "regulator", "mfi", "other"] }] },
        { "condition": "beneficiary_types CONTAINS 'individuals'", "fields": [{ "field_id": "people_trained_count", "label": "Number of people trained", "type": "number", "required": true, "min": 0 }, { "field_id": "female_trained_count", "label": "Of which female", "type": "number", "required": false, "min": 0 }] },
        { "condition": "beneficiary_types CONTAINS 'businesses'", "fields": [{ "field_id": "businesses_count", "label": "Number of businesses", "type": "number", "required": true, "min": 0 }] },
        { "condition": "beneficiary_types CONTAINS 'other'", "fields": [{ "field_id": "other_beneficiary_description", "label": "Describe", "type": "text", "required": true }, { "field_id": "other_beneficiary_count", "label": "Number", "type": "number", "required": true, "min": 0 }] }
      ]
    },
    {
      "section_id": "D",
      "section_name": "Jobs (if training led to jobs)",
      "fields": [
        { "field_id": "total_jobs_fte", "label": "Total jobs created (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "direct_jobs_fte", "label": "Direct jobs (FTE)", "type": "number", "required": true, "min": 0, "condition": "total_jobs_fte > 0" },
        { "field_id": "indirect_jobs_fte", "label": "Indirect jobs (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "permanent_jobs_fte", "label": "Permanent jobs (FTE)", "type": "number", "required": true, "min": 0, "condition": "total_jobs_fte > 0" },
        { "field_id": "temporary_jobs_fte", "label": "Temporary jobs (FTE)", "type": "number", "required": true, "min": 0, "condition": "total_jobs_fte > 0" },
        { "field_id": "female_jobs_fte", "label": "Female jobs (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "youth_jobs_fte", "label": "Youth jobs (FTE)", "type": "number", "required": false, "min": 0 },
        { "field_id": "green_jobs_fte", "label": "Green jobs (FTE)", "type": "number", "required": false, "min": 0 }
      ]
    },
    {
      "section_id": "E",
      "section_name": "Location",
      "logic": { "if_record_level": "site", "action": "inherit_from_site" },
      "conditional_fields": [
        { "condition": "record_level = 'cluster'", "fields": [{ "field_id": "cluster_geometry", "label": "Cluster location", "type": "map_pin_or_polygon_or_admin", "required": true }, { "field_id": "cluster_precision", "label": "Precision", "type": "select", "required": true, "options": ["P3", "P4", "P5"] }] },
        { "condition": "record_level = 'programme'", "fields": [{ "field_id": "programme_countries", "label": "Countries", "type": "multi_select_country", "required": true }, { "field_id": "programme_precision", "label": "Precision", "type": "select", "required": true, "options": ["P7"] }] }
      ]
    },
    {
      "section_id": "F",
      "section_name": "Linking",
      "fields": [{ "field_id": "linked_outcome_ids", "label": "What change did this produce?", "type": "multi_select_from_existing", "required": false, "options_source": "outcomes_already_reported_in_project", "escape_options": [{ "value": "too_early", "label": "Too early" }, { "value": "dont_know", "label": "Don't know" }] }]
    }
  ],
  "on_continue": { "action": "save_activity_record", "next_flow": "FLOW-06" },
  "validation": [
    { "rule_id": "R1", "rule": "direct + indirect ≤ total jobs", "severity": "hard" },
    { "rule_id": "R1b", "rule": "permanent + temporary = total jobs", "severity": "hard" },
    { "rule_id": "R9", "rule": "reach needs an intervention", "severity": "hard" }
  ]
}

{
  "flow_id": "FLOW-05G",
  "step": 5,
  "name": "Other Activity",
  "screen_title": "Describe what happened at {site_name}",
  "depends_on": ["FLOW-04"],
  "sections": [
    {
      "section_id": "A",
      "section_name": "Description",
      "fields": [
        { "field_id": "activity_description", "label": "Describe what you did", "type": "textarea", "required": true },
        { "field_id": "indicators_affected", "label": "Which indicators does this activity affect?", "type": "multi_select", "required": true, "options_source": "all_22_indicators" }
      ]
    },
    {
      "section_id": "B",
      "section_name": "Standard questions",
      "logic": "for each selected indicator, show its standard question set — capacity, who benefits, beneficiary counts, jobs, finance, location, linking"
    }
  ],
  "on_continue": { "action": "save_activity_record", "next_flow": "FLOW-06" },
  "validation": [
    { "rule": "all selected indicators must pass their own validation rules", "severity": "hard" }
  ]
}

{
  "flow_id": "FLOW-06",
  "step": 6,
  "name": "Add Another Activity",
  "screen_title": "Did you do anything else at {site_name}?",
  "screen_type": "binary_choice",
  "depends_on": ["FLOW-05A", "FLOW-05B", "FLOW-05C", "FLOW-05D", "FLOW-05E", "FLOW-05F", "FLOW-05G"],
  "options": [
    { "value": "yes", "label": "Yes, add another activity at this site", "next_flow": "FLOW-04" },
    { "value": "no", "label": "No, I'm done with this site", "next_flow": "FLOW-07" }
  ]
}

{
  "flow_id": "FLOW-07",
  "step": 7,
  "name": "Add Another Site",
  "screen_title": "Are there other sites in {project_name} to report on?",
  "screen_type": "binary_choice",
  "depends_on": ["FLOW-06"],
  "options": [
    { "value": "yes", "label": "Yes, add another site", "next_flow": "FLOW-03" },
    { "value": "no", "label": "No, I'm done with this project", "next_flow": "FLOW-08" }
  ]
}