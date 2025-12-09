# AymurDB Complete Database Documentation

## Executive Summary

AymurDB is a comprehensive **multi-tenant jewelry business management system** built on Supabase (PostgreSQL 17.6.1). The database supports complete business operations including sales, inventory, suppliers, workshops, payroll, expenses, analytics, and AI features with enterprise-grade security.

**Key Statistics:**

- **106 Tables** in public schema
- **65 Functions** for business logic
- **147 RLS Policies** for security
- **121 Triggers** for automation
- **7 Sequences** for ledger ordering
- **18 Applied Migrations**

---

# Part 1: Table Relationships & Entity Model

## 1. USERS & AUTHENTICATION DOMAIN

### Core Tables

#### **users** (Primary Key: `id_user` UUID)

Primary application users linked to Supabase auth.users

| Column                           | Type      | Purpose                          |
| -------------------------------- | --------- | -------------------------------- |
| id_user                          | uuid      | Primary key                      |
| auth_id                          | uuid      | Supabase auth reference (UNIQUE) |
| email                            | varchar   | User email (UNIQUE)              |
| full_name                        | varchar   | Display name                     |
| phone                            | varchar   | Contact phone                    |
| stripe_customer_id               | varchar   | Stripe integration (UNIQUE)      |
| country, province, city, address | varchar   | Location data                    |
| deleted_at                       | timestamp | Soft delete marker               |
| created_at, updated_at           | timestamp | Audit timestamps                 |

**Relationships:** Referenced by 150+ foreign keys across the system. Core entity for authorization.

---

#### **roles** (Primary Key: `id_role` UUID)

User role definitions for authorization

| Column      | Type    | Purpose                                 |
| ----------- | ------- | --------------------------------------- |
| id_role     | uuid    | Primary key                             |
| role_name   | varchar | Owner, Manager, Finance, Staff (UNIQUE) |
| description | text    | Role documentation                      |

**Available Roles:** Owner, Manager, Finance, Staff

---

#### **shop_access** (Primary Key: `id_access` UUID) - JUNCTION TABLE

Maps users to shops with roles and permissions

| Column      | Type    | Purpose                       |
| ----------- | ------- | ----------------------------- |
| id_access   | uuid    | Primary key                   |
| id_shop     | uuid    | FK → shops                    |
| id_user     | uuid    | FK → users                    |
| id_role     | uuid    | FK → roles                    |
| permissions | jsonb   | Granular permission overrides |
| is_active   | boolean | Soft-deactivate access        |

**Unique Constraint:** `(id_user, id_shop)` - One access record per user per shop

**Cardinality:** Many-to-Many (Users ↔ Shops)

---

### Authentication & Security Tables

| Table                      | Purpose                          | Key Foreign Keys                                     |
| -------------------------- | -------------------------------- | ---------------------------------------------------- |
| **users_sessions**         | Session tracking with revocation | id_user → users                                      |
| **login_attempts**         | Failed login tracking            | id_user → users                                      |
| **password_history**       | Password change audit            | id_user → users                                      |
| **user_security_settings** | 2FA configuration                | id_user → users                                      |
| **api_keys**               | API key management               | id_user → users, id_shop → shops                     |
| **staff_invitations**      | Staff invite workflow            | id_shop → shops, id_role → roles, invited_by → users |
| **audits_logs**            | Immutable audit trail            | id_user → users, id_shop → shops                     |
| **shop_reset_tokens**      | 2-phase reset confirmation       | id_user → users, id_shop → shops                     |

---

## 2. SHOPS DOMAIN

### Core Tables

#### **shops** (Primary Key: `id_shop` UUID)

Multi-tenant shop entity - PRIMARY TENANT ISOLATION KEY

| Column                       | Type      | Purpose                 |
| ---------------------------- | --------- | ----------------------- |
| id_shop                      | uuid      | Primary key             |
| id_owner                     | uuid      | FK → users (shop owner) |
| id_subscription              | uuid      | FK → subscriptions      |
| shop_name                    | varchar   | Display name            |
| shop_logo                    | varchar   | Logo URL                |
| language, currency, timezone | varchar   | Localization            |
| storage_used_bytes           | bigint    | Storage quota tracking  |
| version                      | integer   | Optimistic locking      |
| deleted_at                   | timestamp | Soft delete             |

**Relationships:** Referenced by 130+ tables (complete tenant isolation anchor)

---

### Shop Transfer System

```
neighbor_shops ←──── shop_transfers ←──── shop_transfer_items
                            │                      │
                            ↓                      ↓
               shop_transfer_transactions    inventory_items
                            │
                            ↓
               shop_transfer_settlements
```

| Table                          | Purpose                    | Cardinality                    |
| ------------------------------ | -------------------------- | ------------------------------ |
| **neighbor_shops**             | Shop-to-shop relationships | Many-to-Many (Shops ↔ Shops)   |
| **shop_transfers**             | Transfer headers           | Many-to-One (→ neighbor_shops) |
| **shop_transfer_items**        | Transfer line items        | Many-to-One (→ shop_transfers) |
| **shop_transfer_settlements**  | Financial settlements      | Many-to-One (→ shop_transfers) |
| **shop_transfer_transactions** | Immutable ledger           | Many-to-One (→ shop_transfers) |

---

## 3. SUBSCRIPTIONS & BILLING DOMAIN

```
plans ←──── subscriptions ←──── shops
                 │
                 ↓
              users
```

| Table               | Purpose                       | Key Constraints                    |
| ------------------- | ----------------------------- | ---------------------------------- |
| **plans**           | Subscription tier definitions | UNIQUE: plan_name, stripe_price_id |
| **subscriptions**   | Active subscription records   | UNIQUE: stripe_subscription_id     |
| **stripe_webhooks** | Webhook event log             | UNIQUE: stripe_event_id            |

