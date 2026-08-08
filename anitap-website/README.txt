AniTap website — V2 (indigo)

- index.html : the site. Open in any browser.
- assets/    : photos, textures, shape/material shots, industry examples, destination designs.

DEPLOY: drag this folder onto netlify.com/drop (free, ~30 seconds).
EDIT: open index.html and search for:
  "const CONFIG"    -> prices, shapes, materials, quantities, destinations
  "const EXAMPLES"  -> the 20 industry example cards
  "const DEST_ART"  -> which destinations have designed artwork

DESTINATION ART: Instagram, Facebook, TikTok and Google Reviews have designed
examples in all 4 shapes (assets/dest-<key>-<shape>.jpg). To add art for another
destination, drop in 4 images and add a line to DEST_ART.

Countertop Stand supports 5 finishes; Brushed Gold unlocks once you add
assets/shape-stand-gold.jpg and delete the "materials:[...]" line on the stand entry.

Checkout is demo-only until connected to Stripe.

--- UPDATE (v6) ---
Customizer flow is now: Product > Shape > Destination > Material > Quantity > Logo & Details > Review Order.
Destination is a photo-card grid (4 / 2 / 1 per row) with name, description, Select button and checkmark.
Images use object-fit: contain and are never cropped. Material is locked until a destination is picked.
19 new example photos added as assets/dest-<destination>-<shape>.jpg
  standard: website, menu, booking, directions, phone, email, whatsapp, profile
  stand:    website, menu, booking, directions, phone, email, whatsapp, profile
  square:   website, menu, phone
  round:    website, menu, booking, directions, phone, email, whatsapp, profile
  All 8 destinations x 4 shapes = 32 example photos, complete.
Add-on services and their prices in the ADDONS object are placeholders - set your real prices there.

--- UPDATE (v9) ---
New "Custom Design" section appears automatically inside the builder when the
Google Reviews destination is selected (business product only). Single Harbor
Nails example image at assets/custom-design-example.jpg, shown uncropped, never
a gallery. Includes feature list + request form (business name, logo upload,
review link, up to 3 brand colors or "use my logo colors", card message with
Custom Message text field, design notes). "Save Custom Design Request" stores the
brief; it then shows in the Review box and on the cart line. Cleared on add-to-cart
and when the drawer is reopened.

