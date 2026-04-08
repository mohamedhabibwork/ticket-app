# Entity Relationship Diagram (ERD)
## Unified Customer Support & Ticket Management Platform

| Field | Value |
|---|---|
| **Version** | 1.0.0 |
| **Database** | PostgreSQL 16+ |
| **Date** | 2026-04-08 |

---

## Schema Conventions

- **Primary Key:** `BIGSERIAL` (internal), `UUID` v4 via `gen_random_uuid()` (public-facing)
- **Timestamps:** All `TIMESTAMPTZ`, always in UTC
- **Soft Delete:** `deleted_at TIMESTAMPTZ NULL` on all primary entities
- **Audit Columns:** `created_by`, `updated_by`, `deleted_by` → `BIGINT REFERENCES users(id)` on all primary entities
- **Enum Replacement:** All enums stored via the centralized `lookup_types` + `lookups` system
- **Naming:** `snake_case` for all identifiers

---

## Table of Contents

1. [Lookup System](#1-lookup-system)
2. [Organizations & Branding](#2-organizations--branding)
3. [Users, Roles & Security](#3-users-roles--security)
4. [Contacts](#4-contacts)
5. [Mailboxes & Email](#5-mailboxes--email)
6. [Tickets](#6-tickets)
7. [Ticket Administration (SLA & Custom Fields)](#7-ticket-administration-sla--custom-fields)
8. [Saved Replies](#8-saved-replies)
9. [Task Management](#9-task-management)
10. [Form Builder](#10-form-builder)
11. [Workflow & Automation](#11-workflow--automation)
12. [Social Media](#12-social-media)
13. [Channels](#13-channels)
14. [Knowledgebase](#14-knowledgebase)
15. [Binaka Live Chat](#15-binaka-live-chat)
16. [eCommerce Integration](#16-ecommerce-integration)
17. [Performance & Reporting](#17-performance--reporting)
18. [Audit & Security Logs](#18-audit--security-logs)
19. [Relationships Summary](#19-relationships-summary)

---

## 1. Lookup System

### `lookup_types`

Central registry of all configurable enum categories.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | Internal ID |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | Public ID |
| `name` | VARCHAR(100) | NOT NULL, UNIQUE | Machine-readable key e.g. `ticket_status` |
| `label` | VARCHAR(150) | NOT NULL | Human-readable label |
| `description` | TEXT | NULL | Optional description |
| `is_system` | BOOLEAN | NOT NULL, DEFAULT false | System types cannot be deleted |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Seed values (name):** `ticket_status`, `ticket_priority`, `task_status`, `task_priority`, `article_status`, `channel_type`, `social_platform`, `ecommerce_platform`, `widget_position`, `form_field_type`, `workflow_trigger`, `workflow_action_type`, `sla_breach_action`, `contact_type`, `agent_role`

---

### `lookups`

All configurable values across the system. Self-referential for hierarchy.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | Internal ID |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | Public ID |
| `lookup_type_id` | BIGINT | NOT NULL, FK → lookup_types(id) | Category |
| `parent_id` | BIGINT | NULL, FK → lookups(id) | For nested lookups |
| `organization_id` | BIGINT | NULL, FK → organizations(id) | NULL = platform-wide |
| `name` | VARCHAR(100) | NOT NULL | Machine key e.g. `open` |
| `label` | VARCHAR(150) | NOT NULL | Display label e.g. `Open` |
| `label_ar` | VARCHAR(150) | NULL | Arabic label |
| `color` | VARCHAR(7) | NULL | Hex color for badges |
| `icon` | VARCHAR(100) | NULL | Icon identifier |
| `order_by` | INTEGER | NOT NULL, DEFAULT 0 | Sort order |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `is_default` | BOOLEAN | NOT NULL, DEFAULT false | Default selection |
| `metadata` | JSONB | NULL | Extra config per lookup type |
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
| `name` | VARCHAR(255) | NOT NULL | Organization display name |
| `slug` | VARCHAR(100) | NOT NULL, UNIQUE | URL-safe identifier |
| `subdomain` | VARCHAR(100) | NOT NULL, UNIQUE | `{slug}.helpdesk.io` |
| `custom_domain` | VARCHAR(255) | NULL, UNIQUE | Custom support portal domain |
| `custom_domain_verified` | BOOLEAN | NOT NULL, DEFAULT false | |
| `plan_id` | BIGINT | NULL, FK → subscription_plans(id) | Current billing plan |
| `max_agents` | INTEGER | NULL | Seat limit; NULL = unlimited |
| `locale` | VARCHAR(10) | NOT NULL, DEFAULT 'en' | Default locale |
| `timezone` | VARCHAR(50) | NOT NULL, DEFAULT 'UTC' | Default timezone |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `trial_ends_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | Soft delete |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

### `organization_settings`

Key-value settings per organization (one row per setting key).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `key` | VARCHAR(150) | NOT NULL | Setting key |
| `value` | TEXT | NULL | Setting value |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(organization_id, key)`

**Common keys:** `business_hours`, `sla_paused_on_pending`, `csat_enabled`, `csat_delay_hours`, `ticket_ref_prefix`, `duplicate_window_minutes`, `spam_filter_enabled`, `max_attachment_mb`

---

### `branding_configs`

White-label and visual customization per organization.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, UNIQUE, FK → organizations(id) | |
| `logo_url` | TEXT | NULL | Primary logo URL |
| `favicon_url` | TEXT | NULL | Favicon URL |
| `primary_color` | VARCHAR(7) | NULL | Hex e.g. `#1A73E8` |
| `secondary_color` | VARCHAR(7) | NULL | |
| `background_color` | VARCHAR(7) | NULL | |
| `font_family` | VARCHAR(100) | NULL | Google Font name |
| `custom_css` | TEXT | NULL | Organization-level CSS overrides |
| `login_bg_url` | TEXT | NULL | Custom login page background |
| `login_headline` | VARCHAR(255) | NULL | Custom login headline |
| `hide_vendor_branding` | BOOLEAN | NOT NULL, DEFAULT false | White-label flag |
| `portal_header_html` | TEXT | NULL | Custom portal header HTML |
| `portal_footer_html` | TEXT | NULL | Custom portal footer HTML |
| `email_logo_url` | TEXT | NULL | Logo used in email templates |
| `email_header_color` | VARCHAR(7) | NULL | |
| `email_footer_text` | TEXT | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

---

### `themes`

Per-agent theme preferences (dark mode, density, etc).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `user_id` | BIGINT | NOT NULL, UNIQUE, FK → users(id) | |
| `mode` | VARCHAR(20) | NOT NULL, DEFAULT 'light' | `light` / `dark` / `system` |
| `density` | VARCHAR(20) | NOT NULL, DEFAULT 'comfortable' | `compact` / `comfortable` |
| `sidebar_collapsed` | BOOLEAN | NOT NULL, DEFAULT false | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

## 3. Users, Roles & Security

### `users`

Platform users: agents, admins, and owners.

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
| `display_name` | VARCHAR(200) | NULL | Overrides first+last in UI |
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

RBAC roles defined per organization.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `name` | VARCHAR(100) | NOT NULL | e.g. `Administrator` |
| `slug` | VARCHAR(100) | NOT NULL | e.g. `administrator` |
| `description` | TEXT | NULL | |
| `is_system` | BOOLEAN | NOT NULL, DEFAULT false | System roles cannot be deleted |
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

Granular permission registry (platform-level, not org-specific).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `key` | VARCHAR(150) | NOT NULL, UNIQUE | e.g. `tickets.delete` |
| `label` | VARCHAR(200) | NOT NULL | |
| `group` | VARCHAR(100) | NOT NULL | e.g. `Tickets`, `Reports`, `Settings` |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `role_permissions`

Junction: which permissions each role grants.

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

Junction: which roles each user holds within an organization.

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

Organizational grouping of agents for routing and reporting.

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

Junction: agents belonging to a team.

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

Active sessions for authentication management.

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

2FA configuration per user.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `user_id` | BIGINT | NOT NULL, UNIQUE, FK → users(id) | |
| `method` | VARCHAR(20) | NOT NULL | `totp` / `email_otp` |
| `totp_secret` | VARCHAR(255) | NULL | Encrypted TOTP secret |
| `backup_codes` | JSONB | NULL | Encrypted backup codes array |
| `is_enabled` | BOOLEAN | NOT NULL, DEFAULT false | |
| `enabled_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `api_keys`

Scoped API keys for programmatic access.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `user_id` | BIGINT | NULL, FK → users(id) | Owner; NULL = org-level key |
| `name` | VARCHAR(150) | NOT NULL | |
| `key_hash` | VARCHAR(255) | NOT NULL, UNIQUE | SHA-256 hash of actual key |
| `key_prefix` | VARCHAR(10) | NOT NULL | First 8 chars for display |
| `scopes` | JSONB | NOT NULL, DEFAULT '[]' | Permission scopes |
| `last_used_at` | TIMESTAMPTZ | NULL | |
| `expires_at` | TIMESTAMPTZ | NULL | |
| `revoked_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

---

### `ip_whitelist`

Per-organization IP access restrictions.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `ip_range` | CIDR | NOT NULL | IP or CIDR range |
| `label` | VARCHAR(150) | NULL | Description |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |

---

## 4. Contacts

### `contacts`

End customers who submit tickets.

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
| `contact_type_id` | BIGINT | NULL, FK → lookups(id) | Lookup: contact_type |
| `language` | VARCHAR(10) | NULL | |
| `timezone` | VARCHAR(50) | NULL | |
| `is_blocked` | BOOLEAN | NOT NULL, DEFAULT false | |
| `external_id` | VARCHAR(255) | NULL | ID from integrated eCommerce system |
| `metadata` | JSONB | NULL | Extra key-value attributes |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(organization_id, email)` WHERE `deleted_at IS NULL`

---

### `contact_notes`

Internal notes agents write about a contact.

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

Email mailboxes connected to the platform.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `name` | VARCHAR(150) | NOT NULL | Display name |
| `email` | VARCHAR(255) | NOT NULL | Inbound address |
| `reply_to` | VARCHAR(255) | NULL | Reply-to override |
| `connection_type` | VARCHAR(30) | NOT NULL | `imap_smtp` / `gmail_oauth` / `outlook_oauth` / `hosted` |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `is_default` | BOOLEAN | NOT NULL, DEFAULT false | |
| `auto_reply_enabled` | BOOLEAN | NOT NULL, DEFAULT false | |
| `auto_reply_subject` | VARCHAR(255) | NULL | |
| `auto_reply_body_html` | TEXT | NULL | |
| `default_team_id` | BIGINT | NULL, FK → teams(id) | Default routing team |
| `last_synced_at` | TIMESTAMPTZ | NULL | |
| `sync_error` | TEXT | NULL | Last sync error message |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

### `mailbox_imap_configs`

IMAP connection settings for a mailbox.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `mailbox_id` | BIGINT | NOT NULL, UNIQUE, FK → mailboxes(id) | |
| `host` | VARCHAR(255) | NOT NULL | |
| `port` | INTEGER | NOT NULL | |
| `username` | VARCHAR(255) | NOT NULL | |
| `password_enc` | TEXT | NOT NULL | AES-256 encrypted |
| `use_ssl` | BOOLEAN | NOT NULL, DEFAULT true | |
| `oauth_token_enc` | TEXT | NULL | For OAuth-based connections |
| `oauth_refresh_token_enc` | TEXT | NULL | |
| `oauth_expires_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `mailbox_smtp_configs`

SMTP connection settings for outbound email.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `mailbox_id` | BIGINT | NOT NULL, UNIQUE, FK → mailboxes(id) | |
| `host` | VARCHAR(255) | NOT NULL | |
| `port` | INTEGER | NOT NULL | |
| `username` | VARCHAR(255) | NOT NULL | |
| `password_enc` | TEXT | NOT NULL | AES-256 encrypted |
| `use_tls` | BOOLEAN | NOT NULL, DEFAULT true | |
| `from_name` | VARCHAR(150) | NULL | |
| `from_email` | VARCHAR(255) | NULL | Overrides mailbox email for SMTP FROM |
| `dkim_private_key_enc` | TEXT | NULL | DKIM signing key |
| `dkim_selector` | VARCHAR(100) | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `mailbox_aliases`

Additional email addresses that route to a mailbox.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `mailbox_id` | BIGINT | NOT NULL, FK → mailboxes(id) | |
| `alias_email` | VARCHAR(255) | NOT NULL, UNIQUE | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |

---

### `email_routing_rules`

Rules to automatically route inbound emails to teams or tags.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `mailbox_id` | BIGINT | NULL, FK → mailboxes(id) | NULL = applies to all mailboxes |
| `name` | VARCHAR(150) | NOT NULL | |
| `conditions` | JSONB | NOT NULL | Array of condition objects |
| `action_team_id` | BIGINT | NULL, FK → teams(id) | Assign to this team |
| `action_tag_ids` | BIGINT[] | NULL | Add these tag IDs |
| `action_priority_id` | BIGINT | NULL, FK → lookups(id) | Set priority |
| `order_by` | INTEGER | NOT NULL, DEFAULT 0 | Evaluation order |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

### `email_messages`

Raw inbound and outbound email records.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `mailbox_id` | BIGINT | NOT NULL, FK → mailboxes(id) | |
| `ticket_id` | BIGINT | NULL, FK → tickets(id) | Linked ticket |
| `direction` | VARCHAR(10) | NOT NULL | `inbound` / `outbound` |
| `message_id` | TEXT | NOT NULL, UNIQUE | Email Message-ID header |
| `in_reply_to` | TEXT | NULL | In-Reply-To header |
| `from_email` | VARCHAR(255) | NOT NULL | |
| `from_name` | VARCHAR(255) | NULL | |
| `to_emails` | JSONB | NOT NULL | Array of email addresses |
| `cc_emails` | JSONB | NULL | |
| `bcc_emails` | JSONB | NULL | |
| `subject` | TEXT | NULL | |
| `body_html` | TEXT | NULL | |
| `body_text` | TEXT | NULL | |
| `raw_headers` | JSONB | NULL | Full parsed headers |
| `is_spam` | BOOLEAN | NOT NULL, DEFAULT false | |
| `spam_score` | NUMERIC(5,2) | NULL | |
| `bounce_type` | VARCHAR(20) | NULL | `soft` / `hard` / NULL |
| `sent_at` | TIMESTAMPTZ | NULL | |
| `received_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `email_attachments`

Files attached to email messages.

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

Core ticket entity.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `reference_number` | VARCHAR(30) | NOT NULL, UNIQUE | Human-readable e.g. `TKT-00045` |
| `subject` | TEXT | NOT NULL | |
| `description_html` | TEXT | NULL | |
| `status_id` | BIGINT | NOT NULL, FK → lookups(id) | Lookup: ticket_status |
| `priority_id` | BIGINT | NOT NULL, FK → lookups(id) | Lookup: ticket_priority |
| `channel_id` | BIGINT | NULL, FK → lookups(id) | Lookup: channel_type (email/chat/social/form/api) |
| `contact_id` | BIGINT | NULL, FK → contacts(id) | Requester |
| `assigned_agent_id` | BIGINT | NULL, FK → users(id) | Assignee |
| `assigned_team_id` | BIGINT | NULL, FK → teams(id) | |
| `mailbox_id` | BIGINT | NULL, FK → mailboxes(id) | Source mailbox |
| `form_submission_id` | BIGINT | NULL, FK → form_submissions(id) | If created via form |
| `social_message_id` | BIGINT | NULL, FK → social_messages(id) | If created via social |
| `chat_session_id` | BIGINT | NULL, FK → chat_sessions(id) | If created via Binaka |
| `parent_ticket_id` | BIGINT | NULL, FK → tickets(id) | If this was merged INTO parent |
| `is_merged` | BOOLEAN | NOT NULL, DEFAULT false | |
| `is_spam` | BOOLEAN | NOT NULL, DEFAULT false | |
| `is_locked` | BOOLEAN | NOT NULL, DEFAULT false | Editing lock |
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

### `ticket_custom_field_values`

Values for custom ticket fields per ticket.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `ticket_id` | BIGINT | NOT NULL, FK → tickets(id) | |
| `field_id` | BIGINT | NOT NULL, FK → ticket_custom_fields(id) | |
| `value_text` | TEXT | NULL | |
| `value_number` | NUMERIC | NULL | |
| `value_boolean` | BOOLEAN | NULL | |
| `value_date` | TIMESTAMPTZ | NULL | |
| `value_lookup_id` | BIGINT | NULL, FK → lookups(id) | For dropdown/select fields |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(ticket_id, field_id)`

---

### `ticket_messages`

Agent and customer replies within a ticket thread.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `ticket_id` | BIGINT | NOT NULL, FK → tickets(id) | |
| `email_message_id` | BIGINT | NULL, FK → email_messages(id) | Linked raw email if from email |
| `author_type` | VARCHAR(20) | NOT NULL | `agent` / `contact` / `system` |
| `author_user_id` | BIGINT | NULL, FK → users(id) | If agent |
| `author_contact_id` | BIGINT | NULL, FK → contacts(id) | If contact |
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

Files attached to ticket messages.

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

Reusable tags for categorizing tickets.

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

Junction: tags applied to tickets.

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

Agents who follow a ticket and receive notifications.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `ticket_id` | BIGINT | NOT NULL, FK → tickets(id) | |
| `user_id` | BIGINT | NOT NULL, FK → users(id) | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(ticket_id, user_id)`

---

### `ticket_cc`

CC recipients who receive all ticket email notifications.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `ticket_id` | BIGINT | NOT NULL, FK → tickets(id) | |
| `email` | VARCHAR(255) | NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(ticket_id, email)`

---

### `ticket_merges`

History of ticket merge operations.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `master_ticket_id` | BIGINT | NOT NULL, FK → tickets(id) | Surviving ticket |
| `merged_ticket_id` | BIGINT | NOT NULL, FK → tickets(id) | Ticket that was merged in |
| `merged_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `merged_by` | BIGINT | NOT NULL, FK → users(id) | |

---

### `ticket_views`

Agent-saved filtered views for the ticket inbox.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `user_id` | BIGINT | NULL, FK → users(id) | NULL = shared org-wide view |
| `name` | VARCHAR(150) | NOT NULL | |
| `filters` | JSONB | NOT NULL | Filter condition set |
| `sort_by` | VARCHAR(50) | NOT NULL, DEFAULT 'created_at' | |
| `sort_dir` | VARCHAR(4) | NOT NULL, DEFAULT 'desc' | |
| `is_default` | BOOLEAN | NOT NULL, DEFAULT false | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

---

## 7. Ticket Administration (SLA & Custom Fields)

### `sla_policies`

SLA definitions per organization.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `name` | VARCHAR(150) | NOT NULL | |
| `description` | TEXT | NULL | |
| `is_default` | BOOLEAN | NOT NULL, DEFAULT false | |
| `business_hours_only` | BOOLEAN | NOT NULL, DEFAULT true | |
| `business_hours_config` | JSONB | NULL | Days/hours definition |
| `holidays` | JSONB | NULL | Array of holiday dates |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

---

### `sla_policy_targets`

Response and resolution time targets per priority within an SLA policy.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `sla_policy_id` | BIGINT | NOT NULL, FK → sla_policies(id) | |
| `priority_id` | BIGINT | NOT NULL, FK → lookups(id) | Lookup: ticket_priority |
| `first_response_minutes` | INTEGER | NOT NULL | |
| `resolution_minutes` | INTEGER | NOT NULL | |
| `escalate_agent_id` | BIGINT | NULL, FK → users(id) | Escalation target on breach |
| `escalate_team_id` | BIGINT | NULL, FK → teams(id) | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(sla_policy_id, priority_id)`

---

### `ticket_sla`

Active SLA tracking record per ticket.

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
| `paused_at` | TIMESTAMPTZ | NULL | SLA timer paused |
| `paused_duration_minutes` | INTEGER | NOT NULL, DEFAULT 0 | Cumulative pause time |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `ticket_custom_fields`

Admin-defined custom fields for the ticket form.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `name` | VARCHAR(100) | NOT NULL | Machine key |
| `label` | VARCHAR(150) | NOT NULL | |
| `field_type` | VARCHAR(30) | NOT NULL | `text` / `number` / `date` / `checkbox` / `dropdown` / `multi_select` |
| `options` | JSONB | NULL | For dropdown/multi_select: `[{label, value}]` |
| `is_required` | BOOLEAN | NOT NULL, DEFAULT false | |
| `is_visible_to_contact` | BOOLEAN | NOT NULL, DEFAULT false | Show on portal form |
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

CSAT survey sent to customer after ticket resolution.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | Public token for survey link |
| `ticket_id` | BIGINT | NOT NULL, UNIQUE, FK → tickets(id) | |
| `sent_to` | VARCHAR(255) | NOT NULL | Customer email |
| `sent_at` | TIMESTAMPTZ | NOT NULL | |
| `expires_at` | TIMESTAMPTZ | NOT NULL | |
| `rating` | SMALLINT | NULL | 1–5 |
| `comment` | TEXT | NULL | |
| `responded_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

## 8. Saved Replies

### `saved_reply_folders`

Organizational folders for saved replies.

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

Pre-written reply templates.

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
| `team_id` | BIGINT | NULL, FK → teams(id) | For team-scoped replies |
| `user_id` | BIGINT | NULL, FK → users(id) | For personal replies |
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

Tasks linked to tickets or standalone.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `ticket_id` | BIGINT | NULL, FK → tickets(id) | Optional ticket link |
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

Junction: users assigned to a task.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `task_id` | BIGINT | NOT NULL, FK → tasks(id) | |
| `user_id` | BIGINT | NOT NULL, FK → users(id) | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(task_id, user_id)`

---

### `task_checklist_items`

Sub-items within a task.

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

Configurable contact/support request forms.

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
| `captcha_provider` | VARCHAR(30) | NULL | `recaptcha_v3` / `hcaptcha` / NULL |
| `captcha_site_key` | VARCHAR(255) | NULL | |
| `captcha_secret_enc` | TEXT | NULL | |
| `is_password_protected` | BOOLEAN | NOT NULL, DEFAULT false | |
| `password_hash` | VARCHAR(255) | NULL | |
| `allowed_domains` | JSONB | NULL | Domain allowlist |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `is_published` | BOOLEAN | NOT NULL, DEFAULT false | |
| `submitted_message` | TEXT | NULL | Success message shown post-submit |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULL | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |
| `deleted_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(organization_id, slug)` WHERE `deleted_at IS NULL`

---

### `form_fields`

Fields composing a form.

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
| `options` | JSONB | NULL | For select/radio/checkbox: `[{label,value}]` |
| `validation_rules` | JSONB | NULL | `{min,max,pattern,...}` |
| `maps_to_field` | VARCHAR(100) | NULL | Native ticket field key |
| `maps_to_custom_field_id` | BIGINT | NULL, FK → ticket_custom_fields(id) | |
| `conditional_logic` | JSONB | NULL | Show/hide conditions |
| `order_by` | INTEGER | NOT NULL, DEFAULT 0 | |
| `is_hidden` | BOOLEAN | NOT NULL, DEFAULT false | Hidden field |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

---

### `form_submissions`

Individual form submission records.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `form_id` | BIGINT | NOT NULL, FK → forms(id) | |
| `ticket_id` | BIGINT | NULL, FK → tickets(id) | Resulting ticket |
| `contact_id` | BIGINT | NULL, FK → contacts(id) | Matched/created contact |
| `ip_address` | INET | NULL | |
| `user_agent` | TEXT | NULL | |
| `captcha_score` | NUMERIC(4,3) | NULL | reCAPTCHA score |
| `submitted_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `form_submission_values`

Field-level values for a form submission.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `form_submission_id` | BIGINT | NOT NULL, FK → form_submissions(id) | |
| `form_field_id` | BIGINT | NOT NULL, FK → form_fields(id) | |
| `value_text` | TEXT | NULL | |
| `value_files` | JSONB | NULL | Array of uploaded file keys |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(form_submission_id, form_field_id)`

---

## 11. Workflow & Automation

### `workflows`

Automation rules: trigger → conditions → actions.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `name` | VARCHAR(255) | NOT NULL | |
| `description` | TEXT | NULL | |
| `trigger_event_id` | BIGINT | NOT NULL, FK → lookups(id) | Lookup: workflow_trigger |
| `condition_logic` | VARCHAR(10) | NOT NULL, DEFAULT 'AND' | `AND` / `OR` |
| `conditions` | JSONB | NOT NULL | Array of condition objects |
| `actions` | JSONB | NOT NULL | Array of action objects |
| `stop_processing` | BOOLEAN | NOT NULL, DEFAULT false | Halt subsequent workflows |
| `order_by` | INTEGER | NOT NULL, DEFAULT 0 | Evaluation order |
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

Execution history for every workflow run.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `workflow_id` | BIGINT | NOT NULL, FK → workflows(id) | |
| `ticket_id` | BIGINT | NULL, FK → tickets(id) | Entity that triggered it |
| `trigger_event` | VARCHAR(100) | NOT NULL | |
| `conditions_matched` | BOOLEAN | NOT NULL | |
| `actions_executed` | JSONB | NULL | Array of executed action results |
| `error` | TEXT | NULL | Error message if failed |
| `executed_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:** `(workflow_id, executed_at DESC)`, `(ticket_id)`

---

## 12. Social Media

### `social_accounts`

Connected social media accounts per organization.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `platform_id` | BIGINT | NOT NULL, FK → lookups(id) | Lookup: social_platform |
| `account_name` | VARCHAR(255) | NOT NULL | Handle or Page name |
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

Inbound messages/comments from social channels.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `social_account_id` | BIGINT | NOT NULL, FK → social_accounts(id) | |
| `ticket_id` | BIGINT | NULL, FK → tickets(id) | Resulting ticket |
| `platform_message_id` | VARCHAR(500) | NOT NULL | ID from the social platform |
| `message_type` | VARCHAR(30) | NOT NULL | `dm` / `mention` / `comment` / `post` |
| `sender_platform_id` | VARCHAR(255) | NOT NULL | Sender's platform user ID |
| `sender_name` | VARCHAR(255) | NULL | |
| `sender_avatar_url` | TEXT | NULL | |
| `body` | TEXT | NULL | |
| `media_urls` | JSONB | NULL | Array of media URLs |
| `parent_message_id` | VARCHAR(500) | NULL | For threaded comments |
| `received_at` | TIMESTAMPTZ | NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique:** `(social_account_id, platform_message_id)`

---

## 13. Channels

### `channels`

Registry of all communication channels configured for an organization.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `channel_type_id` | BIGINT | NOT NULL, FK → lookups(id) | Lookup: channel_type |
| `name` | VARCHAR(150) | NOT NULL | |
| `reference_id` | BIGINT | NULL | FK to mailbox_id / social_account_id / chat_widget_id |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

---

## 14. Knowledgebase

### `kb_categories`

Two-level hierarchy: Category → Subcategory.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `parent_id` | BIGINT | NULL, FK → kb_categories(id) | NULL = top-level category |
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

Knowledgebase articles.

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
| `excerpt` | TEXT | NULL | Short summary |
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

Manually linked related articles.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `article_id` | BIGINT | NOT NULL, FK → kb_articles(id) | |
| `related_article_id` | BIGINT | NOT NULL, FK → kb_articles(id) | |
| `order_by` | INTEGER | NOT NULL, DEFAULT 0 | |

**Unique:** `(article_id, related_article_id)`

---

### `kb_article_feedback`

Reader feedback on articles.

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

Embeddable chat widget configuration.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | Public widget ID used in JS snippet |
| `organization_id` | BIGINT | NOT NULL, UNIQUE, FK → organizations(id) | |
| `name` | VARCHAR(150) | NOT NULL | |
| `greeting_message` | TEXT | NULL | |
| `away_message` | TEXT | NULL | Shown outside business hours |
| `primary_color` | VARCHAR(7) | NULL | |
| `position_id` | BIGINT | NULL, FK → lookups(id) | Lookup: widget_position |
| `default_team_id` | BIGINT | NULL, FK → teams(id) | |
| `pre_chat_form_enabled` | BOOLEAN | NOT NULL, DEFAULT true | |
| `pre_chat_fields` | JSONB | NULL | `[{name, email, phone}]` toggles |
| `kb_search_enabled` | BOOLEAN | NOT NULL, DEFAULT false | Show KB search before agent connect |
| `max_file_size_mb` | INTEGER | NOT NULL, DEFAULT 10 | |
| `proactive_triggers` | JSONB | NULL | Time-on-page trigger configs |
| `business_hours_config` | JSONB | NULL | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |
| `updated_by` | BIGINT | NULL, FK → users(id) | |

---

### `chat_sessions`

Individual live chat sessions.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `chat_widget_id` | BIGINT | NOT NULL, FK → chat_widgets(id) | |
| `ticket_id` | BIGINT | NULL, FK → tickets(id) | Created upon session end |
| `contact_id` | BIGINT | NULL, FK → contacts(id) | If identified |
| `assigned_agent_id` | BIGINT | NULL, FK → users(id) | |
| `assigned_team_id` | BIGINT | NULL, FK → teams(id) | |
| `visitor_name` | VARCHAR(200) | NULL | |
| `visitor_email` | VARCHAR(255) | NULL | |
| `visitor_ip` | INET | NULL | |
| `visitor_user_agent` | TEXT | NULL | |
| `page_url` | TEXT | NULL | Page where chat started |
| `status` | VARCHAR(30) | NOT NULL, DEFAULT 'pending' | `pending` / `active` / `ended` / `missed` |
| `rating` | SMALLINT | NULL | 1–5 post-chat rating |
| `rating_comment` | TEXT | NULL | |
| `started_at` | TIMESTAMPTZ | NULL | |
| `ended_at` | TIMESTAMPTZ | NULL | |
| `transcript_sent` | BOOLEAN | NOT NULL, DEFAULT false | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `chat_messages`

Messages within a chat session.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `chat_session_id` | BIGINT | NOT NULL, FK → chat_sessions(id) | |
| `sender_type` | VARCHAR(20) | NOT NULL | `agent` / `visitor` / `bot` / `system` |
| `sender_user_id` | BIGINT | NULL, FK → users(id) | If agent |
| `body` | TEXT | NULL | |
| `attachments` | JSONB | NULL | Array of `{filename, storage_key, mime_type, size_bytes}` |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

## 16. eCommerce Integration

### `ecommerce_integrations`

Connected eCommerce store configurations.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `platform_id` | BIGINT | NOT NULL, FK → lookups(id) | Lookup: ecommerce_platform |
| `name` | VARCHAR(150) | NOT NULL | Store name/label |
| `store_url` | TEXT | NOT NULL | |
| `api_key_enc` | TEXT | NULL | AES-256 encrypted |
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

Order data cached from connected stores.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `ecommerce_integration_id` | BIGINT | NOT NULL, FK → ecommerce_integrations(id) | |
| `contact_id` | BIGINT | NULL, FK → contacts(id) | Matched contact |
| `platform_order_id` | VARCHAR(255) | NOT NULL | ID from the store |
| `order_number` | VARCHAR(100) | NULL | Human-readable order number |
| `status` | VARCHAR(100) | NULL | As returned by the platform |
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

Links between tickets and eCommerce orders.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `ticket_id` | BIGINT | NOT NULL, FK → tickets(id) | |
| `ecommerce_order_id` | BIGINT | NOT NULL, FK → ecommerce_orders(id) | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `created_by` | BIGINT | NULL, FK → users(id) | |

**Unique:** `(ticket_id, ecommerce_order_id)`

---

## 17. Performance & Reporting

### `agent_performance_snapshots`

Daily aggregated performance snapshot per agent.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `user_id` | BIGINT | NOT NULL, FK → users(id) | Agent |
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

## 18. Audit & Security Logs

### `audit_logs`

Tamper-evident log of all sensitive mutations.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `organization_id` | BIGINT | NULL, FK → organizations(id) | |
| `user_id` | BIGINT | NULL, FK → users(id) | Actor |
| `entity_type` | VARCHAR(100) | NOT NULL | e.g. `ticket`, `user`, `role` |
| `entity_id` | BIGINT | NULL | ID of affected entity |
| `action` | VARCHAR(100) | NOT NULL | e.g. `create`, `update`, `delete`, `login` |
| `changes` | JSONB | NULL | `{before: {...}, after: {...}}` |
| `ip_address` | INET | NULL | |
| `user_agent` | TEXT | NULL | |
| `metadata` | JSONB | NULL | Extra context |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:** `(organization_id, entity_type, entity_id)`, `(user_id, created_at DESC)`, `(created_at DESC)`

---

### `notifications`

In-platform notification records per user.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `uuid` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | |
| `organization_id` | BIGINT | NOT NULL, FK → organizations(id) | |
| `user_id` | BIGINT | NOT NULL, FK → users(id) | Recipient |
| `type` | VARCHAR(100) | NOT NULL | e.g. `ticket_assigned`, `sla_breach`, `task_due` |
| `title` | VARCHAR(255) | NOT NULL | |
| `body` | TEXT | NULL | |
| `reference_type` | VARCHAR(50) | NULL | `ticket` / `task` / `chat` |
| `reference_id` | BIGINT | NULL | |
| `is_read` | BOOLEAN | NOT NULL, DEFAULT false | |
| `read_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:** `(user_id, is_read, created_at DESC)`

---

## 19. Relationships Summary

```
organizations
 ├─ organization_settings      (1:N)
 ├─ branding_configs           (1:1)
 ├─ users                      (1:N)
 │   ├─ themes                 (1:1)
 │   ├─ two_factor_auth        (1:1)
 │   ├─ user_sessions          (1:N)
 │   └─ user_roles             (N:M via user_roles) → roles
 ├─ roles                      (1:N)
 │   └─ role_permissions       (N:M via role_permissions) → permissions
 ├─ teams                      (1:N)
 │   └─ team_members           (N:M via team_members) → users
 ├─ api_keys                   (1:N)
 ├─ ip_whitelist               (1:N)
 ├─ mailboxes                  (1:N)
 │   ├─ mailbox_imap_configs   (1:1)
 │   ├─ mailbox_smtp_configs   (1:1)
 │   └─ mailbox_aliases        (1:N)
 ├─ email_routing_rules        (1:N)
 ├─ contacts                   (1:N)
 │   └─ contact_notes          (1:N)
 ├─ tickets                    (1:N)
 │   ├─ ticket_messages        (1:N)
 │   ├─ ticket_attachments     (1:N)
 │   ├─ ticket_tags            (N:M via ticket_tags) → tags
 │   ├─ ticket_followers       (N:M via ticket_followers) → users
 │   ├─ ticket_cc              (1:N)
 │   ├─ ticket_sla             (1:1) → sla_policies
 │   ├─ ticket_custom_field_values (1:N) → ticket_custom_fields
 │   ├─ ticket_merges          (1:N)
 │   ├─ ticket_orders          (N:M via ticket_orders) → ecommerce_orders
 │   └─ csat_surveys           (1:1)
 ├─ ticket_custom_fields       (1:N)
 ├─ sla_policies               (1:N)
 │   └─ sla_policy_targets     (1:N)
 ├─ tags                       (1:N)
 ├─ ticket_views               (1:N)
 ├─ saved_reply_folders        (1:N)
 │   └─ saved_replies          (1:N)
 ├─ tasks                      (1:N)
 │   ├─ task_assignees         (N:M) → users
 │   └─ task_checklist_items   (1:N)
 ├─ forms                      (1:N)
 │   ├─ form_fields            (1:N)
 │   └─ form_submissions       (1:N)
 │       └─ form_submission_values (1:N) → form_fields
 ├─ workflows                  (1:N)
 │   └─ workflow_execution_logs (1:N)
 ├─ social_accounts            (1:N) → platform via lookups
 │   └─ social_messages        (1:N)
 ├─ chat_widgets               (1:1)
 │   └─ chat_sessions          (1:N)
 │       └─ chat_messages      (1:N)
 ├─ ecommerce_integrations     (1:N)
 │   └─ ecommerce_orders       (1:N)
 ├─ kb_categories              (1:N, self-referential)
 │   └─ kb_articles            (1:N)
 │       ├─ kb_article_related (N:M self)
 │       └─ kb_article_feedback (1:N)
 ├─ branding_configs           (1:1)
 ├─ agent_performance_snapshots (1:N) → users
 ├─ audit_logs                 (1:N)
 └─ notifications              (1:N) → users

lookup_types (1:N) → lookups (self-referential via parent_id)
  lookups referenced by: tickets, tasks, forms, social_accounts,
  ecommerce_integrations, chat_widgets, kb_articles, email_routing_rules,
  sla_policy_targets, saved_replies, workflows
```

---

*End of ERD — Unified Customer Support & Ticket Management Platform v1.0.0*