**Plan Limits Tracked:**

- `max_shops` - Maximum shops allowed
- `storage_limit_mb` - Storage quota
- `max_staff_per_shop` - Staff limit
- `ai_credits_monthly` - AI usage quota
- `features` - JSONB feature flags

---

## 4. INVENTORY DOMAIN

### Product Catalog Hierarchy

```
metal_types ←──── metal_purities ←──── metal_prices
     │                  │
     └──────────────────┼──────────────┐
                        ↓              ↓
product_categories ←── inventory_items ←── item_stones
         │                   │              │
         ↓                   ↓              ↓
   product_sizes      item_certifications  stone_types
```

### Core Tables

#### **inventory_items** (Primary Key: `id_item` UUID)

Core inventory with full metadata

| Column                   | Type             | Purpose                                           |
| ------------------------ | ---------------- | ------------------------------------------------- |
| id_item                  | uuid             | Primary key                                       |
| id_shop                  | uuid             | FK → shops                                        |
| id_purchase              | uuid             | FK → purchases (if from purchase)                 |
| id_recycled_item         | uuid             | FK → recycled_items (if from recycled)            |
| id_category              | uuid             | FK → product_categories                           |
| id_metal_type            | uuid             | FK → metal_types                                  |
| id_metal_purity          | uuid             | FK → metal_purities                               |
| id_stone_type            | uuid             | FK → stone_types                                  |
| id_size                  | uuid             | FK → product_sizes                                |
| barcode, sku             | varchar          | Identifiers                                       |
| item_name                | varchar          | Display name                                      |
| source_type              | varchar          | 'purchase' or 'recycled'                          |
| item_type                | varchar          | 'raw_material', 'component', 'finished'           |
| ownership_type           | varchar          | 'owned', 'consignment', 'memo'                    |
| weight_grams             | numeric          | Physical weight (required)                        |
| purchase_price, currency | numeric, varchar | Cost tracking                                     |
| status                   | varchar          | 'available', 'reserved', 'sold', 'workshop', etc. |
| version                  | integer          | Optimistic locking                                |
| deleted_at               | timestamp        | Soft delete                                       |

**Status Values:**

- `available` - Ready for sale
- `reserved` - Held for customer
- `sold` - Completed sale
- `workshop` - In workshop for repair/customization
- `transferred` - Moved to another shop
- `damaged` - Damaged item
- `returned` - Returned item

---

### Supporting Catalog Tables

| Table                   | Purpose                     | Relationships                    |
| ----------------------- | --------------------------- | -------------------------------- |
| **product_categories**  | Rings, Necklaces, etc.      | → product_sizes, inventory_items |
| **metal_types**         | Gold, Silver, Platinum      | → metal_purities, metal_prices   |
| **metal_purities**      | 24K, 22K, 18K with fineness | → metal_types                    |
| **stone_types**         | Diamond, Ruby, etc.         | → item_stones                    |
| **product_sizes**       | Ring sizes, chain lengths   | → product_categories             |
| **metal_prices**        | Daily price tracking        | → metal_types, metal_purities    |
| **item_stones**         | Multiple stones per item    | → inventory_items, stone_types   |
| **item_certifications** | GIA, IGI certificates       | → inventory_items, file_uploads  |

---

## 5. PURCHASES DOMAIN (Supplier Procurement)

```
supplier_categories ←── suppliers ←── purchases ←── inventory_items
                             │             │
                             ↓             ↓
                    supplier_transactions  supplier_payments
                             │
                             ↓
                    supplier_analytics
```

| Table                     | Purpose                      | Key Relationships      |
| ------------------------- | ---------------------------- | ---------------------- |
| **supplier_categories**   | Supplier classification      | → suppliers            |
| **suppliers**             | Supplier master with balance | current_balance field  |
| **purchases**             | Purchase orders              | → suppliers            |
| **supplier_payments**     | Payments to suppliers        | → suppliers, purchases |
| **supplier_transactions** | IMMUTABLE ledger             | → suppliers            |
| **supplier_analytics**    | Supplier metrics             | → suppliers            |
| **payment_reminders**     | Payment tracking             | → suppliers, purchases |

---

## 6. SALES DOMAIN

```
customers ←── sales ←── sale_items ←── inventory_items
     │          │
     ↓          ↓
customer_transactions  sale_payments
     │
     ↓
customer_analytics
```

| Table                          | Purpose                      | Key Relationships             |
| ------------------------------ | ---------------------------- | ----------------------------- |
| **customers**                  | Customer master with balance | current_balance, credit_limit |
| **sales**                      | Sales transactions           | → customers                   |
| **sale_items**                 | Line items                   | → sales, inventory_items      |
| **sale_payments**              | Customer payments            | → sales, customers            |
| **customer_transactions**      | IMMUTABLE ledger             | → customers                   |
| **customer_payment_reminders** | Payment reminders            | → sales, customers            |
| **customer_analytics**         | Customer metrics             | → customers                   |

---

## 7. DELIVERIES DOMAIN

```
sales ←── deliveries ←── courier_companies
                              │
                              ↓
                       courier_payments
                              │
                              ↓
                    courier_transactions (IMMUTABLE)
```

### **courier_companies** (Primary Key: `id_courier`)

External delivery/courier service providers with balance tracking

| Column                 | Type      | Nullable | Purpose                                 |
| ---------------------- | --------- | -------- | --------------------------------------- |
| id_courier             | uuid      | NO       | Primary key                             |
| id_shop                | uuid      | NO       | FK → shops                              |
| company_name           | varchar   | NO       | Courier company name                    |
| contact_person         | varchar   | YES      | Contact name                            |
| phone                  | varchar   | YES      | Phone number                            |
| email                  | varchar   | YES      | Email address                           |
| website                | varchar   | YES      | Website URL                             |
| **current_balance**    | numeric   | NO       | Amount owed to courier (default: 0)     |
| status                 | varchar   | YES      | 'active' / 'inactive' (default: active) |
| notes                  | text      | YES      | Additional notes                        |
| version                | integer   | NO       | Optimistic locking (default: 0)         |
| created_by, updated_by | uuid      | -        | FK → users                              |
| deleted_at             | timestamp | YES      | Soft delete marker                      |

