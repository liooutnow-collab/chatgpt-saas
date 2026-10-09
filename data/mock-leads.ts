import { Lead } from "@/lib/providers/types";

/**
 * Fictional businesses for demo purposes.
 * All data is simulated — no real personal or business information.
 */

const CITIES: Record<string, { country: string; lat: number; lng: number }> = {
  Dhaka: { country: "Bangladesh", lat: 23.8103, lng: 90.4125 },
  Chittagong: { country: "Bangladesh", lat: 22.3569, lng: 91.7832 },
  Sylhet: { country: "Bangladesh", lat: 24.8949, lng: 91.8687 },
  Khulna: { country: "Bangladesh", lat: 22.8456, lng: 89.5403 },
  Rajshahi: { country: "Bangladesh", lat: 24.3745, lng: 88.6042 },
  "New York": { country: "United States", lat: 40.7128, lng: -74.006 },
  London: { country: "United Kingdom", lat: 51.5074, lng: -0.1278 },
  Dubai: { country: "United Arab Emirates", lat: 25.2048, lng: 55.2708 },
};

function makeLead(
  id: string,
  name: string,
  type: string,
  city: string,
  website: string | null,
  phone: string | null,
  address: string,
  rating: number | null = null,
  reviews: number | null = null
): Lead {
  const loc = CITIES[city] || CITIES.Dhaka;
  const hasWebsite = !!website;
  const hasPhone = !!phone;
  let websiteQuality: Lead["websiteQuality"] = "unknown";
  if (hasWebsite) {
    websiteQuality = Math.random() > 0.3 ? "good" : "needs_improvement";
  }
  return {
    id,
    businessName: name,
    businessType: type,
    website,
    phone,
    address,
    city,
    country: loc.country,
    source: "Mock Business Directory",
    sourceId: `mock_${id}`,
    latitude: loc.lat + (Math.random() - 0.5) * 0.05,
    longitude: loc.lng + (Math.random() - 0.5) * 0.05,
    hasWebsite,
    hasPhone,
    rating,
    reviewCount: reviews,
    websiteQuality,
  };
}

