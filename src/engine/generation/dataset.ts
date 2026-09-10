import type { CommerceRecord, Channel, CustomerSegment, Status } from "../contracts/types";
import { CHANNELS, SEGMENTS, STATUSES } from "../contracts/types";
import { mulberry32, seededInt, seededPick, seededWeightedPick, seededFloat } from "./seeded";

// Deterministic dataset generator, versioned.
// Uses integer cents, seasonal patterns, plausible deltas.

const REGION_COUNTRIES: Record<string, string[]> = {
  "North America": ["United States", "Canada", "Mexico"],
  "Europe": ["Germany", "France", "United Kingdom", "Spain", "Italy", "Netherlands"],
  "Asia Pacific": ["Japan", "Australia", "Singapore", "India", "South Korea"],
  "Latin America": ["Brazil", "Mexico", "Argentina", "Chile", "Colombia"],
  "Middle East & Africa": ["United Arab Emirates", "South Africa", "Saudi Arabia", "Egypt"],
};

const CATEGORY_SUBCATEGORY: Record<string, string[]> = {
  "Electronics": ["Phones", "Laptops", "Audio", "Accessories"],
  "Apparel": ["Menswear", "Womenswear", "Footwear", "Outerwear"],
  "Home & Garden": ["Kitchen", "Furniture", "Decor", "Garden"],
  "Sports": ["Fitness", "Outdoor", "Team Sports", "Water Sports"],
  "Beauty": ["Skincare", "Makeup", "Fragrance", "Haircare"],
  "Books": ["Fiction", "Non-Fiction", "Education", "Children"],
};

const PRODUCT_BY_CATEGORY: Record<string, string[]> = {
  "Electronics": ["QuantumPhone X", "Nebula Laptop Pro", "Aero Buds", "Prism Monitor 27\"", "Volt Charger", "Echo Speaker", "Lumen Camera", "Orbit Drone Mini"],
  "Apparel": ["Urban Jacket", "Coast Linen Shirt", "Summit Trail Boots", "Aero Running Tee", "Noir Denim", "Silk Blend Dress", "Heritage Knit", "Pioneer Cap"],
  "Home & Garden": ["Chef Steel Pan", "Oak Dining Chair", "Ceramic Vase Set", "Garden Tool Kit", "Glow Lamp", "Linen Curtains", "Stone Planter", "Aroma Diffuser"],
  "Sports": ["Flex Yoga Mat", "Power Kettlebell", "Trail Backpack", "Carbon Road Bike", "Aqua Goggles", "Striker Football", "Summit Tent", "Pulse Tracker"],
  "Beauty": ["Glow Serum", "Velvet Lipstick", "Desert Oud", "Silk Shampoo", "Mineral Foundation", "Hydra Cream", "Citrus Mist", "Repair Mask"],
  "Books": ["The Prismatic Way", "Atlas of Commerce", "Quiet Analytics", "Deep Workflows", "Designing Data", "The Ledger", "Horizon Essays", "Future Margins"],
};

const CHANNEL_MARGIN_BIAS: Record<Channel, number> = {
  Web: 0.32, Mobile: 0.28, Marketplace: 0.22, Retail: 0.35,
};
const CATEGORY_MARGIN_BIAS: Record<string, number> = {
  "Electronics": 0.28, "Apparel": 0.45, "Home & Garden": 0.38, "Sports": 0.33, "Beauty": 0.52, "Books": 0.40,
};

function dateToISO(d: Date) { return d.toISOString().slice(0,10); }
function parseISO(s: string) { return new Date(s + "T12:00:00Z"); }

export const GENERATOR_VERSION = "v2-mulberry-100k-36mo";
export const DEMO_SEED = 0x50524953; // "PRIS"

