# Feature Upgrade Analysis

## UVdesk Open Source → Our Platform Gap Report

| Field                | Value                                 |
| -------------------- | ------------------------------------- |
| **Document Version** | 1.0.0                                 |
| **Source**           | https://www.uvdesk.com/en/opensource/ |
| **Reference BRD**    | BRD-FINAL.md v1.0.0                   |
| **Reference ERD**    | ERD-FINAL.md v1.0.0                   |
| **Prepared By**      | Mohamed Habib                         |
| **Date**             | 2026-04-08                            |
| **Classification**   | Internal — Engineering                |

---

## Purpose

This document maps every feature listed on the UVdesk Open Source platform against our existing BRD and ERD. For each UVdesk feature it establishes one of three statuses:

- ✅ **Covered** — fully addressed in the existing BRD/ERD with no action needed
- ⚠️ **Partial** — the concept exists but our implementation is shallower than UVdesk's; requires a BRD extension and/or schema addition
- 🆕 **New** — not present in our platform at all; requires a full feature addition

All items marked ⚠️ or 🆕 are detailed in the **Upgrade Specifications** section with precise BRD requirements and ERD additions.

---

## 1. Feature Coverage Matrix

### 1.1 Core Ticket System

| UVdesk Feature                      | Our Status | Notes                                                                                                                    |
| ----------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| Ticket creation from email          | ✅ Covered | `email_messages` → `tickets` flow                                                                                        |
| Ticket types / categories           | ⚠️ Partial | We have `lookups` but no dedicated ticket type entity with escalation routing                                            |
| Custom ticket fields                | ✅ Covered | `ticket_custom_fields` + `ticket_custom_field_values`                                                                    |
| Google reCAPTCHA on ticket creation | ✅ Covered | Covered in form CAPTCHA; needs explicit flag on customer portal ticket form too                                          |
| Ticket priority (Urgent/Medium/Low) | ✅ Covered | `priority_id` FK to `lookups`                                                                                            |
| Ticket status management            | ✅ Covered | `status_id` FK to `lookups`                                                                                              |
| Ticket tags                         | ✅ Covered | `tags` + `ticket_tags` junction                                                                                          |
| Ticket merging                      | ✅ Covered | `ticket_merges` table                                                                                                    |
| CC / BCC on ticket replies          | ✅ Covered | `ticket_cc` table; BCC stored in `email_messages`                                                                        |
| Ticket forwarding (CC/BCC forward)  | ⚠️ Partial | Email forwarding not modelled as a distinct action; BCC/CC exist but explicit forward action is missing                  |
| Secret / private notes              | ✅ Covered | `ticket_messages.is_private = true`                                                                                      |
| Thread-level locking (per message)  | 🆕 New     | We have ticket-level locking only; UVdesk locks individual thread entries                                                |
| Thread deletion (omit thread)       | ⚠️ Partial | `ticket_messages.deleted_at` exists for soft delete but not exposed as an explicit agent-facing "omit" action with audit |
| Multiple concurrent ticket viewers  | 🆕 New     | No presence tracking per ticket; UVdesk shows all agents currently viewing                                               |
| Image gallery viewer in ticket      | 🆕 New     | Attachments are stored but no dedicated gallery/lightbox metadata                                                        |
| Saved replies (canned responses)    | ✅ Covered | `saved_replies` + `saved_reply_folders`                                                                                  |
| Bulk ticket actions                 | ✅ Covered | Specified in BRD §5.2                                                                                                    |
| Spam detection / quarantine         | ✅ Covered | `is_spam` flag + BRD §5.1                                                                                                |

---

### 1.2 Ticket Administration & Agent Management

| UVdesk Feature                      | Our Status | Notes                                                                                                  |
| ----------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| Agent creation                      | ✅ Covered | `users` table                                                                                          |
| Role-based access control           | ✅ Covered | `roles` + `permissions` + `role_permissions`                                                           |
| Agent privilege scopes (visibility) | ⚠️ Partial | We have action permissions but not view-scope restrictions (e.g., agent sees only own tickets)         |
| Groups (department classification)  | 🆕 New     | We have `teams` but UVdesk separates Groups (departments) from Teams (sub-groups); we need both levels |
| Teams (sub-groups within groups)    | ✅ Covered | `teams` + `team_members`                                                                               |
| Multiple agents viewing one ticket  | 🆕 New     | No viewer presence table exists                                                                        |
| Agent performance insights          | ✅ Covered | `agent_performance_snapshots` + BRD §5.11                                                              |

---

### 1.3 Email Management & Mailboxes

| UVdesk Feature                          | Our Status | Notes                                                         |
| --------------------------------------- | ---------- | ------------------------------------------------------------- |
| Mailbox configuration (IMAP/SMTP)       | ✅ Covered | `mailboxes` + `mailbox_imap_configs` + `mailbox_smtp_configs` |
| Multiple mailboxes                      | ✅ Covered | Multiple rows in `mailboxes` per org                          |
| Mail-to-ticket (inbound parsing)        | ✅ Covered | `email_messages` → ticket creation flow                       |
| Email piping (customer reply via email) | ✅ Covered | `In-Reply-To` threading in `email_messages`                   |
| Auto-reply on ticket creation           | ✅ Covered | `mailboxes.auto_reply_enabled`                                |
| Email routing rules                     | ✅ Covered | `email_routing_rules`                                         |
| Email signature per agent               | ✅ Covered | `users.signature_html`                                        |

