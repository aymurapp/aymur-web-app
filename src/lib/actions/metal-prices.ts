'use server';

/**
 * Metal Prices Server Actions
 *
 * Server actions for metal prices management including:
 * - CRUD operations for metal price entries
 * - Current price lookups for each metal/purity combination
 * - Price history for charting and analysis
 *
 * NOTE: This uses mock data since the metal_prices table doesn't exist yet.
 * When the database schema is updated, replace mock data with actual queries.
 *
 * @module lib/actions/metal-prices
 */

import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

// =============================================================================
// ACTION RESULT TYPE
// =============================================================================

/**
 * Standard result type for server actions
 */
type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

// =============================================================================
// TYPES
// =============================================================================

/**
 * Metal type reference
 */
export interface MetalType {
  id_metal_type: string;
  metal_name: string;
  metal_code: string;
}

/**
 * Metal purity reference
 */
export interface MetalPurity {
  id_purity: string;
  purity_name: string;
  purity_percentage: number;
  fineness: number;
}

/**
 * Base metal price record
 */
export interface MetalPrice {
  id_price: string;
  id_shop: string;
  id_metal_type: string;
  id_metal_purity: string | null;
  price_date: string;
  price_per_gram: number;
  buy_price_per_gram: number | null;
  sell_price_per_gram: number | null;
  currency: string;
  source: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

/**
 * Metal price with related type and purity details
 */
export interface MetalPriceWithDetails extends MetalPrice {
  metal_type: MetalType;
  metal_purity: MetalPurity | null;
}

/**
 * Price history point for charts
 */
export interface PriceHistoryPoint {
  date: string;
  price_per_gram: number;
  buy_price_per_gram: number | null;
  sell_price_per_gram: number | null;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const metalPriceFiltersSchema = z.object({
  metalTypeId: z.string().uuid().optional(),
  metalPurityId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().min(1).max(1000).optional(),
});

const createMetalPriceSchema = z.object({
  id_metal_type: z.string().uuid(),
  id_metal_purity: z.string().uuid().nullable().optional(),
  price_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  price_per_gram: z.number().positive('Price must be positive'),
  buy_price_per_gram: z.number().positive().nullable().optional(),
  sell_price_per_gram: z.number().positive().nullable().optional(),
  currency: z.string().min(3).max(3).default('USD'),
  source: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

const updateMetalPriceSchema = z.object({
  price_per_gram: z.number().positive('Price must be positive').optional(),
  buy_price_per_gram: z.number().positive().nullable().optional(),
  sell_price_per_gram: z.number().positive().nullable().optional(),
  source: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type MetalPriceFilters = z.infer<typeof metalPriceFiltersSchema>;
export type CreateMetalPriceInput = z.infer<typeof createMetalPriceSchema>;
export type UpdateMetalPriceInput = z.infer<typeof updateMetalPriceSchema>;

// =============================================================================
// MOCK DATA - Metal Types and Purities
// =============================================================================

const mockMetalTypes: MetalType[] = [
  { id_metal_type: 'mt-gold', metal_name: 'Gold', metal_code: 'AU' },
  { id_metal_type: 'mt-silver', metal_name: 'Silver', metal_code: 'AG' },
  { id_metal_type: 'mt-platinum', metal_name: 'Platinum', metal_code: 'PT' },
];

const mockMetalPurities: MetalPurity[] = [
  // Gold purities
  { id_purity: 'mp-gold-24k', purity_name: '24K', purity_percentage: 99.9, fineness: 999 },
  { id_purity: 'mp-gold-22k', purity_name: '22K', purity_percentage: 91.67, fineness: 916 },
  { id_purity: 'mp-gold-18k', purity_name: '18K', purity_percentage: 75.0, fineness: 750 },
  { id_purity: 'mp-gold-14k', purity_name: '14K', purity_percentage: 58.5, fineness: 585 },
  // Silver purities
  { id_purity: 'mp-silver-999', purity_name: '999 Fine', purity_percentage: 99.9, fineness: 999 },
  {
    id_purity: 'mp-silver-925',
    purity_name: '925 Sterling',
    purity_percentage: 92.5,
    fineness: 925,
  },
  // Platinum purities
  {
    id_purity: 'mp-platinum-950',
    purity_name: '950 Platinum',
    purity_percentage: 95.0,
    fineness: 950,
  },
];

// =============================================================================
// MOCK DATA STORE - Price History (In-memory for demo purposes)
// =============================================================================

/**
 * Generate realistic price history for the last N days
 * Base prices (per gram in USD):
 * - Gold 24K: ~$65
 * - Silver 999: ~$0.80
 * - Platinum 950: ~$32
 */
function generatePriceHistory(): MetalPriceWithDetails[] {
  const prices: MetalPriceWithDetails[] = [];
  const today = new Date();

  // Configuration for each metal/purity combo
  const priceConfigs = [
    // Gold prices
    {
      metalType: mockMetalTypes[0]!,
      purity: mockMetalPurities[0]!,
      basePrice: 65.0,
      buySpread: 0.98,
      sellSpread: 1.02,
      volatility: 0.02,
    }, // 24K
    {
      metalType: mockMetalTypes[0]!,
      purity: mockMetalPurities[1]!,
      basePrice: 59.6,
      buySpread: 0.98,
      sellSpread: 1.02,
      volatility: 0.02,
    }, // 22K
    {
      metalType: mockMetalTypes[0]!,
      purity: mockMetalPurities[2]!,
      basePrice: 48.75,
      buySpread: 0.97,
      sellSpread: 1.03,
      volatility: 0.02,
    }, // 18K
    {
      metalType: mockMetalTypes[0]!,
      purity: mockMetalPurities[3]!,
      basePrice: 38.0,
      buySpread: 0.97,
      sellSpread: 1.03,
      volatility: 0.02,
    }, // 14K
    // Silver prices
    {
      metalType: mockMetalTypes[1]!,
      purity: mockMetalPurities[4]!,
      basePrice: 0.8,
      buySpread: 0.95,
      sellSpread: 1.05,
      volatility: 0.03,
    }, // 999
    {
      metalType: mockMetalTypes[1]!,
      purity: mockMetalPurities[5]!,
      basePrice: 0.74,
      buySpread: 0.95,
      sellSpread: 1.05,
      volatility: 0.03,
    }, // 925
    // Platinum prices
    {
      metalType: mockMetalTypes[2]!,
      purity: mockMetalPurities[6]!,
      basePrice: 32.0,
      buySpread: 0.97,
      sellSpread: 1.03,
      volatility: 0.025,
    }, // 950
  ];

  // Generate 90 days of price history for each combo
  for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
    const priceDate = new Date(today);
    priceDate.setDate(priceDate.getDate() - dayOffset);
    const dateStr = priceDate.toISOString().split('T')[0]!;

    for (const config of priceConfigs) {
      // Add some realistic price variation (random walk with drift)
      const randomFactor = 1 + (Math.random() - 0.5) * config.volatility;
      // Add slight upward trend bias
      const trendFactor = 1 + dayOffset * 0.0001;
      const adjustedBase = (config.basePrice * randomFactor) / trendFactor;

      const pricePerGram = Number(adjustedBase.toFixed(4));
      const buyPrice = Number((pricePerGram * config.buySpread).toFixed(4));
      const sellPrice = Number((pricePerGram * config.sellSpread).toFixed(4));

      prices.push({
        id_price: `price-${config.metalType.id_metal_type}-${config.purity.id_purity}-${dayOffset}`,
        id_shop: 'demo-shop',
        id_metal_type: config.metalType.id_metal_type,
        id_metal_purity: config.purity.id_purity,
        price_date: dateStr,
        price_per_gram: pricePerGram,
        buy_price_per_gram: buyPrice,
        sell_price_per_gram: sellPrice,
        currency: 'USD',
        source: dayOffset === 0 ? 'Manual Entry' : 'Historical Import',
        notes: null,
        created_by: 'system',
        created_at: priceDate.toISOString(),
        metal_type: config.metalType,
        metal_purity: config.purity,
      });
    }
  }

  return prices;
}

// Initialize mock price data store
const mockPrices: MetalPriceWithDetails[] = generatePriceHistory();

// =============================================================================
// METAL PRICE QUERIES
// =============================================================================

/**
 * Get all metal prices with optional filters
 */
export async function getMetalPrices(
  filters?: MetalPriceFilters
): Promise<ActionResult<MetalPriceWithDetails[]>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate filters if provided
    if (filters) {
      metalPriceFiltersSchema.parse(filters);
    }

    // Filter mock data
    let filteredPrices = [...mockPrices];

    if (filters?.metalTypeId) {
      filteredPrices = filteredPrices.filter((p) => p.id_metal_type === filters.metalTypeId);
    }

    if (filters?.metalPurityId) {
      filteredPrices = filteredPrices.filter((p) => p.id_metal_purity === filters.metalPurityId);
    }

    if (filters?.startDate) {
      filteredPrices = filteredPrices.filter((p) => p.price_date >= filters.startDate!);
    }

    if (filters?.endDate) {
      filteredPrices = filteredPrices.filter((p) => p.price_date <= filters.endDate!);
    }

    // Sort by date descending
    filteredPrices.sort(
      (a, b) => new Date(b.price_date).getTime() - new Date(a.price_date).getTime()
    );

    // Apply limit
    if (filters?.limit) {
      filteredPrices = filteredPrices.slice(0, filters.limit);
    }

    return { success: true, data: filteredPrices };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'Validation error' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch metal prices',
    };
  }
}

/**
 * Get the current (latest) price for each metal type/purity combination
 */
export async function getCurrentMetalPrices(): Promise<ActionResult<MetalPriceWithDetails[]>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const today = new Date().toISOString().split('T')[0]!;