export function generateCommerceRecords(count: number, seed = DEMO_SEED): CommerceRecord[] {
  const rand = mulberry32(seed);
  const start = new Date("2022-01-01T00:00:00Z");
  const end = new Date("2024-12-31T00:00:00Z");
  const dayCount = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;

  const records: CommerceRecord[] = [];

  // Precompute seasonal multiplier by month
  const monthMultiplier = [0.92,0.88,0.95,0.98,1.02,0.90,0.88,0.93,1.05,1.12,1.28,1.35]; // Jan-Dec

  for (let i=0;i<count;i++) {
    // Date with seasonal bias: pick day weighted by month multiplier
    // Do uniform plus small seasonal weighting via rejection sampling simplified:
    let dayOffset: number;
    if (rand() < 0.78) {
      // uniform
      dayOffset = seededInt(rand, 0, dayCount-1);
    } else {
      // bias toward Q4
      const biasedMonth = seededWeightedPick(rand, monthMultiplier.map((m, idx): [number, number] => [idx, m]));
      const monthStart = new Date(Date.UTC(2022 + Math.floor(biasedMonth/12), biasedMonth%12, 1));
      // map biased month to random year
      const year = seededInt(rand, 2022, 2024);
      const m = biasedMonth % 12;
      const dim = new Date(Date.UTC(year, m+1, 0)).getUTCDate();
      const day = seededInt(rand, 1, dim);
      const d = new Date(Date.UTC(year, m, day));
      dayOffset = Math.floor((d.getTime() - start.getTime())/86400000);
      dayOffset = Math.max(0, Math.min(dayCount-1, dayOffset));
    }
    const d = new Date(start.getTime() + dayOffset*86400000);
    const orderDate = dateToISO(d);
    const monthIdx = d.getUTCMonth();
    const seasonalMult = monthMultiplier[monthIdx]!;

    const region = seededPick(rand, Object.keys(REGION_COUNTRIES));
    const country = seededPick(rand, REGION_COUNTRIES[region]!);
    const category = seededPick(rand, Object.keys(CATEGORY_SUBCATEGORY));
    const subcategory = seededPick(rand, CATEGORY_SUBCATEGORY[category]!);
    const productName = seededPick(rand, PRODUCT_BY_CATEGORY[category]!);

    const channel = seededWeightedPick<Channel>(rand, [
      ["Web", 34], ["Mobile", 28], ["Marketplace", 22], ["Retail", 16]
    ]);
    const customerSegment = seededWeightedPick<CustomerSegment>(rand, [
      ["Consumer", 55], ["Small Business", 28], ["Enterprise", 17]
    ]);
    const status = seededWeightedPick<Status>(rand, [
      ["Completed", 82], ["Pending", 7], ["Cancelled", 6], ["Refunded", 5]
    ]);

    // Quantity: weighted (1 common)
    const quantity = seededWeightedPick(rand, [[1,55],[2,22],[3,12],[4,6],[5,3],[6,1],[8,1] as [number,number]]) as number;

    // Unit price cents: log-normal-like via buckets per category
    const priceBuckets: Record<string, Array<[number, number]>> = {
      Electronics: [[19900,10],[49900,20],[89900,25],[149900,20],[249900,15],[399900,10]],
      Apparel: [[2900,15],[5900,25],[9900,30],[14900,20],[24900,10]],
      "Home & Garden": [[3900,15],[7900,20],[14900,25],[24900,20],[39900,15],[79900,5]],
      Sports: [[4900,15],[9900,25],[19900,30],[39900,20],[79900,10]],
      Beauty: [[1900,20],[3900,30],[7900,25],[14900,15],[24900,10]],
      Books: [[1200,20],[1900,30],[2900,25],[3900,15],[5900,10]],
    };
    const bucket = seededWeightedPick(rand, priceBuckets[category]!.map(([cents,w])=>[cents,w] as [number,number]));
    // add jitter ±18%
    const jitter = seededFloat(rand, 0.82, 1.18);
    const unitPriceCents = Math.max(500, Math.round(bucket * jitter * (0.9 + seasonalMult*0.1)));

    const discountChoices = seededWeightedPick(rand, [[0,55],[5,18],[10,12],[15,8],[20,4],[25,2],[30,1] as [number,number]]) as number;
    // Marketplace slightly higher discount
    const discountPercent = channel==="Marketplace" ? Math.min(30, discountChoices + seededInt(rand,0,3)) : discountChoices;

    const gross = quantity * unitPriceCents;
    const revenueCents = Math.round(gross * (1 - discountPercent/100));

    // Cost: margin bias + noise, occasional loss-maker
    const baseMargin = (CHANNEL_MARGIN_BIAS[channel]! + CATEGORY_MARGIN_BIAS[category]!) / 2;
    const marginNoise = seededFloat(rand, -0.14, 0.14);
    let margin = baseMargin + marginNoise;
    // Force ~12% loss makers
    const isLoss = rand() < 0.12;
    if (isLoss) margin = seededFloat(rand, -0.18, -0.02);
    // Clamp
    margin = Math.max(-0.25, Math.min(0.65, margin));
    const costCents = Math.max(100, Math.round(revenueCents * (1 - margin)));
    const profitCents = revenueCents - costCents;

    const id = `ORD-${String(1000000 + i).slice(1)}-${String(Math.floor(rand()*900)+100)}`;

    records.push({
      id,
      orderDate,
      region,
      country,
      category,
      subcategory,
      productName,
      channel,
      customerSegment,
      quantity,
      unitPriceCents,
      discountPercent,
      revenueCents,
      costCents,
      profitCents,
      status,
    });
  }

  // Sort by date then id for stability
  records.sort((a,b) => a.orderDate.localeCompare(b.orderDate) || a.id.localeCompare(b.id));

  // Ensure deterministic IDs order? Already sorted.
  // To keep IDs stable after sort, we keep as generated but sorted order is chronological.
  return records;
}

export function getDemoMeta(recordCount: number): import("../contracts/types").DatasetMeta {
  return {
    id: "demo-v2",
    name: "Prismatic Demo — Synthetic Commerce",
    source: "synthetic",
    recordCount,
    dateRange: ["2022-01-01", "2024-12-31"],
    schemaVersion: "2.0.0",
    generatorVersion: GENERATOR_VERSION,
    createdAt: new Date().toISOString(),
  };
}