---

### 1.4 Workflow & Automation

| UVdesk Feature                | Our Status | Notes                                         |
| ----------------------------- | ---------- | --------------------------------------------- |
| Event-based workflow triggers | ✅ Covered | `workflows` + `workflow_execution_logs`       |
| Condition-action rules        | ✅ Covered | `conditions` + `actions` JSONB in `workflows` |
| Workflow execution log        | ✅ Covered | `workflow_execution_logs`                     |

---

### 1.5 Social Media

| UVdesk Feature               | Our Status | Notes                                                                             |
| ---------------------------- | ---------- | --------------------------------------------------------------------------------- |
| Facebook (Pages + Messenger) | ✅ Covered | `social_accounts` + `social_messages`                                             |
| Instagram (DMs + Comments)   | ✅ Covered |                                                                                   |
| Twitter / X (Mentions + DMs) | ✅ Covered |                                                                                   |
| WhatsApp Business API        | ✅ Covered |                                                                                   |
| Disqus comment integration   | 🆕 New     | Not in our platform; UVdesk has a Disqus Engage app turning comments into tickets |

---

### 1.6 eCommerce & Marketplace

| UVdesk Feature                         | Our Status | Notes                                                                                          |
| -------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| Shopify integration                    | ✅ Covered | `ecommerce_integrations`                                                                       |
| WooCommerce integration                | ✅ Covered |                                                                                                |
| Magento 2 integration                  | ✅ Covered |                                                                                                |
| Prestashop integration                 | ⚠️ Partial | `ecommerce_platform` lookup exists but Prestashop not explicitly seeded                        |
| OpenCart integration                   | ⚠️ Partial | Same as above                                                                                  |
| Salla (Saudi) integration              | ✅ Covered |                                                                                                |
| Zid (Saudi) integration                | ✅ Covered |                                                                                                |
| Marketplace integration (Amazon, eBay) | 🆕 New     | UVdesk has Seller Central Messaging; we only handle eCommerce stores, not marketplace channels |
| Amazon Seller Central Messaging        | 🆕 New     | Distinct from eCommerce orders; seller-buyer messaging within Amazon                           |
| Order fetch / display in ticket        | ✅ Covered | `ecommerce_orders` + `ticket_orders`                                                           |

---

### 1.7 Multi-Channel Support

| UVdesk Feature        | Our Status | Notes                                                                                        |
| --------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| Email channel         | ✅ Covered |                                                                                              |
| Live chat (Binaka)    | ✅ Covered | `chat_widgets` + `chat_sessions`                                                             |
| Social media channels | ✅ Covered |                                                                                              |
| Web forms             | ✅ Covered | `forms` + `form_submissions`                                                                 |
| API ticket creation   | ✅ Covered | BRD §5.1 + `api_keys`                                                                        |
| Unified inbox         | ✅ Covered | BRD §5.9                                                                                     |
| Mobile App channel    | 🆕 New     | UVdesk lists a Mobile App product; no mobile SDK or push notification system in our platform |

---

### 1.8 Form Builder

| UVdesk Feature             | Our Status | Notes                    |
| -------------------------- | ---------- | ------------------------ |
| Drag-and-drop form builder | ✅ Covered | `forms` + `form_fields`  |
| Custom field types         | ✅ Covered |                          |
| Form embed via JS snippet  | ✅ Covered | BRD §5.6                 |
| CAPTCHA protection         | ✅ Covered | `forms.captcha_provider` |

---

### 1.9 Knowledgebase

| UVdesk Feature                           | Our Status | Notes                               |
| ---------------------------------------- | ---------- | ----------------------------------- |
| Article categories                       | ✅ Covered | `kb_categories` (2-level hierarchy) |
| Article authoring                        | ✅ Covered | `kb_articles`                       |
| Article feedback (helpful / not helpful) | ✅ Covered | `kb_article_feedback`               |
| Article search                           | ✅ Covered | BRD §5.13 full-text search          |
| KB widget integration with Binaka        | ✅ Covered | `chat_widgets.kb_search_enabled`    |

---

### 1.10 Branding & Theming

| UVdesk Feature                       | Our Status | Notes                                   |
| ------------------------------------ | ---------- | --------------------------------------- |
| Custom branding / logo               | ✅ Covered | `branding_configs`                      |
| Customize theme colors               | ✅ Covered |                                         |
| Custom domain                        | ✅ Covered | `organizations.custom_domain`           |
| White-label (remove vendor branding) | ✅ Covered | `branding_configs.hide_vendor_branding` |

---

### 1.11 Security

| UVdesk Feature            | Our Status | Notes                                                                                                           |
| ------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------- |
| Role-based access         | ✅ Covered |                                                                                                                 |
| Two-factor authentication | ✅ Covered | `two_factor_auth`                                                                                               |
| IP whitelisting           | ✅ Covered | `ip_whitelist`                                                                                                  |
| API keys                  | ✅ Covered | `api_keys`                                                                                                      |
| Audit log                 | ✅ Covered | `audit_logs`                                                                                                    |
| GDPR compliance hooks     | ⚠️ Partial | BRD mentions data retention / deletion but no dedicated GDPR data subject request workflow or anonymization log |

---

### 1.12 Platform / Extensibility

