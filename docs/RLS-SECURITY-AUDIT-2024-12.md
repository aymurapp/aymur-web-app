# RLS Security Audit Report - December 2024

## Overview

This document describes critical security vulnerabilities discovered during a comprehensive Row Level Security (RLS) policy audit of the Aymur Platform database, and the fixes applied to remediate them.

**Audit Date:** December 9, 2024
**Database:** AymurDB (Supabase)
**Total Policies Reviewed:** 118 policies across 95 tables

---

## Executive Summary

Four critical/high-severity security vulnerabilities were identified and fixed:

| Priority | Issue                       | Risk                           | Migration Applied                   |
| -------- | --------------------------- | ------------------------------ | ----------------------------------- |
| CRITICAL | shop_access role escalation | Privilege escalation to owner  | `fix_shop_access_role_escalation`   |
| CRITICAL | subscriptions manipulation  | Free subscription upgrades     | `fix_subscriptions_readonly_policy` |
| HIGH     | expenses approval bypass    | Unauthorized expense approvals | `fix_expenses_approval_protection`  |
| HIGH     | salary_periods missing RBAC | Payroll manipulation           | `fix_salary_periods_rbac`           |

---

## Vulnerability Details

### 1. shop_access Role Escalation (CRITICAL)

**Discovery:**
The `shop_access` table had a policy `shop_access_own_update` that allowed users to perform ALL operations on their own records. Combined with the fact that roles are publicly readable, this created a privilege escalation vulnerability.

**Attack Vector:**

```sql
-- Any authenticated staff member could become owner:
UPDATE shop_access
SET id_role = 'cd2c64be-def1-42e2-985c-26d3b73f0d64'  -- owner role UUID
WHERE id_user = auth.uid();
```

**Impact:**

- Complete RBAC bypass
- Staff could escalate to owner role
- Access to all salary/payroll data
- Ability to manage staff, approve expenses, modify shop settings

**Fix Applied:**
Created trigger `prevent_role_self_escalation_trigger` that blocks users from modifying `id_role`, `permissions`, or `is_active` on their own records.

```sql
-- Function: private.prevent_role_self_escalation()
-- Trigger: prevent_role_self_escalation_trigger ON shop_access
```

---

### 2. Subscriptions Manipulation (CRITICAL)

**Discovery:**
The `subscriptions` table had a policy `subscriptions_own` allowing ALL operations for users on their own records. The existing trigger `enforce_subscription_downgrade` only validated plan changes, not status or date modifications.

**Attack Vector:**

```sql
-- User could grant themselves unlimited free access:
UPDATE subscriptions
SET status = 'active',
    current_period_end = NOW() + INTERVAL '100 years'
WHERE id_user = auth.uid();
```

**Impact:**

- Free subscription upgrades
- Extended access without payment
- Revenue loss and license violations

**Fix Applied:**

1. Replaced `subscriptions_own` (ALL) with `subscriptions_own_read` (SELECT only)
2. Added triggers to prevent any direct INSERT/UPDATE/DELETE by authenticated users
3. All subscription modifications must now go through Stripe webhooks (service_role)

```sql
-- Policy: subscriptions_own_read (SELECT only)
-- Function: private.protect_subscription_modifications()
-- Triggers: protect_subscription_insert_trigger, protect_subscription_update_trigger, protect_subscription_delete_trigger
```

---

### 3. Expenses Approval Bypass (HIGH)

**Discovery:**
The `expenses` table had standard shop isolation allowing ALL operations. While `expense_approvals` table had proper RBAC (owner/manager only), the `expenses.approval_status` column was unprotected.

**Attack Vector:**

```sql
-- Staff could approve their own expenses:
UPDATE expenses
SET approval_status = 'approved'
WHERE id_expense = 'expense-uuid';
```

**Impact:**

- Unauthorized expense approvals
- Potential financial fraud
- Bypassing of approval workflow

**Fix Applied:**
Created trigger `protect_expense_approval_trigger` that only allows owner/manager roles to modify the `approval_status` field.

```sql
-- Function: private.protect_expense_approval_status()
-- Trigger: protect_expense_approval_trigger ON expenses
```

---

### 4. salary_periods Missing RBAC (HIGH)

**Discovery:**
All payroll tables (`salary_records`, `salary_payments`, `salary_advances`, `salary_adjustments`, `staff_salary_configs`) required owner/manager/finance roles. However, `salary_periods` only had standard shop isolation.

**Attack Vector:**

```sql
-- Staff could manipulate payroll periods:
UPDATE salary_periods
SET period_end = NOW() - INTERVAL '1 month'
WHERE id_shop = 'shop-uuid';
```

**Impact:**