**Triggers:** `bump_version_trigger` (optimistic locking)

---

### **deliveries** (Primary Key: `id_delivery`)

Shipment/delivery records linking sales to couriers

| Column                  | Type    | Nullable | Purpose                              |
| ----------------------- | ------- | -------- | ------------------------------------ |
| id_delivery             | uuid    | NO       | Primary key                          |
| id_shop                 | uuid    | NO       | FK → shops                           |
| id_sale                 | uuid    | NO       | FK → sales (which sale)              |
| id_courier              | uuid    | NO       | FK → courier_companies               |
| tracking_number         | varchar | YES      | Courier tracking number              |
| delivery_cost           | numeric | NO       | Shipping cost amount                 |
| cost_paid_by            | varchar | NO       | 'shop' or 'customer'                 |
| status                  | varchar | YES      | Delivery status (default: 'pending') |
| shipped_date            | date    | YES      | When shipped                         |
| estimated_delivery_date | date    | YES      | Expected delivery                    |
| delivered_date          | date    | YES      | Actual delivery date                 |
| recipient_name          | varchar | YES      | Recipient name                       |
| delivery_address        | text    | YES      | Delivery address                     |
| notes                   | text    | YES      | Additional notes                     |
| created_by, updated_by  | uuid    | -        | FK → users                           |

**Status Values:** `pending` → `shipped` → `in_transit` → `delivered` / `failed` / `returned`

**Triggers:**

- `check_courier_delivery_validity` → Validates courier exists and is active
- `update_updated_at_trigger` → Auto-updates timestamp

---

### **courier_payments** (Primary Key: `id_payment`)

Payments made to courier companies

| Column              | Type    | Nullable | Purpose                           |
| ------------------- | ------- | -------- | --------------------------------- |
| id_payment          | uuid    | NO       | Primary key                       |
| id_shop             | uuid    | NO       | FK → shops                        |
| id_courier          | uuid    | NO       | FK → courier_companies            |
| payment_type        | varchar | NO       | 'cash', 'cheque', 'bank_transfer' |
| amount              | numeric | NO       | Payment amount                    |
| payment_date        | date    | NO       | When payment was made             |
| cheque_number       | varchar | YES      | Cheque number (if cheque)         |
| cheque_date         | date    | YES      | Cheque date                       |
| cheque_bank         | varchar | YES      | Bank name                         |
| cheque_status       | varchar | YES      | 'pending', 'cleared', 'bounced'   |
| cheque_cleared_date | date    | YES      | When cheque cleared               |
| notes               | text    | YES      | Payment notes                     |
| created_by          | uuid    | NO       | FK → users                        |

---

### **courier_transactions** (Primary Key: `id_transaction`) - IMMUTABLE LEDGER

Balance ledger for courier companies - **NO UPDATE/DELETE ALLOWED**

| Column              | Type    | Nullable | Purpose                             |
| ------------------- | ------- | -------- | ----------------------------------- |
| id_transaction      | uuid    | NO       | Primary key                         |
| id_shop             | uuid    | NO       | FK → shops                          |
| id_courier          | uuid    | NO       | FK → courier_companies              |
| **sequence_number** | bigint  | NO       | Auto-increment ledger sequence      |
| transaction_type    | varchar | NO       | 'delivery', 'payment', 'adjustment' |
| reference_id        | uuid    | YES      | Related delivery/payment ID         |
| reference_type      | varchar | YES      | 'delivery' or 'payment'             |
| debit_amount        | numeric | NO       | Shop owes more (default: 0)         |
| credit_amount       | numeric | NO       | Payment made (default: 0)           |
| **balance_after**   | numeric | NO       | Running balance after transaction   |
| description         | text    | YES      | Transaction description             |
| created_by          | uuid    | NO       | FK → users                          |

**Triggers:**

- `prevent_courier_transactions_update` → **BLOCKS ALL UPDATES**
- `prevent_courier_transactions_delete` → **BLOCKS ALL DELETES**
- `sync_courier_balance_trigger` → Auto-updates `courier_companies.current_balance`

---

### Delivery RLS Policies

| Table                | Policy    | Command | Rule                                 |
| -------------------- | --------- | ------- | ------------------------------------ |
| courier_companies    | isolation | ALL     | `id_shop = ANY(get_user_shop_ids())` |
| courier_companies    | no_delete | DELETE  | `false` (blocked)                    |
| courier_payments     | isolation | ALL     | `id_shop = ANY(get_user_shop_ids())` |
| courier_payments     | no_delete | DELETE  | `false` (blocked)                    |
| courier_transactions | insert    | INSERT  | `id_shop = ANY(get_user_shop_ids())` |
| courier_transactions | isolation | SELECT  | `id_shop = ANY(get_user_shop_ids())` |
| deliveries           | isolation | ALL     | `id_shop = ANY(get_user_shop_ids())` |
| deliveries           | no_delete | DELETE  | `false` (blocked)                    |

---

## 8. EXPENSES DOMAIN

```
expense_categories ←── expenses ←── expense_payments
                           │
                           ↓
                    expense_approvals
                           │
         ┌─────────────────┴─────────────────┐
         ↓                                   ↓
budget_categories ←── budget_allocations ←── budget_transactions
```

