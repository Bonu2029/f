/**
 * COMPANY DETAILS — replace every [bracketed] placeholder before launch.
 * Nothing here is invented: unknown facts stay as visible placeholders.
 */
export const COMPANY = {
  name: "Time & Power",
  shortName: "Time & Power",
  tagline: "Windows & Doors",
  phone: "(267) 939-0320",
  phoneHref: "tel:+12679390320",
  email: "hellousa84@gmail.com",
  emailHref: "mailto:hellousa84@gmail.com",
  address: "60 Platt Pl, Feasterville-Trevose, PA 19053",
  hours: "[Business Hours]",
  license: "Fully licensed", // add PA HIC # / NJ HIC # here when ready,
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
