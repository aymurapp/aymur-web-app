# RLS Security Audit Report - December 2024

## Overview

This document describes security vulnerabilities discovered during a comprehensive Row Level Security (RLS) policy audit of the Aymur Platform database, and the fixes applied.

**Audit Date:** December 9, 2024
**Database:** AymurDB (Supabase)
**Total Policies Reviewed:** 118 policies across 95 tables

---

## Executive Summary

### Critical Fixes Applied

| Priority | Issue                                       | Migration                           |
| -------- | ------------------------------------------- | ----------------------------------- |
| CRITICAL | `get_user_shop_ids()` returning empty array | `fix_get_user_shop_ids_to_query_db` |
| CRITICAL | shop_access role escalation                 | `fix_shop_access_role_escalation`   |
| CRITICAL | subscriptions manipulation                  | `fix_subscriptions_readonly_policy` |
| HIGH     | expenses approval bypass                    | `fix_expenses_approval_protection`  |
| HIGH     | salary_periods missing RBAC                 | `fix_salary_periods_rbac`           |

---

## Vulnerability Details

### 1. get_user_shop_ids() Empty Array (CRITICAL)

**Issue:** The core RLS function `get_user_shop_ids()` was reading from JWT `app_metadata.shop_ids`, but this metadata was never populated. Result: ALL RLS checks failed for ALL users.

**Root Cause:**

```sql
-- OLD FUNCTION (broken):
RETURN (SELECT (auth.jwt() -> 'app_metadata' -> 'shop_ids')::uuid[]);
-- JWT only had: {"provider": "email", "providers": ["email"]}
-- No shop_ids = empty array = all RLS fails
```

**Fix Applied:**

```sql
-- NEW FUNCTION (working):
-- 1. Gets auth.uid() from JWT
-- 2. Finds public.users.id_user from auth_id
-- 3. Queries shop_access directly (SECURITY DEFINER bypasses RLS)
-- 4. Returns array of shop IDs where user is active
```

**Security:** Uses SECURITY DEFINER with locked search_path. Safe because:

- No user-controlled inputs
- auth.uid() is cryptographically verified
- Fails closed (returns empty array on error)

---

### 2. shop_access Role Escalation (CRITICAL)

**Issue:** Users could UPDATE their own `shop_access.id_role` to escalate from staff to owner.

**Fix:** Trigger `prevent_role_self_escalation_trigger` blocks users from modifying `id_role`, `permissions`, or `is_active` on their own records.

---

### 3. subscriptions Manipulation (CRITICAL)

**Issue:** Users could UPDATE their subscription `status`, `id_plan`, `current_period_end`.

**Fix:**

- Policy changed from ALL to SELECT only
- Triggers block INSERT/UPDATE/DELETE by authenticated users
- Only service_role (Stripe webhooks) can modify

---

### 4. expenses Approval Bypass (HIGH)

**Issue:** Staff could UPDATE `expenses.approval_status` directly, bypassing workflow.

**Fix:** Trigger `protect_expense_approval_trigger` only allows owner/manager to change approval status.

---

### 5. salary_periods Missing RBAC (HIGH)

**Issue:** Only payroll table without role restrictions.

**Fix:** Policy `salary_periods_rbac` now requires owner/manager/finance roles.

---

## Security Architecture

### Multi-tenant Isolation Flow

```
User Request
    │
    ▼
┌─────────────────────────────────────┐
│  auth.uid() from JWT signature      │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  get_user_shop_ids()                │
│  - Looks up users.id_user           │
│  - Queries shop_access              │
│  - Returns [shop_id1, shop_id2...]  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  RLS Policy Check                   │
│  id_shop = ANY(get_user_shop_ids()) │
└─────────────────────────────────────┘
    │
    ▼
  Data (only from authorized shops)
```

### UUID in URL Security

Shop UUIDs visible in URLs (e.g., `/en/efc45c18-.../customers`) is **secure**:

- UUIDs are identifiers, not secrets
- Security enforced by RLS, not URL obscurity
- Same pattern used by GitHub, Stripe, Notion, Google Drive
- UUIDv4 has 2^122 possibilities (impossible to guess)

---

## Migrations Applied

| Version        | Name                              | Description                  |
| -------------- | --------------------------------- | ---------------------------- |
| 20251209213753 | fix_shop_access_role_escalation   | Prevent role self-escalation |
| 20251209213812 | fix_subscriptions_readonly_policy | Restrict to read-only        |
| 20251209213826 | fix_expenses_approval_protection  | Protect approval status      |
| 20251209213841 | fix_salary_periods_rbac           | Add RBAC restrictions        |
| 20251209XXXXXX | fix_get_user_shop_ids_to_query_db | Query DB instead of JWT      |

---

## Testing

After applying fixes, verify:

1. **Create customer/supplier** - Should work now (was blocked by empty shop_ids)
2. **Staff cannot change own role** - Should fail with security violation
3. **User cannot modify subscription** - Should fail with Stripe message
4. **Staff cannot approve expenses** - Should fail unless owner/manager

---

_This document is part of the Aymur Platform security documentation._