| Table                   | Purpose                       |
| ----------------------- | ----------------------------- |
| **expense_categories**  | Expense classification        |
| **expenses**            | Expense records with approval |
| **expense_payments**    | Expense payments              |
| **expense_approvals**   | Approval workflow audit       |
| **recurring_expenses**  | Recurring expense templates   |
| **budget_categories**   | Budget classifications        |
| **budget_allocations**  | Budget limits per period      |
| **budget_transactions** | Budget usage tracking         |

---

## 9. WORKSHOPS DOMAIN

```
workshops ←── workshop_orders ←── workshop_payments
     │              │
     ↓              ↓
workshop_transactions  customers
                       inventory_items
```

| Table                     | Purpose                     |
| ------------------------- | --------------------------- |
| **workshops**             | Internal/external workshops |
| **workshop_orders**       | Service orders              |
| **workshop_payments**     | Workshop payments           |
| **workshop_transactions** | IMMUTABLE workshop ledger   |

---

## 10. PAYROLL DOMAIN

```
staff_salary_configs ←── salary_periods ←── salary_records ←── salary_payments
                                                  │
                                    ┌─────────────┴─────────────┐
                                    ↓                           ↓
                            salary_advances              salary_adjustments
```

| Table                         | Purpose                       |
| ----------------------------- | ----------------------------- |
| **staff_salary_configs**      | Salary structure per employee |
| **salary_periods**            | Payroll period definitions    |
| **salary_records**            | Individual payroll records    |
| **salary_payments**           | Salary payment records        |
| **salary_advances**           | Advance requests              |
| **salary_adjustments**        | Bonuses, penalties            |
| **staff_daily_performance**   | Daily staff metrics           |
| **staff_monthly_performance** | Monthly staff metrics         |

---

## 11. TAXES DOMAIN

```
tax_types ←── tax_periods ←── tax_records
                   │
                   ↓
            tax_payments
```

---

## 12. AI FEATURES DOMAIN

```
ai_conversations ←── ai_messages ←── ai_operations
        │                │
        ↓                ↓
ai_token_usage    ai_credit_pools ←── ai_credit_allocations
```

| Table                     | Purpose                         |
| ------------------------- | ------------------------------- |
| **ai_conversations**      | Chat sessions                   |
| **ai_messages**           | Individual messages             |
| **ai_operations**         | AI-proposed database operations |
| **ai_token_usage**        | IMMUTABLE token usage ledger    |
| **ai_credit_pools**       | Monthly credit allocation       |
| **ai_credit_allocations** | Per-user credit allocation      |
| **ai_table_permissions**  | AI access controls              |

---

## 13. ANALYTICS DOMAIN

### Metrics Tables Hierarchy

| Level               | Tables                                                                                        | Aggregation            |
| ------------------- | --------------------------------------------------------------------------------------------- | ---------------------- |
| **Daily**           | daily_shop_metrics, daily_financial_metrics, daily_customer_metrics, daily_inventory_snapshot | Raw daily calculations |
| **Daily Breakdown** | daily_sales_by_category, daily_sales_by_metal, daily_sales_by_payment                         | Dimensional analysis   |
| **Weekly**          | weekly_shop_metrics                                                                           | 7-day aggregates       |
| **Monthly**         | monthly_shop_metrics, monthly_profit_loss                                                     | Monthly summaries      |
| **Yearly**          | yearly_shop_metrics                                                                           | Annual summaries       |
| **Inventory**       | category_inventory_metrics, inventory_aging_summary, inventory_turnover_metrics               | Inventory analysis     |

---

## Relationship Cardinality Summary

### One-to-One Relationships

- User → Subscription
- Shop → Subscription
- Shop → Shop Settings
- User → Security Settings

### One-to-Many Relationships

- Shop → Customers, Sales, Suppliers, Purchases, Inventory, Workshops, Expenses
- Supplier → Purchases → Items
- Customer → Sales → Items
- Workshop → Orders → Payments

### Many-to-Many Relationships

- **Users ↔ Shops** (via shop_access)
- **Shops ↔ Shops** (via neighbor_shops)

### Immutable Ledger Tables (Append-Only)

- customer_transactions
- supplier_transactions
- workshop_transactions
- courier_transactions
- shop_transfer_transactions
- shop_transfer_settlements
- budget_transactions
- ai_token_usage
- audits_logs

---

# Part 2: Business Workflows & Use Cases

## 1. CUSTOMER SALE WORKFLOW

### Tables Involved

`sales` → `sale_items` → `sale_payments` → `customer_transactions` → `customers`

### Step-by-Step Flow

```
1. CREATE SALE
   POST /sales
   ├── Auto-generate sale_number via generate_sale_number()
   ├── Set payment_status = 'unpaid'
   └── TRIGGER: update_updated_at

2. ADD SALE ITEMS
   POST /sale_items (for each item)
   ├── Validate item.status = 'available'
   ├── TRIGGER: sync_sale_totals (recalculates totals)
   └── TRIGGER: check_item_availability_on_sale

3. RECORD PAYMENT
   POST /sale_payments
   ├── TRIGGER: sync_sale_payment_status
   │   ├── Calculate total_paid = SUM(payments)
   │   └── Update payment_status: 'paid'/'partial'/'unpaid'
   └── TRIGGER: trigger_update_daily_metrics

4. UPDATE CUSTOMER BALANCE
   FUNCTION: create_customer_transaction()
   ├── Calculate new balance
   ├── Insert immutable ledger entry
   └── TRIGGER: sync_customer_balance (updates customers.current_balance)

5. MARK ITEMS AS SOLD
   UPDATE inventory_items SET status = 'sold'

6. COMPLETE SALE
   UPDATE sales SET sale_status = 'completed'
   └── TRIGGER: validate_sale_status_transition
```

### Business Rules Enforced

