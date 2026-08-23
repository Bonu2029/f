/** Service categories used in sign-up and on the marketing site. */
export const businessTypes = [
  "Plumbing",
  "HVAC",
  "Electrical",
  "Pools & Spas",
  "Appliance Service",
  "Windows & Doors",
  "Roofing",
  "Water Treatment",
  "Solar",
  "Other",
] as const;

export type BusinessType = (typeof businessTypes)[number];

/** The six categories highlighted on the homepage. */
export const featuredCategories = [
  "Plumbing",
  "HVAC",
  "Electrical",
  "Pools",
  "Appliance Service",
  "Windows & Doors",
] as const;
