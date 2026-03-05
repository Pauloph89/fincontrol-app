

## Plan: Multi-Tenant Architecture for FinControl

### Current State
- All data tables use `user_id` for RLS (single-user isolation)
- Tables: commissions, commission_installments, expenses, expense_rules, expense_categories, bank_entries, audit_log, profiles, user_roles
- Roles enum: admin, financeiro, comercial, visualizador (keeping all 4)
- Company data lives in `profiles` table (company_name, cnpj, logo_url, etc.)

### Architecture Overview

```text
┌─────────────┐
│  companies   │  ← NEW table (tenant anchor)
│  id, name,   │
│  cnpj, logo  │
└──────┬───────┘
       │
       │  company_id (FK)
       ▼
┌─────────────┐     ┌──────────────┐
│  profiles    │────▶│  user_roles  │
│  + company_id│     │  (unchanged) │
└──────┬───────┘     └──────────────┘
       │
       │  company_id added to ALL data tables
       ▼
┌──────────────────────────────────────────┐
│ commissions, expenses, expense_rules,    │
│ expense_categories, bank_entries,        │
│ audit_log                                │
│ RLS: company_id = user's company         │
│ (audit_log: shared read, user-only write)│
└──────────────────────────────────────────┘
```

---

### Phase 1: Database Migration

**1.1 Create `companies` table**
- id (uuid PK), name, cnpj, logo_url, email, phone, primary_color, secondary_color, created_at, updated_at
- RLS: members of the company can read/update

**1.2 Add `company_id` column to all data tables**
- profiles, commissions, expenses, expense_rules, expense_categories, bank_entries, audit_log
- All nullable initially (to not break existing rows)
- Add `external_order_id` to commissions (future integrations)

**1.3 Migrate existing data**
- Create one company per distinct user (using profile data: company_name, cnpj, logo_url)
- Set `company_id` on all existing rows based on `user_id` mapping
- Move company fields (cnpj, logo_url, phone, etc.) into `companies` table
- Make `company_id` NOT NULL after migration

**1.4 Create helper function**
- `get_user_company_id(_user_id uuid)` — SECURITY DEFINER function that returns the company_id from profiles
- Used in RLS policies to avoid recursive lookups

**1.5 Update RLS policies**
- All data tables: `company_id = get_user_company_id(auth.uid())`
- audit_log: SELECT by company, INSERT by own user_id
- companies: SELECT/UPDATE by members

**1.6 Add indexes**
- `company_id` index on all data tables

---

### Phase 2: Auth & Invite System

**2.1 Remove public signup**
- Remove the "Cadastre-se" toggle from `Auth.tsx` — login only

**2.2 Edge function: `invite-user`**
- Admin calls this function with: email, role, company_id
- Function uses Supabase Admin API to create user + send invite email (magic link)
- Sets profile.company_id and user_roles entry

**2.3 Login guard**
- After login, check if user has `company_id` in profile
- If not, show "Usuário não vinculado a nenhuma empresa" and block access

**2.4 Update UserManagement component**
- Add "Adicionar Usuário" button (admin only)
- Form: name, email, role selection
- Calls `invite-user` edge function

---

### Phase 3: Update All Hooks & Queries

Every data hook currently filters by `user_id` via RLS. After migration, RLS handles company isolation automatically, so queries continue working — but we need to:

- Add `company_id` to all INSERT operations (from user's profile)
- Create a `useCompany` hook that loads the current user's company_id from profile
- Update: `useCommissions`, `useExpenses`, `useExpenseRules`, `useExpenseCategories`, `useBankEntries`, `useAuditLog`
- Update `useCompanySettings` to read/write from `companies` table instead of `profiles`

---

### Phase 4: Settings Page Update

- Company settings (name, cnpj, logo, email, phone, colors) now edit the `companies` table
- Financial settings (day_start, alert_days, currency, default_account) stay on `profiles`
- User management: add invite button, show company users

---

### Phase 5: Responsiveness Pass

- Ensure all pages work on mobile/tablet/desktop
- Tables with horizontal scroll on mobile
- Adaptive grids for KPI cards and forms

---

### Risk Mitigation

- Migration is additive (add columns, never drop)
- company_id starts nullable, set via UPDATE, then made NOT NULL
- Existing RLS policies preserved until new ones are verified
- No data deletion — company fields in profiles remain as backup
- Edge function for invite uses service_role_key (already available as secret)

---

### Technical Details

**New DB function:**
```sql
CREATE FUNCTION get_user_company_id(_user_id uuid)
RETURNS uuid AS $$
  SELECT company_id FROM profiles WHERE user_id = _user_id LIMIT 1
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**New RLS pattern (example for commissions):**
```sql
CREATE POLICY "Company members can view commissions"
ON commissions FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));
```

**Edge function `invite-user`:**
- Receives: `{ email, role, name }`
- Uses `SUPABASE_SERVICE_ROLE_KEY` to call `supabase.auth.admin.createUser()`
- Sets `email_confirm: false` to trigger invite email
- Inserts profile and user_roles records

**Files to create/modify:**
- New: `supabase/functions/invite-user/index.ts`
- New: `src/hooks/useCompany.ts`
- Modified: all data hooks (add company_id to inserts)
- Modified: `Auth.tsx` (remove signup)
- Modified: `AuthContext.tsx` (add company check)
- Modified: `Settings.tsx` + `useCompanySettings.ts` (point to companies table)
- Modified: `UserManagement.tsx` (add invite form)
- Migration SQL for schema changes + data migration

