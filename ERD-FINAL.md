# Entity Relationship Diagram (ERD)
## Unified Customer Support & Ticket Management Platform

| Field | Value |
|---|---|
| **Version** | 2.0.0 |
| **Database** | PostgreSQL 16+ |
| **Date** | 2026-04-08 |

---

## Schema Conventions

- **Primary Key:** `BIGSERIAL` (internal), `UUID` v4 via `gen_random_uuid()` (public-facing)
- **Timestamps:** All `TIMESTAMPTZ`, always in UTC
- **Soft Delete:** `deleted_at TIMESTAMPTZ NULL` on all primary entities
- **Audit Columns:** `created_by`, `updated_by`, `deleted_by` → `BIGINT REFERENCES users(id)` on all primary entities
- **Enum Replacement:** All enums stored via the centralized `lookup_types` + `lookups` system
- **Monetary Amounts:** All stored as `BIGINT` in smallest currency unit (halalas / fils / cents)
- **Naming:** `snake_case` for all identifiers

---

## Table of Contents

1. [Lookup System](#1-lookup-system)
2. [Organizations & Branding](#2-organizations--branding)
3. [Users, Roles & Security](#3-users-roles--security)
4. [Contacts](#4-contacts)
5. [Mailboxes & Email](#5-mailboxes--email)
6. [Tickets](#6-tickets)
7. [Ticket Administration — SLA & Custom Fields](#7-ticket-administration--sla--custom-fields)
8. [Saved Replies](#8-saved-replies)
9. [Task Management](#9-task-management)
10. [Form Builder](#10-form-builder)
11. [Workflow & Automation](#11-workflow--automation)
12. [Social Media](#12-social-media)
13. [Channels](#13-channels)
14. [Knowledgebase](#14-knowledgebase)
15. [Binaka Live Chat](#15-binaka-live-chat)
16. [eCommerce Integration](#16-ecommerce-integration)
17. [Agent Performance & Reporting](#17-agent-performance--reporting)
18. [Audit, Notifications & Security Logs](#18-audit-notifications--security-logs)
19. [Currencies & Tax](#19-currencies--tax)
20. [Subscription Plans](#20-subscription-plans)
21. [Plan Features & Limits](#21-plan-features--limits)
22. [Add-Ons](#22-add-ons)
23. [Subscriptions](#23-subscriptions)
24. [Seats & Usage](#24-seats--usage)
25. [Invoices & Payments](#25-invoices--payments)
26. [Payment Methods](#26-payment-methods)
27. [Coupons & Discounts](#27-coupons--discounts)
28. [Gateway Integration Records](#28-gateway-integration-records)
29. [Dunning](#29-dunning)
30. [Platform Revenue Snapshots](#30-platform-revenue-snapshots)
31. [Full Relationships Summary](#31-full-relationships-summary)

---

## 1. Lookup System

### `lookup_types`

Central registry of all configurable enum categories.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `name` | VARCHAR(100) | NOT NULL, UNIQUE | Machine key e.g. `ticket_status` |
| `label` | VARCHAR(150) | NOT NULL | |
| `description` | TEXT | NULL | |
| `is_system` | BOOLEAN | NOT NULL, DEFAULT false | System types cannot be deleted |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Seed values:** `ticket_status`, `ticket_priority`, `task_status`, `task_priority`, `article_status`, `channel_type`, `social_platform`, `ecommerce_platform`, `widget_position`, `form_field_type`, `workflow_trigger`, `workflow_action_type`, `sla_breach_action`, `contact_type`, `agent_role`

---

### `lookups`

All configurable values across the system. Self-referential for hierarchy.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `lookup_type_id` | BIGINT | NOT NULL, FK → lookup_types(id) | |
| `parent_id` | BIGINT | NULL, FK → lookups(id) | For nested lookups |
| `organization_id` | BIGINT | NULL, FK → organizations(id) | NULL = platform-wide |
| `name` | VARCHAR(100) | NOT NULL | Machine key e.g. `open` |
| `label` | VARCHAR(150) | NOT NULL | Display label |
| `label_ar` | VARCHAR(150) | NULL | Arabic label |
| `color` | VARCHAR(7) | NULL | Hex color for badges |
| `icon` | VARCHAR(100) | NULL | |
| `order_by` | INTEGER | NOT NULL, DEFAULT 0 | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `is_default` | BOOLEAN | NOT NULL, DEFAULT false | |
| `metadata` | JSONB | NULL | Extra config per type |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

**Indexes:** `(lookup_type_id, organization_id)`, `(parent_id)`, `(is_active)`

---

## 2. Organizations & Branding

### `organizations`

Top-level multi-tenant entity. Each tenant is one organization.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `name` | VARCHAR(255) | NOT NULL | |
| `slug` | VARCHAR(100) | NOT NULL, UNIQUE | |
| `subdomain` | VARCHAR(100) | NOT NULL, UNIQUE | `{slug}.helpdesk.io` |
| `custom_domain` | VARCHAR(255) | NULL, UNIQUE | |
| `custom_domain_verified` | BOOLEAN | NOT NULL, DEFAULT false | |
| `plan_id` | BIGINT | NULL, FK → subscription_plans(id) | |
| `max_agents` | INTEGER | NULL | Seat limit; NULL = unlimited |
| `locale` | VARCHAR(10) | NOT NULL, DEFAULT 'en' | |
| `timezone` | VARCHAR(50) | NOT NULL, DEFAULT 'UTC' | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `trial_ends_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

### `organization_settings`

Key-value settings per organization.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `key` | VARCHAR(150) | NOT NULL | |
| `value` | TEXT | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(organization_id, key)`

**Common keys:** `business_hours`, `sla_paused_on_pending`, `csat_enabled`, `csat_delay_hours`, `ticket_ref_prefix`, `duplicate_window_minutes`, `spam_filter_enabled`, `max_attachment_mb`

---

### `branding_configs`

Visual customization per organization.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, UNIQUE, FK → organizations(id) | |
| `logo_url` | TEXT | NULL | |
| `favicon_url` | TEXT | NULL | |
| `primary_color` | VARCHAR(7) | NULL | |
| `secondary_color` | VARCHAR(7) | NULL | |
| `background_color` | VARCHAR(7) | NULL | |
| `font_family` | VARCHAR(100) | NULL | |
| `custom_css` | TEXT | NULL | |
| `login_bg_url` | TEXT | NULL | |
| `login_headline` | VARCHAR(255) | NULL | |
| `hide_vendor_branding` | BOOLEAN | NOT NULL, DEFAULT false | |
| `portal_header_html` | TEXT | NULL | |
| `portal_footer_html` | TEXT | NULL | |
| `email_logo_url` | TEXT | NULL | |
| `email_header_color` | VARCHAR(7) | NULL | |
| `email_footer_text` | TEXT | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

---

### `themes`

Per-agent theme preferences.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `user_id` | BIGINT | NOT NULL, UNIQUE, FK → users(id) | |
| `mode` | VARCHAR(20) | NOT NULL, DEFAULT 'light' | `light` / `dark` / `system` |
| `density` | VARCHAR(20) | NOT NULL, DEFAULT 'comfortable' | |
| `sidebar_collapsed` | BOOLEAN | NOT NULL, DEFAULT false | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

## 3. Users, Roles & Security

### `users`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `email` | VARCHAR(255) | NOT NULL | |
| `email_verified_at` | TIMESTAMPTZ | NULL | |
| `password_hash` | VARCHAR(255) | NULL | bcrypt; NULL if OAuth-only |
| `first_name` | VARCHAR(100) | NOT NULL | |
| `last_name` | VARCHAR(100) | NOT NULL | |
| `display_name` | VARCHAR(200) | NULL | |
| `avatar_url` | TEXT | NULL | |
| `phone` | VARCHAR(30) | NULL | |
| `bio` | TEXT | NULL | |
| `signature_html` | TEXT | NULL | Email signature |
| `locale` | VARCHAR(10) | NOT NULL, DEFAULT 'en' | |
| `timezone` | VARCHAR(50) | NOT NULL, DEFAULT 'UTC' | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `is_platform_admin` | BOOLEAN | NOT NULL, DEFAULT false | Cross-org admin |
| `availability_status` | VARCHAR(30) | NOT NULL, DEFAULT 'online' | `online` / `busy` / `away` / `offline` |
| `last_seen_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(organization_id, email)` WHERE `deleted_at IS NULL`

---

### `roles`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `name` | VARCHAR(100) | NOT NULL | |
| `slug` | VARCHAR(100) | NOT NULL | |
| `description` | TEXT | NULL | |
| `is_system` | BOOLEAN | NOT NULL, DEFAULT false | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(organization_id, slug)` WHERE `deleted_at IS NULL`

**System roles seeded:** `owner`, `administrator`, `supervisor`, `agent`, `readonly`

---

### `permissions`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `key` | VARCHAR(150) | NOT NULL, UNIQUE | e.g. `tickets.delete` |
| `label` | VARCHAR(200) | NOT NULL | |
| `group` | VARCHAR(100) | NOT NULL | e.g. `Tickets`, `Reports` |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `role_permissions`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `role_id` | BIGINT | NOT NULL, FK → roles(id) | |
| `permission_id` | BIGINT | NOT NULL, FK → permissions(id) | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(role_id, permission_id)`

---

### `user_roles`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `user_id` | BIGINT | NOT NULL, FK → users(id) | |
| `role_id` | BIGINT | NOT NULL, FK → roles(id) | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(user_id, role_id)`

---

### `teams`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `name` | VARCHAR(150) | NOT NULL | |
| `description` | TEXT | NULL | |
| `auto_assign_method` | VARCHAR(30) | NOT NULL, DEFAULT 'round_robin' | `round_robin` / `load_balanced` / `manual` |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

### `team_members`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `team_id` | BIGINT | NOT NULL, FK → teams(id) | |
| `user_id` | BIGINT | NOT NULL, FK → users(id) | |
| `is_lead` | BOOLEAN | NOT NULL, DEFAULT false | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(team_id, user_id)`

---

### `user_sessions`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | Session token |
| `user_id` | BIGINT | NOT NULL, FK → users(id) | |
| `ip_address` | INET | NOT NULL | |
| `user_agent` | TEXT | NULL | |
| `device_type` | VARCHAR(50) | NULL | `web` / `mobile` / `api` |
| `last_activity_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `expires_at` | TIMESTAMPTZ | NOT NULL | |
| `revoked_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `two_factor_auth`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `user_id` | BIGINT | NOT NULL, UNIQUE, FK → users(id) | |
| `method` | VARCHAR(20) | NOT NULL | `totp` / `email_otp` |
| `totp_secret` | VARCHAR(255) | NULL | Encrypted |
| `backup_codes` | JSONB | NULL | Encrypted array |
| `is_enabled` | BOOLEAN | NOT NULL, DEFAULT false | |
| `enabled_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `api_keys`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `user_id` | BIGINT | NULL, FK → users(id) | |
| `name` | VARCHAR(150) | NOT NULL | |
| `key_hash` | VARCHAR(255) | NOT NULL, UNIQUE | SHA-256 hash |
| `key_prefix` | VARCHAR(10) | NOT NULL | First 8 chars for display |
| `scopes` | JSONB | NOT NULL, DEFAULT '[]' | |
| `last_used_at` | TIMESTAMPTZ | NULL | |
| `expires_at` | TIMESTAMPTZ | NULL | |
| `revoked_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

---

### `ip_whitelist`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `ip_range` | CIDR | NOT NULL | |
| `label` | VARCHAR(150) | NULL | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |

---

## 4. Contacts

### `contacts`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `email` | VARCHAR(255) | NULL | |
| `phone` | VARCHAR(30) | NULL | |
| `first_name` | VARCHAR(100) | NULL | |
| `last_name` | VARCHAR(100) | NULL | |
| `company` | VARCHAR(200) | NULL | |
| `avatar_url` | TEXT | NULL | |
| `contact_type_id` | BIGINT | NULL, FK → lookups(id) | |
| `language` | VARCHAR(10) | NULL | |
| `timezone` | VARCHAR(50) | NULL | |
| `is_blocked` | BOOLEAN | NOT NULL, DEFAULT false | |
| `external_id` | VARCHAR(255) | NULL | ID from eCommerce system |
| `metadata` | JSONB | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(organization_id, email)` WHERE `deleted_at IS NULL`

---

### `contact_notes`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `contact_id` | BIGINT | NOT NULL, FK → contacts(id) | |
| `body` | TEXT | NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NOT NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

## 5. Mailboxes & Email

### `mailboxes`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `name` | VARCHAR(150) | NOT NULL | |
| `email` | VARCHAR(255) | NOT NULL | |
| `reply_to` | VARCHAR(255) | NULL | |
| `connection_type` | VARCHAR(30) | NOT NULL | `imap_smtp` / `gmail_oauth` / `outlook_oauth` / `hosted` |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `is_default` | BOOLEAN | NOT NULL, DEFAULT false | |
| `auto_reply_enabled` | BOOLEAN | NOT NULL, DEFAULT false | |
| `auto_reply_subject` | VARCHAR(255) | NULL | |
| `auto_reply_body_html` | TEXT | NULL | |
| `default_team_id` | BIGINT | NULL, FK → teams(id) | |
| `last_synced_at` | TIMESTAMPTZ | NULL | |
| `sync_error` | TEXT | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

### `mailbox_imap_configs`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `mailbox_id` | BIGINT | NOT NULL, UNIQUE, FK → mailboxes(id) | |
| `host` | VARCHAR(255) | NOT NULL | |
| `port` | INTEGER | NOT NULL | |
| `username` | VARCHAR(255) | NOT NULL | |
| `password_enc` | TEXT | NOT NULL | AES-256 encrypted |
| `use_ssl` | BOOLEAN | NOT NULL, DEFAULT true | |
| `oauth_token_enc` | TEXT | NULL | |
| `oauth_refresh_token_enc` | TEXT | NULL | |
| `oauth_expires_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `mailbox_smtp_configs`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `mailbox_id` | BIGINT | NOT NULL, UNIQUE, FK → mailboxes(id) | |
| `host` | VARCHAR(255) | NOT NULL | |
| `port` | INTEGER | NOT NULL | |
| `username` | VARCHAR(255) | NOT NULL | |
| `password_enc` | TEXT | NOT NULL | |
| `use_tls` | BOOLEAN | NOT NULL, DEFAULT true | |
| `from_name` | VARCHAR(150) | NULL | |
| `from_email` | VARCHAR(255) | NULL | |
| `dkim_private_key_enc` | TEXT | NULL | |
| `dkim_selector` | VARCHAR(100) | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `mailbox_aliases`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `mailbox_id` | BIGINT | NOT NULL, FK → mailboxes(id) | |
| `alias_email` | VARCHAR(255) | NOT NULL, UNIQUE | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |

---

### `email_routing_rules`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `mailbox_id` | BIGINT | NULL, FK → mailboxes(id) | NULL = all mailboxes |
| `name` | VARCHAR(150) | NOT NULL | |
| `conditions` | JSONB | NOT NULL | |
| `action_team_id` | BIGINT | NULL, FK → teams(id) | |
| `action_tag_ids` | BIGINT[] | NULL | |
| `action_priority_id` | BIGINT | NULL, FK → lookups(id) | |
| `order_by` | INTEGER | NOT NULL, DEFAULT 0 | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

### `email_messages`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `mailbox_id` | BIGINT | NOT NULL, FK → mailboxes(id) | |
| `ticket_id` | BIGINT | NULL, FK → tickets(id) | |
| `direction` | VARCHAR(10) | NOT NULL | `inbound` / `outbound` |
| `message_id` | TEXT | NOT NULL, UNIQUE | Email Message-ID header |
| `in_reply_to` | TEXT | NULL | |
| `from_email` | VARCHAR(255) | NOT NULL | |
| `from_name` | VARCHAR(255) | NULL | |
| `to_emails` | JSONB | NOT NULL | |
| `cc_emails` | JSONB | NULL | |
| `bcc_emails` | JSONB | NULL | |
| `subject` | TEXT | NULL | |
| `body_html` | TEXT | NULL | |
| `body_text` | TEXT | NULL | |
| `raw_headers` | JSONB | NULL | |
| `is_spam` | BOOLEAN | NOT NULL, DEFAULT false | |
| `spam_score` | NUMERIC(5,2) | NULL | |
| `bounce_type` | VARCHAR(20) | NULL | `soft` / `hard` |
| `sent_at` | TIMESTAMPTZ | NULL | |
| `received_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `email_attachments`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `email_message_id` | BIGINT | NOT NULL, FK → email_messages(id) | |
| `filename` | VARCHAR(500) | NOT NULL | |
| `mime_type` | VARCHAR(150) | NOT NULL | |
| `size_bytes` | BIGINT | NOT NULL | |
| `storage_key` | TEXT | NOT NULL | S3 object key |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

## 6. Tickets

### `tickets`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `reference_number` | VARCHAR(30) | NOT NULL, UNIQUE | e.g. `TKT-00045` |
| `subject` | TEXT | NOT NULL | |
| `description_html` | TEXT | NULL | |
| `status_id` | BIGINT | NOT NULL, FK → lookups(id) | Lookup: ticket_status |
| `priority_id` | BIGINT | NOT NULL, FK → lookups(id) | Lookup: ticket_priority |
| `channel_id` | BIGINT | NULL, FK → lookups(id) | Lookup: channel_type |
| `contact_id` | BIGINT | NULL, FK → contacts(id) | |
| `assigned_agent_id` | BIGINT | NULL, FK → users(id) | |
| `assigned_team_id` | BIGINT | NULL, FK → teams(id) | |
| `mailbox_id` | BIGINT | NULL, FK → mailboxes(id) | |
| `form_submission_id` | BIGINT | NULL, FK → form_submissions(id) | |
| `social_message_id` | BIGINT | NULL, FK → social_messages(id) | |
| `chat_session_id` | BIGINT | NULL, FK → chat_sessions(id) | |
| `parent_ticket_id` | BIGINT | NULL, FK → tickets(id) | If merged into parent |
| `is_merged` | BOOLEAN | NOT NULL, DEFAULT false | |
| `is_spam` | BOOLEAN | NOT NULL, DEFAULT false | |
| `is_locked` | BOOLEAN | NOT NULL, DEFAULT false | |
| `locked_by` | BIGINT | NULL, FK → users(id) | |
| `locked_at` | TIMESTAMPTZ | NULL | |
| `first_response_at` | TIMESTAMPTZ | NULL | |
| `resolved_at` | TIMESTAMPTZ | NULL | |
| `closed_at` | TIMESTAMPTZ | NULL | |
| `due_at` | TIMESTAMPTZ | NULL | SLA due time |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

**Indexes:** `(organization_id, status_id)`, `(assigned_agent_id)`, `(assigned_team_id)`, `(contact_id)`, `(created_at DESC)`

---

### `ticket_messages`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `ticket_id` | BIGINT | NOT NULL, FK → tickets(id) | |
| `email_message_id` | BIGINT | NULL, FK → email_messages(id) | |
| `author_type` | VARCHAR(20) | NOT NULL | `agent` / `contact` / `system` |
| `author_user_id` | BIGINT | NULL, FK → users(id) | |
| `author_contact_id` | BIGINT | NULL, FK → contacts(id) | |
| `message_type` | VARCHAR(20) | NOT NULL | `reply` / `note` / `activity` |
| `body_html` | TEXT | NULL | |
| `body_text` | TEXT | NULL | |
| `is_private` | BOOLEAN | NOT NULL, DEFAULT false | Internal notes not sent to customer |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

### `ticket_attachments`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `ticket_id` | BIGINT | NOT NULL, FK → tickets(id) | |
| `ticket_message_id` | BIGINT | NULL, FK → ticket_messages(id) | |
| `filename` | VARCHAR(500) | NOT NULL | |
| `mime_type` | VARCHAR(150) | NOT NULL | |
| `size_bytes` | BIGINT | NOT NULL | |
| `storage_key` | TEXT | NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |

---

### `tags`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `name` | VARCHAR(100) | NOT NULL | |
| `color` | VARCHAR(7) | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(organization_id, name)`

---

### `ticket_tags`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `ticket_id` | BIGINT | NOT NULL, FK → tickets(id) | |
| `tag_id` | BIGINT | NOT NULL, FK → tags(id) | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(ticket_id, tag_id)`

---

### `ticket_followers`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `ticket_id` | BIGINT | NOT NULL, FK → tickets(id) | |
| `user_id` | BIGINT | NOT NULL, FK → users(id) | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(ticket_id, user_id)`

---

### `ticket_cc`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `ticket_id` | BIGINT | NOT NULL, FK → tickets(id) | |
| `email` | VARCHAR(255) | NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(ticket_id, email)`

---

### `ticket_merges`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `master_ticket_id` | BIGINT | NOT NULL, FK → tickets(id) | |
| `merged_ticket_id` | BIGINT | NOT NULL, FK → tickets(id) | |
| `merged_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `merged_by` | BIGINT | NOT NULL, FK → users(id) | |

---

### `ticket_custom_field_values`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `ticket_id` | BIGINT | NOT NULL, FK → tickets(id) | |
| `field_id` | BIGINT | NOT NULL, FK → ticket_custom_fields(id) | |
| `value_text` | TEXT | NULL | |
| `value_number` | NUMERIC | NULL | |
| `value_boolean` | BOOLEAN | NULL | |
| `value_date` | TIMESTAMPTZ | NULL | |
| `value_lookup_id` | BIGINT | NULL, FK → lookups(id) | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(ticket_id, field_id)`

---

### `ticket_views`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `user_id` | BIGINT | NULL, FK → users(id) | NULL = shared org-wide |
| `name` | VARCHAR(150) | NOT NULL | |
| `filters` | JSONB | NOT NULL | |
| `sort_by` | VARCHAR(50) | NOT NULL, DEFAULT 'created_at' | |
| `sort_dir` | VARCHAR(4) | NOT NULL, DEFAULT 'desc' | |
| `is_default` | BOOLEAN | NOT NULL, DEFAULT false | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

---

## 7. Ticket Administration — SLA & Custom Fields

### `sla_policies`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `name` | VARCHAR(150) | NOT NULL | |
| `description` | TEXT | NULL | |
| `is_default` | BOOLEAN | NOT NULL, DEFAULT false | |
| `business_hours_only` | BOOLEAN | NOT NULL, DEFAULT true | |
| `business_hours_config` | JSONB | NULL | |
| `holidays` | JSONB | NULL | Array of holiday dates |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

### `sla_policy_targets`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `sla_policy_id` | BIGINT | NOT NULL, FK → sla_policies(id) | |
| `priority_id` | BIGINT | NOT NULL, FK → lookups(id) | |
| `first_response_minutes` | INTEGER | NOT NULL | |
| `resolution_minutes` | INTEGER | NOT NULL | |
| `escalate_agent_id` | BIGINT | NULL, FK → users(id) | |
| `escalate_team_id` | BIGINT | NULL, FK → teams(id) | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(sla_policy_id, priority_id)`

---

### `ticket_sla`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `ticket_id` | BIGINT | NOT NULL, UNIQUE, FK → tickets(id) | |
| `sla_policy_id` | BIGINT | NOT NULL, FK → sla_policies(id) | |
| `first_response_due_at` | TIMESTAMPTZ | NOT NULL | |
| `resolution_due_at` | TIMESTAMPTZ | NOT NULL | |
| `first_response_breached` | BOOLEAN | NOT NULL, DEFAULT false | |
| `resolution_breached` | BOOLEAN | NOT NULL, DEFAULT false | |
| `first_response_breached_at` | TIMESTAMPTZ | NULL | |
| `resolution_breached_at` | TIMESTAMPTZ | NULL | |
| `paused_at` | TIMESTAMPTZ | NULL | |
| `paused_duration_minutes` | INTEGER | NOT NULL, DEFAULT 0 | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `ticket_custom_fields`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `name` | VARCHAR(100) | NOT NULL | Machine key |
| `label` | VARCHAR(150) | NOT NULL | |
| `field_type` | VARCHAR(30) | NOT NULL | `text` / `number` / `date` / `checkbox` / `dropdown` / `multi_select` |
| `options` | JSONB | NULL | `[{label, value}]` |
| `is_required` | BOOLEAN | NOT NULL, DEFAULT false | |
| `is_visible_to_contact` | BOOLEAN | NOT NULL, DEFAULT false | |
| `order_by` | INTEGER | NOT NULL, DEFAULT 0 | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

### `csat_surveys`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | Public token for survey link |
| `ticket_id` | BIGINT | NOT NULL, UNIQUE, FK → tickets(id) | |
| `sent_to` | VARCHAR(255) | NOT NULL | |
| `sent_at` | TIMESTAMPTZ | NOT NULL | |
| `expires_at` | TIMESTAMPTZ | NOT NULL | |
| `rating` | SMALLINT | NULL | 1–5 |
| `comment` | TEXT | NULL | |
| `responded_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

## 8. Saved Replies

### `saved_reply_folders`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `name` | VARCHAR(150) | NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

---

### `saved_replies`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `folder_id` | BIGINT | NULL, FK → saved_reply_folders(id) | |
| `title` | VARCHAR(255) | NOT NULL | |
| `shortcut` | VARCHAR(50) | NULL | e.g. `/refund` |
| `body_html` | TEXT | NOT NULL | |
| `scope` | VARCHAR(20) | NOT NULL, DEFAULT 'organization' | `organization` / `team` / `personal` |
| `team_id` | BIGINT | NULL, FK → teams(id) | |
| `user_id` | BIGINT | NULL, FK → users(id) | |
| `usage_count` | INTEGER | NOT NULL, DEFAULT 0 | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

## 9. Task Management

### `tasks`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `ticket_id` | BIGINT | NULL, FK → tickets(id) | |
| `title` | VARCHAR(500) | NOT NULL | |
| `description` | TEXT | NULL | |
| `status_id` | BIGINT | NOT NULL, FK → lookups(id) | Lookup: task_status |
| `priority_id` | BIGINT | NOT NULL, FK → lookups(id) | Lookup: task_priority |
| `due_at` | TIMESTAMPTZ | NULL | |
| `completed_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NOT NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

### `task_assignees`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `task_id` | BIGINT | NOT NULL, FK → tasks(id) | |
| `user_id` | BIGINT | NOT NULL, FK → users(id) | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(task_id, user_id)`

---

### `task_checklist_items`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `task_id` | BIGINT | NOT NULL, FK → tasks(id) | |
| `label` | VARCHAR(500) | NOT NULL | |
| `is_completed` | BOOLEAN | NOT NULL, DEFAULT false | |
| `order_by` | INTEGER | NOT NULL, DEFAULT 0 | |
| `completed_at` | TIMESTAMPTZ | NULL | |
| `completed_by` | BIGINT | NULL, FK → users(id) | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

## 10. Form Builder

### `forms`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `name` | VARCHAR(255) | NOT NULL | |
| `slug` | VARCHAR(100) | NOT NULL | |
| `description` | TEXT | NULL | |
| `default_mailbox_id` | BIGINT | NULL, FK → mailboxes(id) | |
| `default_team_id` | BIGINT | NULL, FK → teams(id) | |
| `default_priority_id` | BIGINT | NULL, FK → lookups(id) | |
| `captcha_provider` | VARCHAR(30) | NULL | `recaptcha_v3` / `hcaptcha` |
| `captcha_site_key` | VARCHAR(255) | NULL | |
| `captcha_secret_enc` | TEXT | NULL | |
| `is_password_protected` | BOOLEAN | NOT NULL, DEFAULT false | |
| `password_hash` | VARCHAR(255) | NULL | |
| `allowed_domains` | JSONB | NULL | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `is_published` | BOOLEAN | NOT NULL, DEFAULT false | |
| `submitted_message` | TEXT | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(organization_id, slug)` WHERE `deleted_at IS NULL`

---

### `form_fields`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `form_id` | BIGINT | NOT NULL, FK → forms(id) | |
| `field_type_id` | BIGINT | NOT NULL, FK → lookups(id) | Lookup: form_field_type |
| `label` | VARCHAR(255) | NOT NULL | |
| `placeholder` | VARCHAR(255) | NULL | |
| `help_text` | TEXT | NULL | |
| `is_required` | BOOLEAN | NOT NULL, DEFAULT false | |
| `options` | JSONB | NULL | `[{label,value}]` |
| `validation_rules` | JSONB | NULL | |
| `maps_to_field` | VARCHAR(100) | NULL | Native ticket field key |
| `maps_to_custom_field_id` | BIGINT | NULL, FK → ticket_custom_fields(id) | |
| `conditional_logic` | JSONB | NULL | |
| `order_by` | INTEGER | NOT NULL, DEFAULT 0 | |
| `is_hidden` | BOOLEAN | NOT NULL, DEFAULT false | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

---

### `form_submissions`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `form_id` | BIGINT | NOT NULL, FK → forms(id) | |
| `ticket_id` | BIGINT | NULL, FK → tickets(id) | |
| `contact_id` | BIGINT | NULL, FK → contacts(id) | |
| `ip_address` | INET | NULL | |
| `user_agent` | TEXT | NULL | |
| `captcha_score` | NUMERIC(4,3) | NULL | |
| `submitted_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `form_submission_values`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `form_submission_id` | BIGINT | NOT NULL, FK → form_submissions(id) | |
| `form_field_id` | BIGINT | NOT NULL, FK → form_fields(id) | |
| `value_text` | TEXT | NULL | |
| `value_files` | JSONB | NULL | Array of storage keys |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(form_submission_id, form_field_id)`

---

## 11. Workflow & Automation

### `workflows`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `name` | VARCHAR(255) | NOT NULL | |
| `description` | TEXT | NULL | |
| `trigger_event_id` | BIGINT | NOT NULL, FK → lookups(id) | Lookup: workflow_trigger |
| `condition_logic` | VARCHAR(10) | NOT NULL, DEFAULT 'AND' | `AND` / `OR` |
| `conditions` | JSONB | NOT NULL | |
| `actions` | JSONB | NOT NULL | |
| `stop_processing` | BOOLEAN | NOT NULL, DEFAULT false | |
| `order_by` | INTEGER | NOT NULL, DEFAULT 0 | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `run_count` | BIGINT | NOT NULL, DEFAULT 0 | |
| `last_run_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

### `workflow_execution_logs`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `workflow_id` | BIGINT | NOT NULL, FK → workflows(id) | |
| `ticket_id` | BIGINT | NULL, FK → tickets(id) | |
| `trigger_event` | VARCHAR(100) | NOT NULL | |
| `conditions_matched` | BOOLEAN | NOT NULL | |
| `actions_executed` | JSONB | NULL | |
| `error` | TEXT | NULL | |
| `executed_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:** `(workflow_id, executed_at DESC)`, `(ticket_id)`

---

## 12. Social Media

### `social_accounts`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `platform_id` | BIGINT | NOT NULL, FK → lookups(id) | Lookup: social_platform |
| `account_name` | VARCHAR(255) | NOT NULL | |
| `account_id` | VARCHAR(255) | NOT NULL | Platform-provided ID |
| `access_token_enc` | TEXT | NOT NULL | AES-256 encrypted |
| `refresh_token_enc` | TEXT | NULL | |
| `token_expires_at` | TIMESTAMPTZ | NULL | |
| `page_id` | VARCHAR(255) | NULL | Facebook Page ID |
| `default_team_id` | BIGINT | NULL, FK → teams(id) | |
| `status` | VARCHAR(30) | NOT NULL, DEFAULT 'active' | `active` / `disconnected` / `error` |
| `last_error` | TEXT | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

### `social_messages`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `social_account_id` | BIGINT | NOT NULL, FK → social_accounts(id) | |
| `ticket_id` | BIGINT | NULL, FK → tickets(id) | |
| `platform_message_id` | VARCHAR(500) | NOT NULL | |
| `message_type` | VARCHAR(30) | NOT NULL | `dm` / `mention` / `comment` / `post` |
| `sender_platform_id` | VARCHAR(255) | NOT NULL | |
| `sender_name` | VARCHAR(255) | NULL | |
| `sender_avatar_url` | TEXT | NULL | |
| `body` | TEXT | NULL | |
| `media_urls` | JSONB | NULL | |
| `parent_message_id` | VARCHAR(500) | NULL | For threads |
| `received_at` | TIMESTAMPTZ | NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(social_account_id, platform_message_id)`

---

## 13. Channels

### `channels`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `channel_type_id` | BIGINT | NOT NULL, FK → lookups(id) | Lookup: channel_type |
| `name` | VARCHAR(150) | NOT NULL | |
| `reference_id` | BIGINT | NULL | FK to mailbox / social_account / chat_widget |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

---

## 14. Knowledgebase

### `kb_categories`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `parent_id` | BIGINT | NULL, FK → kb_categories(id) | NULL = top-level |
| `name` | VARCHAR(255) | NOT NULL | |
| `slug` | VARCHAR(150) | NOT NULL | |
| `description` | TEXT | NULL | |
| `icon` | VARCHAR(100) | NULL | |
| `order_by` | INTEGER | NOT NULL, DEFAULT 0 | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(organization_id, slug)` WHERE `deleted_at IS NULL`

---

### `kb_articles`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `category_id` | BIGINT | NOT NULL, FK → kb_categories(id) | |
| `status_id` | BIGINT | NOT NULL, FK → lookups(id) | Lookup: article_status |
| `title` | VARCHAR(500) | NOT NULL | |
| `slug` | VARCHAR(300) | NOT NULL | |
| `body_html` | TEXT | NOT NULL | |
| `excerpt` | TEXT | NULL | |
| `locale` | VARCHAR(10) | NOT NULL, DEFAULT 'en' | |
| `meta_title` | VARCHAR(255) | NULL | |
| `meta_description` | TEXT | NULL | |
| `is_featured` | BOOLEAN | NOT NULL, DEFAULT false | |
| `view_count` | INTEGER | NOT NULL, DEFAULT 0 | |
| `helpful_count` | INTEGER | NOT NULL, DEFAULT 0 | |
| `not_helpful_count` | INTEGER | NOT NULL, DEFAULT 0 | |
| `published_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(organization_id, slug, locale)` WHERE `deleted_at IS NULL`

---

### `kb_article_related`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `article_id` | BIGINT | NOT NULL, FK → kb_articles(id) | |
| `related_article_id` | BIGINT | NOT NULL, FK → kb_articles(id) | |
| `order_by` | INTEGER | NOT NULL, DEFAULT 0 | |

**Unique:** `(article_id, related_article_id)`

---

### `kb_article_feedback`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `article_id` | BIGINT | NOT NULL, FK → kb_articles(id) | |
| `is_helpful` | BOOLEAN | NOT NULL | |
| `comment` | TEXT | NULL | |
| `ip_address` | INET | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

## 15. Binaka Live Chat

### `chat_widgets`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | Public widget ID for JS snippet |
| `organization_id` | BIGINT | NOT NULL, UNIQUE, FK → organizations(id) | |
| `name` | VARCHAR(150) | NOT NULL | |
| `greeting_message` | TEXT | NULL | |
| `away_message` | TEXT | NULL | |
| `primary_color` | VARCHAR(7) | NULL | |
| `position_id` | BIGINT | NULL, FK → lookups(id) | Lookup: widget_position |
| `default_team_id` | BIGINT | NULL, FK → teams(id) | |
| `pre_chat_form_enabled` | BOOLEAN | NOT NULL, DEFAULT true | |
| `pre_chat_fields` | JSONB | NULL | |
| `kb_search_enabled` | BOOLEAN | NOT NULL, DEFAULT false | |
| `max_file_size_mb` | INTEGER | NOT NULL, DEFAULT 10 | |
| `proactive_triggers` | JSONB | NULL | |
| `business_hours_config` | JSONB | NULL | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

---

### `chat_sessions`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `chat_widget_id` | BIGINT | NOT NULL, FK → chat_widgets(id) | |
| `ticket_id` | BIGINT | NULL, FK → tickets(id) | |
| `contact_id` | BIGINT | NULL, FK → contacts(id) | |
| `assigned_agent_id` | BIGINT | NULL, FK → users(id) | |
| `assigned_team_id` | BIGINT | NULL, FK → teams(id) | |
| `visitor_name` | VARCHAR(200) | NULL | |
| `visitor_email` | VARCHAR(255) | NULL | |
| `visitor_ip` | INET | NULL | |
| `visitor_user_agent` | TEXT | NULL | |
| `page_url` | TEXT | NULL | |
| `status` | VARCHAR(30) | NOT NULL, DEFAULT 'pending' | `pending` / `active` / `ended` / `missed` |
| `rating` | SMALLINT | NULL | 1–5 |
| `rating_comment` | TEXT | NULL | |
| `started_at` | TIMESTAMPTZ | NULL | |
| `ended_at` | TIMESTAMPTZ | NULL | |
| `transcript_sent` | BOOLEAN | NOT NULL, DEFAULT false | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `chat_messages`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `chat_session_id` | BIGINT | NOT NULL, FK → chat_sessions(id) | |
| `sender_type` | VARCHAR(20) | NOT NULL | `agent` / `visitor` / `bot` / `system` |
| `sender_user_id` | BIGINT | NULL, FK → users(id) | |
| `body` | TEXT | NULL | |
| `attachments` | JSONB | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

## 16. eCommerce Integration

### `ecommerce_integrations`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `platform_id` | BIGINT | NOT NULL, FK → lookups(id) | Lookup: ecommerce_platform |
| `name` | VARCHAR(150) | NOT NULL | |
| `store_url` | TEXT | NOT NULL | |
| `api_key_enc` | TEXT | NULL | |
| `api_secret_enc` | TEXT | NULL | |
| `oauth_token_enc` | TEXT | NULL | |
| `oauth_refresh_token_enc` | TEXT | NULL | |
| `token_expires_at` | TIMESTAMPTZ | NULL | |
| `last_synced_at` | TIMESTAMPTZ | NULL | |
| `sync_error` | TEXT | NULL | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

### `ecommerce_orders`

Local cache of order data from connected stores.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `ecommerce_integration_id` | BIGINT | NOT NULL, FK → ecommerce_integrations(id) | |
| `contact_id` | BIGINT | NULL, FK → contacts(id) | |
| `platform_order_id` | VARCHAR(255) | NOT NULL | |
| `order_number` | VARCHAR(100) | NULL | |
| `status` | VARCHAR(100) | NULL | |
| `total_amount` | NUMERIC(12,2) | NULL | |
| `currency` | VARCHAR(10) | NULL | |
| `items` | JSONB | NULL | Line items snapshot |
| `shipping_address` | JSONB | NULL | |
| `tracking_number` | VARCHAR(255) | NULL | |
| `tracking_url` | TEXT | NULL | |
| `payment_method` | VARCHAR(100) | NULL | |
| `ordered_at` | TIMESTAMPTZ | NULL | |
| `synced_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(ecommerce_integration_id, platform_order_id)`

---

### `ticket_orders`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `ticket_id` | BIGINT | NOT NULL, FK → tickets(id) | |
| `ecommerce_order_id` | BIGINT | NOT NULL, FK → ecommerce_orders(id) | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(ticket_id, ecommerce_order_id)`

---

## 17. Agent Performance & Reporting

### `agent_performance_snapshots`

Daily aggregated performance per agent.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `user_id` | BIGINT | NOT NULL, FK → users(id) | |
| `snapshot_date` | DATE | NOT NULL | |
| `tickets_created` | INTEGER | NOT NULL, DEFAULT 0 | |
| `tickets_resolved` | INTEGER | NOT NULL, DEFAULT 0 | |
| `tickets_closed` | INTEGER | NOT NULL, DEFAULT 0 | |
| `avg_first_response_minutes` | NUMERIC(10,2) | NULL | |
| `avg_resolution_minutes` | NUMERIC(10,2) | NULL | |
| `sla_breaches` | INTEGER | NOT NULL, DEFAULT 0 | |
| `csat_avg` | NUMERIC(3,2) | NULL | |
| `csat_count` | INTEGER | NOT NULL, DEFAULT 0 | |
| `messages_sent` | INTEGER | NOT NULL, DEFAULT 0 | |
| `chats_handled` | INTEGER | NOT NULL, DEFAULT 0 | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(organization_id, user_id, snapshot_date)`

---

## 18. Audit, Notifications & Security Logs

### `audit_logs`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `organization_id` | BIGINT | NULL, FK → organizations(id) | |
| `user_id` | BIGINT | NULL, FK → users(id) | Actor |
| `entity_type` | VARCHAR(100) | NOT NULL | e.g. `ticket`, `user`, `subscription` |
| `entity_id` | BIGINT | NULL | |
| `action` | VARCHAR(100) | NOT NULL | e.g. `create`, `update`, `delete`, `login` |
| `changes` | JSONB | NULL | `{before, after}` |
| `ip_address` | INET | NULL | |
| `user_agent` | TEXT | NULL | |
| `metadata` | JSONB | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:** `(organization_id, entity_type, entity_id)`, `(user_id, created_at DESC)`, `(created_at DESC)`

---

### `notifications`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `user_id` | BIGINT | NOT NULL, FK → users(id) | Recipient |
| `type` | VARCHAR(100) | NOT NULL | e.g. `ticket_assigned`, `sla_breach`, `payment_failed` |
| `title` | VARCHAR(255) | NOT NULL | |
| `body` | TEXT | NULL | |
| `reference_type` | VARCHAR(50) | NULL | `ticket` / `task` / `chat` / `invoice` |
| `reference_id` | BIGINT | NULL | |
| `is_read` | BOOLEAN | NOT NULL, DEFAULT false | |
| `read_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Index:** `(user_id, is_read, created_at DESC)`

---

## 19. Currencies & Tax

### `currencies`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `code` | VARCHAR(3) | NOT NULL, UNIQUE | ISO 4217 e.g. `SAR`, `AED`, `USD` |
| `name` | VARCHAR(100) | NOT NULL | |
| `symbol` | VARCHAR(10) | NOT NULL | |
| `decimal_digits` | SMALLINT | NOT NULL, DEFAULT 2 | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `tax_rates`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `country_code` | VARCHAR(2) | NOT NULL | ISO 3166-1 alpha-2 |
| `region` | VARCHAR(100) | NULL | |
| `name` | VARCHAR(100) | NOT NULL | e.g. `VAT` |
| `rate_bps` | INTEGER | NOT NULL | Basis points (1500 = 15.00%) |
| `is_b2b_exempt` | BOOLEAN | NOT NULL, DEFAULT false | Reverse-charge eligible |
| `effective_from` | DATE | NOT NULL | |
| `effective_to` | DATE | NULL | NULL = currently active |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

**Index:** `(country_code, effective_from, effective_to)`

---

## 20. Subscription Plans

### `subscription_plans`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `name` | VARCHAR(100) | NOT NULL | e.g. `Professional` |
| `slug` | VARCHAR(100) | NOT NULL, UNIQUE | e.g. `professional` |
| `description` | TEXT | NULL | |
| `highlight_features` | JSONB | NULL | Array of feature strings for pricing page |
| `is_free` | BOOLEAN | NOT NULL, DEFAULT false | |
| `is_custom_pricing` | BOOLEAN | NOT NULL, DEFAULT false | Enterprise flag |
| `is_public` | BOOLEAN | NOT NULL, DEFAULT true | |
| `is_archived` | BOOLEAN | NOT NULL, DEFAULT false | |
| `trial_days` | INTEGER | NOT NULL, DEFAULT 0 | |
| `order_by` | INTEGER | NOT NULL, DEFAULT 0 | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

### `plan_prices`

Pricing per billing cycle per currency. Amounts in smallest unit.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `plan_id` | BIGINT | NOT NULL, FK → subscription_plans(id) | |
| `currency_id` | BIGINT | NOT NULL, FK → currencies(id) | |
| `billing_cycle` | VARCHAR(20) | NOT NULL | `monthly` / `annual` |
| `amount_per_seat` | BIGINT | NOT NULL | Per seat per cycle |
| `flat_amount` | BIGINT | NOT NULL, DEFAULT 0 | Base flat charge (0 = pure per-seat) |
| `gateway_price_id` | VARCHAR(255) | NULL | Stripe Price ID |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `effective_from` | DATE | NOT NULL, DEFAULT CURRENT_DATE | |
| `effective_to` | DATE | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(plan_id, currency_id, billing_cycle)` WHERE `is_active = true AND effective_to IS NULL`

---

## 21. Plan Features & Limits

### `plan_features`

Boolean feature flags per plan.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `plan_id` | BIGINT | NOT NULL, FK → subscription_plans(id) | |
| `feature_key` | VARCHAR(150) | NOT NULL | e.g. `live_chat`, `sso_saml` |
| `is_enabled` | BOOLEAN | NOT NULL, DEFAULT false | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(plan_id, feature_key)`

**Feature keys:** `email_channel`, `live_chat`, `social_channels`, `ecommerce_integration`, `workflow_automation`, `knowledgebase`, `custom_roles`, `sla_policies`, `csat_surveys`, `custom_domain`, `white_label_branding`, `api_access`, `sso_saml`, `ip_whitelisting`, `priority_support`, `advanced_reports`

---

### `plan_limits`

Numeric limits per plan. `-1` = unlimited.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `plan_id` | BIGINT | NOT NULL, FK → subscription_plans(id) | |
| `limit_key` | VARCHAR(150) | NOT NULL | e.g. `max_agents` |
| `limit_value` | INTEGER | NOT NULL | `-1` = unlimited |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(plan_id, limit_key)`

**Limit keys:** `max_agents`, `max_mailboxes`, `max_forms`, `max_workflows`, `max_saved_replies`, `max_kb_articles`, `max_social_accounts`, `max_ecommerce_stores`, `storage_gb`, `max_attachment_mb`

---

## 22. Add-Ons

### `add_ons`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `name` | VARCHAR(150) | NOT NULL | |
| `slug` | VARCHAR(100) | NOT NULL, UNIQUE | |
| `description` | TEXT | NULL | |
| `unit_label` | VARCHAR(50) | NOT NULL | e.g. `seat`, `10 GB` |
| `affects_limit_key` | VARCHAR(150) | NULL | Limit key this add-on increments |
| `increment_value` | INTEGER | NOT NULL, DEFAULT 1 | Units added per purchased unit |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

### `add_on_plan_eligibility`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `add_on_id` | BIGINT | NOT NULL, FK → add_ons(id) | |
| `plan_id` | BIGINT | NOT NULL, FK → subscription_plans(id) | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(add_on_id, plan_id)`

---

### `add_on_prices`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `add_on_id` | BIGINT | NOT NULL, FK → add_ons(id) | |
| `currency_id` | BIGINT | NOT NULL, FK → currencies(id) | |
| `billing_cycle` | VARCHAR(20) | NOT NULL | `monthly` / `annual` |
| `amount_per_unit` | BIGINT | NOT NULL | Smallest currency unit |
| `gateway_price_id` | VARCHAR(255) | NULL | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(add_on_id, currency_id, billing_cycle)` WHERE `is_active = true`

---

## 23. Subscriptions

### `subscriptions`

One active subscription per organization at a time.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `plan_id` | BIGINT | NOT NULL, FK → subscription_plans(id) | |
| `plan_price_id` | BIGINT | NULL, FK → plan_prices(id) | NULL for free/custom plans |
| `currency_id` | BIGINT | NOT NULL, FK → currencies(id) | |
| `billing_cycle` | VARCHAR(20) | NOT NULL | `monthly` / `annual` |
| `status` | VARCHAR(30) | NOT NULL, DEFAULT 'trialing' | `trialing` / `active` / `past_due` / `paused` / `canceled` |
| `quantity` | INTEGER | NOT NULL, DEFAULT 1 | Seat count at last billing snapshot |
| `trial_starts_at` | TIMESTAMPTZ | NULL | |
| `trial_ends_at` | TIMESTAMPTZ | NULL | |
| `current_period_start` | TIMESTAMPTZ | NULL | |
| `current_period_end` | TIMESTAMPTZ | NULL | |
| `next_billing_at` | TIMESTAMPTZ | NULL | |
| `canceled_at` | TIMESTAMPTZ | NULL | |
| `cancel_at_period_end` | BOOLEAN | NOT NULL, DEFAULT false | Deferred cancellation |
| `cancellation_reason` | TEXT | NULL | |
| `paused_at` | TIMESTAMPTZ | NULL | |
| `grace_period_ends_at` | TIMESTAMPTZ | NULL | Set when `past_due` |
| `account_credit` | BIGINT | NOT NULL, DEFAULT 0 | Credit balance in smallest unit |
| `custom_amount_override` | BIGINT | NULL | Enterprise manual pricing |
| `gateway` | VARCHAR(30) | NULL | `stripe` / `paytabs` / `manual` |
| `gateway_subscription_id` | VARCHAR(255) | NULL | e.g. Stripe `sub_xxx` |
| `gateway_customer_id` | VARCHAR(255) | NULL | e.g. Stripe `cus_xxx` |
| `metadata` | JSONB | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(organization_id)` WHERE `status NOT IN ('canceled') AND deleted_at IS NULL`

**Indexes:** `(status)`, `(next_billing_at)`, `(grace_period_ends_at)`, `(gateway_subscription_id)`

---

### `subscription_add_ons`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `subscription_id` | BIGINT | NOT NULL, FK → subscriptions(id) | |
| `add_on_id` | BIGINT | NOT NULL, FK → add_ons(id) | |
| `add_on_price_id` | BIGINT | NOT NULL, FK → add_on_prices(id) | |
| `quantity` | INTEGER | NOT NULL, DEFAULT 1 | |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'active' | `active` / `pending_removal` |
| `remove_at_period_end` | BOOLEAN | NOT NULL, DEFAULT false | |
| `gateway_subscription_item_id` | VARCHAR(255) | NULL | Stripe item ID |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(subscription_id, add_on_id)` WHERE `deleted_at IS NULL AND status = 'active'`

---

### `subscription_changes`

Append-only history of every plan/cycle/quantity change.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `subscription_id` | BIGINT | NOT NULL, FK → subscriptions(id) | |
| `change_type` | VARCHAR(30) | NOT NULL | `upgrade` / `downgrade` / `cycle_change` / `seat_change` / `cancel` / `reactivate` / `trial_convert` / `admin_override` |
| `from_plan_id` | BIGINT | NULL, FK → subscription_plans(id) | |
| `to_plan_id` | BIGINT | NULL, FK → subscription_plans(id) | |
| `from_billing_cycle` | VARCHAR(20) | NULL | |
| `to_billing_cycle` | VARCHAR(20) | NULL | |
| `from_quantity` | INTEGER | NULL | |
| `to_quantity` | INTEGER | NULL | |
| `from_status` | VARCHAR(30) | NULL | |
| `to_status` | VARCHAR(30) | NULL | |
| `proration_amount` | BIGINT | NULL | Credit/charge in smallest unit |
| `effective_at` | TIMESTAMPTZ | NOT NULL | |
| `scheduled_for` | TIMESTAMPTZ | NULL | If deferred |
| `notes` | TEXT | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |

---

### `billing_contacts`

Billing-specific contact details per organization.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `organization_id` | BIGINT | NOT NULL, UNIQUE, FK → organizations(id) | |
| `billing_email` | VARCHAR(255) | NOT NULL | |
| `company_name` | VARCHAR(255) | NULL | |
| `address_line1` | VARCHAR(255) | NULL | |
| `address_line2` | VARCHAR(255) | NULL | |
| `city` | VARCHAR(100) | NULL | |
| `state` | VARCHAR(100) | NULL | |
| `postal_code` | VARCHAR(20) | NULL | |
| `country_code` | VARCHAR(2) | NULL | ISO 3166-1 alpha-2 |
| `vat_number` | VARCHAR(100) | NULL | |
| `vat_verified` | BOOLEAN | NOT NULL, DEFAULT false | |
| `vat_verified_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

---

### `complimentary_plans`

Platform-admin-granted free plan access.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `plan_id` | BIGINT | NOT NULL, FK → subscription_plans(id) | |
| `reason` | TEXT | NULL | |
| `starts_at` | TIMESTAMPTZ | NOT NULL | |
| `expires_at` | TIMESTAMPTZ | NULL | NULL = indefinite |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NOT NULL, FK → users(id) | |

---

## 24. Seats & Usage

### `usage_snapshots`

Daily usage record per organization per metric.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `snapshot_date` | DATE | NOT NULL | |
| `metric_key` | VARCHAR(150) | NOT NULL | Matches `plan_limits.limit_key` |
| `used_value` | INTEGER | NOT NULL | |
| `limit_value` | INTEGER | NOT NULL | Effective limit at snapshot time |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(organization_id, snapshot_date, metric_key)`
**Index:** `(organization_id, metric_key, snapshot_date DESC)`

---

### `billing_seat_snapshots`

Seat count at the start of each billing cycle.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `subscription_id` | BIGINT | NOT NULL, FK → subscriptions(id) | |
| `billing_period_start` | TIMESTAMPTZ | NOT NULL | |
| `billing_period_end` | TIMESTAMPTZ | NOT NULL | |
| `seat_count` | INTEGER | NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(subscription_id, billing_period_start)`

---

## 25. Invoices & Payments

### `invoices`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `subscription_id` | BIGINT | NULL, FK → subscriptions(id) | |
| `invoice_number` | VARCHAR(100) | NOT NULL, UNIQUE | e.g. `INV-tenant-2026-0042` |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'draft' | `draft` / `open` / `paid` / `void` |
| `currency_id` | BIGINT | NOT NULL, FK → currencies(id) | |
| `billing_period_start` | TIMESTAMPTZ | NULL | |
| `billing_period_end` | TIMESTAMPTZ | NULL | |
| `issued_at` | TIMESTAMPTZ | NULL | |
| `due_at` | TIMESTAMPTZ | NULL | |
| `paid_at` | TIMESTAMPTZ | NULL | |
| `voided_at` | TIMESTAMPTZ | NULL | |
| `subtotal` | BIGINT | NOT NULL, DEFAULT 0 | Before discount and tax |
| `discount_amount` | BIGINT | NOT NULL, DEFAULT 0 | |
| `taxable_amount` | BIGINT | NOT NULL, DEFAULT 0 | subtotal − discount |
| `tax_amount` | BIGINT | NOT NULL, DEFAULT 0 | |
| `tax_rate_id` | BIGINT | NULL, FK → tax_rates(id) | |
| `total_amount` | BIGINT | NOT NULL, DEFAULT 0 | taxable + tax |
| `amount_paid` | BIGINT | NOT NULL, DEFAULT 0 | |
| `amount_due` | BIGINT | NOT NULL, DEFAULT 0 | total − paid |
| `credit_applied` | BIGINT | NOT NULL, DEFAULT 0 | Account credit used |
| `coupon_id` | BIGINT | NULL, FK → coupons(id) | |
| `coupon_discount` | BIGINT | NOT NULL, DEFAULT 0 | |
| `locale` | VARCHAR(10) | NOT NULL, DEFAULT 'en' | For Arabic PDF |
| `pdf_storage_key` | TEXT | NULL | S3 key |
| `gateway_invoice_id` | VARCHAR(255) | NULL | e.g. Stripe `in_xxx` |
| `notes` | TEXT | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

**Indexes:** `(organization_id, status)`, `(subscription_id)`, `(status, due_at)`

---

### `invoice_items`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `invoice_id` | BIGINT | NOT NULL, FK → invoices(id) | |
| `type` | VARCHAR(30) | NOT NULL | `plan` / `seat` / `add_on` / `proration` / `credit` / `discount` / `manual` |
| `description` | TEXT | NOT NULL | Shown on invoice |
| `quantity` | INTEGER | NOT NULL, DEFAULT 1 | |
| `unit_amount` | BIGINT | NOT NULL | Per unit in smallest unit |
| `total_amount` | BIGINT | NOT NULL | quantity × unit_amount (can be negative) |
| `period_start` | TIMESTAMPTZ | NULL | For prorated items |
| `period_end` | TIMESTAMPTZ | NULL | |
| `plan_id` | BIGINT | NULL, FK → subscription_plans(id) | |
| `add_on_id` | BIGINT | NULL, FK → add_ons(id) | |
| `order_by` | INTEGER | NOT NULL, DEFAULT 0 | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `payments`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `invoice_id` | BIGINT | NOT NULL, FK → invoices(id) | |
| `payment_method_id` | BIGINT | NULL, FK → payment_methods(id) | |
| `gateway` | VARCHAR(30) | NOT NULL | `stripe` / `paytabs` / `manual` |
| `gateway_payment_id` | VARCHAR(255) | NULL | e.g. Stripe `pi_xxx` |
| `gateway_idempotency_key` | VARCHAR(255) | NULL, UNIQUE | Retry-safe key |
| `status` | VARCHAR(30) | NOT NULL | `pending` / `succeeded` / `failed` / `refunded` / `partially_refunded` |
| `amount` | BIGINT | NOT NULL | |
| `currency_id` | BIGINT | NOT NULL, FK → currencies(id) | |
| `failure_code` | VARCHAR(100) | NULL | |
| `failure_message` | TEXT | NULL | |
| `processed_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:** `(invoice_id)`, `(organization_id, status)`, `(gateway_payment_id)`

---

### `refunds`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `payment_id` | BIGINT | NOT NULL, FK → payments(id) | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `gateway` | VARCHAR(30) | NOT NULL | |
| `gateway_refund_id` | VARCHAR(255) | NULL | |
| `amount` | BIGINT | NOT NULL | |
| `currency_id` | BIGINT | NOT NULL, FK → currencies(id) | |
| `reason` | TEXT | NULL | |
| `status` | VARCHAR(20) | NOT NULL | `pending` / `succeeded` / `failed` |
| `issued_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

---

## 26. Payment Methods

### `payment_methods`

Tokenized payment methods. No raw card data stored.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `gateway` | VARCHAR(30) | NOT NULL | `stripe` / `paytabs` |
| `gateway_payment_method_id` | VARCHAR(255) | NOT NULL | e.g. Stripe `pm_xxx` |
| `type` | VARCHAR(30) | NOT NULL | `card` / `mada` / `apple_pay` / `bank_transfer` |
| `brand` | VARCHAR(30) | NULL | `visa` / `mastercard` / `amex` / `mada` |
| `last4` | VARCHAR(4) | NULL | |
| `exp_month` | SMALLINT | NULL | |
| `exp_year` | SMALLINT | NULL | |
| `holder_name` | VARCHAR(255) | NULL | |
| `is_default` | BOOLEAN | NOT NULL, DEFAULT false | |
| `is_expired` | BOOLEAN | NOT NULL, DEFAULT false | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

**Partial unique index:** `(organization_id, is_default)` WHERE `is_default = true AND deleted_at IS NULL` — enforces one default card per org at DB level.

---

## 27. Coupons & Discounts

### `coupons`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `code` | VARCHAR(100) | NOT NULL, UNIQUE | |
| `name` | VARCHAR(255) | NOT NULL | Internal label |
| `discount_type` | VARCHAR(20) | NOT NULL | `percentage` / `fixed_amount` / `trial_extension` |
| `discount_value` | INTEGER | NOT NULL | % (1–100), fixed amount in smallest unit, or extra trial days |
| `currency_id` | BIGINT | NULL, FK → currencies(id) | Required for `fixed_amount` |
| `duration` | VARCHAR(20) | NOT NULL | `once` / `repeating` / `forever` |
| `duration_months` | INTEGER | NULL | Required for `repeating` |
| `applicable_plans` | BIGINT[] | NULL | NULL = all plans |
| `new_subscriptions_only` | BOOLEAN | NOT NULL, DEFAULT false | |
| `max_total_redemptions` | INTEGER | NULL | NULL = unlimited |
| `max_per_org_redemptions` | INTEGER | NOT NULL, DEFAULT 1 | |
| `redemption_count` | INTEGER | NOT NULL, DEFAULT 0 | |
| `valid_from` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `valid_to` | TIMESTAMPTZ | NULL | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `gateway_coupon_id` | VARCHAR(255) | NULL | Stripe Coupon ID |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

### `coupon_redemptions`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `coupon_id` | BIGINT | NOT NULL, FK → coupons(id) | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `subscription_id` | BIGINT | NULL, FK → subscriptions(id) | |
| `invoice_id` | BIGINT | NULL, FK → invoices(id) | First invoice discount was applied to |
| `discount_amount_applied` | BIGINT | NULL | |
| `trial_days_added` | INTEGER | NULL | |
| `redeemed_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |

---

## 28. Gateway Integration Records

### `gateway_events`

Raw webhook events. Idempotency guard.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `gateway` | VARCHAR(30) | NOT NULL | `stripe` / `paytabs` |
| `event_id` | VARCHAR(255) | NOT NULL | Gateway-provided event ID |
| `event_type` | VARCHAR(150) | NOT NULL | e.g. `invoice.payment_succeeded` |
| `payload` | JSONB | NOT NULL | Full raw event body |
| `processed` | BOOLEAN | NOT NULL, DEFAULT false | |
| `processed_at` | TIMESTAMPTZ | NULL | |
| `error` | TEXT | NULL | |
| `received_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(gateway, event_id)` — prevents duplicate processing

**Index:** `(processed, received_at)`

---

## 29. Dunning

### `dunning_schedules`

Platform-level retry configuration.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `attempt_number` | SMALLINT | NOT NULL | 1, 2, 3 … |
| `delay_days_after_failure` | INTEGER | NOT NULL | Days after previous failure |
| `send_email` | BOOLEAN | NOT NULL, DEFAULT true | |
| `send_in_app` | BOOLEAN | NOT NULL, DEFAULT true | |
| `email_template_key` | VARCHAR(150) | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `dunning_logs`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `subscription_id` | BIGINT | NOT NULL, FK → subscriptions(id) | |
| `invoice_id` | BIGINT | NOT NULL, FK → invoices(id) | |
| `attempt_number` | SMALLINT | NOT NULL | |
| `action` | VARCHAR(50) | NOT NULL | `retry_charge` / `send_email` / `send_in_app` / `downgrade` |
| `result` | VARCHAR(30) | NOT NULL | `succeeded` / `failed` / `skipped` |
| `gateway_response` | JSONB | NULL | |
| `executed_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

## 30. Platform Revenue Snapshots

### `mrr_snapshots`

Daily MRR snapshot pre-aggregated by background job.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `snapshot_date` | DATE | NOT NULL | |
| `currency_id` | BIGINT | NOT NULL, FK → currencies(id) | |
| `plan_id` | BIGINT | NULL, FK → subscription_plans(id) | NULL = total across all plans |
| `active_subscriptions` | INTEGER | NOT NULL | |
| `active_seats` | INTEGER | NOT NULL | |
| `new_mrr` | BIGINT | NOT NULL, DEFAULT 0 | |
| `expansion_mrr` | BIGINT | NOT NULL, DEFAULT 0 | |
| `contraction_mrr` | BIGINT | NOT NULL, DEFAULT 0 | |
| `churned_mrr` | BIGINT | NOT NULL, DEFAULT 0 | |
| `total_mrr` | BIGINT | NOT NULL | |
| `trial_count` | INTEGER | NOT NULL, DEFAULT 0 | |
| `trial_conversions` | INTEGER | NOT NULL, DEFAULT 0 | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(snapshot_date, currency_id, plan_id)`

---

## 31. Full Relationships Summary

```
── LOOKUP SYSTEM ────────────────────────────────────────────────────────
lookup_types (1:N) → lookups (self-referential via parent_id)
  lookups referenced by: tickets, tasks, forms, social_accounts,
  ecommerce_integrations, chat_widgets, kb_articles, email_routing_rules,
  sla_policy_targets, saved_replies, workflows

── PLATFORM ─────────────────────────────────────────────────────────────
organizations
 ├─ organization_settings          (1:N)
 ├─ branding_configs               (1:1)
 ├─ users                          (1:N)
 │   ├─ themes                     (1:1)
 │   ├─ two_factor_auth            (1:1)
 │   ├─ user_sessions              (1:N)
 │   └─ user_roles (N:M) → roles → role_permissions → permissions
 ├─ teams                          (1:N)
 │   └─ team_members (N:M) → users
 ├─ api_keys                       (1:N)
 ├─ ip_whitelist                   (1:N)
 ├─ mailboxes                      (1:N)
 │   ├─ mailbox_imap_configs       (1:1)
 │   ├─ mailbox_smtp_configs       (1:1)
 │   └─ mailbox_aliases            (1:N)
 ├─ email_routing_rules            (1:N)
 ├─ contacts                       (1:N)
 │   └─ contact_notes              (1:N)
 ├─ tickets                        (1:N)
 │   ├─ ticket_messages            (1:N)
 │   ├─ ticket_attachments         (1:N)
 │   ├─ ticket_tags (N:M) → tags
 │   ├─ ticket_followers (N:M) → users
 │   ├─ ticket_cc                  (1:N)
 │   ├─ ticket_sla                 (1:1) → sla_policies
 │   ├─ ticket_custom_field_values (1:N) → ticket_custom_fields
 │   ├─ ticket_merges              (1:N)
 │   ├─ ticket_orders (N:M) → ecommerce_orders
 │   └─ csat_surveys               (1:1)
 ├─ ticket_custom_fields           (1:N)
 ├─ sla_policies                   (1:N)
 │   └─ sla_policy_targets         (1:N)
 ├─ tags                           (1:N)
 ├─ ticket_views                   (1:N)
 ├─ saved_reply_folders            (1:N)
 │   └─ saved_replies              (1:N)
 ├─ tasks                          (1:N)
 │   ├─ task_assignees (N:M) → users
 │   └─ task_checklist_items       (1:N)
 ├─ forms                          (1:N)
 │   ├─ form_fields                (1:N)
 │   └─ form_submissions           (1:N)
 │       └─ form_submission_values (1:N) → form_fields
 ├─ workflows                      (1:N)
 │   └─ workflow_execution_logs    (1:N)
 ├─ social_accounts                (1:N)
 │   └─ social_messages            (1:N)
 ├─ channels                       (1:N)
 ├─ chat_widgets                   (1:1)
 │   └─ chat_sessions              (1:N)
 │       └─ chat_messages          (1:N)
 ├─ ecommerce_integrations         (1:N)
 │   └─ ecommerce_orders           (1:N)
 ├─ kb_categories (1:N, self-referential)
 │   └─ kb_articles                (1:N)
 │       ├─ kb_article_related (N:M self)
 │       └─ kb_article_feedback    (1:N)
 ├─ agent_performance_snapshots    (1:N) → users
 ├─ audit_logs                     (1:N)
 └─ notifications                  (1:N) → users

── BILLING ──────────────────────────────────────────────────────────────
subscription_plans
 ├─ plan_prices             (1:N) → currencies
 ├─ plan_features           (1:N)
 └─ plan_limits             (1:N)

add_ons
 ├─ add_on_prices           (1:N) → currencies
 └─ add_on_plan_eligibility (N:M) → subscription_plans

organizations (continued)
 ├─ subscriptions           (1:1 active)
 │   ├─ subscription_add_ons     (1:N) → add_ons
 │   ├─ subscription_changes     (1:N) [history log]
 │   ├─ billing_seat_snapshots   (1:N)
 │   └─ dunning_logs             (1:N) → invoices
 ├─ billing_contacts        (1:1)
 ├─ payment_methods         (1:N)
 ├─ invoices                (1:N)
 │   ├─ invoice_items             (1:N)
 │   ├─ payments                  (1:N)
 │   │   └─ refunds               (1:N)
 │   └─ coupon_redemptions        (1:1) → coupons
 ├─ usage_snapshots         (1:N)
 └─ complimentary_plans     (1:N) → subscription_plans

coupons
 └─ coupon_redemptions      (1:N) → organizations

currencies
 ├─ plan_prices, add_on_prices, invoices, payments, refunds, mrr_snapshots

tax_rates → invoices

gateway_events              [idempotency store — no FK relationships]
dunning_schedules           [platform config — no FK to org]
mrr_snapshots               → subscription_plans, currencies

── EFFECTIVE LIMIT RESOLUTION (runtime) ─────────────────────────────────
effective_limit(org, key) =
  plan_limits.limit_value (for org's plan)
  + SUM(subscription_add_ons.quantity × add_ons.increment_value)
    WHERE add_ons.affects_limit_key = key
      AND subscription_add_ons.status = 'active'

── FEATURE FLAG RESOLUTION (runtime) ────────────────────────────────────
feature_enabled(org, key) =
  plan_features.is_enabled
    WHERE plan_id = subscription.plan_id
      AND feature_key = key

── SUBSCRIPTION STATE MACHINE ───────────────────────────────────────────
[new org] → trialing ──── trial ends, card on file ──► active
                   └───── trial ends, no card ──────► Free (no sub record)

active ──── payment fails ──► past_due ──── retry succeeds ──► active
       │                            └───── grace ends ──────► Free (downgrade)
       ├─── cancel_at_period_end ──► active (until period end) ──► canceled
       └─── immediate cancel ────────────────────────────────► canceled

paused (Enterprise only) ◄──── admin ──── active
                         └─── reactivated ──► active

canceled ──── reactivate ──► new subscription (active / trialing)
```

---

*End of ERD — Unified Customer Support & Ticket Management Platform v2.0.0*
*Total tables: 95 across 31 schema groups*

---

# Part II — SaaS Billing, Plans & Subscription Management

| Field | Value |
|---|---|
| **Section Version** | 1.0.0 |
| **Database** | PostgreSQL 16+ |
| **Date** | 2026-04-08 |

> All schema conventions from Part I apply: `BIGSERIAL` PK + `UUID` v4 public ID, all timestamps `TIMESTAMPTZ`, soft delete via `deleted_at`, audit columns `created_by` / `updated_by` / `deleted_by`, all monetary amounts as `BIGINT` in smallest currency unit, enums replaced by `lookups`.

---

## 20. Currencies & Tax

### `currencies`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `code` | VARCHAR(3) | NOT NULL, UNIQUE | ISO 4217 e.g. `SAR`, `AED`, `USD` |
| `name` | VARCHAR(100) | NOT NULL | |
| `symbol` | VARCHAR(10) | NOT NULL | |
| `decimal_digits` | SMALLINT | NOT NULL, DEFAULT 2 | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `tax_rates`

Country/region tax configuration with effective date ranges.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `country_code` | VARCHAR(2) | NOT NULL | ISO 3166-1 alpha-2 |
| `region` | VARCHAR(100) | NULL | State/emirate if sub-national |
| `name` | VARCHAR(100) | NOT NULL | e.g. `VAT` |
| `rate_bps` | INTEGER | NOT NULL | Basis points (1500 = 15.00%) |
| `is_b2b_exempt` | BOOLEAN | NOT NULL, DEFAULT false | Reverse-charge eligible |
| `effective_from` | DATE | NOT NULL | |
| `effective_to` | DATE | NULL | NULL = currently active |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

**Index:** `(country_code, effective_from, effective_to)`

---

## 21. Subscription Plans

### `subscription_plans`

Master plan definitions managed by platform admins.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `name` | VARCHAR(100) | NOT NULL | e.g. `Professional` |
| `slug` | VARCHAR(100) | NOT NULL, UNIQUE | e.g. `professional` |
| `description` | TEXT | NULL | Pricing page tagline |
| `highlight_features` | JSONB | NULL | Array of feature strings for pricing page |
| `is_free` | BOOLEAN | NOT NULL, DEFAULT false | |
| `is_custom_pricing` | BOOLEAN | NOT NULL, DEFAULT false | Enterprise manual pricing |
| `is_public` | BOOLEAN | NOT NULL, DEFAULT true | Show on public pricing page |
| `is_archived` | BOOLEAN | NOT NULL, DEFAULT false | Hide from new signups |
| `trial_days` | INTEGER | NOT NULL, DEFAULT 0 | |
| `order_by` | INTEGER | NOT NULL, DEFAULT 0 | Display order |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

### `plan_prices`

Pricing per billing cycle per currency. Amounts in smallest unit.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `plan_id` | BIGINT | NOT NULL, FK → subscription_plans(id) | |
| `currency_id` | BIGINT | NOT NULL, FK → currencies(id) | |
| `billing_cycle` | VARCHAR(20) | NOT NULL | `monthly` / `annual` |
| `amount_per_seat` | BIGINT | NOT NULL | Per seat per cycle in smallest unit |
| `flat_amount` | BIGINT | NOT NULL, DEFAULT 0 | Base flat charge (0 for pure per-seat) |
| `gateway_price_id` | VARCHAR(255) | NULL | Stripe Price ID / PayTabs equivalent |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `effective_from` | DATE | NOT NULL, DEFAULT CURRENT_DATE | |
| `effective_to` | DATE | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(plan_id, currency_id, billing_cycle)` WHERE `is_active = true AND effective_to IS NULL`

---

## 22. Plan Features & Limits

### `plan_features`

Feature flags per plan (boolean capabilities).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `plan_id` | BIGINT | NOT NULL, FK → subscription_plans(id) | |
| `feature_key` | VARCHAR(150) | NOT NULL | e.g. `live_chat`, `sso_saml` |
| `is_enabled` | BOOLEAN | NOT NULL, DEFAULT false | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(plan_id, feature_key)`

**Feature keys (seed):** `live_chat`, `social_channels`, `ecommerce_integration`, `workflow_automation`, `knowledgebase`, `custom_roles`, `sla_policies`, `csat_surveys`, `custom_domain`, `white_label_branding`, `api_access`, `sso_saml`, `ip_whitelisting`, `priority_support`, `advanced_reports`, `email_channel`

---

### `plan_limits`

Numeric limits per plan. `-1` = unlimited.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `plan_id` | BIGINT | NOT NULL, FK → subscription_plans(id) | |
| `limit_key` | VARCHAR(150) | NOT NULL | e.g. `max_agents` |
| `limit_value` | INTEGER | NOT NULL | `-1` = unlimited |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(plan_id, limit_key)`

**Limit keys (seed):** `max_agents`, `max_mailboxes`, `max_forms`, `max_workflows`, `max_saved_replies`, `max_kb_articles`, `max_social_accounts`, `max_ecommerce_stores`, `storage_gb`, `max_attachment_mb`

---

## 23. Add-Ons

### `add_ons`

Purchasable add-ons.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `name` | VARCHAR(150) | NOT NULL | e.g. `Extra Agent Seat` |
| `slug` | VARCHAR(100) | NOT NULL, UNIQUE | e.g. `extra_agent_seat` |
| `description` | TEXT | NULL | |
| `unit_label` | VARCHAR(50) | NOT NULL | e.g. `seat`, `10 GB` |
| `affects_limit_key` | VARCHAR(150) | NULL | Limit key this add-on increments |
| `increment_value` | INTEGER | NOT NULL, DEFAULT 1 | How much each unit increments the limit |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

### `add_on_plan_eligibility`

Which plans allow each add-on.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `add_on_id` | BIGINT | NOT NULL, FK → add_ons(id) | |
| `plan_id` | BIGINT | NOT NULL, FK → subscription_plans(id) | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(add_on_id, plan_id)`

---

### `add_on_prices`

Pricing per unit per currency per billing cycle.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `add_on_id` | BIGINT | NOT NULL, FK → add_ons(id) | |
| `currency_id` | BIGINT | NOT NULL, FK → currencies(id) | |
| `billing_cycle` | VARCHAR(20) | NOT NULL | `monthly` / `annual` |
| `amount_per_unit` | BIGINT | NOT NULL | In smallest unit |
| `gateway_price_id` | VARCHAR(255) | NULL | Stripe Price ID |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(add_on_id, currency_id, billing_cycle)` WHERE `is_active = true`

---

## 24. Subscriptions

### `subscriptions`

Active subscription per organization (one active at a time).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `plan_id` | BIGINT | NOT NULL, FK → subscription_plans(id) | |
| `plan_price_id` | BIGINT | NULL, FK → plan_prices(id) | NULL for free/custom plans |
| `currency_id` | BIGINT | NOT NULL, FK → currencies(id) | |
| `billing_cycle` | VARCHAR(20) | NOT NULL | `monthly` / `annual` |
| `status` | VARCHAR(30) | NOT NULL, DEFAULT 'trialing' | `trialing` / `active` / `past_due` / `paused` / `canceled` |
| `quantity` | INTEGER | NOT NULL, DEFAULT 1 | Seat count at last billing snapshot |
| `trial_starts_at` | TIMESTAMPTZ | NULL | |
| `trial_ends_at` | TIMESTAMPTZ | NULL | |
| `current_period_start` | TIMESTAMPTZ | NULL | |
| `current_period_end` | TIMESTAMPTZ | NULL | |
| `next_billing_at` | TIMESTAMPTZ | NULL | |
| `canceled_at` | TIMESTAMPTZ | NULL | |
| `cancel_at_period_end` | BOOLEAN | NOT NULL, DEFAULT false | |
| `cancellation_reason` | TEXT | NULL | |
| `paused_at` | TIMESTAMPTZ | NULL | |
| `grace_period_ends_at` | TIMESTAMPTZ | NULL | Set when `past_due` |
| `account_credit` | BIGINT | NOT NULL, DEFAULT 0 | Credit balance in smallest unit |
| `custom_amount_override` | BIGINT | NULL | Enterprise manual pricing |
| `gateway` | VARCHAR(30) | NULL | `stripe` / `paytabs` / `manual` |
| `gateway_subscription_id` | VARCHAR(255) | NULL | Stripe `sub_xxx` |
| `gateway_customer_id` | VARCHAR(255) | NULL | Stripe `cus_xxx` |
| `metadata` | JSONB | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(organization_id)` WHERE `status NOT IN ('canceled') AND deleted_at IS NULL`
**Indexes:** `(status)`, `(next_billing_at)`, `(grace_period_ends_at)`, `(gateway_subscription_id)`

---

### `subscription_add_ons`

Add-ons currently attached to a subscription.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `subscription_id` | BIGINT | NOT NULL, FK → subscriptions(id) | |
| `add_on_id` | BIGINT | NOT NULL, FK → add_ons(id) | |
| `add_on_price_id` | BIGINT | NOT NULL, FK → add_on_prices(id) | |
| `quantity` | INTEGER | NOT NULL, DEFAULT 1 | Units purchased |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'active' | `active` / `pending_removal` |
| `remove_at_period_end` | BOOLEAN | NOT NULL, DEFAULT false | |
| `gateway_subscription_item_id` | VARCHAR(255) | NULL | Stripe subscription item ID |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(subscription_id, add_on_id)` WHERE `deleted_at IS NULL AND status = 'active'`

---

### `subscription_changes`

Full append-only history of every plan/cycle/quantity change.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `subscription_id` | BIGINT | NOT NULL, FK → subscriptions(id) | |
| `change_type` | VARCHAR(30) | NOT NULL | `upgrade` / `downgrade` / `cycle_change` / `seat_change` / `cancel` / `reactivate` / `trial_convert` / `admin_override` |
| `from_plan_id` | BIGINT | NULL, FK → subscription_plans(id) | |
| `to_plan_id` | BIGINT | NULL, FK → subscription_plans(id) | |
| `from_billing_cycle` | VARCHAR(20) | NULL | |
| `to_billing_cycle` | VARCHAR(20) | NULL | |
| `from_quantity` | INTEGER | NULL | |
| `to_quantity` | INTEGER | NULL | |
| `from_status` | VARCHAR(30) | NULL | |
| `to_status` | VARCHAR(30) | NULL | |
| `proration_amount` | BIGINT | NULL | Prorated credit/charge |
| `effective_at` | TIMESTAMPTZ | NOT NULL | |
| `scheduled_for` | TIMESTAMPTZ | NULL | If deferred to end of cycle |
| `notes` | TEXT | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | Actor (user or system) |

---

### `billing_contacts`

Billing-specific contact details per organization.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `organization_id` | BIGINT | NOT NULL, UNIQUE, FK → organizations(id) | |
| `billing_email` | VARCHAR(255) | NOT NULL | |
| `company_name` | VARCHAR(255) | NULL | |
| `address_line1` | VARCHAR(255) | NULL | |
| `address_line2` | VARCHAR(255) | NULL | |
| `city` | VARCHAR(100) | NULL | |
| `state` | VARCHAR(100) | NULL | |
| `postal_code` | VARCHAR(20) | NULL | |
| `country_code` | VARCHAR(2) | NULL | |
| `vat_number` | VARCHAR(100) | NULL | |
| `vat_verified` | BOOLEAN | NOT NULL, DEFAULT false | |
| `vat_verified_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

---

## 25. Seats & Usage

### `usage_snapshots`

Daily usage record per organization per metric.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `snapshot_date` | DATE | NOT NULL | |
| `metric_key` | VARCHAR(150) | NOT NULL | Matches `plan_limits.limit_key` |
| `used_value` | INTEGER | NOT NULL | |
| `limit_value` | INTEGER | NOT NULL | Effective limit at snapshot time |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(organization_id, snapshot_date, metric_key)`

---

### `billing_seat_snapshots`

Seat count at the start of each billing cycle (used for invoice calculation).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `subscription_id` | BIGINT | NOT NULL, FK → subscriptions(id) | |
| `billing_period_start` | TIMESTAMPTZ | NOT NULL | |
| `billing_period_end` | TIMESTAMPTZ | NOT NULL | |
| `seat_count` | INTEGER | NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(subscription_id, billing_period_start)`

---

## 26. Invoices & Payments

### `invoices`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `subscription_id` | BIGINT | NULL, FK → subscriptions(id) | |
| `invoice_number` | VARCHAR(100) | NOT NULL, UNIQUE | e.g. `INV-tenant-2026-0042` |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'draft' | `draft` / `open` / `paid` / `void` |
| `currency_id` | BIGINT | NOT NULL, FK → currencies(id) | |
| `billing_period_start` | TIMESTAMPTZ | NULL | |
| `billing_period_end` | TIMESTAMPTZ | NULL | |
| `issued_at` | TIMESTAMPTZ | NULL | |
| `due_at` | TIMESTAMPTZ | NULL | |
| `paid_at` | TIMESTAMPTZ | NULL | |
| `voided_at` | TIMESTAMPTZ | NULL | |
| `subtotal` | BIGINT | NOT NULL, DEFAULT 0 | Before discount and tax |
| `discount_amount` | BIGINT | NOT NULL, DEFAULT 0 | |
| `taxable_amount` | BIGINT | NOT NULL, DEFAULT 0 | subtotal − discount |
| `tax_amount` | BIGINT | NOT NULL, DEFAULT 0 | |
| `tax_rate_id` | BIGINT | NULL, FK → tax_rates(id) | |
| `total_amount` | BIGINT | NOT NULL, DEFAULT 0 | taxable + tax |
| `amount_paid` | BIGINT | NOT NULL, DEFAULT 0 | |
| `amount_due` | BIGINT | NOT NULL, DEFAULT 0 | total − paid |
| `credit_applied` | BIGINT | NOT NULL, DEFAULT 0 | Account credit used |
| `coupon_id` | BIGINT | NULL, FK → coupons(id) | |
| `coupon_discount` | BIGINT | NOT NULL, DEFAULT 0 | |
| `locale` | VARCHAR(10) | NOT NULL, DEFAULT 'en' | For Arabic PDF |
| `pdf_storage_key` | TEXT | NULL | S3 key |
| `gateway_invoice_id` | VARCHAR(255) | NULL | Stripe `in_xxx` |
| `notes` | TEXT | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

**Indexes:** `(organization_id, status)`, `(subscription_id)`, `(due_at)`, `(status, due_at)`

---

### `invoice_items`

Line items composing an invoice.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `invoice_id` | BIGINT | NOT NULL, FK → invoices(id) | |
| `type` | VARCHAR(30) | NOT NULL | `plan` / `seat` / `add_on` / `proration` / `credit` / `discount` / `manual` |
| `description` | TEXT | NOT NULL | |
| `quantity` | INTEGER | NOT NULL, DEFAULT 1 | |
| `unit_amount` | BIGINT | NOT NULL | |
| `total_amount` | BIGINT | NOT NULL | `quantity × unit_amount` (can be negative) |
| `period_start` | TIMESTAMPTZ | NULL | |
| `period_end` | TIMESTAMPTZ | NULL | |
| `plan_id` | BIGINT | NULL, FK → subscription_plans(id) | |
| `add_on_id` | BIGINT | NULL, FK → add_ons(id) | |
| `order_by` | INTEGER | NOT NULL, DEFAULT 0 | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `payments`

Payment attempts linked to invoices.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `invoice_id` | BIGINT | NOT NULL, FK → invoices(id) | |
| `payment_method_id` | BIGINT | NULL, FK → payment_methods(id) | |
| `gateway` | VARCHAR(30) | NOT NULL | `stripe` / `paytabs` / `manual` |
| `gateway_payment_id` | VARCHAR(255) | NULL | Stripe `pi_xxx` |
| `gateway_idempotency_key` | VARCHAR(255) | NULL, UNIQUE | Retry safety |
| `status` | VARCHAR(30) | NOT NULL | `pending` / `succeeded` / `failed` / `refunded` / `partially_refunded` |
| `amount` | BIGINT | NOT NULL | |
| `currency_id` | BIGINT | NOT NULL, FK → currencies(id) | |
| `failure_code` | VARCHAR(100) | NULL | |
| `failure_message` | TEXT | NULL | |
| `processed_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `refunds`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `payment_id` | BIGINT | NOT NULL, FK → payments(id) | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `gateway` | VARCHAR(30) | NOT NULL | |
| `gateway_refund_id` | VARCHAR(255) | NULL | |
| `amount` | BIGINT | NOT NULL | |
| `currency_id` | BIGINT | NOT NULL, FK → currencies(id) | |
| `reason` | TEXT | NULL | |
| `status` | VARCHAR(20) | NOT NULL | `pending` / `succeeded` / `failed` |
| `issued_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

---

## 27. Payment Methods

### `payment_methods`

Tokenized payment methods. No raw card data stored.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `gateway` | VARCHAR(30) | NOT NULL | `stripe` / `paytabs` |
| `gateway_payment_method_id` | VARCHAR(255) | NOT NULL | Stripe `pm_xxx` |
| `type` | VARCHAR(30) | NOT NULL | `card` / `mada` / `apple_pay` / `bank_transfer` |
| `brand` | VARCHAR(30) | NULL | `visa` / `mastercard` / `amex` / `mada` |
| `last4` | VARCHAR(4) | NULL | |
| `exp_month` | SMALLINT | NULL | |
| `exp_year` | SMALLINT | NULL | |
| `holder_name` | VARCHAR(255) | NULL | |
| `is_default` | BOOLEAN | NOT NULL, DEFAULT false | |
| `is_expired` | BOOLEAN | NOT NULL, DEFAULT false | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

**Partial unique index:** `(organization_id, is_default)` WHERE `is_default = true AND deleted_at IS NULL`

---

## 28. Coupons & Discounts

### `coupons`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `code` | VARCHAR(100) | NOT NULL, UNIQUE | |
| `name` | VARCHAR(255) | NOT NULL | Internal label |
| `discount_type` | VARCHAR(20) | NOT NULL | `percentage` / `fixed_amount` / `trial_extension` |
| `discount_value` | INTEGER | NOT NULL | % (1–100), amount in smallest unit, or extra days |
| `currency_id` | BIGINT | NULL, FK → currencies(id) | Required for `fixed_amount` |
| `duration` | VARCHAR(20) | NOT NULL | `once` / `repeating` / `forever` |
| `duration_months` | INTEGER | NULL | Required for `repeating` |
| `applicable_plans` | BIGINT[] | NULL | NULL = all plans |
| `new_subscriptions_only` | BOOLEAN | NOT NULL, DEFAULT false | |
| `max_total_redemptions` | INTEGER | NULL | NULL = unlimited |
| `max_per_org_redemptions` | INTEGER | NOT NULL, DEFAULT 1 | |
| `redemption_count` | INTEGER | NOT NULL, DEFAULT 0 | |
| `valid_from` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `valid_to` | TIMESTAMPTZ | NULL | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `gateway_coupon_id` | VARCHAR(255) | NULL | Stripe Coupon ID |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

### `coupon_redemptions`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `coupon_id` | BIGINT | NOT NULL, FK → coupons(id) | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `subscription_id` | BIGINT | NULL, FK → subscriptions(id) | |
| `invoice_id` | BIGINT | NULL, FK → invoices(id) | First invoice discount was applied to |
| `discount_amount_applied` | BIGINT | NULL | |
| `trial_days_added` | INTEGER | NULL | |
| `redeemed_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |

---

## 29. Gateway Integration Records

### `gateway_events`

Raw webhook events. Idempotency guard.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `gateway` | VARCHAR(30) | NOT NULL | `stripe` / `paytabs` |
| `event_id` | VARCHAR(255) | NOT NULL | Gateway-provided event ID |
| `event_type` | VARCHAR(150) | NOT NULL | e.g. `invoice.payment_succeeded` |
| `payload` | JSONB | NOT NULL | Full raw event body |
| `processed` | BOOLEAN | NOT NULL, DEFAULT false | |
| `processed_at` | TIMESTAMPTZ | NULL | |
| `error` | TEXT | NULL | |
| `received_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(gateway, event_id)` — prevents duplicate processing

---

### `complimentary_plans`

Platform-admin-granted free plan access with expiry.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `plan_id` | BIGINT | NOT NULL, FK → subscription_plans(id) | |
| `reason` | TEXT | NULL | |
| `starts_at` | TIMESTAMPTZ | NOT NULL | |
| `expires_at` | TIMESTAMPTZ | NULL | NULL = indefinite |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NOT NULL, FK → users(id) | Platform admin |

---

## 30. Dunning

### `dunning_schedules`

Platform-level dunning configuration.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `attempt_number` | SMALLINT | NOT NULL | 1, 2, 3 … |
| `delay_days_after_failure` | INTEGER | NOT NULL | |
| `send_email` | BOOLEAN | NOT NULL, DEFAULT true | |
| `send_in_app` | BOOLEAN | NOT NULL, DEFAULT true | |
| `email_template_key` | VARCHAR(150) | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `dunning_logs`

Per-subscription dunning action history.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `subscription_id` | BIGINT | NOT NULL, FK → subscriptions(id) | |
| `invoice_id` | BIGINT | NOT NULL, FK → invoices(id) | |
| `attempt_number` | SMALLINT | NOT NULL | |
| `action` | VARCHAR(50) | NOT NULL | `retry_charge` / `send_email` / `send_in_app` / `downgrade` |
| `result` | VARCHAR(30) | NOT NULL | `succeeded` / `failed` / `skipped` |
| `gateway_response` | JSONB | NULL | |
| `executed_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

## 31. Platform Revenue Snapshots

### `mrr_snapshots`

Daily MRR snapshot. Pre-aggregated by background job.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `snapshot_date` | DATE | NOT NULL | |
| `currency_id` | BIGINT | NOT NULL, FK → currencies(id) | |
| `plan_id` | BIGINT | NULL, FK → subscription_plans(id) | NULL = total |
| `active_subscriptions` | INTEGER | NOT NULL | |
| `active_seats` | INTEGER | NOT NULL | |
| `new_mrr` | BIGINT | NOT NULL, DEFAULT 0 | |
| `expansion_mrr` | BIGINT | NOT NULL, DEFAULT 0 | |
| `contraction_mrr` | BIGINT | NOT NULL, DEFAULT 0 | |
| `churned_mrr` | BIGINT | NOT NULL, DEFAULT 0 | |
| `total_mrr` | BIGINT | NOT NULL | |
| `trial_count` | INTEGER | NOT NULL, DEFAULT 0 | |
| `trial_conversions` | INTEGER | NOT NULL, DEFAULT 0 | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(snapshot_date, currency_id, plan_id)`

---

## 32. Full Relationships Summary (Part II)

```
subscription_plans
 ├─ plan_prices                    (1:N) → currencies
 ├─ plan_features                  (1:N)
 └─ plan_limits                    (1:N)

add_ons
 ├─ add_on_prices                  (1:N) → currencies
 └─ add_on_plan_eligibility        (N:M) → subscription_plans

organizations
 ├─ subscriptions                  (1:1 active at a time)
 │   ├─ subscription_add_ons       (1:N) → add_ons
 │   ├─ subscription_changes       (1:N) [append-only history]
 │   └─ billing_seat_snapshots     (1:N)
 ├─ billing_contacts               (1:1)
 ├─ payment_methods                (1:N)
 ├─ invoices                       (1:N)
 │   ├─ invoice_items              (1:N)
 │   ├─ payments                   (1:N)
 │   │   └─ refunds                (1:N)
 │   └─ coupon_redemptions         (0:1) → coupons
 ├─ usage_snapshots                (1:N)
 └─ complimentary_plans            (1:N) → subscription_plans

coupons
 └─ coupon_redemptions             (1:N) → organizations

currencies
 ├─ plan_prices                    (1:N)
 ├─ add_on_prices                  (1:N)
 ├─ invoices                       (1:N)
 ├─ payments                       (1:N)
 ├─ refunds                        (1:N)
 └─ mrr_snapshots                  (1:N)

tax_rates
 └─ invoices                       (1:N)

gateway_events                     [idempotency store — no FK to org]
dunning_schedules                  [platform config — no FK to org]
dunning_logs → subscriptions, invoices

mrr_snapshots → subscription_plans, currencies

── Effective limit resolution (runtime) ────────────────────────────────
effective_limit =
  plan_limits.limit_value (for org's current plan)
  + SUM(subscription_add_ons.quantity × add_ons.increment_value)
    WHERE add_ons.affects_limit_key = :limit_key
    AND subscription_add_ons.status = 'active'
  (-1 in any term means unlimited → result is unlimited)

── Subscription state machine ──────────────────────────────────────────
trialing ──► active  (payment method attached, trial converts)
trialing ──► Free    (trial expires, no payment method)
active   ──► past_due (payment fails)
past_due ──► active  (retry succeeds)
past_due ──► Free    (grace period expires, no payment)
active   ──► canceled (immediate or end-of-period)
canceled ──► active  (reactivation → new subscription created)
active   ──► paused  (Enterprise admin action)
paused   ──► active  (reactivation)
```

---

*End of ERD — Unified Customer Support & Ticket Management Platform + SaaS Billing v1.0.0*
