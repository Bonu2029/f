# Lumina Dental Studio — clinic website

A single-page, static website for a modern dental clinic. Bright white, soft light blue
accents, warm neutral details, rounded cards, subtle shadows and restrained animation.

No build step and no dependencies — open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
```

## Structure

```
index.html            all page content
assets/css/styles.css design tokens, layout, responsive rules
assets/js/main.js     reveal-on-scroll, parallax, before/after slider, booking form
assets/img/           photography
```

## Sections

Hero · Services & prices · Why choose us · About · Before & after · Patient reviews ·
Book an appointment · Location · Footer.

## Things you will want to change

| What | Where |
| --- | --- |
| Clinic name, phone, address, hours | `index.html` — search for `Lumina`, `555-0142`, `Harbor Street` |
| Services and prices | `index.html`, the `<div class="cards">` block (and the `<select id="bf-service">` options) |
| Map location | the `<iframe>` in the Location section, plus the `Get directions` link next to it |
| Colours, spacing, radius | the `:root` block at the top of `assets/css/styles.css` |
| Photography | drop replacements into `assets/img/` using the same filenames |

## Booking form

The form validates in the browser and then hands the request off:

- Set `data-endpoint` on `<form id="bookForm">` to a URL that accepts a `POST` with JSON
  (Formspree, Netlify Forms, your own API) and the form submits to it.
- Leave `data-endpoint` empty and it falls back to opening a pre-filled email to the
  address in `data-fallback-email`, so a request is never silently dropped.

Nothing is stored client-side and no payment is taken.

## Images

The clinic photography is supplied by the clinic. The before/after pair is one photograph
with the tooth shade adjusted on the "before" side, so the two frames stay perfectly
aligned in the slider — it is illustrative, and the caption on the page says so. Replace
`smile-before.jpg` / `smile-after.jpg` with real, consented patient photos before going
live.

## Accessibility & motion

Skip link, visible focus rings, labelled form fields with inline errors, keyboard-operable
before/after slider (arrow keys / Home / End), 44px+ touch targets, and a full
`prefers-reduced-motion` opt-out.