    // Group by metal_type + metal_purity and take the most recent
    const latestPrices = new Map<string, MetalPriceWithDetails>();

    // Sort by date descending first
    const sortedPrices = [...mockPrices]
      .filter((p) => p.price_date <= today)
      .sort((a, b) => new Date(b.price_date).getTime() - new Date(a.price_date).getTime());

    for (const price of sortedPrices) {
      const key = `${price.id_metal_type}-${price.id_metal_purity || 'null'}`;
      if (!latestPrices.has(key)) {
        latestPrices.set(key, price);
      }
    }

    return { success: true, data: Array.from(latestPrices.values()) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch current metal prices',
    };
  }
}

/**
 * Get price history for a specific metal type (and optional purity) for charting
 *
 * @param metalTypeId - The metal type ID
 * @param days - Number of days of history to retrieve (default: 30)
 * @param metalPurityId - Optional purity filter
 */
export async function getMetalPriceHistory(
  metalTypeId: string,
  days: number = 30,
  metalPurityId?: string
): Promise<ActionResult<PriceHistoryPoint[]>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!metalTypeId) {
      return { success: false, error: 'Metal type ID is required' };
    }

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0]!;
    const endDateStr = today.toISOString().split('T')[0]!;

    // Filter prices for the given metal type, purity, and date range
    let filteredPrices = mockPrices.filter(
      (p) =>
        p.id_metal_type === metalTypeId &&
        p.price_date >= startDateStr &&
        p.price_date <= endDateStr
    );

    if (metalPurityId) {
      filteredPrices = filteredPrices.filter((p) => p.id_metal_purity === metalPurityId);
    }

    // Sort by date ascending for chart display
    filteredPrices.sort(
      (a, b) => new Date(a.price_date).getTime() - new Date(b.price_date).getTime()
    );

    // Transform to chart-friendly format
    const historyPoints: PriceHistoryPoint[] = filteredPrices.map((p) => ({
      date: p.price_date,
      price_per_gram: p.price_per_gram,
      buy_price_per_gram: p.buy_price_per_gram,
      sell_price_per_gram: p.sell_price_per_gram,
    }));

    return { success: true, data: historyPoints };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch price history',
    };
  }
}