- Cannot sell items that are not 'available'
- Immutable customer ledger (no UPDATE/DELETE)
- Atomic balance updates with FOR UPDATE lock
- Status cannot regress from completed → pending

---

## 2. SUPPLIER PURCHASE WORKFLOW

### Tables Involved

`purchases` → `inventory_items` → `supplier_payments` → `supplier_transactions` → `suppliers`

### Step-by-Step Flow

```
1. CREATE PURCHASE ORDER
   POST /purchases
   └── TRIGGER: check_supplier_purchase_validity

2. ADD ITEMS TO INVENTORY
   POST /inventory_items
   ├── source_type = 'purchase'
   ├── id_purchase = purchase order ID
   └── status = 'available'

3. RECORD PAYMENT
   POST /supplier_payments
   └── TRIGGER: sync_purchase_payment_status

4. UPDATE SUPPLIER BALANCE
   FUNCTION: create_supplier_transaction()
   └── TRIGGER: sync_supplier_balance

5. COMPLETE PURCHASE
   UPDATE purchases SET purchase_status = 'received'
```

---

## 3. INVENTORY MANAGEMENT WORKFLOW

### Status Transition Diagram

```
           ┌─────────────────┐
           │   available     │◄─────── transfer_in
           └────────┬────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
    ▼               ▼               ▼
┌────────┐   ┌──────────┐   ┌──────────────┐
│  sold  │   │ reserved │   │ in_workshop  │
└────────┘   └──────────┘   └──────┬───────┘
                                   │
                                   ▼
                             ┌──────────┐
                             │ available │
                             └──────────┘
```

### Daily Automated Metrics

| Table                      | Scheduled | Content                           |
| -------------------------- | --------- | --------------------------------- |
| daily_inventory_snapshot   | Midnight  | Point-in-time inventory value     |
| category_inventory_metrics | Daily     | Category performance              |
| inventory_aging_summary    | Daily     | 0-30, 31-60, 61-90, 90+ day aging |
| inventory_turnover_metrics | Monthly   | Turnover ratio, DIO               |

---

## 4. WORKSHOP ORDERS WORKFLOW

### Status Flow

```
pending → accepted → in_progress → completed → delivered
   │
   └─────────► rejected
```

### Data Flow

1. Create workshop order with estimated cost
2. Workshop accepts and starts work
3. Update inventory item status to 'in_workshop'
4. Complete with actual cost
5. Record payment and update workshop balance
6. Return item to 'available' status

---

## 5. DELIVERY WORKFLOW

### Tables Involved

`sales` → `deliveries` → `courier_companies` → `courier_payments` → `courier_transactions`

### Step-by-Step Flow

```
1. CREATE DELIVERY (after sale completion)
   POST /deliveries
   ├── id_sale (which sale to deliver)
   ├── id_courier (which courier company)
   ├── delivery_cost
   ├── cost_paid_by ('shop' or 'customer')
   ├── recipient_name, delivery_address
   └── status = 'pending'

   TRIGGER: check_courier_delivery_validity
   └── Validates courier exists and is active

2. SHIP ITEMS
   UPDATE deliveries SET
   ├── status = 'shipped'
   ├── shipped_date = NOW()
   ├── tracking_number = 'TRACK123'
   └── estimated_delivery_date = future_date

3. TRACK DELIVERY COST (automatic ledger)
   INSERT courier_transactions
   ├── transaction_type = 'delivery'
   ├── reference_id = id_delivery
   ├── debit_amount = delivery_cost (shop owes courier)
   └── TRIGGER: sync_courier_balance
       └── Updates courier_companies.current_balance

4. UPDATE TRANSIT STATUS
   UPDATE deliveries SET status = 'in_transit'

5. COMPLETE DELIVERY
   UPDATE deliveries SET
   ├── status = 'delivered'
   └── delivered_date = NOW()

   OR (if failed):
   UPDATE deliveries SET status = 'failed' / 'returned'

6. PAY COURIER
   POST /courier_payments
   ├── id_courier
   ├── payment_type ('cash', 'cheque', 'bank_transfer')
   ├── amount
   └── payment_date

   AUTOMATIC: Creates courier_transaction
   ├── transaction_type = 'payment'
   ├── credit_amount = payment (reduces balance)
   └── TRIGGER: sync_courier_balance
       └── Updates courier_companies.current_balance
```

### Status Flow

```
pending → shipped → in_transit → delivered
                         │
                         ├──► failed
                         └──► returned
```

### Balance Tracking

- `current_balance` on courier_companies = amount shop owes
- Delivery creates debit (increases balance)
- Payment creates credit (decreases balance)
- Immutable ledger in courier_transactions

### Business Rules

- Cannot delete deliveries (RESTRICTIVE DELETE policy)
- Cannot delete courier_companies (soft delete only)
- courier_transactions is immutable (no UPDATE/DELETE)
- Courier must be active to create delivery

---

## 6. EXPENSE MANAGEMENT WORKFLOW

### With Budget Tracking

```
1. RECORD EXPENSE
   POST /expenses
   ├── Check if amount > category.approval_threshold
   └── Set approval_status = 'pending' if threshold exceeded

2. BUDGET TRACKING (automatic)
   POST /budget_transactions
   └── TRIGGER: sync_budget_usage

3. APPROVAL WORKFLOW (if required)
   PUT /expenses → approval_status = 'approved'/'rejected'
   POST /expense_approvals (audit record)

4. PAY EXPENSE
   POST /expense_payments
   └── TRIGGER: sync_expense_payment_status
```

---

## 7. PAYROLL WORKFLOW

### Complete Cycle