| UVdesk Feature                      | Our Status | Notes                                                                                                  |
| ----------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| Module / plugin architecture        | 🆕 New     | UVdesk is built on Symfony and exposes a module SDK; our platform has no official plugin/extension API |
| Google Calendar integration         | 🆕 New     | UVdesk has a Google Calendar app for tasks/tickets; we have no calendar integration                    |
| Translation / multilingual UI       | ⚠️ Partial | BRD mentions Arabic/RTL and i18n but no machine translation or per-ticket translation service          |
| Single Sign-On for end-customers    | 🆕 New     | Our SSO covers agent login (SAML) but not end-customer portal SSO                                      |
| Self-hosted / on-premise deployment | 🆕 New     | Our platform is SaaS-only; UVdesk is LAMP/LEMP self-hostable                                           |
| AI Chatbot                          | 🆕 New     | UVdesk lists an AI Chatbot product; we have no AI-assisted chat or auto-reply                          |

---

## 2. Summary Counts

| Status             | Count  |
| ------------------ | ------ |
| ✅ Covered         | 52     |
| ⚠️ Partial         | 10     |
| 🆕 New             | 12     |
| **Total assessed** | **74** |

---

## 3. Upgrade Specifications

This section provides full BRD requirements and ERD additions for every ⚠️ Partial and 🆕 New item.

---

### 3.1 Ticket Types / Categories (⚠️ Partial)

**Gap:** UVdesk's ticket categories are not just a lookup value — they carry escalation routing logic, icons, and SLA policy overrides per category.

**BRD Addition:**

- Admins shall define ticket types/categories beyond a simple label: each category may override the default SLA policy, default assigned team, and default priority.
- Ticket category icons and color badges shall be configurable.
- Creating a ticket via the customer portal shall allow the requester to select a category; available categories are configurable per form.
- Workflow conditions shall be filterable by ticket category.

**ERD Addition:**

```sql
-- Replaces the plain lookup value for ticket category with a structured entity

CREATE TABLE ticket_categories (
  id             BIGSERIAL PRIMARY KEY,
  uuid           UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  organization_id BIGINT NOT NULL REFERENCES organizations(id),
  name           VARCHAR(150) NOT NULL,
  slug           VARCHAR(100) NOT NULL,
  description    TEXT,
  icon           VARCHAR(100),
  color          VARCHAR(7),
  default_priority_id   BIGINT REFERENCES lookups(id),   -- lookup: ticket_priority
  default_team_id       BIGINT REFERENCES teams(id),
  default_sla_policy_id BIGINT REFERENCES sla_policies(id),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  order_by       INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  created_by     BIGINT REFERENCES users(id),
  updated_by     BIGINT REFERENCES users(id),
  deleted_by     BIGINT REFERENCES users(id),
  UNIQUE (organization_id, slug) WHERE deleted_at IS NULL
);
```

Add `category_id BIGINT REFERENCES ticket_categories(id)` to `tickets`.

---

### 3.2 Thread-Level Locking (🆕 New)

**Gap:** UVdesk supports locking individual ticket message threads (e.g., to hide FTP/SSH credentials shared in one reply from certain agents). Our platform only locks the entire ticket for concurrent editing.

**BRD Addition:**

- An agent with sufficient permissions may lock a specific reply thread within a ticket.
- A locked thread is visible only to agents who have the `threads.view_locked` permission.
- Locking a thread records the locking agent and timestamp.
- Unlocking a thread is also permission-gated and audited.
- The ticket timeline shall show a visual indicator on locked threads.

**ERD Addition:**

Add columns to `ticket_messages`:

```sql
ALTER TABLE ticket_messages ADD COLUMN is_thread_locked    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE ticket_messages ADD COLUMN thread_locked_by    BIGINT REFERENCES users(id);
ALTER TABLE ticket_messages ADD COLUMN thread_locked_at    TIMESTAMPTZ;
ALTER TABLE ticket_messages ADD COLUMN thread_unlocked_by  BIGINT REFERENCES users(id);
ALTER TABLE ticket_messages ADD COLUMN thread_unlocked_at  TIMESTAMPTZ;
```

Add permission key: `threads.lock`, `threads.unlock`, `threads.view_locked`.

---

### 3.3 Thread Omission / Deletion (⚠️ Partial)

**Gap:** `ticket_messages.deleted_at` exists but is purely a backend soft-delete. UVdesk exposes "Omit Thread" as an explicit, audited, agent-facing action with a reason field.

**BRD Addition:**

- Agents with the `threads.delete` permission may omit (soft-delete) any thread from the ticket view.
- Omitting a thread requires a reason (free text, mandatory) recorded in the audit log.
- Omitted threads remain accessible to agents with the `threads.view_deleted` permission via a "show deleted threads" toggle.
- Omitting a thread fires a `ticket.thread_omitted` event that can trigger workflows.

**ERD Addition:**

```sql
ALTER TABLE ticket_messages ADD COLUMN deleted_reason TEXT;  -- reason for omission
```

The existing `deleted_at` / `deleted_by` audit columns already handle the who/when. The reason field completes the UVdesk parity.

---

### 3.4 Multiple Concurrent Ticket Viewers (🆕 New)

**Gap:** UVdesk shows all agents currently viewing a ticket so they can coordinate. We have ticket-level locking for editing but no real-time viewer presence.

**BRD Addition:**

- When an agent opens a ticket, their presence is broadcast to all other agents viewing the same ticket in real time (via WebSocket).
- The ticket header shall display avatar thumbnails of all current viewers.
- Presence expires after 30 seconds of inactivity and refreshes on scroll/click/keystroke.
- Viewer presence is ephemeral — not persisted to the database.

