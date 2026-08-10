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

--- UPDATE (v14) ---
Five more photos added, each placed where it does work rather than in a gallery:

  showcase-industries.jpg -> banner directly under the existing "Made for every
     business" heading in #examples. Cropped below the poster headline, so the
     six industry cards and their category pills carry the section.

  showcase-menu-demo.jpg  -> the two-step tap demo in the new #destinations
     section. Cropped to the two numbered photo panels; the poster headline and
     the "Slide 9 of 10" deck footer were cut off.

  showcase-directions.jpg -> "Tap for Directions" card in #destinations.
  showcase-smartpage.jpg  -> "Tap for a Smart Page" card in #destinations.
     Both were already clean square product shots and are used uncropped.

  showcase-brand.jpg      -> the new closing call-to-action band above #contact.
     The poster's whole left column (the "Ready to Tap?" headline, the sub copy,
     the non-clickable "Get Started" button and the handwritten note) was painted
     out and the lavender background rebuilt behind it, so the section headline
     and buttons beside it are the real, working ones.

NEW SECTION #destinations ("One tap, any destination") holds the menu demo band
plus a three-card row: Directions, Smart Page, and a "plenty more" card listing
every destination with a Build Your Card button.

NEW CLOSING CTA section (.finale) sits between the FAQ and the contact form.

Same rule as v13 applies throughout: the destination sets the price, the shape
never does.