/**
 * Get a single metal price by ID
 */
export async function getMetalPrice(id: string): Promise<ActionResult<MetalPriceWithDetails>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const price = mockPrices.find((p) => p.id_price === id);
    if (!price) {
      return { success: false, error: 'Metal price not found' };
    }

    return { success: true, data: price };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch metal price',
    };
  }
}

// =============================================================================
// METAL PRICE MUTATIONS
// =============================================================================

/**
 * Create a new metal price entry
 */
export async function createMetalPrice(
  input: CreateMetalPriceInput
): Promise<ActionResult<MetalPriceWithDetails>> {
  try {
    const validated = createMetalPriceSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Find the metal type and purity
    const metalType = mockMetalTypes.find((mt) => mt.id_metal_type === validated.id_metal_type);
    if (!metalType) {
      return { success: false, error: 'Invalid metal type' };
    }

    let metalPurity: MetalPurity | null = null;
    if (validated.id_metal_purity) {
      metalPurity =
        mockMetalPurities.find((mp) => mp.id_purity === validated.id_metal_purity) ?? null;
      if (!metalPurity) {
        return { success: false, error: 'Invalid metal purity' };
      }
    }

    // Check for duplicate (same metal type, purity, and date)
    const existingPrice = mockPrices.find(
      (p) =>
        p.id_metal_type === validated.id_metal_type &&
        p.id_metal_purity === (validated.id_metal_purity ?? null) &&
        p.price_date === validated.price_date
    );

    if (existingPrice) {
      return {
        success: false,
        error: 'A price already exists for this metal, purity, and date combination',
      };
    }

    const now = new Date().toISOString();
    const newPrice: MetalPriceWithDetails = {
      id_price: `price-${crypto.randomUUID()}`,
      id_shop: 'demo-shop',
      id_metal_type: validated.id_metal_type,
      id_metal_purity: validated.id_metal_purity ?? null,
      price_date: validated.price_date,
      price_per_gram: validated.price_per_gram,
      buy_price_per_gram: validated.buy_price_per_gram ?? null,
      sell_price_per_gram: validated.sell_price_per_gram ?? null,
      currency: validated.currency,
      source: validated.source ?? null,
      notes: validated.notes ?? null,
      created_by: user.id,
      created_at: now,
      metal_type: metalType,
      metal_purity: metalPurity,
    };

    mockPrices.push(newPrice);

    // Re-sort to maintain order
    mockPrices.sort((a, b) => new Date(b.price_date).getTime() - new Date(a.price_date).getTime());

    return { success: true, data: newPrice };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'Validation error' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create metal price',
    };
  }
}

