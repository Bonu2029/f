import type { City } from "../types";
import { stableId } from "../utils";

/**
 * Markets. Philadelphia is the launch city, but nothing in the codebase
 * assumes it — city is a foreign key on every business, and search always
 * works from a lat/lng plus a radius.
 */
const RAW: Omit<City, "id">[] = [
  {
    slug: "philadelphia",
    name: "Philadelphia",
    state_code: "PA",
    country_code: "US",
    lat: 39.9526,
    lng: -75.1652,
    timezone: "America/New_York",
    is_live: true,
    neighborhoods: [
      "Rittenhouse",
      "Center City",
      "Old City",
      "Northern Liberties",
      "Fishtown",
      "Queen Village",
      "Bella Vista",
      "East Passyunk",
      "Graduate Hospital",
      "Fairmount",
      "University City",
      "Point Breeze",
      "Manayunk",
    ],
  },
  {
    slug: "pittsburgh",
    name: "Pittsburgh",
    state_code: "PA",
    country_code: "US",
    lat: 40.4406,
    lng: -79.9959,
    timezone: "America/New_York",
    is_live: false,
    neighborhoods: ["Shadyside", "Lawrenceville", "Squirrel Hill", "South Side"],
  },
  {
    slug: "brooklyn",
    name: "Brooklyn",
    state_code: "NY",
    country_code: "US",
    lat: 40.6782,
    lng: -73.9442,
    timezone: "America/New_York",
    is_live: false,
    neighborhoods: ["Williamsburg", "Park Slope", "Bushwick", "Bed-Stuy"],
  },
  {
    slug: "austin",
    name: "Austin",
    state_code: "TX",
    country_code: "US",
    lat: 30.2672,
    lng: -97.7431,
    timezone: "America/Chicago",
    is_live: false,
    neighborhoods: ["East Austin", "South Congress", "Hyde Park"],
  },
];

export const CITIES: City[] = RAW.map((c) => ({ ...c, id: stableId("city", c.slug) }));

export const LIVE_CITIES = CITIES.filter((c) => c.is_live);

export function cityBySlug(slug: string): City | undefined {
  return CITIES.find((c) => c.slug === slug);
}

export function cityById(id: string): City | undefined {
  return CITIES.find((c) => c.id === id);
}

export const PHILADELPHIA = CITIES[0];

/** Where a customer starts before granting location access. */
export const DEFAULT_CUSTOMER_LOCATION = {
  label: "Philadelphia, PA",
  lat: 39.9526,
  lng: -75.1652,
  city_id: PHILADELPHIA.id,
};
