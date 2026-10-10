/**
 * DEMO PRICING — every number below is a SAMPLE, not a real company rate.
 * Replace with your own rates. The whole estimator reads only from here.
 * All currency in USD. Sizes are in square feet of opening area.
 */
export const PRICING = {
  isDemo: true, // set false once real rates are entered (removes "Demo pricing" labels)
  rangeSpread: 0.15, // +/- 15% displayed around the calculated midpoint

  services: {
    install: { label: "Installation / replacement", kinds: ["window", "door"] },
    repair: { label: "Repair", kinds: ["window", "door"] },
    restoration: { label: "Historic restoration", kinds: ["window", "door"] },
  },

  // Installation / replacement: base per unit + per sq ft, by product type & material
  install: {
    window: {
      base: 250,
      perSqFt: { vinyl: 38, fiberglass: 58, wood: 72, "aluminum-clad wood": 80 },
      types: { "double-hung": 1, casement: 1.12, sliding: 0.95, picture: 0.9, bay: 1.6, awning: 1.08 },
    },
    door: {
      base: 450,
      perSqFt: { fiberglass: 52, steel: 40, wood: 78, "aluminum-clad wood": 86 },
      types: { entry: 1, "patio sliding": 1.25, french: 1.35, storm: 0.55 },
    },
  },

  glass: {
    window: { standard: 0, "low-e": 4, "triple-pane": 9, "laminated": 7, "obscure / privacy": 3 },
    door: { "none / solid": 0, standard: 0, "low-e": 4, "decorative": 10 },
  },

  addOns: {
    removal: { label: "Remove existing unit", perUnit: 85 },
    disposal: { label: "Haul-away & disposal", perUnit: 40 },
    finishing: {
      label: "Interior finishing",
      options: { none: 0, "trim & caulk": 120, "trim, paint & stain": 260 },
    },
  },

  // Repairs: priced by reported issue, per unit
  repair: {
    window: {
      issues: {
        "Foggy / failed glass seal": [180, 420],
        "Sticking or hard to operate": [120, 300],
        "Broken balance / hardware": [110, 260],
        "Drafts or leaks": [140, 380],
        "Rot or damaged sash": [250, 650],
        "Something else / not sure": null, // null → inspection recommended
      },
    },
    door: {
      issues: {
        "Sticking or misaligned": [140, 320],
        "Lock or hardware problem": [110, 280],
        "Drafts / worn weatherstripping": [120, 260],
        "Damaged frame or threshold": [260, 700],
        "Something else / not sure": null,
      },
    },
  },

  // Historic restoration: per unit range scaled by reported condition
  restoration: {
    window: { range: [650, 1400] },
    door: { range: [1200, 3200] },
    condition: {
      "Good — mostly cosmetic": 0.8,
      "Fair — some rot or loose glazing": 1,
      "Poor — significant deterioration": 1.45,
      "Not sure": null, // null → assessment recommended
    },
    finishing: { "Match existing paint": 0, "Strip & repaint": 180, "Strip & stain / clear coat": 260 },
  },
};
