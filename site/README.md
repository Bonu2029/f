# [Company Name] — Windows & Doors website

A responsive React + Vite site with Framer Motion scroll choreography and an interactive **Measure & Estimate** tool.

```bash
npm install
npm run dev      # local preview
npm run build    # production build → dist/
npm test         # estimate + perspective-geometry unit tests
```

## Where to edit

| What | File |
|---|---|
| Company name, phone, email, service areas, form endpoints | `src/config/company.js` |
| **Demo pricing** (every estimator rate) | `src/config/pricing.js` — set `isDemo: false` once real rates are in |
| Image slots (add photos here) | `src/config/images.js` (see `IMAGE_PROMPTS.md`) |

## Structure

- `src/sections/` — homepage sections (hero, services story, craftsmanship sticky, restoration + before/after, showroom, measurement preview, services index, gallery, FAQ/areas, forms, closing)
- `src/estimator/` — guided estimate flow, corner annotator, camera capture, example demo
- `src/lib/geometry.js` — homography-based perspective correction (photo + known-size reference)
- `src/lib/estimate.js` — pricing engine that reads only from `config/pricing.js`
- `src/components/ImageSlot.jsx` — renders a configured photo or a labeled placeholder

## Measurement honesty

- Four points on a photo are **never** converted to dimensions by themselves.
- **Photo + reference:** the customer marks the opening and a known-size object (US Letter, A4 or a custom size) lying flat in the same plane. A homography maps both into real units, and the site warns when opposite edges disagree.
- **Manual:** the customer marks the photo for reference and types their tape measurements.
- **AR:** WebXR support is detected and reported, but a live AR measuring session is not implemented yet (see the production notes).
- **"Try an Example"** uses a synthetic photo with known geometry and is labeled as a demonstration throughout.