```
1. CONFIGURE SALARY
   POST /staff_salary_configs (base, allowances, deductions)

2. CREATE PERIOD
   POST /salary_periods (monthly)

3. GENERATE RECORDS
   Auto-calculate gross/net for each employee

4. ADJUSTMENTS
   POST /salary_adjustments (bonus/penalty)
   POST /salary_advances (advance requests)

5. APPROVE & PAY
   UPDATE salary_records SET status = 'approved'
   POST /salary_payments

6. CLOSE PERIOD
   UPDATE salary_periods SET status = 'closed'
```

---

## 8. SHOP TRANSFERS WORKFLOW

### Inter-Shop Inventory Movement

```
1. CREATE TRANSFER
   POST /shop_transfers (from_shop, to_shop)

2. ADD ITEMS
   POST /shop_transfer_items
   └── TRIGGER: validate_shop_transfer

3. SHIP
   UPDATE shop_transfers SET status = 'shipped'

4. RECEIVE
   UPDATE shop_transfers SET status = 'received'
   └── Items ownership changes to receiving shop

5. LEDGER ENTRIES
   POST /shop_transfer_transactions (for both shops)

6. SETTLEMENT (if sale-type transfer)
   POST /shop_transfer_settlements
```

---

## 9. SUBSCRIPTION LIMITS ENFORCEMENT

### Limits Checked

| Check Type | Enforced By                     | Behavior   |
| ---------- | ------------------------------- | ---------- |
| Shops      | `enforce_shop_limit_trigger`    | Hard block |
| Storage    | `enforce_storage_limit_trigger` | Hard block |
| Staff      | `enforce_staff_limit_on_access` | Hard block |
| Features   | API middleware                  | Soft block |

### Function: `check_subscription_limits(p_shop_id, p_check_type)`

Returns: `(within_limit, current_usage, max_allowed, message)`

---

## 10. AI FEATURES & CREDIT SYSTEM

### Credit Flow

```
1. MONTHLY POOL ALLOCATION
   POST /ai_credit_pools (total_credits for shop)

2. USER ALLOCATION
   POST /ai_credit_allocations (per-user limits)

3. CONVERSATION
   POST /ai_conversations → POST /ai_messages

4. TOKEN TRACKING (automatic)
   POST /ai_token_usage (immutable)
   └── TRIGGER: sync_ai_credit_usage

5. OPERATION APPROVAL
   POST /ai_operations (pending_review)
   PUT /ai_operations (approved/rejected)
   └── Execute approved operations
```

---

## 11. ANALYTICS & METRICS SYSTEM

### Automated Calculations

| Trigger Event        | Metric Updated          |
| -------------------- | ----------------------- |
| Sale created/updated | daily_shop_metrics      |
| Purchase created     | daily_shop_metrics      |
| Expense recorded     | daily_financial_metrics |
| Customer created     | daily_customer_metrics  |
| Midnight job         | All daily snapshots     |
| Weekly job           | weekly_shop_metrics     |
| Monthly job          | monthly_profit_loss     |

### Key Performance Indicators

**Financial KPIs:**

- Gross Margin % = (Gross Profit / Revenue) × 100
- Operating Margin % = (Operating Profit / Revenue) × 100

**Inventory KPIs:**

- Turnover Ratio = COGS / Average Inventory Value
- Days Inventory Outstanding = 365 / Turnover Ratio

**Customer KPIs:**

- Customer Lifetime Value
- Average Transaction Value
- Repeat Customer Rate %

---

# Part 3: Security Architecture

## 1. MULTI-TENANCY MODEL

### Shop Isolation Function

```sql
CREATE OR REPLACE FUNCTION public.get_user_shop_ids()
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN (SELECT (auth.jwt() -> 'app_metadata' -> 'shop_ids')::uuid[]);
EXCEPTION
  WHEN OTHERS THEN
    RETURN ARRAY[]::uuid[];
END;
$function$
```

**How It Works:**

- Extracts shop IDs from JWT token's app_metadata
- Called in 106+ RLS policies
- Returns empty array if not authenticated

### Role Hierarchy

| Role        | Level | Key Permissions                                 |
| ----------- | ----- | ----------------------------------------------- |
| **Owner**   | 1     | Full system access, staff management, approvals |
| **Manager** | 2     | Staff management, expense approval, analytics   |
| **Finance** | 3     | Payroll, salary management, financial reports   |
| **Staff**   | 4     | Sales, customer management, basic operations    |

---

## 2. RLS POLICY PATTERNS

### Pattern 1: Shop Isolation (42 tables)

```sql
-- Used by: sales, customers, suppliers, inventory_items, etc.
qual = "(id_shop = ANY (get_user_shop_ids()))"
```

### Pattern 2: Shop + User Isolation (8 tables)

```sql
-- Used by: ai_conversations, notifications, user_preferences
qual = "((id_shop = ANY (get_user_shop_ids())) AND (id_user = auth.uid()))"
```

### Pattern 3: Role-Based Access (7 tables)

```sql
-- Used by: salary_records, salary_payments, expense_approvals
qual = "((id_shop = ANY (get_user_shop_ids()))
  AND (get_user_shop_role(id_shop) = ANY (ARRAY['owner', 'manager', 'finance'])))"
```

### Pattern 4: No-Delete Protection (16 tables)

```sql
-- RESTRICTIVE policy - blocks all deletes
-- Used by: sales, purchases, customers, expenses, inventory_items
cmd = "DELETE", qual = "false"
```

### Pattern 5: Insert-Only Ledgers (5 tables)

```sql
-- Used by: customer_transactions, supplier_transactions, etc.
-- INSERT allowed, SELECT with shop isolation, no UPDATE/DELETE
```

### Pattern 6: Read-Only (2 tables)

```sql
-- Used by: plans, roles
-- Public SELECT, no modification
```

### Pattern 7: Deny-All (8 tables)

```sql
-- Used by: login_attempts, password_history, schema_migrations
qual = "false" -- No user access, backend only
```

---

