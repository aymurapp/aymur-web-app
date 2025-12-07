#!/usr/bin/env node
/**
 * Merge Database Types Script
 *
 * This script merges Supabase-generated types with custom helper types.
 * It reads the generated types and appends the helper types at the end.
 *
 * Usage: node scripts/merge-db-types.js
 */

const fs = require('fs');
const path = require('path');

const GENERATED_FILE = path.join(__dirname, '../src/lib/types/database.generated.ts');
const OUTPUT_FILE = path.join(__dirname, '../src/lib/types/database.ts');

const HEADER = `/**
 * Supabase Database Types
 * Auto-generated from Supabase schema via CLI
 *
 * Project ID: cudcrgjshblmxtgpstwr
 * Database: PostgreSQL 17.6.1
 * Generated: ${new Date().toISOString().split('T')[0]}
 *
 * Database Stats: 106 tables | 65 functions | 147 RLS policies
 *
 * To regenerate: npm run db:types
 * (Requires: npx supabase login)
 *
 * Key Tables:
 * - Core: users, shops, shop_access, roles
 * - Inventory: inventory_items, product_categories, metal_types, metal_purities
 * - Sales: sales, sale_items, sale_payments
 * - Customers: customers, customer_transactions, customer_analytics
 * - Suppliers: suppliers, supplier_transactions, purchases
 * - Workshops: workshops, workshop_orders, workshop_transactions
 * - Expenses: expenses, expense_categories, expense_payments
 * - Deliveries: deliveries, courier_companies, courier_transactions
 * - Budget: budget_categories, budget_allocations, budget_transactions
 * - AI: ai_conversations, ai_messages, ai_operations, ai_token_usage
 * - Analytics: daily_shop_metrics, daily_financial_metrics, etc.
 *
 * Immutable Ledger Tables (INSERT ONLY - no UPDATE/DELETE):
 * - customer_transactions
 * - supplier_transactions
 * - courier_transactions
 * - workshop_transactions
 * - budget_transactions
 * - shop_transfer_transactions
 * - shop_transfer_settlements
 * - ai_token_usage
 * - audits_logs
 *
 * Multi-tenancy: All shop-scoped tables use get_user_shop_ids() for RLS.
 */

`;

const HELPER_TYPES = `
// Type helpers for convenience
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];

export type Functions<T extends keyof Database['public']['Functions']> =
  Database['public']['Functions'][T];
`;

function main() {
  // Check if generated file exists
  if (!fs.existsSync(GENERATED_FILE)) {
    console.error('Error: Generated types file not found.');
    console.error(
      'Run: npx supabase login && npx supabase gen types typescript --project-id cudcrgjshblmxtgpstwr --schema public > src/lib/types/database.generated.ts'
    );
    process.exit(1);
  }

  // Read generated types
  let generatedContent = fs.readFileSync(GENERATED_FILE, 'utf-8');

  // Remove any existing header comments from generated file
  generatedContent = generatedContent.replace(/^\/\*\*[\s\S]*?\*\/\s*\n?/, '');

  // Combine header + generated content + helper types
  const finalContent = HEADER + generatedContent.trim() + '\n' + HELPER_TYPES;

  // Write to output file
  fs.writeFileSync(OUTPUT_FILE, finalContent, 'utf-8');

  // Clean up generated file
  fs.unlinkSync(GENERATED_FILE);

  console.log('Database types generated successfully!');
  console.log(`Output: ${OUTPUT_FILE}`);
}

main();
