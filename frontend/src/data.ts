import type { FeatureCollection } from 'geojson';

async function fetchGeoJson(url: string): Promise<FeatureCollection> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: HTTP ${res.status}`);
  return res.json();
}

let countriesPromise: Promise<FeatureCollection> | null = null;
let provincesPromise: Promise<FeatureCollection> | null = null;

// Cached after first success; a failure clears the cache so the next
// band entry retries the fetch.
export function loadCountries(): Promise<FeatureCollection> {
  countriesPromise ??= fetchGeoJson('/data/countries.geojson').catch((err) => {
    countriesPromise = null;
    throw err;
  });
  return countriesPromise;
}

export function loadProvinces(): Promise<FeatureCollection> {
  provincesPromise ??= fetchGeoJson('/data/vietnam-34-provinces.geojson').catch((err) => {
    provincesPromise = null;
    throw err;
  });
  return provincesPromise;
}