## 3. PERMISSION SYSTEM

### Permission Structure (JSONB)

```json
{
  "inventory.view": true,
  "inventory.manage": true,
  "sales.create": true,
  "sales.void": false,
  "expenses.approve": false,
  "payroll.view": false,
  "staff.manage_roles": false,
  "ai.use": true,
  "ai.approve_operations": false
}
```

### Permission Override

- Roles have default permissions via `get_owner_default_permissions()` / `get_staff_default_permissions()`
- Individual overrides stored in `shop_access.permissions`
- Merged at runtime: defaults + overrides

---

## 4. IMMUTABLE DATA PROTECTION

### Protected Ledger Tables (9 tables)

| Table                      | Protection                  | Purpose          |
| -------------------------- | --------------------------- | ---------------- |
| audits_logs                | prevent_ledger_modification | Audit trail      |
| customer_transactions      | prevent_ledger_modification | Customer balance |
| supplier_transactions      | prevent_ledger_modification | Supplier balance |
| courier_transactions       | prevent_ledger_modification | Courier balance  |
| workshop_transactions      | prevent_ledger_modification | Workshop balance |
| shop_transfer_transactions | prevent_ledger_modification | Transfer ledger  |
| shop_transfer_settlements  | prevent_ledger_modification | Settlements      |
| ai_token_usage             | prevent_ledger_modification | AI usage         |
| budget_transactions        | prevent_ledger_modification | Budget tracking  |

### Trigger Function

```sql
CREATE OR REPLACE FUNCTION public.prevent_ledger_modification()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'UPDATE forbidden on immutable ledger table "%"', TG_TABLE_NAME;
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'DELETE forbidden on immutable ledger table "%"', TG_TABLE_NAME;
  END IF;
  RETURN NULL;
END;
$function$
```

### Correction Mechanism

- Create compensating entries (new entry with opposite values)
- Original entries remain for audit trail
- Meets financial compliance requirements

---

## 5. AUTHENTICATION & RATE LIMITING

### Tables

| Table            | Purpose             | RLS      |
| ---------------- | ------------------- | -------- |
| login_attempts   | Track failed logins | Deny-all |
| auth_rate_limits | Rate limit tracking | Deny-all |
| ip_rate_limits   | IP-based limits     | Deny-all |
| password_history | Password audit      | Deny-all |

### Rate Limiting Algorithm

1. On failed login: increment attempt_count
2. If count > threshold: set blocked_until
3. On login attempt: check if blocked
4. On success: reset counter

---

## 6. AUDIT TRAIL

### audits_logs Table

| Column     | Purpose                |
| ---------- | ---------------------- |
| id_shop    | Which shop             |
| id_user    | Who made change        |
| action     | INSERT/UPDATE/DELETE   |
| table_name | Which table            |
| record_id  | Which record           |
| old_values | Previous state (JSONB) |
| new_values | New state (JSONB)      |
| ip_address | Source IP              |
| user_agent | Browser/client         |
| session_id | Session tracking       |
| request_id | Request correlation    |

---

## 7. RLS POLICY SUMMARY

| Pattern        | Count | Tables               |
| -------------- | ----- | -------------------- |
| Shop Isolation | 42    | Core business tables |
| Shop + User    | 8     | Personal data        |
| Role-Based     | 7     | Payroll, approvals   |
| No-Delete      | 16    | Financial records    |
| Insert-Only    | 5     | Ledger tables        |
| Read-Only      | 2     | Reference data       |
| Deny-All       | 8     | System tables        |

**Total: 116 RLS policies across 106 tables**

---

## 8. THREAT MITIGATIONS

| Threat                     | Mitigation                  |
| -------------------------- | --------------------------- |
| Unauthorized tenant access | RLS + JWT shop_ids          |
| Privilege escalation       | RBAC policies               |
| Data tampering             | Immutable ledger triggers   |
| Audit log tampering        | Ledger immutability         |
| Brute force                | Rate limiting               |
| Accidental deletion        | RESTRICTIVE delete policies |
| Invalid state transitions  | Status validation triggers  |

---

# Part 4: Design Patterns Summary

## 1. Multi-Tenancy Pattern

- **Anchor:** `shops.id_shop` in 130+ tables
- **Isolation:** RLS via `get_user_shop_ids()`
- **Access:** `shop_access` junction table

## 2. Soft Delete Pattern

- `deleted_at` timestamp column
- Queries use `WHERE deleted_at IS NULL`
- Enables data recovery

## 3. Optimistic Locking Pattern

- `version` integer column
- Incremented on UPDATE via `bump_version_trigger`
- Client includes `WHERE version = X`

## 4. Balance Ledger Pattern

- Transaction table (immutable)
- Balance field on entity
- Sync trigger updates balance on insert

## 5. Payment Status Pattern

- `payment_status`: 'unpaid'/'partial'/'paid'
- Auto-updated via sync trigger
- Based on SUM of payments vs total

## 6. Approval Workflow Pattern

- `approval_status`: 'pending'/'approved'/'rejected'
- Approval audit table
- Threshold-based requirements

## 7. Sequence Number Pattern

- For ledger transaction ordering
- 7 sequences for 7 ledger types
- Ensures audit trail integrity

---

## 12. SHOP RESET SYSTEM (2-Phase Confirmation)

### Overview

Allows shop owners to completely reset their shop data and start fresh. Uses a 2-phase confirmation system for safety.

### Tables

#### **shop_reset_tokens** (Primary Key: `id`)

Temporary tokens for reset confirmation (5-minute expiry)

| Column     | Type        | Purpose                                   |
| ---------- | ----------- | ----------------------------------------- |
| id         | uuid        | Primary key                               |
| id_shop    | uuid        | FK → shops                                |
| id_user    | uuid        | FK → users (must be owner)                |
| token      | uuid        | Confirmation token                        |
| expires_at | timestamptz | Token expiry (default: NOW() + 5 minutes) |
| created_at | timestamptz | When requested                            |

