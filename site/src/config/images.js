/**
 * IMAGE SLOTS — every photo on the site is referenced here by id.
 *
 * To add a real image: drop the file in /public/images and set `src`,
 * e.g. src: "images/hero-interior.jpg". While `src` is null, an elegant
 * labeled placeholder renders in its place.
 *
 * `demo: true` slots are labeled "Demonstration image" on the page until
 * real project photography is supplied. See IMAGE_PROMPTS.md for a
 * generation / art-direction prompt for each slot.
 */
export const IMAGES = {
  heroInterior:     { src: null, alt: "Sunlit living room with tall divided-light windows", art: "window", ratio: "16/9" },
  closing:          { src: null, alt: "Elegant front entrance at dusk with warm interior light", art: "door", ratio: "16/9" },

  svcWindowInstall: { src: null, alt: "Newly installed windows in a bright modern home", art: "window", ratio: "4/5" },
  svcDoorInstall:   { src: null, alt: "Handsome wood entry door with sidelights", art: "door", ratio: "4/5" },
  svcRepair:        { src: null, alt: "Technician adjusting window hardware", art: "detail", ratio: "4/5" },

  craftAppearance:  { src: null, alt: "Close-up of a window sash, trim profile, and paint finish", art: "detail", ratio: "4/5" },
  craftFunction:    { src: null, alt: "Hand operating a smooth casement window crank", art: "window", ratio: "4/5" },
  craftOptions:     { src: null, alt: "Hardware, glass and finish samples laid out on stone", art: "samples", ratio: "4/5" },

  restoreWood:      { src: null, alt: "Close-up of restored old-growth wood window sash", art: "wood", ratio: "3/4" },
  restoreBefore:    { src: null, alt: "Historic window before restoration", art: "window-worn", ratio: "4/3", demo: true },
  restoreAfter:     { src: null, alt: "Historic window after restoration", art: "window", ratio: "4/3", demo: true },

  showroomArrive:   { src: null, alt: "Mobile showroom vehicle parked outside a rowhome", art: "van", ratio: "4/3", demo: true },
  showroomPresent:  { src: null, alt: "Consultant presenting door and window samples", art: "samples", ratio: "4/3", demo: true },
  showroomCompare:  { src: null, alt: "Homeowner comparing finish samples beside their window", art: "detail", ratio: "4/3", demo: true },

  measureWindow:    { src: null, alt: "Window used for the measurement demonstration", art: "window", ratio: "4/3", demo: true },

  gallery1: { src: null, alt: "Project — replacement windows, Philadelphia rowhome", art: "window", ratio: "4/5", demo: true, category: "Windows" },
  gallery2: { src: null, alt: "Project — new entry door", art: "door", ratio: "4/5", demo: true, category: "Doors" },
  gallery3: { src: null, alt: "Project — restored historic sash", art: "wood", ratio: "4/5", demo: true, category: "Restoration" },
  gallery4: { src: null, alt: "Project — patio doors to garden", art: "door", ratio: "4/5", demo: true, category: "Doors" },
  gallery5: { src: null, alt: "Project — bay window", art: "window", ratio: "4/5", demo: true, category: "Windows" },
  gallery6: { src: null, alt: "Project — historic front door restoration", art: "door", ratio: "4/5", demo: true, category: "Restoration" },
};