--- UPDATE (v15) ---
  showcase-howitworks.jpg -> the How It Works section (#how), which is now a
     two-column band: the photo on one side, three steps on the other.

  The photo carries its own "1 Choose a Shape / 2 We Design It / 3 Tap & Open"
  callouts, so the section was rebuilt from four steps to three to match it —
  a page reading "four steps" beside a photo captioned "three simple steps"
  would have contradicted itself. Nothing was dropped: sending your details and
  approving the preview both live in step 2 now.
     Old: Choose your product / Send your details / Approve your design / Receive and tap
     New: Choose a shape / We design it / Tap and open
  Heading changed from "From idea to tap in four steps" to "Three simple steps".

  Painted out of the photo before use: the "AniTap" logo lockup, the "How It
  Works" headline, the "Three simple steps to connect and impress." sub-line and
  the "AniTap | NFC Powered" footer. The three step callouts were kept, since
  the section text is now written to match them.

DEPLOYING: drag the whole anitap-website folder (or unzip anitap-website.zip and
drag the folder inside it) onto netlify.com/drop. index.html must sit at the top
level of what you drop, with assets/ beside it.

--- UPDATE (v16) ---
LUNA ATELIER REMOVED EVERYWHERE. It appeared in ten places; all are now gone.

Deleted assets:
  case-luna.jpg, dest-instagram-square.jpg, dest-instagram-stand.jpg,
  dest-instagram-standard.jpg, showcase-smartpage.jpg, showcase-howitworks.jpg

Replacements:
  PRODUCTS "NFC Business Card" photo  -> case-velvet.jpg (Velvet Bloom)
  PORTFOLIO "Luna Atelier" entry      -> "Ivory Lane Boutique" on ex-ivory.jpg
  dest-instagram-round.jpg            -> Petal & Pine round card (from ex-petal.jpg)
  "Tap for a Smart Page" card         -> dest-profile-standard.jpg (Alex Morgan)
  showcase-social.jpg                 -> recropped below the Luna card, so it now
                                         shows only Olive & Oak (Facebook) and
                                         Paws & Polish (TikTok). Because that crop
                                         also dropped the poster's only Instagram
                                         example, the social panel's photo slot is
                                         now a 3-image grid: the recropped shot
                                         across the top, with the Petal & Pine and
                                         Glow Muse Instagram coasters beneath it.
  How It Works                        -> the photo is gone (Luna was in two of its
                                         three steps and on the phone). The section
                                         is back to a plain three-step grid; the
                                         three steps themselves are unchanged.

*** STILL NEEDED: Instagram destination art for a non-Luna brand in the standard,
square and stand shapes. All four Instagram photos were Luna, and the only other
Instagram cards in the library (Petal & Pine, Glow Muse) are both round. So
DEST_ART_SHAPES.instagram is now ["round"], and picking Instagram on any other
shape shows the builder's "Photo example coming soon for this shape" placeholder.
Drop in dest-instagram-standard.jpg / -square.jpg / -stand.jpg and add those
shapes back to DEST_ART_SHAPES.instagram to close the gap. ***

--- UPDATE (v17) ---
CONTACT DETAILS ADDED. All of them come from one place — the CONTACT object at
the top of the script block:

  const CONTACT={name:"Ani", email:"anitapofficials@gmail.com",
                 phone:"+12678608496", phoneDisplay:"(267) 860-8496"};

Edit that object and the cart, both form buttons and the toast all follow. The
addresses written into the markup (contact section, footer, FAQ) are plain
mailto:/tel: links, so search for the address if you ever change it.

Where it appears:
  - Contact section: three cards (email, call or text, "You'll be talking to:
    Ani"), each a real mailto:/tel: link.
  - Contact section: a "Can't order on the site? Just send a photo." panel
    listing the three things to send — a picture of the product, the design, and
    the quantity — with both contact links.
  - Footer: a Contact column.
  - Cart drawer: the note under Checkout now gives the same photo-order route
    instead of the old developer-facing "connect Stripe" line.
  - FAQ: "What if I can't order on the site?"

TWO DEAD BUTTONS NOW WORK. Both previously did nothing a customer could use:
  - The contact form said "this is a demo form, nothing was sent". Send Message
    and Request a Demo now open the visitor's email app with every field they
    filled in already written into the body, addressed to CONTACT.email.
  - Checkout said "Demo checkout — connect Stripe". It now opens an email
    listing every cart line, the total, and blanks for business name and phone.
  Both are mailto: links, so they need no server. If a visitor has no mail app
  configured nothing opens, which is why the on-screen confirmation and the cart
  note always show the address and phone number as plain readable text too.
  Replace checkout() with Stripe when you're ready; the rest can stay.

--- UPDATE (v18) ---
ONLINE BUYING REMOVED. Nothing on the site takes an order or a payment now;
every path ends in an email to CONTACT.email.

Deleted outright: the header cart button and counter, the whole cart drawer,
the promo-code box (and CONFIG.promo), shipping/subtotal/total cart rows, the
Checkout button, and the JS behind all of it (cart, renderCart, updateCartCount,
updateCartTotals, removeItem, applyPromo, checkout, openCart, closeCart,
isCartOpen). The empty `stripe:""` field on every tier and bundle is gone too.

What replaced it:
  Configurator footer  "Add to Cart" + "Buy Now"  ->  a single "Email This Order"
    button. emailOrder() turns the whole configuration into a message: product,
    shape, destination, finish, quantity, design style, business name, category,
    whatever destination fields were filled in, any add-ons, and the estimated
    total broken into cards + add-ons + shipping.
  Tier cards           "Buy Now"  ->  per-card tiers say "Build Yours" and open
    the configurator; packages and bundles say "Email to Order" and open a
    pre-filled email naming that package and its listed price.
  Header               cart icon  ->  an "Email Us" button. It only fits beside
    nine nav links above 1150px; below that the mobile menu carries Email Us and
    a Call or Text button instead.

Wording that implied instant purchase was changed: "Shop Products" -> "See
Products", "Shop Review/Social Cards" -> "Build Review/Social Cards",
"Customize & Order" -> "Build & Email Order", and the order summary's "Total" is
now "Estimated total" with a note that nothing is charged on the site.

Header note: nav links and the header buttons are now white-space:nowrap, so
they can no longer wrap to two or three lines. To make room for Email Us the
"Contact" link was dropped from the desktop nav (it is still in the mobile menu
and the footer, and the Email Us button covers the same need). The nav-links
breakpoint moved from 1000px to 1099px.

TO SELL ONLINE LATER: re-add a checkout by restoring a payment step on the
configurator footer and the package buttons. Stripe Payment Links remain the
simplest route — one link per package, opened instead of mailTo().
