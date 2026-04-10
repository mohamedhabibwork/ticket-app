# Business Requirements Document (BRD)

## Unified Customer Support & Ticket Management Platform

| Field                | Value         |
| -------------------- | ------------- |
| **Document Version** | 2.0.0         |
| **Status**           | Draft         |
| **Prepared By**      | Mohamed Habib |
| **Date**             | 2026-04-08    |
| **Classification**   | Confidential  |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Context & Objectives](#2-business-context--objectives)
3. [Stakeholders](#3-stakeholders)
4. [Scope](#4-scope)
5. [Functional Requirements — Platform](#5-functional-requirements--platform)
   - 5.1 Ticket Formation
   - 5.2 Ticket Administration
   - 5.3 Task Management
   - 5.4 Security
   - 5.5 Email Management
   - 5.6 Form Builder
   - 5.7 Workflow & Automation
   - 5.8 Social Media Integration
   - 5.9 Multi-Channel Support
   - 5.10 eCommerce Multichannel Integration
   - 5.11 Agent Performance Examination
   - 5.12 Theme Customization
   - 5.13 Knowledgebase
   - 5.14 Saved Replies
   - 5.15 Mailboxes Configuration
   - 5.16 Branding
   - 5.17 Binaka Live Chat
   - 5.18 eCommerce Support
6. [Functional Requirements — Billing & Subscriptions](#6-functional-requirements--billing--subscriptions)
   - 6.1 Subscription Plans
   - 6.2 Plan Features & Limits
   - 6.3 Add-Ons
   - 6.4 Subscription Lifecycle
   - 6.5 Billing & Invoicing
   - 6.6 Payment Methods
   - 6.7 Coupons & Discounts
   - 6.8 Trial Management
   - 6.9 Seat Management
   - 6.10 Usage Metering & Enforcement
   - 6.11 Billing Portal (Self-Service)
   - 6.12 Payment Gateway Integrations
   - 6.13 Tax Management
   - 6.14 Notifications & Dunning
   - 6.15 Platform Admin Billing Console
   - 6.16 Revenue Reporting
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Integration Requirements](#8-integration-requirements)
9. [Business Rules](#9-business-rules)
10. [Assumptions & Constraints](#10-assumptions--constraints)
11. [Glossary](#11-glossary)

---

## 1. Executive Summary

This document defines the complete business requirements for a **Unified Customer Support & Ticket Management Platform** — a multi-tenant, white-label SaaS product that consolidates customer communication from email, live chat, social media, web forms, and eCommerce channels into a single support workspace, with a fully integrated billing and subscription management engine.

The platform competes in the space occupied by Freshdesk, Zendesk, and HelpScout, with a strong emphasis on customization, branding flexibility, Gulf/MENA market compatibility, and a first-class recurring billing system with Stripe and PayTabs integration.

---

## 2. Business Context & Objectives

### 2.1 Problem Statement

Businesses operating across multiple channels (email, social media, eCommerce, web chat) have no unified view of customer issues. Support teams use disconnected tools, causing duplicate tickets, missed SLAs, inconsistent responses, and poor agent utilization. Additionally, platforms targeting the MENA market lack native Arabic invoicing, VAT compliance, and regional payment methods.

### 2.2 Business Objectives

**Platform**

- Consolidate all customer communication channels into one platform
- Reduce average ticket resolution time by at least 30%
- Enable SLA enforcement and automated escalation
- Provide white-label customization for reseller and enterprise clients
- Support Arabic/English bilingual interfaces and RTL layouts
- Integrate natively with eCommerce platforms for order-aware support
- Deliver measurable agent performance reporting

**Billing**

- Generate predictable recurring revenue via monthly and annual subscription plans
- Minimize churn via proactive dunning, grace periods, and in-app upgrade prompts
- Enable upselling through visible plan limit indicators and contextual upgrade prompts
- Support GCC/MENA billing requirements: Arabic invoices, VAT, SAR/AED/EGP currencies
- Give organization owners full self-service billing control without support intervention
- Provide platform admins with real-time MRR, churn, and cohort revenue dashboards

### 2.3 Success Metrics

| Metric                       | Target                           |
| ---------------------------- | -------------------------------- |
| First Response Time          | < 2 hours (configurable per SLA) |
| Ticket Resolution Rate       | > 90% within SLA                 |
| Customer Satisfaction (CSAT) | > 4.0 / 5.0                      |
| Agent Utilization            | Visible via dashboard            |
| System Uptime                | 99.9%                            |
| Trial-to-Paid Conversion     | > 25%                            |
| Monthly Churn Rate           | < 3%                             |

---

## 3. Stakeholders

| Role                           | Responsibility                                                     |
| ------------------------------ | ------------------------------------------------------------------ |
| Platform Owner / Tenant Admin  | Manages the entire workspace, billing, and configuration           |
| Support Agent                  | Handles tickets, replies to customers, manages tasks               |
| Team Lead / Supervisor         | Monitors agents, assigns tickets, reviews performance              |
| End Customer                   | Submits requests via forms, email, chat, or social media           |
| System Administrator           | Manages security, integrations, and system health                  |
| eCommerce Manager              | Integrates store data for order-aware support                      |
| Platform Admin (SaaS Operator) | Manages all tenants, plans, billing console, and revenue reporting |

---

## 4. Scope

### 4.1 In Scope

- Full ticket lifecycle management (create → assign → resolve → close)
- Email mailbox ingestion (IMAP/SMTP), routing, and reply
- Generic drag-and-drop form builder with public embed
- Workflow automation (conditions → actions)
- Saved replies / canned responses
- Knowledgebase with articles and categories
- Social media integration (Facebook, Instagram, Twitter/X, WhatsApp Business)
- Live chat widget (Binaka)
- eCommerce order data integration (Shopify, WooCommerce, Salla, Zid)
- Agent performance reports and CSAT
- Role-based access control with granular permissions
- Multi-brand / multi-mailbox tenancy
- White-label theming and custom domain support
- Bilingual support (Arabic / English, RTL/LTR)
- SaaS subscription billing engine (plans, seats, add-ons, invoices)
- Stripe and PayTabs payment gateway integration
- GCC VAT compliance and Arabic invoice PDF generation
- Self-service billing portal and platform admin billing console

### 4.2 Out of Scope

- Phone call recording or telephony (planned Phase 2)
- Full CRM (contacts only, not full pipeline)
- Native mobile apps (web-responsive only at launch)

---

## 5. Functional Requirements — Platform

---

### 5.1 Ticket Formation

**Description:** The system must support creating tickets from multiple sources: email inbound, form submission, social media message, live chat escalation, agent manual creation, and API.

**Requirements:**

- Each ticket shall have a unique auto-incremented ID and a human-readable reference number (e.g., `#TKT-00045`).
- Tickets shall capture: subject, description, requester (contact), assignee (agent), team, priority, status, channel source, tags, and custom field values.
- Tickets created from email shall automatically populate subject and body from the email message.
- Tickets created from forms shall map form field values to ticket fields as configured.
- Agents may manually create tickets on behalf of customers.
- Tickets must support rich-text descriptions and inline attachments.
- Duplicate ticket detection: if a contact submits within a configurable time window on the same topic, the system shall alert the agent.
- Tickets may be merged. All merged ticket history must be preserved and linked to the master ticket.
- Tickets must support CC / BCC recipients that receive email notifications on all replies.
- The ticket timeline shall display all events: replies, notes, status changes, assignments, merges, escalations.

**Statuses (via lookups):** New → Open → Pending → On Hold → Resolved → Closed

**Priority levels (via lookups):** Low, Medium, High, Urgent, Critical

---

### 5.2 Ticket Administration

**Description:** Configure how tickets are managed globally: SLA policies, auto-assignment, escalation, and ticket field customization.

**Requirements:**

- Administrators shall define SLA policies with first-response and resolution time targets per priority level.
- SLA policies shall support business-hours-aware timers (configurable business hours and holidays).
- SLA breaches shall trigger escalation workflows and visual indicators (red badges on overdue tickets).
- Custom ticket fields: admins shall add text, number, dropdown, date, checkbox, and multi-select fields to ticket forms.
- Ticket views: agents can create saved filtered views (e.g., "My Open Tickets", "Overdue Today").
- Bulk actions: admins and leads can bulk-assign, bulk-tag, bulk-change status, or bulk-delete tickets.
- Auto-assignment: round-robin or load-balanced assignment to available agents in a team.
- Ticket locking: when an agent is actively replying, the ticket is soft-locked to prevent concurrent edits.
- Spam detection: tickets flagged as spam shall be quarantined, not deleted.

---

### 5.3 Task Management

**Description:** Agents and leads may create tasks linked to tickets or standalone to coordinate follow-up work.

**Requirements:**

- Tasks shall have: title, description, due date, priority, assignee(s), status, and linked ticket (optional).
- Task statuses (via lookups): Todo → In Progress → Done → Cancelled.
- Tasks may have a checklist of sub-items, each independently completable.
- Task assignees receive in-platform and email notifications when tasks are created, due soon, or overdue.
- Tasks due within 24 hours shall trigger a reminder notification.
- Dashboard widget shall show agent's pending tasks count and overdue count.

---

### 5.4 Security

**Description:** The platform must enforce multi-level security: authentication, authorization, audit logging, and data isolation between tenants.

**Requirements:**

- Authentication: email/password with bcrypt hashing, OAuth 2.0 (Google, Microsoft), and optional SAML SSO for enterprise tenants.
- Two-factor authentication (2FA) via TOTP (Google Authenticator-compatible) and email OTP.
- Admins may enforce 2FA organization-wide.
- Role-Based Access Control (RBAC): roles are defined per organization with granular permissions (e.g., `tickets.view`, `tickets.delete`, `reports.view`, `settings.edit`).
- Predefined system roles: Owner, Administrator, Supervisor, Agent, Readonly.
- Custom roles: organizations may create additional roles with any permission combination.
- IP whitelisting: admins may restrict login to specific IP ranges.
- API keys: organizations may generate scoped API keys with expiry dates.
- Session management: configurable session timeout (default 24h), ability to terminate all active sessions.
- All sensitive actions (delete, settings change, permission change) must be recorded in the audit log with timestamp, actor, IP, and before/after values.
- Data isolation: tenants must be fully isolated at the database query level via `organization_id` partitioning.

---

### 5.5 Email Management

**Description:** The platform serves as the central email hub for customer support, ingesting, routing, and sending emails on behalf of the organization.

**Requirements:**

- Support connection to existing IMAP/SMTP mailboxes (Gmail, Outlook, custom SMTP).
- Support hosted mailboxes via platform-provided addresses (e.g., `support@tenant.helpdesk.io`).
- Inbound emails shall be parsed and converted to tickets or threaded to existing tickets based on the `In-Reply-To` header.
- Email threading: all replies (agent and customer) must remain in a single ticket thread with full email headers preserved.
- Agents reply to customers directly from the ticket interface; the reply is sent via the configured mailbox SMTP.
- Outbound email templates: configurable HTML templates for auto-replies, notifications, and CSAT surveys.
- Email signature: each agent may configure a personal signature appended to all outgoing emails.
- Spam filtering: integration with SpamAssassin or equivalent to quarantine spam before ticket creation.
- Bounce handling: soft and hard bounces shall be detected and flagged on the contact profile.
- Email routing rules: based on sender domain, subject keywords, or headers — route to specific team, mailbox, or assign a tag automatically.

---

### 5.6 Form Builder

**Description:** A drag-and-drop visual form builder that generates embeddable contact forms and support request forms, which feed directly into the ticket system.

**Requirements:**

- Form builder shall support field types: single-line text, multi-line text, email, phone, number, date, file upload, checkbox, radio group, dropdown, rating (1–5 stars), hidden field, section divider, and heading.
- Each field shall have: label, placeholder, help text, required flag, and validation rules.
- Forms shall support conditional logic: show/hide fields based on values of other fields.
- Forms may be embedded via JavaScript snippet or linked via a direct URL.
- A form may be mapped to a specific mailbox, team, and initial ticket priority/status.
- Custom field mapping: form fields may map to native ticket fields or custom ticket fields.
- Form submissions create tickets automatically; the submitter email becomes the contact.
- CAPTCHA protection (Google reCAPTCHA v3 or hCaptcha) shall be configurable per form.
- Submissions are logged with IP address, user agent, and timestamp.
- Forms may be password-protected or restricted by domain allowlist.
- Form responses shall be viewable in a submissions dashboard with filter and export.

---

### 5.7 Workflow & Automation

**Description:** A rule engine that triggers automated actions when tickets meet defined conditions, reducing manual effort and ensuring consistency.

**Requirements:**

- Workflows shall be composed of: trigger event, condition group, and action list.
- Trigger events: ticket created, ticket updated, ticket status changed, reply received, reply sent, SLA breached, time elapsed since last activity.
- Conditions: field-level filters (status, priority, tag, assignee, channel, custom field value, requester email domain, subject contains, etc.) combined with AND/OR logic.
- Actions: assign to agent/team, set priority, set status, add tag, remove tag, send email notification, send webhook, create task, add note, apply saved reply, escalate ticket, trigger another workflow.
- Workflows may be active/inactive and ordered by priority.
- Execution logs: each workflow execution shall be logged with matched conditions and executed actions.
- Loop prevention: circular workflow triggers shall be detected and broken after one execution cycle.

---

### 5.8 Social Media Integration

**Description:** Connect social media accounts so messages, comments, and mentions arrive as tickets in the platform.

**Supported Channels:** Facebook (Pages, Messenger), Instagram (DMs, Comments), Twitter/X (Mentions, DMs), WhatsApp Business API.

**Requirements:**

- OAuth-based connection of social accounts; credentials stored encrypted.
- Inbound messages and mentions create tickets with channel source tagged.
- Agents reply directly from the ticket interface; the reply is posted to the originating social platform.
- Facebook/Instagram: support for comment moderation (reply, hide, delete comment) from within the platform.
- WhatsApp Business: support for WhatsApp message templates (pre-approved) for outbound initiation.
- Social accounts may be assigned to specific teams.
- Each connected social account shows real-time connection status (active / disconnected / error).
- Rate limit awareness: platform respects platform API rate limits and queues messages accordingly.

---

### 5.9 Multi-Channel Support

**Description:** All channels feed into a unified ticket inbox. The platform supports: Email, Live Chat (Binaka), Social Media, Web Forms, API, and WhatsApp.

**Requirements:**

- A unified inbox view shows tickets from all channels, filterable by channel.
- Channel badges (icons) are displayed on each ticket so agents can identify origin at a glance.
- Channel-specific reply composer: the reply interface adapts based on channel (email rich-text vs. chat simple-text vs. WhatsApp template selector).
- Cross-channel linking: an agent may link two tickets from different channels belonging to the same customer.
- Channel health dashboard: shows inbound volume per channel per day/week.

---

### 5.10 eCommerce Multichannel Integration

**Description:** Connect eCommerce platforms so agents can view order details, shipment status, and customer purchase history directly inside a ticket.

**Supported Platforms:** Shopify, WooCommerce, Salla (Saudi), Zid (Saudi), Magento.

**Requirements:**

- OAuth or API-key based store connection.
- When a ticket is linked to an order, the order panel shows: order ID, items, total, status, tracking number, and payment method.
- Customer purchase history is shown on the contact sidebar when viewing any ticket from that customer.
- Agents may perform store actions from within the ticket (configurable): issue refund, cancel order, resend order confirmation — subject to role permissions.
- Store sync runs every 15 minutes; manual refresh is available.
- Multi-store: a single organization may connect multiple stores across platforms.

---

### 5.11 Agent Performance Examination

**Description:** Managers and supervisors can measure agent and team productivity, response quality, and customer satisfaction.

**Reports:**

- **Ticket Volume Report:** total tickets by status, priority, channel, and time period.
- **Agent Performance Report:** tickets handled, average first response time, average resolution time, and CSAT score per agent.
- **Team Report:** same metrics aggregated per team.
- **SLA Compliance Report:** % tickets resolved within SLA, # SLA breaches per agent/team.
- **CSAT Report:** satisfaction rating distribution, low-rating tickets flagged for review.
- **Channel Report:** volume and resolution metrics split by channel.
- **Workload Report:** current open ticket count per agent (real-time).

**Requirements:**

- Date range filter for all reports (preset: today, yesterday, last 7 days, last 30 days, custom).
- Export reports to CSV and PDF.
- Reports respect role permissions (agents see only own stats; supervisors see team stats; admins see all).
- CSAT survey: automatically sent to customer upon ticket resolution via email; response is a 1–5 star rating with optional comment.

---

### 5.12 Theme Customization

**Description:** Each organization may customize the look of the support portal and widget to match their brand.

**Requirements:**

- Configurable: primary color, secondary color, background color, font family (from Google Fonts), logo, favicon.
- Support portal (end-customer facing): custom domain support (CNAME), custom header/footer HTML, configurable navigation links.
- Live chat widget (Binaka): configure widget color, position (bottom-left / bottom-right), initial greeting, agent avatar, and business hours message.
- Email template theming: logo, header color, and footer text configurable for all outbound emails.
- Dark mode toggle for the agent dashboard (preference per agent).
- Preview mode: changes can be previewed before publishing.

---

### 5.13 Knowledgebase

**Description:** A self-service knowledgebase where organizations publish help articles to deflect tickets and empower customers.

**Requirements:**

- Articles organized in a two-level category hierarchy (Category → Subcategory).
- Article editor: rich-text WYSIWYG with image embed, video embed, tables, and code blocks.
- Articles support multiple languages; language is selected per article version.
- Article statuses: Draft → In Review → Published → Archived.
- SEO fields: meta title, meta description, and custom URL slug per article.
- Article search: full-text search across title and body.
- Related articles: auto-suggested or manually linked per article.
- Feedback: readers may rate an article (helpful / not helpful) with optional comment.
- View tracking: article view count is recorded.
- Agent article suggestion: while composing a reply, the agent may search and insert a link to an article.
- Widget integration: the Binaka chat widget may show knowledgebase search before connecting to an agent.

---

### 5.14 Saved Replies

**Description:** Pre-written reply templates that agents can insert into ticket replies with one click, improving speed and consistency.

**Requirements:**

- Saved replies are organized in folders.
- Each reply has a title, shortcut code (e.g., `/refund`), and body (rich text with merge tags).
- Merge tags supported: `{{customer_name}}`, `{{ticket_id}}`, `{{agent_name}}`, `{{organization_name}}`, `{{ticket_url}}`.
- Agents may search saved replies by title or shortcut while composing a reply.
- Replies may be scoped: organization-wide, team-specific, or personal (agent-only).
- Admins manage all replies; agents manage personal replies.
- Usage tracking: most-used replies surfaced at the top of the picker.

---

### 5.15 Mailboxes Configuration

**Description:** Administrators configure inbound and outbound email connections per mailbox.

**Requirements:**

- Add mailbox via IMAP/SMTP credentials or via OAuth (Gmail, Outlook).
- Per-mailbox settings: display name, from address, reply-to address, signature, and auto-reply toggle.
- Auto-reply: configurable template sent to the customer immediately upon ticket creation from this mailbox.
- Each mailbox is assigned to one or more teams for default routing.
- Connection health: system polls IMAP every 2 minutes and alerts admin on connection failure.
- Multiple mailboxes may share a single SMTP server.
- Mailbox alias: a single mailbox may receive email at multiple addresses.
- Mailbox-level email routing rules (override organization-level rules).
- Mailbox activity log: last sync time, emails ingested in last 24h, errors.

---

### 5.16 Branding

**Description:** Full white-label support for resellers and enterprise clients to present the platform as their own product.

**Requirements:**

- Custom domain for support portal (e.g., `support.client.com`) via CNAME.
- Custom domain for outbound email FROM address with SPF/DKIM verification wizard.
- Remove all references to the platform vendor from UI, emails, and meta tags.
- Custom login page: background image, headline text, and logo.
- Custom 404 and error pages.
- White-label API documentation URL configurable.
- Per-organization color scheme and font applied consistently across portal, widget, and emails.

---

### 5.17 Binaka Live Chat

**Description:** An embeddable live chat widget (branded "Binaka") that allows customers to chat with agents in real time, with automatic escalation to a ticket if the chat is unresolved.

**Requirements:**

- JavaScript snippet embed on any webpage; no server-side requirement.
- Pre-chat form: collect visitor name and email before starting chat (configurable).
- Real-time message delivery via WebSockets.
- Typing indicator for both agent and visitor.
- Agent availability: when no agent is available (outside business hours or all busy), widget falls back to a "leave a message" form which creates a ticket.
- Chat assignment: chats are routed to the assigned team queue; agents accept or reject chat requests.
- Chat sessions auto-convert to a ticket upon end.
- Visitor identification: if visitor provides email, link chat to existing contact profile.
- File sharing: visitors and agents may send files up to a configurable size limit.
- Chat rating: at end of chat, visitor is prompted to rate the session.
- Proactive chat: trigger a chat invitation based on time-on-page rules.
- Chat transcript sent to visitor email automatically on session end.

---

### 5.18 eCommerce Support

**Description:** Order-aware support tooling that gives agents full context on a customer's purchase history without leaving the ticket.

**Requirements:**

- Order lookup by order ID, email, or phone from within the ticket sidebar.
- Display: order status, line items with images, order total, shipping address, tracking link, and payment method.
- Customer purchase timeline: all historical orders from linked stores shown on contact profile.
- Agents may add order IDs as metadata to tickets for reporting.
- Configurable agent actions per integration: issue refund, cancel order, resend invoice — permissions gated by role.
- Order search results may be shared in the ticket reply as a formatted message.

---

## 6. Functional Requirements — Billing & Subscriptions

---

### 6.1 Subscription Plans

The platform offers four base plan tiers. All plan configurations are managed by platform admins and stored in the database (no hardcoding).

| Tier             | Target                          | Billing Model                   |
| ---------------- | ------------------------------- | ------------------------------- |
| **Free**         | Individuals / evaluation        | Forever free, hard feature caps |
| **Starter**      | Small teams (1–5 agents)        | Per-seat, monthly or annual     |
| **Professional** | Growing teams (up to 25 agents) | Per-seat, monthly or annual     |
| **Enterprise**   | Large organizations             | Custom pricing, annual contract |

**Requirements:**

- Each plan has a distinct set of feature flags and numeric limits (see §6.2).
- Plans are offered in two billing cycles: monthly and annual (annual = 10× monthly rate, equivalent to 2 months free).
- Each plan has a price per agent seat per billing cycle per currency.
- Enterprise plans have a `custom_pricing` flag; price is negotiated and entered manually by a platform admin.
- Plans can be created, edited, and archived by platform admins. Archiving hides the plan from new signups but does not affect existing subscriptions.
- Plan order is configurable for the pricing/upgrade page display.

---

### 6.2 Plan Features & Limits

Every plan defines feature flags and numeric limits enforced at runtime. All values are stored per plan in the database — nothing is hardcoded.

**Feature Flags:**

| Feature               | Free | Starter | Professional | Enterprise |
| --------------------- | ---- | ------- | ------------ | ---------- |
| Email channel         | ✓    | ✓       | ✓            | ✓          |
| Live chat (Binaka)    | ✗    | ✓       | ✓            | ✓          |
| Social media channels | ✗    | ✗       | ✓            | ✓          |
| eCommerce integration | ✗    | ✗       | ✓            | ✓          |
| Workflow automation   | ✗    | ✓       | ✓            | ✓          |
| Knowledgebase         | ✗    | ✓       | ✓            | ✓          |
| Custom roles          | ✗    | ✗       | ✓            | ✓          |
| SLA policies          | ✗    | ✓       | ✓            | ✓          |
| CSAT surveys          | ✗    | ✓       | ✓            | ✓          |
| Custom domain         | ✗    | ✗       | ✓            | ✓          |
| White-label branding  | ✗    | ✗       | ✗            | ✓          |
| API access            | ✗    | ✓       | ✓            | ✓          |
| SSO / SAML            | ✗    | ✗       | ✗            | ✓          |
| IP whitelisting       | ✗    | ✗       | ✗            | ✓          |
| Priority support      | ✗    | ✗       | ✓            | ✓          |
| Advanced reports      | ✗    | ✗       | ✓            | ✓          |

**Numeric Limits (`-1` = Unlimited):**

| Limit                | Free | Starter | Professional | Enterprise |
| -------------------- | ---- | ------- | ------------ | ---------- |
| Max agents (seats)   | 1    | 5       | 25           | -1         |
| Max mailboxes        | 1    | 3       | 10           | -1         |
| Max forms            | 1    | 5       | 20           | -1         |
| Max workflows        | 0    | 10      | 50           | -1         |
| Max saved replies    | 10   | 50      | 200          | -1         |
| Max KB articles      | 0    | 50      | 500          | -1         |
| Max social accounts  | 0    | 0       | 5            | -1         |
| Max eCommerce stores | 0    | 0       | 3            | -1         |
| Storage (GB)         | 1    | 5       | 20           | Custom     |
| Max attachment MB    | 5    | 20      | 50           | Custom     |

> When a hard limit is reached, the action is blocked and an upgrade prompt is shown.

---

### 6.3 Add-Ons

Add-ons allow organizations to expand specific limits beyond their plan without upgrading the full tier.

| Add-On                | Unit                | Applies To            |
| --------------------- | ------------------- | --------------------- |
| Extra Agent Seat      | Per seat / month    | Starter, Professional |
| Extra Storage         | Per 10 GB / month   | All paid plans        |
| Extra Mailbox         | Per mailbox / month | Starter, Professional |
| Extra Social Account  | Per account / month | Professional          |
| Extra eCommerce Store | Per store / month   | Professional          |
| Priority Support Pack | Flat / month        | Starter               |

**Requirements:**

- Add-ons are priced per unit and billed alongside the base subscription.
- Add-on prices vary by currency; all prices are stored in the database.
- Add-ons are prorated when added mid-cycle.
- Removing an add-on takes effect at the end of the current billing cycle.
- Add-ons are not available on the Free plan.

---

### 6.4 Subscription Lifecycle

**States:**

| State      | Description                                    |
| ---------- | ---------------------------------------------- |
| `trialing` | Free trial period; full plan features unlocked |
| `active`   | Paid subscription in good standing             |
| `past_due` | Payment failed; grace period active            |
| `paused`   | Paused by platform admin (Enterprise only)     |
| `canceled` | Subscription ended; org downgraded to Free     |

```
trialing → active → past_due → canceled
                 ↘ paused (Enterprise only)
```

**Lifecycle Events:**

- **Upgrade:** Immediate; prorated charge for remainder of billing cycle. New limits apply instantly.
- **Downgrade:** Scheduled for end of current billing cycle. Org retains current plan until cycle ends.
- **Cancellation:** Immediate or end-of-cycle (user choice). Data retained for 90 days post-cancellation.
- **Reactivation:** Canceled org may reactivate at any time; a new subscription is created.
- **Plan Change Mid-Cycle:** Generates a prorated invoice line item.

**Grace Period:** When a payment fails, the subscription enters `past_due`. Full access is retained for a configurable grace period (default 7 days). After grace period expires, the account is downgraded to Free limits.

---

### 6.5 Billing & Invoicing

**Requirements:**

- Invoices are generated automatically at the start of each billing cycle.
- Invoice line items: base plan charge, per-seat charges, add-on charges, prorated adjustments, discounts, and tax.
- Invoices are numbered sequentially per organization: `INV-{org_slug}-{year}-{seq}`.
- Invoices are generated in the organization's billing currency.
- Invoices are available for PDF download immediately upon generation.
- Arabic invoice PDF generated when organization locale is `ar`.
- Invoice states: `draft` → `open` → `paid` → `void`.
- Each invoice must display: invoice number, issue date, due date, billing period, organization name and address, VAT registration number (if applicable), line items with unit price and quantity, subtotal, discount amount, tax amount and rate, and total due.

---

### 6.6 Payment Methods

**Requirements:**

- Organizations may store one or more payment methods. One must be designated as default for automatic charges.
- Supported types: credit/debit card (Visa, Mastercard, Amex), MADA (Saudi Arabia), Apple Pay, SADAD, bank transfer (manual, Enterprise only).
- Payment methods are stored as tokens at the gateway; no raw card data is stored on the platform.
- Expired or invalid payment methods trigger a notification to the organization owner.
- Payment methods can be added, removed, and reordered from the billing portal.

---

### 6.7 Coupons & Discounts

**Coupon Types:**

| Type                 | Description                     |
| -------------------- | ------------------------------- |
| Percentage           | e.g., 20% off for 3 months      |
| Fixed amount         | e.g., SAR 200 off first invoice |
| Free trial extension | e.g., +14 days added to trial   |

**Requirements:**

- Coupons are created and managed by platform admins.
- Each coupon has: code, discount type, discount value, applicable plans, usage limit (total and per-org), validity period, and duration (`once` / `repeating` / `forever`).
- A coupon may be restricted to new subscriptions only.
- Organizations apply coupons during checkout or from the billing portal.
- Applied coupons appear as line items on invoices.
- Coupon redemption history is tracked per organization.
- Coupons may not be stacked; only one coupon per subscription at a time.

---

### 6.8 Trial Management

**Requirements:**

- New organizations start on a configurable free trial (default 14 days) with Professional plan features.
- No payment method required to start a trial.
- Trial length is configurable per organization by platform admins (for sales-assisted trials).
- Trial expiry notifications sent at 72h, 24h, and 1h before expiry via in-app banner and email.
- On trial expiry with no payment method: automatic downgrade to Free plan.
- On trial expiry with a payment method: automatic conversion to selected paid plan; first invoice generated.
- Trial extensions may be granted manually by platform admins.
- A single organization email domain may only redeem one trial.

---

### 6.9 Seat Management

**Requirements:**

- A seat is one active (non-deleted) agent user within an organization.
- Seat count is computed in real time from the `users` table WHERE `is_active = true AND deleted_at IS NULL`.
- Adding a user that would exceed the plan's seat limit is blocked with an upgrade prompt.
- When a seat add-on is purchased, the effective `max_agents` limit increases immediately.
- Seat count is billed at the start of each cycle based on the count at billing time (snapshot).
- Downgrading seat count (removing users) reduces the invoice from the next cycle.

---

### 6.10 Usage Metering & Enforcement

**Tracked Metrics:**

| Metric            | How Measured                                                       |
| ----------------- | ------------------------------------------------------------------ |
| Agent seats       | Count of active users                                              |
| Storage used (GB) | Sum of all attachment sizes in object storage                      |
| Ticket volume     | Count of tickets in current cycle (informational only, not billed) |
| Mailboxes         | Count of active mailboxes                                          |
| Workflows         | Count of active workflows                                          |
| Forms             | Count of active forms                                              |
| Social accounts   | Count of connected social accounts                                 |
| KB articles       | Count of published articles                                        |
| eCommerce stores  | Count of active integrations                                       |

**Enforcement Rules:**

- Hard limits: action blocked; upgrade modal shown.
- Soft limits: action proceeds but warning banner shown (storage at 80%).
- Usage snapshots are recorded daily for billing and analytics.

---

### 6.11 Billing Portal (Self-Service)

Accessible to Organization Owner role only:

- **Current plan:** Plan name, billing cycle, next billing date, and seat count.
- **Upgrade / downgrade:** Plan selector with feature comparison and live price preview.
- **Add-ons:** Add or remove add-ons with prorated price preview.
- **Payment methods:** Add, remove, and set default payment method.
- **Invoices:** Full history with PDF download and payment status.
- **Coupon:** Apply a coupon code.
- **Cancel subscription:** Immediate or end-of-cycle cancellation with consequences explained.
- **Billing contact:** Override billing email (separate from owner's account email).
- **Billing address:** Company name, address, VAT number — displayed on all invoices.

---

### 6.12 Payment Gateway Integrations

**Stripe (Primary):** Handles card tokenization, recurring charge scheduling, 3D Secure, and webhooks. Webhook events consumed: `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `payment_method.attached`, `payment_method.detached`. Stripe Customer ID stored per organization; Stripe Subscription ID stored per subscription.

**PayTabs (MENA Fallback):** Used when the organization billing country is SA, AE, EG, KW, BH, OM, or QA. Supports MADA, Apple Pay (SA), and SADAD. Webhook events consumed: `payment_response`, `refund_response`. PayTabs transaction references stored per payment record.

**Manual / Bank Transfer (Enterprise):** Invoice generated and emailed manually. Payment marked as paid by a platform admin after bank confirmation. No automated retry logic.

---

### 6.13 Tax Management

**Requirements:**

- Tax rates are configurable per country/region by platform admins with effective date ranges to handle rate changes without breaking historical invoices.
- VAT applies to GCC countries (SA: 15%, AE: 5%, BH: 10%, QA: 0%, KW: 0%, OM: 5%).
- Organization's billing country determines applicable tax rate.
- If an organization provides a valid VAT registration number, B2B reverse-charge may apply (configurable per country).
- Tax amount displayed as a separate line item on every invoice.
- VAT numbers validated via VIES (EU) or ZATCA API (Saudi Arabia).

---

### 6.14 Notifications & Dunning

**Billing Notifications:**

| Event                              | Channel        | Recipient          |
| ---------------------------------- | -------------- | ------------------ |
| Trial starting                     | Email          | Owner              |
| Trial expiring in 72h              | Email + In-app | Owner              |
| Trial expiring in 24h              | Email + In-app | Owner              |
| Trial expired (no card)            | Email + In-app | Owner              |
| Subscription activated             | Email          | Owner              |
| Invoice generated                  | Email          | Billing contact    |
| Payment successful                 | Email          | Billing contact    |
| Payment failed (attempt 1)         | Email + In-app | Owner              |
| Payment failed (attempt 2, +3d)    | Email + In-app | Owner              |
| Payment failed (attempt 3, +7d)    | Email + In-app | Owner              |
| Account downgraded (grace expired) | Email + In-app | Owner + All admins |
| Subscription canceled              | Email          | Owner              |
| Plan upgraded                      | Email + In-app | Owner              |
| Plan downgraded (scheduled)        | Email          | Owner              |
| Upcoming renewal (7 days prior)    | Email          | Billing contact    |
| Seat limit reached                 | In-app         | Owner + Admins     |
| Storage at 80%                     | In-app         | Owner              |
| Storage at 100%                    | Email + In-app | Owner              |

**Dunning Schedule:**

| Attempt | When                   | Action                                         |
| ------- | ---------------------- | ---------------------------------------------- |
| 1       | Immediately on failure | Notify owner; subscription stays `active`      |
| 2       | +3 days                | Retry charge; subscription moves to `past_due` |
| 3       | +7 days                | Retry charge; final warning email              |
| 4       | +7 days (grace end)    | No retry; downgrade to Free                    |

All dunning steps and results are logged in `dunning_logs`.

---

### 6.15 Platform Admin Billing Console

Accessible to `is_platform_admin = true` users only:

- **Organization billing list:** All organizations with plan, MRR contribution, seat count, next billing date, and status.
- **Manual subscription actions:** Upgrade/downgrade any org's plan, grant trial extension, apply coupon, void invoice, mark manual payment as paid.
- **Coupon management:** Create, edit, deactivate, and view redemption stats.
- **Plan management:** Create, edit, archive plans and their features/limits/prices.
- **Tax rate management:** Configure tax rates per country with effective dates.
- **Revenue dashboard:** MRR, ARR, churn rate, new subscriptions, upgrades, downgrades, and refunds — filterable by date range, plan, and country.

---

### 6.16 Revenue Reporting

Reports available to platform admins, all exportable to CSV:

- **MRR:** Total active subscription MRR by plan and currency.
- **ARR:** Annualized MRR.
- **New MRR:** Revenue from new subscriptions in the period.
- **Expansion MRR:** Revenue from upgrades and add-ons.
- **Contraction MRR:** Revenue lost from downgrades and add-on removals.
- **Churned MRR:** Revenue lost from cancellations.
- **Net MRR Growth:** New + Expansion − Contraction − Churned.
- **Churn Rate:** % of subscriptions canceled in period.
- **Trial Conversion Rate:** % of trials converted to paid.
- **ARPU:** MRR / active seats.
- **LTV:** ARPU × average subscription duration.
- **Cohort Analysis:** Revenue retention by signup month cohort.

---

## 7. Non-Functional Requirements

| Category                | Requirement                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| **Performance**         | API response time < 300ms (p95) under normal load                                                       |
| **Scalability**         | Horizontal scaling; supports 10,000+ concurrent agents per deployment                                   |
| **Availability**        | 99.9% SLA; planned maintenance during low-traffic windows with advance notice                           |
| **Security**            | TLS 1.2+ for all traffic; AES-256 data at rest; SOC 2 Type II alignment                                 |
| **Data Retention**      | Ticket data retained for minimum 5 years; configurable per tenant                                       |
| **Localization**        | Full RTL support for Arabic; all UI strings externalized for i18n                                       |
| **Accessibility**       | WCAG 2.1 Level AA for end-customer portal                                                               |
| **Backup**              | Automated daily database backups; point-in-time recovery to 7 days                                      |
| **Audit**               | Full audit trail on all data mutations; tamper-evident logs                                             |
| **File Storage**        | Attachments stored in S3-compatible object storage; max file size configurable                          |
| **Idempotency**         | All payment processing endpoints must be idempotent (retry-safe via idempotency keys)                   |
| **Webhook Reliability** | Gateway webhooks processed with at-least-once delivery; idempotency guards prevent duplicate processing |
| **PCI Compliance**      | No raw card data ever touches platform servers; tokenization at gateway                                 |
| **Currency Precision**  | All monetary amounts stored as BIGINT in smallest unit; conversion handled at presentation layer        |
| **Multi-Currency**      | Invoice displayed in org's billing currency; MRR reports normalized to USD                              |
| **Billing Performance** | Invoice PDF generation < 3 seconds; billing portal page load < 500ms                                    |
| **Concurrency**         | Subscription state changes use database-level row locking to prevent race conditions                    |

---

## 8. Integration Requirements

| Integration           | Type           | Purpose                       |
| --------------------- | -------------- | ----------------------------- |
| Gmail / Outlook       | OAuth 2.0      | Mailbox connection            |
| Facebook Graph API    | OAuth 2.0      | Pages, Messenger, Instagram   |
| Twitter/X API v2      | OAuth 2.0      | Mentions and DMs              |
| WhatsApp Business API | Webhook + REST | Inbound/outbound messaging    |
| Shopify Admin API     | API Key        | eCommerce order data          |
| WooCommerce REST API  | API Key        | eCommerce order data          |
| Salla API             | OAuth 2.0      | Saudi eCommerce               |
| Zid API               | OAuth 2.0      | Saudi eCommerce               |
| Google reCAPTCHA v3   | Client-side    | Form spam prevention          |
| hCaptcha              | Client-side    | Alternative CAPTCHA           |
| Stripe                | Webhook + REST | Primary payment gateway       |
| PayTabs               | Webhook + REST | MENA payment gateway fallback |
| SMTP (generic)        | Credentials    | Custom mail server            |
| Webhook (outbound)    | HTTP POST      | Workflow action               |
| Slack                 | OAuth 2.0      | Agent notifications           |
| ZATCA API             | REST           | Saudi VAT number validation   |
| VIES                  | SOAP/REST      | EU VAT number validation      |

---

## 9. Business Rules

**Platform:**

- A ticket can belong to only one mailbox at a time but can be re-assigned to another mailbox.
- Deleting a contact does not delete their tickets (soft delete + anonymization).
- SLA timers pause when ticket status is "Pending" or "On Hold".
- A ticket may only be merged into a ticket that is not itself a merged ticket (no chain merges).
- Saved replies with team scope are visible to all agents in that team only.
- Workflows execute in order of priority; a workflow may halt subsequent workflows via a "stop processing" action.
- Agent accounts are scoped to one organization. Platform admins have cross-organization access.
- Custom domains require TLS certificate provisioning via Let's Encrypt.
- CSAT surveys expire 7 days after being sent if not responded to.

**Billing:**

- An organization may only have one active subscription at a time.
- Billings (plans, seats) are managed at organization level, not user level.
- Switching billing cycles (monthly ↔ annual) is treated as a plan change: current cycle is settled, new cycle begins.
- Annual subscriptions are non-refundable after 14 days from payment, except where required by law.
- Monthly subscriptions are non-refundable except for the first 48 hours (goodwill policy, configurable).
- Prorated credits from downgrades are applied as account credit, not refunded to the payment method.
- Account credit is applied automatically to the next invoice.
- A coupon may not be stacked with another coupon on the same subscription.
- Free plan organizations have no invoice history.
- Platform admins may grant any organization a complimentary plan (no charge) with an expiry date.
- On cancellation, the organization's data is retained for 90 days, then permanently deleted per GDPR/data policy.
- All billing amounts are stored in the smallest currency unit (halalas / fils / piastres / cents).

---

## 10. Assumptions & Constraints

- The platform is built as a multi-tenant SaaS; all tenants share infrastructure but are fully data-isolated.
- Each organization is billed per active agent seat.
- Email deliverability for hosted mailboxes is the responsibility of the platform operator.
- Social media integrations depend on third-party API availability and policies.
- WhatsApp Business API requires a Meta-approved BSP account.
- Arabic/RTL support applies to the end-customer portal and email templates; the agent dashboard is English-first with Arabic available as a locale option.
- Stripe is available in all target markets; PayTabs is the fallback for GCC countries.
- The platform does not process payments directly; all card data is tokenized at the gateway.

---

## 11. Glossary

| Term                  | Definition                                                                  |
| --------------------- | --------------------------------------------------------------------------- |
| Tenant / Organization | A customer of the platform operating their own isolated workspace           |
| Agent                 | A support team member responding to tickets                                 |
| Contact               | An end customer who submits tickets                                         |
| Mailbox               | An email address connected to the platform for inbound/outbound email       |
| Ticket                | A single customer request tracked through its full lifecycle                |
| SLA                   | Service Level Agreement — time targets for response and resolution          |
| CSAT                  | Customer Satisfaction Score — collected via post-resolution survey          |
| Saved Reply           | A pre-written reply template inserted by agents                             |
| Workflow              | An automation rule that triggers actions based on ticket events             |
| Binaka                | The platform's branded embeddable live chat widget                          |
| Knowledgebase         | A self-service article library for end customers                            |
| Channel               | A communication medium (email, chat, social, form)                          |
| Lookup                | A configurable enum value stored in the centralized lookup system           |
| Subscription          | An organization's active billing agreement for a plan tier                  |
| Seat                  | One active agent user consuming a billing unit                              |
| Add-On                | A purchasable extension to plan limits without a full tier upgrade          |
| MRR                   | Monthly Recurring Revenue                                                   |
| ARR                   | Annual Recurring Revenue                                                    |
| Dunning               | The process of retrying failed payments and notifying the organization      |
| Proration             | Adjusting a charge proportionally based on time used within a billing cycle |
| Grace Period          | Time after payment failure during which full access is retained             |
| VAT                   | Value Added Tax — applicable per GCC country billing address                |
| ARPU                  | Average Revenue Per User — MRR divided by active seats                      |
| LTV                   | Lifetime Value — ARPU multiplied by average subscription duration           |

---

# Part II — SaaS Billing, Plans & Subscription Management

| Field               | Value      |
| ------------------- | ---------- |
| **Section Version** | 1.0.0      |
| **Date**            | 2026-04-08 |

---

## Table of Contents (Part II)

19. [Subscription Plans](#19-subscription-plans)
20. [Plan Features & Limits](#20-plan-features--limits)
21. [Add-Ons](#21-add-ons)
22. [Subscription Lifecycle](#22-subscription-lifecycle)
23. [Billing & Invoicing](#23-billing--invoicing)
24. [Payment Methods](#24-payment-methods)
25. [Coupons & Discounts](#25-coupons--discounts)
26. [Trial Management](#26-trial-management)
27. [Seat Management](#27-seat-management)
28. [Usage Metering & Enforcement](#28-usage-metering--enforcement)
29. [Billing Portal (Self-Service)](#29-billing-portal-self-service)
30. [Payment Gateway Integrations](#30-payment-gateway-integrations)
31. [Tax Management](#31-tax-management)
32. [Notifications & Dunning](#32-notifications--dunning)
33. [Platform Admin Billing Console](#33-platform-admin-billing-console)
34. [Revenue Reporting](#34-revenue-reporting)
35. [Billing Business Rules](#35-billing-business-rules)
36. [Billing Non-Functional Requirements](#36-billing-non-functional-requirements)

---

## 19. Subscription Plans

### 19.1 Plan Tiers

The platform offers four base plan tiers. All plan configurations are managed by platform admins and stored in the database — no hardcoding.

| Tier             | Target                          | Billing Model                   |
| ---------------- | ------------------------------- | ------------------------------- |
| **Free**         | Individuals / evaluation        | Forever free, hard feature caps |
| **Starter**      | Small teams (1–5 agents)        | Per-seat, monthly or annual     |
| **Professional** | Growing teams (up to 25 agents) | Per-seat, monthly or annual     |
| **Enterprise**   | Large organizations             | Custom pricing, annual contract |

### 19.2 Plan Requirements

- Each plan has a distinct set of feature flags and numeric limits (see Section 20).
- Plans are offered in two billing cycles: **monthly** and **annual** (annual = 2 months free, i.e., 10× monthly rate).
- Each plan has a price per agent seat per billing cycle per currency.
- Enterprise plans have a `custom_pricing` flag; price is negotiated and entered manually by a platform admin.
- Plans can be created, edited, and archived by platform admins. Archiving a plan hides it from the public pricing page but does not affect existing subscriptions.
- Each plan may have a public-facing name, description, and highlighted feature list for the pricing page.
- Plan display order is configurable.

---

## 20. Plan Features & Limits

Every plan defines a set of feature flags and numeric limits enforced at runtime. All limits are stored per plan in the database — no limits are hardcoded.

### 20.1 Feature Flags (Boolean)

| Feature               | Free | Starter | Professional | Enterprise |
| --------------------- | ---- | ------- | ------------ | ---------- |
| Email channel         | ✓    | ✓       | ✓            | ✓          |
| Live chat (Binaka)    | ✗    | ✓       | ✓            | ✓          |
| Social media channels | ✗    | ✗       | ✓            | ✓          |
| eCommerce integration | ✗    | ✗       | ✓            | ✓          |
| Workflow automation   | ✗    | ✓       | ✓            | ✓          |
| Knowledgebase         | ✗    | ✓       | ✓            | ✓          |
| Custom roles          | ✗    | ✗       | ✓            | ✓          |
| SLA policies          | ✗    | ✓       | ✓            | ✓          |
| CSAT surveys          | ✗    | ✓       | ✓            | ✓          |
| Custom domain         | ✗    | ✗       | ✓            | ✓          |
| White-label branding  | ✗    | ✗       | ✗            | ✓          |
| API access            | ✗    | ✓       | ✓            | ✓          |
| SSO / SAML            | ✗    | ✗       | ✗            | ✓          |
| IP whitelisting       | ✗    | ✗       | ✗            | ✓          |
| Priority support      | ✗    | ✗       | ✓            | ✓          |
| Advanced reports      | ✗    | ✗       | ✓            | ✓          |

### 20.2 Numeric Limits

| Limit                | Free | Starter | Professional | Enterprise |
| -------------------- | ---- | ------- | ------------ | ---------- |
| Max agents (seats)   | 1    | 5       | 25           | Unlimited  |
| Max mailboxes        | 1    | 3       | 10           | Unlimited  |
| Max forms            | 1    | 5       | 20           | Unlimited  |
| Max workflows        | 0    | 10      | 50           | Unlimited  |
| Max saved replies    | 10   | 50      | 200          | Unlimited  |
| Max KB articles      | 0    | 50      | 500          | Unlimited  |
| Max social accounts  | 0    | 0       | 5            | Unlimited  |
| Max eCommerce stores | 0    | 0       | 3            | Unlimited  |
| Storage (GB)         | 1    | 5       | 20           | Custom     |
| Max attachment MB    | 5    | 20      | 50           | Custom     |

> **Enforcement:** When a limit is reached, the action is blocked and the user is shown an upgrade prompt. Unlimited is stored as `-1` in the database.

---

## 21. Add-Ons

Add-ons allow organizations to expand specific limits beyond their plan without upgrading the full tier.

| Add-On                | Unit                | Applies To            |
| --------------------- | ------------------- | --------------------- |
| Extra Agent Seat      | Per seat / month    | Starter, Professional |
| Extra Storage         | Per 10 GB / month   | All paid plans        |
| Extra Mailbox         | Per mailbox / month | Starter, Professional |
| Extra Social Account  | Per account / month | Professional          |
| Extra eCommerce Store | Per store / month   | Professional          |
| Priority Support Pack | Flat / month        | Starter               |

**Requirements:**

- Add-ons are priced per unit and billed alongside the base subscription.
- Add-on prices vary by currency; all prices are stored in the database.
- Add-ons are prorated when added mid-cycle.
- Removing an add-on takes effect at the end of the current billing cycle.
- Add-ons are not available on the Free plan.

---

## 22. Subscription Lifecycle

### 22.1 States

```
trialing → active → past_due → canceled
                 ↘ paused (Enterprise only, on request)
```

| State      | Description                                        |
| ---------- | -------------------------------------------------- |
| `trialing` | Free trial period; full plan features unlocked     |
| `active`   | Paid subscription in good standing                 |
| `past_due` | Payment failed; grace period active                |
| `paused`   | Subscription paused by platform admin (Enterprise) |
| `canceled` | Subscription ended; org downgraded to Free         |

### 22.2 Lifecycle Events

- **Upgrade:** Immediate; prorated charge for remainder of billing cycle. New limits apply instantly.
- **Downgrade:** Scheduled for end of current billing cycle. Org retains current plan until cycle ends.
- **Cancellation:** Immediate or end-of-cycle (user choice). Data retained for 90 days post-cancellation.
- **Reactivation:** Canceled org may reactivate at any time; a new subscription is created.
- **Plan Change Mid-Cycle:** Generates a prorated invoice line item.

### 22.3 Grace Period

When a payment fails the subscription enters `past_due`. The organization retains full access for a configurable grace period (default 7 days). After the grace period, the account is downgraded to Free limits. Dunning emails are sent throughout the grace period (see Section 32).

---

## 23. Billing & Invoicing

### 23.1 Invoice Generation

- Invoices are generated automatically at the start of each billing cycle.
- Invoice line items: base plan charge, per-seat charges, add-on charges, prorated adjustments, discounts, and tax.
- Invoices are numbered sequentially per organization: `INV-{org_slug}-{year}-{seq}`.
- Invoices are generated in the organization's billing currency.
- PDF invoices are available for download immediately upon generation.
- Arabic invoice PDF is generated when the organization locale is `ar`.

### 23.2 Invoice States

`draft` → `open` → `paid` → `void`

- **Draft:** System-generated, not yet finalized.
- **Open:** Finalized and awaiting payment.
- **Paid:** Payment confirmed.
- **Void:** Manually voided by platform admin (no refund implied).

### 23.3 Invoice Contents

Each invoice must display: invoice number, issue date, due date, billing period, organization name and address, platform name and address, VAT registration number (if applicable), line items with unit price and quantity, subtotal, discount amount, tax amount and rate, total due, and payment status.

---

## 24. Payment Methods

- Organizations may store one or more payment methods.
- Supported method types: credit/debit card (Visa, Mastercard, Amex), MADA (Saudi Arabia), Apple Pay, SADAD (Saudi Arabia), bank transfer (manual, Enterprise only).
- One payment method must be designated as the **default** for automatic charges.
- Payment methods are stored as tokens at the gateway; no raw card data is stored on the platform.
- Expired or invalid payment methods trigger a notification to the organization owner.
- Payment methods can be added, removed, and reordered from the billing portal.

---

## 25. Coupons & Discounts

### 25.1 Coupon Types

| Type                 | Description                   |
| -------------------- | ----------------------------- |
| Percentage           | e.g., 20% off for 3 months    |
| Fixed amount         | e.g., $50 off first invoice   |
| Free trial extension | e.g., +14 days added to trial |

### 25.2 Requirements

- Coupons are created and managed by platform admins.
- Each coupon has: code, discount type, discount value, applicable plans (all or specific), usage limit (total and per-organization), validity period (start and expiry date), and duration (`once` / `repeating` / `forever`).
- A coupon may be restricted to new subscriptions only.
- Organizations apply coupons during checkout or from the billing portal.
- Applied coupons appear as line items on invoices.
- Coupon redemption history is tracked per organization.

---

## 26. Trial Management

- New organizations start on a configurable free trial (default 14 days) with Professional plan features.
- No payment method required to start a trial.
- Trial length is configurable per organization by platform admins (for sales-assisted trials).
- Trial expiry notifications: 72h, 24h, and 1h before expiry — in-app banner and email sent.
- On trial expiry with no payment method: automatic downgrade to Free plan.
- On trial expiry with a payment method: automatic conversion to selected paid plan; first invoice generated.
- Trial extensions may be granted manually by platform admins.
- A single organization email domain may only redeem one trial.

---

## 27. Seat Management

- A **seat** is one active (non-deleted) agent user within an organization.
- The seat count is computed in real time from the `users` table WHERE `is_active = true AND deleted_at IS NULL`.
- Adding a user that would exceed the plan's seat limit is blocked with an upgrade prompt.
- When a seat add-on is purchased, the `max_agents` effective limit increases immediately.
- Seat count is billed at the start of each cycle based on the count at billing time (snapshot).
- Downgrading seat count (removing users) reduces the invoice from the next cycle.
- Platform admins may see a seat utilization graph per organization.

---

## 28. Usage Metering & Enforcement

### 28.1 Tracked Metrics

| Metric            | How Measured                                           |
| ----------------- | ------------------------------------------------------ |
| Agent seats       | Count of active users                                  |
| Storage used (GB) | Sum of all attachment sizes in object storage          |
| Ticket volume     | Count of tickets in current cycle (informational only) |
| Mailboxes         | Count of active mailboxes                              |
| Workflows         | Count of active workflows                              |
| Forms             | Count of active forms                                  |
| Social accounts   | Count of connected social accounts                     |
| KB articles       | Count of published articles                            |
| eCommerce stores  | Count of active integrations                           |

### 28.2 Enforcement Rules

- **Hard limits:** Blocking — the action is prevented and an upgrade modal is shown.
- **Soft limits:** Warning — the action proceeds but a warning banner is shown (e.g., storage at 80%).
- Storage soft limit triggers at 80% utilization.
- Usage snapshots are recorded daily for billing and analytics.

---

## 29. Billing Portal (Self-Service)

Accessible to organization Owner role only. The portal provides:

- **Current plan:** Display plan name, billing cycle, next billing date, and seat count.
- **Upgrade / downgrade:** Plan selector with feature comparison and price preview.
- **Add-ons:** Add or remove add-ons with prorated price preview.
- **Payment methods:** Add, remove, and set default payment method.
- **Invoices:** List all invoices with download PDF link and payment status.
- **Coupon:** Apply a coupon code.
- **Cancel subscription:** Immediate or end-of-cycle cancellation with confirmation and consequences explained.
- **Billing contact:** Override the billing email address.
- **Billing address:** Company name, address, VAT number — used on invoices.

---

## 30. Payment Gateway Integrations

### 30.1 Stripe (Primary)

- Handles card tokenization, recurring charge scheduling, 3D Secure, and webhooks.
- Webhook events consumed: `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `payment_method.attached`, `payment_method.detached`.
- Stripe Customer ID is stored per organization; Stripe Subscription ID stored per subscription.

### 30.2 PayTabs (MENA Fallback)

- Used when the organization billing country is SA, AE, EG, KW, BH, OM, QA.
- Supports MADA, Apple Pay (SA), and SADAD.
- Webhook events consumed: `payment_response`, `refund_response`.
- PayTabs transaction references stored per payment record.

### 30.3 Manual / Bank Transfer (Enterprise)

- Invoice is generated and emailed manually.
- Payment is marked as paid by a platform admin after bank confirmation.
- No automated retry logic for manual payments.

---

## 31. Tax Management

- Tax rates are configurable per country/region by platform admins.
- VAT applies to GCC countries: SA 15%, AE 5%, BH 10%, OM 5%. Qatar and Kuwait have no VAT as of 2026.
- Organization's billing country determines applicable tax rate.
- If an organization provides a valid VAT registration number, B2B reverse-charge may apply (configurable per country).
- Tax amount is displayed as a separate line item on every invoice.
- Tax rates store effective date ranges to handle rate changes without breaking historical invoices.

---

## 32. Notifications & Dunning

### 32.1 Billing Notifications

| Event                              | Channel        | Recipient          |
| ---------------------------------- | -------------- | ------------------ |
| Trial starting                     | Email          | Owner              |
| Trial expiring in 72h              | Email + In-app | Owner              |
| Trial expiring in 24h              | Email + In-app | Owner              |
| Trial expired (no card)            | Email + In-app | Owner              |
| Subscription activated             | Email          | Owner              |
| Invoice generated                  | Email          | Billing contact    |
| Payment successful                 | Email          | Billing contact    |
| Payment failed (attempt 1)         | Email + In-app | Owner              |
| Payment failed (attempt 2, +3d)    | Email + In-app | Owner              |
| Payment failed (attempt 3, +7d)    | Email + In-app | Owner              |
| Account downgraded (grace expired) | Email + In-app | Owner + All admins |
| Subscription canceled              | Email          | Owner              |
| Plan upgraded                      | Email + In-app | Owner              |
| Plan downgraded (scheduled)        | Email          | Owner              |
| Upcoming renewal (7 days prior)    | Email          | Billing contact    |
| Seat limit reached                 | In-app         | Owner + Admins     |
| Storage at 80%                     | In-app         | Owner              |
| Storage at 100%                    | Email + In-app | Owner              |

### 32.2 Dunning Schedule

| Attempt | When                | Action                                                       |
| ------- | ------------------- | ------------------------------------------------------------ |
| 1       | Immediately         | Notify owner; subscription remains `active`                  |
| 2       | +3 days             | Retry charge; notify owner; subscription moves to `past_due` |
| 3       | +7 days             | Retry charge; final warning email                            |
| 4       | +7 days (grace end) | No retry; subscription downgraded to Free                    |

All dunning steps and results are logged in `dunning_logs`.

---

## 33. Platform Admin Billing Console

Accessible to `is_platform_admin = true` users only.

- **Organization billing list:** All organizations with plan, MRR, seat count, next billing date, and status.
- **Manual subscription actions:** Upgrade/downgrade any org's plan, grant trial extension, apply coupon, void invoice, mark manual payment as paid.
- **Coupon management:** Create, edit, deactivate, and view redemption stats for all coupons.
- **Plan management:** Create, edit, archive plans and their features/limits/prices.
- **Tax rate management:** Configure tax rates per country with effective dates.
- **Revenue dashboard:** MRR, ARR, churn rate, new subscriptions, upgrades, downgrades, and refunds — filterable by date range, plan, and country.

---

## 34. Revenue Reporting

Reports available to platform admins:

- **MRR (Monthly Recurring Revenue):** Total active subscription MRR by plan and currency.
- **ARR (Annual Recurring Revenue):** Annualized MRR.
- **New MRR:** Revenue from new subscriptions in the period.
- **Expansion MRR:** Revenue gained from upgrades and add-ons.
- **Contraction MRR:** Revenue lost from downgrades and add-on removals.
- **Churned MRR:** Revenue lost from cancellations.
- **Net MRR Growth:** New + Expansion − Contraction − Churned.
- **Churn Rate:** % of subscriptions canceled in period.
- **Trial Conversion Rate:** % of trials converted to paid.
- **ARPU (Average Revenue Per User):** MRR / active seats.
- **LTV (Lifetime Value):** ARPU × average subscription duration.
- **Cohort Analysis:** Revenue retention by signup month cohort.

All reports exportable to CSV.

---

## 35. Billing Business Rules

- An organization may only have one active subscription at a time.
- Switching billing cycles (monthly ↔ annual) is treated as a plan change: current cycle is settled, new cycle begins.
- Annual subscriptions are non-refundable after 14 days from payment, except where required by law.
- Monthly subscriptions are non-refundable except for the first 48 hours (goodwill policy, configurable).
- Prorated credits from downgrades are applied as account credit, not refunded to the payment method.
- Account credit is applied automatically to the next invoice.
- A coupon may not be stacked with another coupon on the same subscription.
- Free plan organizations have no invoice history.
- Platform admins may grant any organization a complimentary plan (no charge) with an expiry date.
- On cancellation, the organization's data is retained for 90 days, then permanently deleted per GDPR/data policy.
- VAT numbers are validated via VIES (EU) or via ZATCA API (Saudi Arabia).
- All billing amounts are stored in the smallest currency unit (halalas / fils / piastres / cents).

---

## 36. Billing Non-Functional Requirements

| Category                | Requirement                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| **Idempotency**         | All payment processing endpoints must be idempotent (retry-safe via idempotency keys)                   |
| **Webhook Reliability** | Gateway webhooks processed with at-least-once delivery; idempotency guards prevent duplicate processing |
| **Auditability**        | Every billing state change recorded with actor, timestamp, and before/after values                      |
| **PCI Compliance**      | No raw card data ever touches platform servers; tokenization at gateway                                 |
| **Currency Precision**  | All monetary amounts stored as BIGINT in smallest unit; conversion handled at presentation layer        |
| **Multi-Currency**      | Invoice displayed in org's billing currency; MRR reports normalized to a base currency (USD)            |
| **Performance**         | Invoice PDF generation < 3 seconds; billing portal page load < 500ms                                    |
| **Concurrency**         | Subscription state changes use database-level row locking to prevent race conditions                    |