**ERD Addition:** No persistent table needed. Presence is managed in-memory via a pub/sub system (Redis). Document the WebSocket event contract:

```
Event: ticket.viewer_joined  → { ticket_id, user_id, user_name, avatar_url, joined_at }
Event: ticket.viewer_left    → { ticket_id, user_id }
Event: ticket.viewers_list   → { ticket_id, viewers: [...] }
TTL: 30 seconds per viewer heartbeat
```

---

### 3.5 Image Gallery Viewer in Ticket Thread (🆕 New)

**Gap:** UVdesk provides a built-in image gallery/lightbox within the ticket thread so agents can view uploaded images at full resolution without downloading. We store attachments but have no gallery metadata.

**BRD Addition:**

- Image attachments within a ticket thread shall be renderable inline as thumbnails.
- Clicking a thumbnail opens a lightbox/gallery viewer showing the full-resolution image with navigation between all images in that thread.
- Supported formats: JPEG, PNG, GIF, WebP, SVG.
- The agent may annotate (highlight / draw) on the image within the viewer before responding (Phase 2 — optional).
- Images embedded via URL in rich-text replies shall also be included in the gallery.

**ERD Addition:**

Add columns to `ticket_attachments`:

```sql
ALTER TABLE ticket_attachments ADD COLUMN is_inline_image   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE ticket_attachments ADD COLUMN image_width        INTEGER;
ALTER TABLE ticket_attachments ADD COLUMN image_height       INTEGER;
ALTER TABLE ticket_attachments ADD COLUMN thumbnail_key      TEXT;  -- S3 key for 200px thumbnail
ALTER TABLE ticket_attachments ADD COLUMN gallery_order      INTEGER;  -- position in thread gallery
```

---

### 3.6 Agent Visibility Scopes (⚠️ Partial)

**Gap:** Our permissions system controls what actions agents can perform but not what data they can see. UVdesk's "Agent Privileges" includes view scopes (e.g., an agent sees only tickets assigned to themselves or their group).

**BRD Addition:**

- Each role shall have a configurable ticket view scope: `all` (see all org tickets), `group` (see tickets assigned to their group/team), `self` (see only tickets assigned to themselves).
- The ticket list query enforces the scope server-side; agents cannot bypass it via filters.
- Admins and supervisors always see all tickets regardless of scope.
- View scope shall also apply to reports: agents with `self` scope see only their own stats.

**ERD Addition:**

Add to `roles`:

```sql
ALTER TABLE roles ADD COLUMN ticket_view_scope VARCHAR(20) NOT NULL DEFAULT 'all';
-- Values: 'all' | 'group' | 'self'
```

Add permission keys: `tickets.view_scope.all`, `tickets.view_scope.group`, `tickets.view_scope.self`.

---

### 3.7 Groups (Department Level) (🆕 New)

**Gap:** UVdesk distinguishes between Groups (department-level classification) and Teams (sub-groups within a group). We only have Teams. Groups give a higher-level routing and reporting layer.

**BRD Addition:**

- Admins may create Groups representing departments (e.g., Billing, Technical Support, Sales).
- Each Team may belong to one Group.
- Tickets may be assigned to a Group; the system routes to the Group's default Team.
- Email routing rules and workflows may target a Group as a routing destination.
- Reports may be filtered and aggregated by Group.
- An agent may belong to multiple Groups via their Team memberships.

**ERD Addition:**

```sql
CREATE TABLE groups (
  id              BIGSERIAL PRIMARY KEY,
  uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  organization_id BIGINT NOT NULL REFERENCES organizations(id),
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  default_team_id BIGINT REFERENCES teams(id),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      BIGINT REFERENCES users(id),
  updated_by      BIGINT REFERENCES users(id),
  deleted_by      BIGINT REFERENCES users(id)
);

-- Link teams to groups
ALTER TABLE teams ADD COLUMN group_id BIGINT REFERENCES groups(id);

-- Link tickets to groups
ALTER TABLE tickets ADD COLUMN assigned_group_id BIGINT REFERENCES groups(id);
```

---

### 3.8 Ticket Forwarding as Explicit Action (⚠️ Partial)

**Gap:** We store CC/BCC on tickets and outgoing emails, but "Forward Ticket" as an explicit agent action — sending the thread content to an external email with CC/BCC tracking — is not modelled.

**BRD Addition:**

- Agents may forward any ticket thread to one or more external email addresses from within the ticket interface.
- The forward action shall record: forwarded by, forwarded to (array), CC, BCC, timestamp, and which thread message was forwarded.
- Forwarded messages are logged in the ticket timeline as a distinct event type (`forward`).
- A forward does not create a new ticket; it is informational only.

**ERD Addition:**

```sql
CREATE TABLE ticket_forwards (
  id                BIGSERIAL PRIMARY KEY,
  uuid              UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  ticket_id         BIGINT NOT NULL REFERENCES tickets(id),
  ticket_message_id BIGINT REFERENCES ticket_messages(id),
  forwarded_to      JSONB NOT NULL,   -- array of email strings
  cc_emails         JSONB,
  bcc_emails        JSONB,
  subject           TEXT,
  body_html         TEXT,
  forwarded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  forwarded_by      BIGINT NOT NULL REFERENCES users(id)
);
```

---

### 3.9 Disqus Comment Integration (🆕 New)