--- UPDATE (v9) ---
Reverted the separate "Custom Design" section. Google Reviews is now one normal
destination card in "What Should Your Card Open?", promoted into the primary eight
(9th card, before the socials). Preview = Harbor Nails image (assets/dest-reviews-*.jpg,
same image on every shape since the source is a square card). Copy: "Send customers
directly to your Google review page." / button "Select Google Reviews". Reviews-only
fields: Google Review Link + Card Message dropdown (Tap to Review / Leave Us a Review /
We'd Love Your Feedback / Review Us on Google / Custom Message -> text field). Business
name + optional logo come from the shared details step. Order summary shows
"Destination: Google Reviews".

--- UPDATE (v10) ---
Two Google-review options now sit side by side in "What Should Your Card Open?":
  1. "Google Reviews" (label: Google Reviews) - original social-style review art
     (assets/dest-reviews-*.jpg restored from the first build). Desc "Opens your
     Google review page." Button "Select Google Reviews".
  2. "Custom Google Review Card" (label: Custom Review Card) - Harbor Nails image
     (assets/dest-customreview-*.jpg). Button "Select Custom Design". Preview caption:
     "Example custom design only...". Order summary shows Destination: Google Reviews
     AND Design: Custom Design.
Both options ask for: Business Name + Logo (shared details step) and, in the
destination fields, Google Review Link + Optional Design Notes. The Review Link label
has a "How do I find this?" button opening a step-by-step guide popup with a "Got It"
and X close. Helper text under the field: "Paste the direct link customers will use..."

--- UPDATE (v11) ---
Fixed: Custom Google Review Card showed the square image on the standard shape.
Added shape-correct Harbor custom-review images:
  standard = horizontal rectangle card, round = round disc, stand = countertop stand,
  square = original square card. Each shape now shows its matching image.

--- UPDATE (v12) ---
Restyle toward the Apple/Stripe/Linear brief on the EXISTING static site (no Next.js —
that would need a build step, a Node host, Stripe secret keys and a database, none of
which a static file can carry). Changes:
- Palette shifted to the brief's colors: #5B5CEB / #7A6CFF / #A69BFF, softer lavender
  backgrounds, lighter lines.
- New ready-made Pricing tiers + bundles block above the custom configurator, matching
  the brief's exact numbers: Review Cards $5/each, Smart NFC Business Card $25, Complete
  Business Bundle "Starting at $499" flagged MOST POPULAR; bundles Starter $45 / Business
  $100 / Premium $175 / Smart Bundle $65.
- "Buy Now" buttons: each TIER/BUNDLE object has an empty `stripe:` field. Paste a Stripe
  Payment Link URL there (create one per product in your Stripe dashboard) and the button
  sends the customer straight to Stripe checkout. Until a link is set, the button adds the
  bundle to the on-site cart (Review Cards opens the configurator instead). No Stripe keys
  are ever stored in this file — Payment Links are the safe no-code path.

HOW TO GO LIVE WITH PAYMENTS (no coding):
1. Stripe dashboard > Payment Links > create one link per product/bundle above.
2. Copy each link URL.
3. In index.html, find the TIERS and BUNDLES arrays and paste each URL into that item's
   stripe:"" field.
4. Re-upload index.html. Done — Stripe handles checkout, receipts and your orders list.

--- UPDATE (v13) ---
NEW PRICING — Google Review cards and social media cards are $25 per card.
  Google Reviews, Custom Google Review Card, Instagram, TikTok and Facebook are
  priced from CONFIG.premiumPerCard ($25). Every other destination (website,
  menu, booking, directions, phone, email, WhatsApp, smart profile) stays on
  CONFIG.basePerCard ($5). Shape never changes the price — a standard card, a
  rounded square, a round coaster and a tent sign all cost the same. Only the
  finish can add a small upgrade (materials[].adj), unchanged from before.

  CONFIG.quantities no longer store fixed totals. Each row now carries a `mult`
  (the volume multiplier) and the total is computed as base x qty x mult:
      $5  base ->    5 /  25 /  45 /  100 /  175 /   325
      $25 base ->   25 / 125 / 225 /  500 /  875 /  1625
  To change a price, edit basePerCard / premiumPerCard, or a row's `mult`.
  To move a destination between the two prices, add or remove its id from
  CONFIG.premiumDests.

  TIERS is now four cards: Review & Social Cards ($25/card), Standard Tap Cards
  ($5/card), Smart NFC Business Card ($25), Complete Business Bundle ($749).
  BUNDLES repriced to match the $25 card: Starter $225 (10), Business $500 (25),
  Premium $875 (50), Smart Bundle $250 (1 smart + 10 review). Bundles render in
  their own #bundleGrid under a "Ready-made bundles" heading.
  The Stripe Payment Link workflow is unchanged — paste a URL into each item's
  `stripe:` field to send that button straight to Stripe checkout.

  The pricing section's quantity grid has a two-way toggle (Review & Social /
  Standard) so visitors can price either card type without opening the builder.
  The builder shows a live price hint above the quantity chips and a "Card type"
  row in Review Order.

NEW SECTIONS AND IMAGES — four photos added to assets/:
  showcase-shapes.jpg    -> new "Pick your shape" section (#shapes) with the
                            four formats and their real dimensions.
  showcase-finishes.jpg  -> banner at the top of the Materials section.
  showcase-review.jpg    -> "Google Review Cards" panel in the new #tapcards
                            section. The baked-in "Shop Review Products" button
                            was painted out of the photo so the only clickable
                            button on the panel is the real one.
  showcase-social.jpg    -> "Social Media Cards" panel in #tapcards.
  Nav and mobile menu updated with Review & Social and Shapes links.
  Added favicon, Open Graph / Twitter card tags and theme-color.
  Fixed: bundle cards printed "undefined" under the price; the header overflowed
  the viewport below ~400px wide.
