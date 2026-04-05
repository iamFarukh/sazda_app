type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
  country_code?: string;
};

type NominatimReverse = {
  display_name?: string;
  address?: NominatimAddress;
};

const UA = 'Sazda/1.0 (prayer times; contact: app@sazda.local)';

/**
 * Reverse geocode coordinates to a short city label (e.g. "London, UK").
 * Uses OpenStreetMap Nominatim; respect their usage policy for production volume.
 */
export async function reverseGeocodeCity(latitude: number, longitude: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
    String(latitude),
  )}&lon=${encodeURIComponent(String(longitude))}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Geocode HTTP ${res.status}`);
  }

  const data = (await res.json()) as NominatimReverse;
  const a = data.address;
  if (!a) {
    return (data.display_name ?? '').split(',').slice(0, 2).join(',').trim() || 'Unknown';
  }

  const place =
    a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? a.state ?? '';
  const country = a.country ?? (a.country_code ? a.country_code.toUpperCase() : '');
  if (place && country) return `${place}, ${country}`;
  if (place) return place;
  if (country) return country;
  return (data.display_name ?? '').split(',').slice(0, 2).join(',').trim() || 'Unknown';
}