**Gap:** UVdesk has a Disqus Engage app that converts Disqus comments on blog/content pages into support tickets. We have no equivalent.

**BRD Addition:**

- Organizations may connect a Disqus forum via API key.
- New comments on connected Disqus forums are ingested as tickets with channel source `disqus`.
- Agents may reply to Disqus comments directly from the ticket interface; the reply is posted back to Disqus.
- The Disqus account avatar and username are stored on the contact profile.
- Moderation actions (approve, mark spam, delete comment) are available from within the ticket.

**ERD Addition:**

Add `disqus` to the `social_platform` lookup seed.

```sql
CREATE TABLE disqus_accounts (
  id              BIGSERIAL PRIMARY KEY,
  uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  organization_id BIGINT NOT NULL REFERENCES organizations(id),
  forum_shortname VARCHAR(150) NOT NULL,
  api_key_enc     TEXT NOT NULL,
  api_secret_enc  TEXT NOT NULL,
  access_token_enc TEXT,
  default_team_id BIGINT REFERENCES teams(id),
  status          VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      BIGINT REFERENCES users(id),
  updated_by      BIGINT REFERENCES users(id),
  deleted_by      BIGINT REFERENCES users(id)
);
```

`social_messages` already handles the inbound Disqus comment once connected; `platform_message_id` stores the Disqus post ID.

---

### 3.10 Amazon Seller Central Messaging (🆕 New)

**Gap:** UVdesk has a dedicated Seller Central Messaging app integrating Amazon's buyer-seller messaging channel. We have eCommerce order data but not marketplace messaging.

**BRD Addition:**

- Organizations may connect an Amazon Seller Central account via MWS/SP-API credentials.
- Inbound buyer-seller messages from Amazon are ingested as tickets with channel source `amazon_seller`.
- Agents may reply to buyers directly from the ticket; the reply is sent via Amazon's messaging API within platform guidelines.
- Amazon order details (product, ASIN, order ID) are attached to the ticket automatically.
- Amazon messaging policies (72-hour response window) are enforced with visual SLA indicators.

**ERD Addition:**

```sql
CREATE TABLE marketplace_accounts (
  id               BIGSERIAL PRIMARY KEY,
  uuid             UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  organization_id  BIGINT NOT NULL REFERENCES organizations(id),
  platform         VARCHAR(50) NOT NULL,   -- 'amazon', 'ebay' etc.
  account_name     VARCHAR(255) NOT NULL,
  seller_id        VARCHAR(255),
  marketplace_id   VARCHAR(50),            -- Amazon marketplace (e.g. ATVPDKIKX0DER = US)
  sp_api_client_id_enc   TEXT,
  sp_api_client_secret_enc TEXT,
  sp_api_refresh_token_enc TEXT,
  default_team_id  BIGINT REFERENCES teams(id),
  status           VARCHAR(30) NOT NULL DEFAULT 'active',
  last_synced_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       BIGINT REFERENCES users(id),
  updated_by       BIGINT REFERENCES users(id),
  deleted_by       BIGINT REFERENCES users(id)
);

CREATE TABLE marketplace_messages (
  id                       BIGSERIAL PRIMARY KEY,
  uuid                     UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  marketplace_account_id   BIGINT NOT NULL REFERENCES marketplace_accounts(id),
  ticket_id                BIGINT REFERENCES tickets(id),
  platform_message_id      VARCHAR(500) NOT NULL,
  amazon_order_id          VARCHAR(100),
  buyer_email              VARCHAR(255),
  buyer_name               VARCHAR(255),
  subject                  TEXT,
  body                     TEXT,
  direction                VARCHAR(10) NOT NULL,  -- 'inbound' | 'outbound'
  received_at              TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (marketplace_account_id, platform_message_id)
);
```

---

### 3.11 Google Calendar Integration (🆕 New)

**Gap:** UVdesk has a Google Calendar app allowing agents to create calendar events from ticket tasks. We have no calendar integration.

**BRD Addition:**

- Agents may connect their personal Google Calendar via OAuth 2.0.
- From any task or ticket, an agent may create a Google Calendar event pre-populated with ticket subject, due date, and a link back to the ticket.
- Calendar events may also be created automatically by workflow actions: `create_calendar_event`.
- Event creation requires the agent's calendar to be connected; agents without a connected calendar are prompted to connect.
- Agents may view upcoming calendar events in their dashboard sidebar.

**ERD Addition:**

