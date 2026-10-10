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
  heroInterior:     { src: "images/hero-interior.webp", alt: "Sunlit townhouse living room with a tall divided-light window and marble fireplace", art: "window", ratio: "16/9" },
  closing:          { src: "images/closing-entrance.webp", alt: "Elegant front entrance at dusk with warm interior light", art: "door", ratio: "16/9" },

  svcWindowInstall: { src: "images/svc-window-install.webp", alt: "Newly installed windows in a bright modern home", art: "window", ratio: "4/5" },
  svcDoorInstall:   { src: "images/svc-door-install.webp", alt: "Handsome wood entry door with sidelights", art: "door", ratio: "4/5" },
  svcRepair:        { src: "images/svc-repair.webp", alt: "Technician adjusting window hardware", art: "detail", ratio: "4/5" },

  craftAppearance:  { src: "images/craft-appearance.webp", alt: "Close-up of a window sash, trim profile, and paint finish", art: "detail", ratio: "4/5" },
  craftFunction:    { src: "images/craft-function.webp", alt: "Hand operating a smooth casement window crank", art: "window", ratio: "4/5" },
  craftOptions:     { src: "images/craft-options.webp", alt: "Hardware, glass and finish samples laid out on stone", art: "samples", ratio: "4/5" },

  restoreWood:      { src: "images/restore-wood.webp", alt: "Close-up of restored old-growth wood window sash", art: "wood", ratio: "3/4" },
  restoreBefore:    { src: "images/restore-before.webp", alt: "Historic window before restoration", art: "window-worn", ratio: "4/3", demo: true },
  restoreAfter:     { src: "images/restore-after.webp", alt: "Historic window after restoration", art: "window", ratio: "4/3", demo: true },

  showroomArrive:   { src: "images/showroom-arrive.webp", alt: "Mobile showroom vehicle parked outside a rowhome", art: "van", ratio: "4/3", demo: true },
  showroomPresent:  { src: "images/showroom-present.webp", alt: "Consultant presenting door and window samples", art: "samples", ratio: "4/3", demo: true },
  showroomCompare:  { src: "images/showroom-compare.webp", alt: "Homeowner comparing finish samples beside their window", art: "detail", ratio: "4/3", demo: true },

  measureWindow:    { src: "images/measure-window.webp", alt: "Window used for the measurement demonstration", art: "window", ratio: "4/3", demo: true },

  gallery1: { src: "images/gallery-rowhome-windows.webp", alt: "Project — replacement windows, Philadelphia rowhome", art: "window", ratio: "4/3", demo: true, category: "Windows" },
  gallery2: { src: "images/gallery-charcoal-door.webp", alt: "Project — charcoal entry door with transom", art: "door", ratio: "4/3", demo: true, category: "Doors" },
  gallery3: { src: "images/gallery-workshop-sash.webp", alt: "Project — restored historic sash", art: "wood", ratio: "4/3", demo: true, category: "Restoration" },
  gallery4: { src: "images/gallery-patio-doors.webp", alt: "Project — sliding patio doors to a terrace", art: "door", ratio: "4/3", demo: true, category: "Doors" },
  gallery5: { src: "images/gallery-bay-window.webp", alt: "Project — bay window with window seat", art: "window", ratio: "4/3", demo: true, category: "Windows" },
  gallery6: { src: "images/gallery-double-door.webp", alt: "Project — restored historic double front door", art: "door", ratio: "4/3", demo: true, category: "Restoration" },
};