/**
 * Update an existing metal price (typically for corrections only)
 */
export async function updateMetalPrice(
  id: string,
  input: UpdateMetalPriceInput
): Promise<ActionResult<MetalPriceWithDetails>> {
  try {
    const validated = updateMetalPriceSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const index = mockPrices.findIndex((p) => p.id_price === id);
    if (index === -1) {
      return { success: false, error: 'Metal price not found' };
    }

    const existingPrice = mockPrices[index];
    if (!existingPrice) {
      return { success: false, error: 'Metal price not found' };
    }

    // Apply updates
    const updatedPrice: MetalPriceWithDetails = {
      ...existingPrice,
      ...(validated.price_per_gram !== undefined && { price_per_gram: validated.price_per_gram }),
      ...(validated.buy_price_per_gram !== undefined && {
        buy_price_per_gram: validated.buy_price_per_gram,
      }),
      ...(validated.sell_price_per_gram !== undefined && {
        sell_price_per_gram: validated.sell_price_per_gram,
      }),
      ...(validated.source !== undefined && { source: validated.source }),
      ...(validated.notes !== undefined && { notes: validated.notes }),
    };

    mockPrices[index] = updatedPrice;

    return { success: true, data: updatedPrice };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'Validation error' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update metal price',
    };
  }
}

/**
 * Delete a metal price entry
 */
export async function deleteMetalPrice(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const index = mockPrices.findIndex((p) => p.id_price === id);
    if (index === -1) {
      return { success: false, error: 'Metal price not found' };
    }

    mockPrices.splice(index, 1);

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete metal price',
    };
  }
}

// =============================================================================
// REFERENCE DATA QUERIES
// =============================================================================

/**
 * Get available metal types
 */
export async function getMetalTypes(): Promise<ActionResult<MetalType[]>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    return { success: true, data: mockMetalTypes };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch metal types',
    };
  }
}

/**
 * Get available metal purities, optionally filtered by metal type
 */
export async function getMetalPurities(metalTypeId?: string): Promise<ActionResult<MetalPurity[]>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // In a real implementation, purities would be linked to metal types
    // For mock data, we'll filter based on naming convention
    let purities = [...mockMetalPurities];

    if (metalTypeId) {
      if (metalTypeId === 'mt-gold') {
        purities = mockMetalPurities.filter((p) => p.id_purity.includes('gold'));
      } else if (metalTypeId === 'mt-silver') {
        purities = mockMetalPurities.filter((p) => p.id_purity.includes('silver'));
      } else if (metalTypeId === 'mt-platinum') {
        purities = mockMetalPurities.filter((p) => p.id_purity.includes('platinum'));
      }
    }

    return { success: true, data: purities };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch metal purities',
    };
  }
}
