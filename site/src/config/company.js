/**
 * COMPANY DETAILS — replace every [bracketed] placeholder before launch.
 * Nothing here is invented: unknown facts stay as visible placeholders.
 */
export const COMPANY = {
  name: "[Company Name]",
  shortName: "[Company]",
  tagline: "Windows & Doors",
  phone: "[Phone Number]",
  phoneHref: null, // e.g. "tel:+12155550000" — leave null until supplied
  email: "[Email Address]",
  emailHref: null, // e.g. "mailto:hello@example.com"
  address: "[Business Address]",
  hours: "[Business Hours]",
  license: "[License / Registration Numbers]",
  serviceAreas: {
    "Pennsylvania": ["Philadelphia", "[Add neighborhoods / suburbs]"],
    "New Jersey": ["[Add counties / towns]"],
  },
};

/**
 * FORM CONNECTION — set an endpoint (Formspree, your CRM, a serverless
 * function, etc.). While null, forms never pretend to submit: they show
 * a clear "not connected" notice instead of a success message.
 */
export const FORMS = {
  estimateEndpoint: null,
  showroomEndpoint: null,
  contactEndpoint: null,
};