/** Generate a pool of mock leads per type/city combination */
function generatePool(): Lead[] {
  const leads: Lead[] = [];
  let counter = 1;

  const dentistNames = [
    "Smile Dental Care",
    "Bright Smile Clinic",
    "City Dental Hub",
    "Pearl Dental Studio",
    "Family Dentistry Plus",
    "Elite Orthodontics",
    "Gentle Care Dentists",
    "Modern Dental Works",
    "Horizon Dental",
    "Apex Oral Care",
    "White Pearl Clinic",
    "Dental Harmony",
    "Prime Teeth Care",
    "Serenity Dental",
    "Urban Smile Lab",
    "CareFirst Dental",
    "Radiant Dental",
    "Trust Dental Group",
    "Nova Dental Center",
    "Legacy Dental",
  ];

  const restaurantNames = [
    "Spice Route Kitchen",
    "Garden Table Bistro",
    "Riverfront Grill",
    "Golden Spoon",
    "Urban Plate",
    "Heritage Kitchen",
    "Lotus Leaf Cafe",
    "Fire & Stone",
    "Blue Lagoon Seafood",
    "The Local Pantry",
    "Saffron House",
    "Midnight Bites",
    "Oak & Ember",
    "Citrus Grove",
    "Bamboo Garden",
    "The Copper Pot",
    "Harvest Moon",
    "Street Cart Kitchen",
    "Pearl Harbor Diner",
    "Meadow Table",
  ];

  const gymNames = [
    "Iron Forge Fitness",
    "Peak Performance Gym",
    "Core Strength Studio",
    "Flex Zone",
    "PowerHouse Training",
    "Elevate Fitness",
    "Pulse Athletic Club",
    "BodyForge",
    "Apex Strength",
    "Vitality Gym",
    "Momentum Fitness",
    "Titan Training Center",
    "Form & Function",
    "Beast Mode Gym",
    "Harmony Wellness",
    "Stride Fitness",
    "Forge Athletic",
    "Summit Strength",
    "Ignite Gym",
    "Balance Fitness Hub",
  ];

  const cafeNames = [
    "Brew & Leaf",
    "Morning Ritual Coffee",
    "The Daily Grind",
    "Cloud Nine Cafe",
    "Bean & Bloom",
    "Roast House",
    "Whispering Beans",
    "Cafe Lumen",
    "Steam & Story",
    "Amber Cup",
    "The Quiet Corner",
    "Sunrise Sip",
    "Velvet Roast",
    "Paper Cup Cafe",
    "Harbor Brew",
    "Moss & Mocha",
    "Frame Coffee",
    "Lumina Cafe",
    "Nest Coffee Bar",
    "Copper Kettle",
  ];

  const hotelNames = [
    "Grand Horizon Hotel",
    "Cityscape Inn",
    "Riverside Lodge",
    "Pearl Palace Hotel",
    "Skyline Suites",
    "Garden View Hotel",
    "The Metropolitan",
    "Harbor Lights Hotel",
    "Emerald Stay",
    "Summit Residences",
    "Lakeside Retreat",
    "Urban Nest Hotel",
    "Crown Plaza Local",
    "Serenity Inn",
    "Blue Orchid Hotel",
    "Landmark Suites",
    "The Courtyard",
    "Vista Grand",
    "Amber Hotel",
    "Nexus Stay",
  ];

  const realEstateNames = [
    "Horizon Realty Group",
    "Prime Property Partners",
    "Urban Nest Realty",
    "Legacy Homes Agency",
    "Skyline Estates",
    "Trust Homes Realty",
    "Apex Property Group",
    "Garden City Realty",
    "Metro Housing Solutions",
    "Pearl Estates",
    "Summit Realty Partners",
    "Cityscape Properties",
    "Heritage Homes Agency",
    "Nova Realty",
    "Landmark Property Co",
    "Greenfield Realty",
    "Cornerstone Homes",
    "Vista Property Group",
    "Elite Estates",
    "Bridge Realty",
  ];

  const typeMap: Record<string, string[]> = {
    Dentist: dentistNames,
    Restaurant: restaurantNames,
    Gym: gymNames,
    Cafe: cafeNames,
    Hotel: hotelNames,
    "Real Estate Agency": realEstateNames,
  };

  const cities = Object.keys(CITIES);
  const streets = [
    "Main Street",
    "Park Avenue",
    "Lake Road",
    "Commerce Street",
    "Garden Lane",
    "Station Road",
    "University Avenue",
    "Market Square",
    "River Walk",
    "Hill View Road",
  ];

  for (const [type, names] of Object.entries(typeMap)) {
    for (const city of cities) {
      for (let i = 0; i < names.length; i++) {
        const name = `${names[i]} ${city !== "Dhaka" ? city : ""}`.trim();
        const hasSite = Math.random() > 0.15;
        const hasPhone = Math.random() > 0.25;
        const website = hasSite
          ? `${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example`
          : null;
        const phone = hasPhone
          ? `+880 ${Math.floor(100 + Math.random() * 900)} ${Math.floor(
              100 + Math.random() * 900
            )} ${Math.floor(100 + Math.random() * 900)}`
          : null;
        const street = streets[i % streets.length];
        const rating =
          Math.random() > 0.2
            ? Math.round((3.5 + Math.random() * 1.5) * 10) / 10
            : null;
        const reviews =
          rating !== null ? Math.floor(10 + Math.random() * 200) : null;

        leads.push(
          makeLead(
            `lead_${counter++}`,
            name,
            type,
            city,
            website,
            phone,
            `${10 + i} ${street}, ${city}`,
            rating,
            reviews
          )
        );
      }
    }
  }

  // Custom / generic fallbacks
  for (let i = 0; i < 40; i++) {
    const city = cities[i % cities.length];
    leads.push(
      makeLead(
        `lead_${counter++}`,
        `Local Business ${i + 1}`,
        "Custom",
        city,
        Math.random() > 0.3 ? `localbiz${i + 1}.example` : null,
        Math.random() > 0.3
          ? `+880 ${Math.floor(100 + Math.random() * 900)} XXX XXX`
          : null,
        `${20 + i} Commerce Street, ${city}`
      )
    );
  }

  return leads;
}

export const MOCK_LEADS: Lead[] = generatePool();

export function filterMockLeads(
  businessType: string,
  location: string,
  limit: number,
  offset = 0
): Lead[] {
  const locLower = location.toLowerCase();
  const typeLower = businessType.toLowerCase();

  let filtered = MOCK_LEADS.filter((lead) => {
    const typeMatch =
      lead.businessType.toLowerCase() === typeLower ||
      lead.businessType.toLowerCase().includes(typeLower);

    const locMatch =
      lead.city.toLowerCase().includes(locLower) ||
      lead.country.toLowerCase().includes(locLower) ||
      lead.address.toLowerCase().includes(locLower) ||
      locLower.includes(lead.city.toLowerCase());

    return typeMatch && locMatch;
  });

  // Deterministic shuffle based on type+location so same search feels consistent
  const seed = (businessType + location).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  filtered = [...filtered].sort((a, b) => {
    const ha = (a.id.charCodeAt(5) + seed) % 100;
    const hb = (b.id.charCodeAt(5) + seed) % 100;
    return ha - hb;
  });

  return filtered.slice(offset, offset + limit);
}