**RLS:** Owner can only see their own tokens

### Functions

| Function                                 | Purpose                                              |
| ---------------------------------------- | ---------------------------------------------------- |
| `request_shop_reset(p_shop_id)`          | Phase 1: Generates confirmation token (5-min expiry) |
| `confirm_shop_reset(p_shop_id, p_token)` | Phase 2: Executes reset with valid token             |
| `cleanup_expired_reset_tokens()`         | Maintenance: Removes expired tokens                  |

### Workflow

```
1. REQUEST RESET (owner only)
   SELECT request_shop_reset('shop-uuid');
   └── Returns: { "token": "abc-123...", "expires_in_minutes": 5 }
   └── Creates audit log: SHOP_RESET_REQUESTED

2. CONFIRM WITHIN 5 MINUTES
   SELECT confirm_shop_reset('shop-uuid', 'abc-123...');
   ├── Validates token not expired
   ├── Disables immutable ledger triggers temporarily
   ├── Deletes all shop data (70+ tables) in FK order
   ├── Re-enables triggers
   ├── Resets staff permissions to defaults
   ├── Resets shop counters
   └── Creates audit logs: SHOP_RESET_CONFIRMED, SHOP_RESET_COMPLETED
```

### What Gets Preserved

- Shop record itself
- All staff `shop_access` records (permissions reset to defaults)
- Subscription linkage
- All audit logs (including reset events)

### What Gets Deleted

- All transactions/ledgers (70+ tables)
- All customers, suppliers, workshops, couriers
- All sales, purchases, expenses
- All inventory items
- All payroll data
- All metrics/analytics
- All AI conversations
- All files/documents
- All notifications

### Security

- **Owner-only**: Only shop owner can initiate and confirm
- **SECURITY DEFINER**: Functions run with elevated privileges
- **Time-limited**: Token expires in 5 minutes
- **Audit trail**: All reset actions logged before execution
- **Fail-safe**: Triggers re-enabled even on error

---

# Appendix A: Key Functions

| Function                                             | Purpose                                |
| ---------------------------------------------------- | -------------------------------------- |
| `get_user_shop_ids()`                                | Returns shops user can access          |
| `get_user_shop_role(p_shop_id)`                      | Returns user's role in shop            |
| `calculate_customer_balance(p_customer_id)`          | Gets customer balance                  |
| `calculate_supplier_balance(p_supplier_id)`          | Gets supplier balance                  |
| `calculate_courier_balance(p_courier_id)`            | Gets courier balance                   |
| `calculate_workshop_balance(p_workshop_id)`          | Gets workshop balance                  |
| `create_customer_transaction(...)`                   | Creates customer ledger entry          |
| `create_supplier_transaction(...)`                   | Creates supplier ledger entry          |
| `generate_sale_number(p_shop_id)`                    | Auto-generates sale numbers            |
| `generate_invoice_number(p_shop_id)`                 | Auto-generates invoice numbers         |
| `check_subscription_limits(p_shop_id, p_check_type)` | Validates subscription limits          |
| `get_subscription_limits(p_shop_id)`                 | Returns usage vs limits                |
| `prevent_ledger_modification()`                      | Blocks UPDATE/DELETE on ledgers        |
| `update_daily_shop_metrics(p_shop_id, p_date)`       | Updates daily metrics                  |
| `run_daily_maintenance()`                            | Daily cleanup tasks                    |
| `request_shop_reset(p_shop_id)`                      | Phase 1: Request shop reset, get token |
| `confirm_shop_reset(p_shop_id, p_token)`             | Phase 2: Execute shop reset with token |
| `cleanup_expired_reset_tokens()`                     | Remove expired reset tokens            |

---

# Appendix B: Installed Extensions

| Extension          | Purpose                 |
| ------------------ | ----------------------- |
| pg_graphql         | GraphQL support         |
| supabase_vault     | Secret management       |
| uuid-ossp          | UUID generation         |
| pgcrypto           | Cryptographic functions |
| pg_stat_statements | Query statistics        |
| plpgsql            | Procedural language     |

---

# Appendix C: Applied Migrations

1. `20251126130740_security_fixes`
2. `20251126131656_critical_security_fixes`
3. `20251126131759_create_fk_indexes`
4. `20251126134454_unified_permission_system_part1`
5. `20251126134522_unified_permission_system_part2`
6. `20251126134604_unified_permission_system_part3`
7. `20251126134619_unified_permission_system_part4`
8. `20251126194650_add_shop_reset_function` - Initial single-function reset
9. `20251126195832_shop_reset_2phase_system` - 2-phase reset with token confirmation
10. `20251129010819_create_auth_user_sync_trigger` - Syncs auth.users to public.users
11. `20251129022119_fix_users_rls_policy_auth_id` - RLS policy fix for auth_id
12. `20251130000907_fix_subscriptions_rls_policy` - Subscriptions RLS fix
13. `20251130001000_fix_shop_access_rls_policy` - Shop access RLS fix
14. `20251130001041_fix_shops_rls_policy` - Shops RLS fix
15. `20251130002250_fix_rls_infinite_recursion` - Fix RLS infinite recursion
16. `20251130002437_disable_users_staff_visibility_policy` - Disable staff visibility policy
17. `20251130002628_fix_shop_access_insert_policy` - Shop access insert policy fix
18. `20251130003220_fix_setup_shop_defaults_tax_types` - Fix setup shop defaults for tax types

---

_Documentation generated from AymurDB Supabase database analysis_
_Project ID: cudcrgjshblmxtgpstwr_
_Region: eu-central-2_
_PostgreSQL Version: 17.6.1_
