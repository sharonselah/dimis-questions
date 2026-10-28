// Photos, flags and icons. Photos give the form its colour, as in Aluta: chrome stays brand
// green, colour comes from content. Photos are from Wikimedia Commons (licences and links in
// images/CREDITS.md); flags are from flagcdn.com, stored in images/flags.

const PHOTOS = {
  "tea-kiambu":    { src: "images/tea-kiambu.jpg",    credit: "Cmwaura, CC BY-SA 4.0" },
  "tea-pickers":   { src: "images/tea-pickers.jpg",   credit: "Josep M. Gracia, CC BY-SA 4.0" },
  "tea-tigoni":    { src: "images/tea-tigoni.jpg",    credit: "Cmwaura, CC BY-SA 4.0" },
  "tea-farm":      { src: "images/tea-farm.jpg",      credit: "SeanTwice, CC0" },
  aerial:          { src: "images/aerial.jpg",        credit: "Hansueli Krapf, CC BY-SA 3.0" },
  "women-farmers": { src: "images/women-farmers.jpg", credit: "McKay Savage, CC BY 2.0" },
  "young-farmers": { src: "images/young-farmers.jpg", credit: "USAID in Africa, public domain" },
  "solar-install": { src: "images/solar-install.jpg", credit: "PowerAfricaSolar, CC BY-SA 4.0" },
  "solar-lamp":    { src: "images/solar-lamp.jpg",    credit: "Patrick Bentley, CC BY 2.0" },
  seedlings:       { src: "images/seedlings.jpg",     credit: "NigerianScribe, CC0" },
  "savings-group": { src: "images/savings-group.jpg", credit: "Mycmain, CC BY-SA 4.0" },
  "health-centre": { src: "images/health-centre.jpg", credit: "B722N, CC BY-SA 4.0" },
  training:        { src: "images/training.jpg",      credit: "CCAFS, CC BY 2.0" },
};

// Banner photo for each screen.
const SCREEN_PHOTO = {
  "FLOW-01": "tea-kiambu",
  "FLOW-01B": "tea-pickers",
  "FLOW-02": "tea-tigoni",
  "FLOW-03": "aerial",
  "FLOW-04": "women-farmers",
  "FLOW-05A": "solar-install",
  "FLOW-05B": "solar-lamp",
  "FLOW-05C": "seedlings",
  "FLOW-05D": "savings-group",
  "FLOW-05E": "health-centre",
  "FLOW-05F": "training",
  "FLOW-05G": "young-farmers",
  "FLOW-06": "tea-farm",
};

// Card photos, by option value: interventions, projects, site types and activities.
// Cards without one get an orb instead (see cardArt in app.js).
const OPTION_PHOTO = {
  SPARK: "solar-install",
  GROW: "women-farmers",
  "SPARK-001": "solar-install",
  "SPARK-002": "health-centre",
  "GROW-004": "seedlings",
  rooftop_solar: "solar-install",
  ground_mounted_solar: "solar-install",
  mini_grid: "solar-lamp",
  off_grid_system: "solar-lamp",
  hospital: "health-centre",
  farm_plot: "young-farmers",
  farmer_cluster: "women-farmers",
  nursery: "seedlings",
  installed_renewable_energy_capacity: "solar-install",
  provided_energy_access: "solar-lamp",
  distributed_seedlings_inputs: "seedlings",
  provided_finance: "savings-group",
  built_upgraded_facility: "health-centre",
  delivered_training: "training",
  other: "young-farmers",
};

// Existing sites are matched by their type.
function photoFor(option) {
  const site = MOCK.sites.find((s) => s.id === option.value);
  return PHOTOS[OPTION_PHOTO[option.value] ?? OPTION_PHOTO[site?.type]];
}

// ISO 3166 codes for the flags in images/flags.
const COUNTRY_CODES = {
  "Algeria": "dz", "Angola": "ao", "Benin": "bj", "Botswana": "bw", "Burkina Faso": "bf", "Burundi": "bi",
  "Cabo Verde": "cv", "Cameroon": "cm", "Central African Republic": "cf", "Chad": "td", "Comoros": "km",
  "Congo": "cg", "Côte d'Ivoire": "ci", "Democratic Republic of the Congo": "cd", "Djibouti": "dj", "Egypt": "eg",
  "Equatorial Guinea": "gq", "Eritrea": "er", "Eswatini": "sz", "Ethiopia": "et", "Gabon": "ga", "Gambia": "gm",
  "Ghana": "gh", "Guinea": "gn", "Guinea-Bissau": "gw", "Kenya": "ke", "Lesotho": "ls", "Liberia": "lr",
  "Libya": "ly", "Madagascar": "mg", "Malawi": "mw", "Mali": "ml", "Mauritania": "mr", "Mauritius": "mu",
  "Morocco": "ma", "Mozambique": "mz", "Namibia": "na", "Niger": "ne", "Nigeria": "ng", "Rwanda": "rw",
  "São Tomé and Príncipe": "st", "Senegal": "sn", "Seychelles": "sc", "Sierra Leone": "sl", "Somalia": "so",
  "South Africa": "za", "South Sudan": "ss", "Sudan": "sd", "Tanzania": "tz", "Togo": "tg", "Tunisia": "tn",
  "Uganda": "ug", "Zambia": "zm", "Zimbabwe": "zw",
};
const flagSrc = (country) => COUNTRY_CODES[country] && `images/flags/${COUNTRY_CODES[country]}.svg`;

// Lucide icons (stroke 1.75) for chip options, by option value.
const OPTION_ICON = {
  carbon: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  nature: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  energy: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  gender: '<circle cx="12" cy="9" r="6"/><path d="M12 15v7"/><path d="M9 19h6"/>',
  finance: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',
};
const iconUrl = (paths) => `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`)}")`;
