/**
 * Tiny event bridge so any "Book this" affordance on the page can preselect
 * the booking widget without prop-drilling through every section.
 */

export const BOOKING_EVENT = "ashgrove:book";

export type BookingRequest = {
  serviceId?: string;
  barberId?: string;
};

export const requestBooking = (detail: BookingRequest) => {
  window.dispatchEvent(new CustomEvent<BookingRequest>(BOOKING_EVENT, { detail }));
};

export const onBookingRequest = (handler: (detail: BookingRequest) => void) => {
  const listener = (event: Event) => handler((event as CustomEvent<BookingRequest>).detail ?? {});
  window.addEventListener(BOOKING_EVENT, listener);
  return () => window.removeEventListener(BOOKING_EVENT, listener);
};