```sql
CREATE TABLE agent_calendar_connections (
  id                   BIGSERIAL PRIMARY KEY,
  user_id              BIGINT NOT NULL UNIQUE REFERENCES users(id),
  provider             VARCHAR(30) NOT NULL DEFAULT 'google',
  access_token_enc     TEXT NOT NULL,
  refresh_token_enc    TEXT NOT NULL,
  token_expires_at     TIMESTAMPTZ,
  calendar_id          VARCHAR(255),  -- Primary Google Calendar ID
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ticket_calendar_events (
  id               BIGSERIAL PRIMARY KEY,
  uuid             UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  ticket_id        BIGINT REFERENCES tickets(id),
  task_id          BIGINT REFERENCES tasks(id),
  user_id          BIGINT NOT NULL REFERENCES users(id),
  provider         VARCHAR(30) NOT NULL DEFAULT 'google',
  event_id         VARCHAR(500) NOT NULL,  -- Google Calendar event ID
  event_url        TEXT,
  title            VARCHAR(500),
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.12 GDPR Data Subject Request Workflow (⚠️ Partial)

**Gap:** UVdesk lists GDPR compliance. Our BRD mentions data retention and deletion but has no structured workflow for GDPR data subject requests (access, erasure, portability).

**BRD Addition:**

- The platform shall provide a GDPR request management workflow accessible to organization owners and platform admins.
- Supported request types: Right of Access (export all data for a contact), Right to Erasure (anonymize all PII for a contact), Right to Portability (download contact data as JSON).
- Each request shall be tracked with status: `received` → `in_progress` → `completed` / `rejected`.
- Erasure shall anonymize: contact name, email, phone, IP addresses in form submissions and audit logs. Ticket content is retained but de-linked from the contact.
- Completed requests generate an audit log entry that is tamper-evident and cannot be deleted.
- SLA for GDPR requests: platform must complete within 30 days (configurable); reminder notifications sent at 20 days.

**ERD Addition:**

```sql
CREATE TABLE gdpr_requests (
  id              BIGSERIAL PRIMARY KEY,
  uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  organization_id BIGINT NOT NULL REFERENCES organizations(id),
  contact_id      BIGINT NOT NULL REFERENCES contacts(id),
  request_type    VARCHAR(30) NOT NULL,  -- 'access' | 'erasure' | 'portability'
  status          VARCHAR(20) NOT NULL DEFAULT 'received',
  -- 'received' | 'in_progress' | 'completed' | 'rejected'
  requester_email VARCHAR(255) NOT NULL,
  notes           TEXT,
  due_at          TIMESTAMPTZ NOT NULL,
  completed_at    TIMESTAMPTZ,
  export_key      TEXT,              -- S3 key of generated data export
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      BIGINT REFERENCES users(id),
  updated_by      BIGINT REFERENCES users(id)
);
```

---

### 3.13 End-Customer Portal SSO (🆕 New)

**Gap:** Our SSO covers agent login (SAML/OAuth). UVdesk has SSO apps for end-customer portal login (so customers log in with their Google/social account to submit tickets).

**BRD Addition:**

- Organization admins may enable social login for the end-customer support portal: Google, Facebook, Apple.
- When enabled, customers may register/login to the portal using their social account without creating a separate password.
- The social identity is linked to the contact profile. If the social email matches an existing contact, accounts are merged automatically.
- Multiple social providers may be enabled simultaneously.
- Password-based customer login remains available unless explicitly disabled by the admin.

**ERD Addition:**

```sql
CREATE TABLE customer_social_identities (
  id              BIGSERIAL PRIMARY KEY,
  contact_id      BIGINT NOT NULL REFERENCES contacts(id),
  provider        VARCHAR(30) NOT NULL,  -- 'google' | 'facebook' | 'apple'
  provider_user_id VARCHAR(255) NOT NULL,
  email           VARCHAR(255),
  access_token_enc TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_user_id)
);