- Payroll timing manipulation
- Potential to affect salary calculations
- Inconsistent access control

**Fix Applied:**
Replaced `salary_periods_isolation` policy with `salary_periods_rbac` requiring owner/manager/finance roles, matching all other payroll tables.

```sql
-- Policy: salary_periods_rbac (owner, manager, finance roles only)
```

---

## Security Architecture Overview

### Multi-tenant Isolation

All shop-scoped tables use the `get_user_shop_ids()` function for tenant isolation:

```sql
qual = (id_shop = ANY(get_user_shop_ids()))
```

This function returns an array of shop IDs the current user has access to via `shop_access` table.

### RBAC Implementation

Role-based access control is implemented using `get_user_shop_role(shop_id)` function:

```sql
SELECT r.role_name FROM shop_access sa
JOIN roles r ON r.id_role = sa.id_role
WHERE sa.id_shop = p_shop_id
  AND sa.id_user = get_current_user_id()
  AND sa.is_active = true
```

**Available Roles:**
| Role | Permissions |
|------|-------------|
| owner | Full access to all features |
| manager | Most features except some owner-only operations |
| finance | Payroll and financial operations |
| staff | Basic operations, limited access |

### Immutable Ledger Pattern

Transaction tables use INSERT + SELECT only policies to maintain audit trails:

- `customer_transactions`
- `supplier_transactions`
- `workshop_transactions`
- `courier_transactions`
- `budget_transactions`
- `shop_transfer_transactions`
- `audits_logs`

### No-Delete Protection

Critical tables have RESTRICTIVE `no_delete` policies:

- `customers`, `suppliers`, `workshops`
- `sales`, `sale_items`, `sale_payments`
- `purchases`, `expenses`, `expense_payments`
- `inventory_items`
- `salary_records`, `salary_payments`, `salary_advances`
- And more...

---

## Remaining Considerations

### Medium Priority (Recommended for Future)

| Issue                 | Table                | Recommendation                             |
| --------------------- | -------------------- | ------------------------------------------ |
| API keys exposure     | `api_keys`           | Add RBAC (owner only)                      |
| File uploads exposure | `file_uploads`       | Add entity-based or file_type restrictions |
| Document templates    | `document_templates` | Add RBAC for UPDATE/DELETE                 |
| Staff invitations     | `staff_invitations`  | Add DELETE policy for owner/manager        |

### Low Priority (Design Decisions)

| Issue                       | Notes                                                              |
| --------------------------- | ------------------------------------------------------------------ |
| Catalog table deletes       | Consider soft-delete for `product_categories`, `metal_types`, etc. |
| `plans`/`roles` public read | Intentional for pricing pages                                      |

---

## Testing Recommendations

After applying these fixes, verify:

1. **shop_access**: Staff cannot change their own role

   ```sql
   -- Should fail with "Security violation: Cannot modify your own role"
   UPDATE shop_access SET id_role = 'owner-uuid' WHERE id_user = auth.uid();
   ```

2. **subscriptions**: Users cannot modify subscription

   ```sql
   -- Should fail with "Subscriptions can only be modified through Stripe"
   UPDATE subscriptions SET status = 'active' WHERE id_user = auth.uid();
   ```

3. **expenses**: Staff cannot approve expenses

   ```sql
   -- Should fail with "Only owners or managers can change expense approval status"
   UPDATE expenses SET approval_status = 'approved' WHERE id_expense = 'some-uuid';
   ```

4. **salary_periods**: Staff cannot access salary periods
   ```sql
   -- Should return empty set for staff role
   SELECT * FROM salary_periods;
   ```

---

## Migrations Applied

| Migration Name                      | Applied Date | Description                         |
| ----------------------------------- | ------------ | ----------------------------------- |
| `fix_shop_access_role_escalation`   | 2024-12-09   | Prevent role self-escalation        |
| `fix_subscriptions_readonly_policy` | 2024-12-09   | Restrict subscriptions to read-only |
| `fix_expenses_approval_protection`  | 2024-12-09   | Protect expense approval status     |
| `fix_salary_periods_rbac`           | 2024-12-09   | Add RBAC to salary_periods          |

---

## Audit Methodology

1. Extracted all RLS policies from `pg_policies` system view
2. Analyzed each policy for:
   - Correct tenant isolation
   - RBAC consistency across related tables
   - Potential privilege escalation vectors
   - Missing policies for sensitive operations
3. Used sequential thinking to systematically evaluate 20 potential issues
4. Verified vulnerabilities by examining:
   - Table structures
   - Trigger definitions
   - Function implementations
5. Applied fixes via Supabase migrations

---

## Contact

For questions about this audit or the security architecture, contact the development team.

---

_This document is part of the Aymur Platform security documentation._