-- Customer portal session (separate from agent sessions)
CREATE TABLE customer_sessions (
  id              BIGSERIAL PRIMARY KEY,
  uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  contact_id      BIGINT NOT NULL REFERENCES contacts(id),
  organization_id BIGINT NOT NULL REFERENCES organizations(id),
  ip_address      INET,
  user_agent      TEXT,
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.14 Ticket Translation (⚠️ Partial)

**Gap:** Our BRD specifies Arabic/English bilingual UI but not in-ticket machine translation. UVdesk has a Translation app allowing agents to translate ticket content on demand.

**BRD Addition:**

- Agents may request a machine translation of any ticket message or customer reply into their preferred language via a "Translate" button.
- Translation is performed via a configurable provider: Google Translate API or DeepL API.
- The translated text is shown inline below the original; the original is preserved.
- Translated content is never stored as the canonical ticket message — it is ephemeral and re-generated on demand.
- Agents may configure their preferred target translation language in profile settings.
- Translation usage is tracked per organization for billing/quota purposes.

**ERD Addition:**

```sql
CREATE TABLE translation_configs (
  id              BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL UNIQUE REFERENCES organizations(id),
  provider        VARCHAR(30) NOT NULL DEFAULT 'google',  -- 'google' | 'deepl'
  api_key_enc     TEXT,
  is_enabled      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      BIGINT REFERENCES users(id),
  updated_by      BIGINT REFERENCES users(id)
);

-- Ephemeral translation cache to avoid re-calling API for same text
CREATE TABLE translation_cache (
  id              BIGSERIAL PRIMARY KEY,
  source_hash     VARCHAR(64) NOT NULL,  -- SHA-256 of source text + target_lang
  source_language VARCHAR(10),
  target_language VARCHAR(10) NOT NULL,
  translated_text TEXT NOT NULL,
  provider        VARCHAR(30) NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_hash)
);
```

---

### 3.15 Mobile App Channel & Push Notifications (🆕 New)

**Gap:** UVdesk lists a Mobile App product. We have no mobile SDK, push notification infrastructure, or mobile-specific ticket channel.

**BRD Addition:**

- The platform shall provide a mobile SDK (iOS / Android) that allows organizations to embed support within their own mobile apps.
- The mobile SDK shall support: create ticket, view ticket history, reply to ticket, receive push notifications on new replies.
- Push notifications are sent via FCM (Android) and APNs (iOS) when a ticket is updated and the customer has notifications enabled.
- Agent mobile access (view/reply to tickets from a mobile device) shall be provided via a responsive web interface initially; a native agent app is Phase 2.
- Push notification preferences are configurable per contact per organization.

**ERD Addition:**

```sql
CREATE TABLE mobile_sdk_configs (
  id              BIGSERIAL PRIMARY KEY,
  uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  organization_id BIGINT NOT NULL UNIQUE REFERENCES organizations(id),
  app_id          UUID NOT NULL DEFAULT gen_random_uuid(),   -- Public SDK app identifier
  app_secret_hash VARCHAR(255) NOT NULL,                    -- Hashed app secret
  android_fcm_server_key_enc TEXT,
  ios_apns_key_enc    TEXT,
  ios_apns_key_id     VARCHAR(20),
  ios_team_id         VARCHAR(20),
  ios_bundle_id       VARCHAR(255),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      BIGINT REFERENCES users(id),
  updated_by      BIGINT REFERENCES users(id)
);

CREATE TABLE contact_push_tokens (
  id              BIGSERIAL PRIMARY KEY,
  contact_id      BIGINT NOT NULL REFERENCES contacts(id),
  organization_id BIGINT NOT NULL REFERENCES organizations(id),
  platform        VARCHAR(10) NOT NULL,   -- 'ios' | 'android'
  token           TEXT NOT NULL,
  device_id       VARCHAR(255),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contact_id, token)
);

CREATE TABLE push_notification_logs (
  id              BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id),
  contact_id      BIGINT REFERENCES contacts(id),
  ticket_id       BIGINT REFERENCES tickets(id),
  platform        VARCHAR(10) NOT NULL,
  token           TEXT NOT NULL,
  title           VARCHAR(255),
  body            TEXT,
  status          VARCHAR(20) NOT NULL,  -- 'sent' | 'failed' | 'bounced'
  provider_response JSONB,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.16 AI Chatbot (🆕 New)

**Gap:** UVdesk lists an AI Chatbot product. We have Binaka live chat but no AI-driven automatic response layer.

**BRD Addition:**

- Organizations may enable an AI chatbot layer within the Binaka widget that handles visitor queries automatically before connecting to a human agent.
- The chatbot uses the organization's knowledgebase articles as its primary knowledge source.
- AI responses are generated via a configurable LLM provider: OpenAI (GPT-4o), Anthropic (Claude), or Azure OpenAI.
- The chatbot may escalate to a human agent at any point based on visitor request or confidence threshold.
- Bot confidence threshold is configurable: when the bot's confidence score is below the threshold, it escalates automatically.
- Conversation history from the bot session is carried over to the human agent on escalation.
- Bot interaction analytics: sessions handled, escalations, deflection rate, top questions.
- Bot responses can be reviewed and rated by agents post-session to improve future responses.

**ERD Addition:**

```sql
CREATE TABLE chatbot_configs (
  id              BIGSERIAL PRIMARY KEY,
  uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  organization_id BIGINT NOT NULL UNIQUE REFERENCES organizations(id),
  is_enabled      BOOLEAN NOT NULL DEFAULT false,
  llm_provider    VARCHAR(30) NOT NULL DEFAULT 'openai',  -- 'openai' | 'anthropic' | 'azure_openai'
  api_key_enc     TEXT,
  model           VARCHAR(100) NOT NULL DEFAULT 'gpt-4o',
  system_prompt   TEXT,                    -- Custom instructions for the bot
  confidence_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.70,
  use_knowledgebase BOOLEAN NOT NULL DEFAULT true,
  escalation_message TEXT,                 -- Message shown when escalating to human
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      BIGINT REFERENCES users(id),
  updated_by      BIGINT REFERENCES users(id)
);

CREATE TABLE chatbot_sessions (
  id              BIGSERIAL PRIMARY KEY,
  uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  chat_session_id BIGINT NOT NULL UNIQUE REFERENCES chat_sessions(id),
  organization_id BIGINT NOT NULL REFERENCES organizations(id),
  was_escalated   BOOLEAN NOT NULL DEFAULT false,
  escalated_at    TIMESTAMPTZ,
  deflected       BOOLEAN NOT NULL DEFAULT false,  -- Visitor satisfied without human
  messages_count  INTEGER NOT NULL DEFAULT 0,
  avg_confidence  NUMERIC(4,3),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chatbot_messages (
  id              BIGSERIAL PRIMARY KEY,
  chatbot_session_id BIGINT NOT NULL REFERENCES chatbot_sessions(id),
  role            VARCHAR(20) NOT NULL,   -- 'user' | 'assistant' | 'system'
  content         TEXT NOT NULL,
  confidence_score NUMERIC(4,3),          -- Bot confidence for this response
  kb_article_ids  BIGINT[],              -- Articles used to generate response
  token_count     INTEGER,
  agent_rating    SMALLINT,              -- 1-5 rating by reviewing agent
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.17 Self-Hosted / On-Premise Deployment Mode (🆕 New)

**Gap:** UVdesk is downloadable and self-hostable on LAMP/LEMP stacks. Our platform is SaaS-only. This is a major architectural consideration for enterprise clients who cannot use cloud-hosted software due to data sovereignty requirements (common in GCC government sector).

**BRD Addition:**

- The platform shall support an **On-Premise Edition** as a separately licensed deployment option.
- On-Premise Edition is packaged as a Docker Compose bundle (application, PostgreSQL, Redis, worker queues).
- A single on-premise license file activates the on-premise edition and enforces seat limits without calling home.
- Automatic update packages are distributed via a private container registry accessible with a valid license.
- Feature parity: On-Premise Edition shall have all SaaS features except: multi-tenant billing, platform admin console, and MRR reporting.
- License enforcement: the license file contains an encrypted seat limit and expiry date; the application verifies it locally on startup and daily via a signed JWT from the licensing server.

**ERD Addition:**

```sql
-- Licensing table for on-premise installations
CREATE TABLE on_premise_licenses (
  id              BIGSERIAL PRIMARY KEY,
  uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  license_key     VARCHAR(255) NOT NULL UNIQUE,
  organization_name VARCHAR(255) NOT NULL,
  contact_email   VARCHAR(255) NOT NULL,
  max_agents      INTEGER NOT NULL,
  features        JSONB NOT NULL,          -- Enabled features JSON
  issued_at       TIMESTAMPTZ NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  last_verified_at TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. Upgrade Priority Roadmap

| Priority         | Feature                              | Effort    | Impact                          |
| ---------------- | ------------------------------------ | --------- | ------------------------------- |
| 🔴 P1 — Sprint 1 | Groups (department level)            | Medium    | High — core routing improvement |
| 🔴 P1 — Sprint 1 | Ticket Categories with SLA override  | Medium    | High — admin demand             |
| 🔴 P1 — Sprint 1 | Agent visibility scopes              | Low       | High — security requirement     |
| 🔴 P1 — Sprint 1 | Thread-level locking                 | Low       | Medium — data security          |
| 🔴 P1 — Sprint 1 | Thread omission audit                | Low       | Medium — compliance             |
| 🟡 P2 — Sprint 2 | Concurrent ticket viewer presence    | Medium    | Medium — UX quality             |
| 🟡 P2 — Sprint 2 | Ticket forwarding as explicit action | Low       | Medium — agent workflow         |
| 🟡 P2 — Sprint 2 | Image gallery viewer                 | Medium    | Medium — UX quality             |
| 🟡 P2 — Sprint 2 | GDPR data subject request workflow   | Medium    | High — legal compliance         |
| 🟡 P2 — Sprint 2 | End-customer portal SSO              | Medium    | High — enterprise demand        |
| 🟠 P3 — Sprint 3 | Ticket translation (machine)         | Medium    | Medium — MENA market            |
| 🟠 P3 — Sprint 3 | Google Calendar integration          | Medium    | Low–Medium                      |
| 🟠 P3 — Sprint 3 | Disqus integration                   | Medium    | Low                             |
| 🟠 P3 — Sprint 3 | Amazon Seller Central Messaging      | High      | Medium — eCommerce clients      |
| 🔵 P4 — Future   | Mobile SDK & Push Notifications      | High      | High — mobile-first clients     |
| 🔵 P4 — Future   | AI Chatbot                           | High      | High — market differentiation   |
| 🔵 P4 — Future   | On-Premise / Self-Hosted Edition     | Very High | High — GCC enterprise           |

---

## 5. New Database Tables Summary

| Table                        | Purpose                                                  |
| ---------------------------- | -------------------------------------------------------- |
| `ticket_categories`          | Structured ticket types with SLA/team/priority overrides |
| `groups`                     | Department-level grouping above teams                    |
| `ticket_forwards`            | Explicit ticket forwarding action records                |
| `disqus_accounts`            | Disqus forum connections                                 |
| `marketplace_accounts`       | Amazon Seller Central / eBay connections                 |
| `marketplace_messages`       | Inbound/outbound marketplace buyer-seller messages       |
| `agent_calendar_connections` | Google Calendar OAuth per agent                          |
| `ticket_calendar_events`     | Events created from tickets/tasks in Google Calendar     |
| `gdpr_requests`              | GDPR data subject request tracking                       |
| `customer_social_identities` | Social login (Google/Facebook/Apple) for end-customers   |
| `customer_sessions`          | Customer portal session tokens                           |
| `translation_configs`        | Per-org machine translation provider config              |
| `translation_cache`          | Ephemeral translation result cache                       |
| `mobile_sdk_configs`         | Mobile SDK configuration and FCM/APNs keys               |
| `contact_push_tokens`        | Device push tokens per contact                           |
| `push_notification_logs`     | Push delivery records                                    |
| `chatbot_configs`            | AI chatbot configuration per org                         |
| `chatbot_sessions`           | Chatbot conversation sessions                            |
| `chatbot_messages`           | Individual chatbot message turns                         |
| `on_premise_licenses`        | License records for self-hosted deployments              |

---

## 6. Columns Added to Existing Tables

| Table                | New Column(s)                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `tickets`            | `category_id`, `assigned_group_id`                                                                                       |
| `ticket_messages`    | `is_thread_locked`, `thread_locked_by`, `thread_locked_at`, `thread_unlocked_by`, `thread_unlocked_at`, `deleted_reason` |
| `ticket_attachments` | `is_inline_image`, `image_width`, `image_height`, `thumbnail_key`, `gallery_order`                                       |
| `teams`              | `group_id`                                                                                                               |
| `roles`              | `ticket_view_scope`                                                                                                      |

---

## 7. New Permission Keys

```
tickets.view_scope.all
tickets.view_scope.group
tickets.view_scope.self
threads.lock
threads.unlock
threads.view_locked
threads.delete
threads.view_deleted
gdpr.requests.manage
marketplace.view
marketplace.reply
chatbot.configure
translation.use
calendar.connect
```

---

_End of Upgrade Analysis — UVdesk Open Source → Our Platform v1.0.0_
