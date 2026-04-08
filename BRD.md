# Business Requirements Document (BRD)
## Unified Customer Support & Ticket Management Platform

| Field | Value |
|---|---|
| **Document Version** | 1.0.0 |
| **Status** | Draft |
| **Prepared By** | Mohamed Habib |
| **Date** | 2026-04-08 |
| **Classification** | Confidential |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Context & Objectives](#2-business-context--objectives)
3. [Stakeholders](#3-stakeholders)
4. [Scope](#4-scope)
5. [Functional Requirements](#5-functional-requirements)
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
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Integration Requirements](#7-integration-requirements)
8. [Business Rules](#8-business-rules)
9. [Assumptions & Constraints](#9-assumptions--constraints)
10. [Glossary](#10-glossary)

---

## 1. Executive Summary

This document defines the business requirements for a **Unified Customer Support & Ticket Management Platform** — a multi-tenant, white-label SaaS product that consolidates customer communication from email, live chat, social media, web forms, and eCommerce channels into a single support workspace.

The platform is designed to serve businesses of all sizes that need to manage high volumes of inbound customer requests with structured workflows, SLA enforcement, team collaboration, and deep analytics. It competes in the space occupied by Freshdesk, Zendesk, and HelpScout, with a strong emphasis on customization, branding flexibility, and Gulf/MENA market compatibility.

---

## 2. Business Context & Objectives

### 2.1 Problem Statement

Businesses operating across multiple channels (email, social media, eCommerce, web chat) have no unified view of customer issues. Support teams use disconnected tools, causing duplicate tickets, missed SLAs, inconsistent responses, and poor agent utilization.

### 2.2 Business Objectives

- Consolidate all customer communication channels into one platform
- Reduce average ticket resolution time by at least 30%
- Enable SLA enforcement and automated escalation
- Provide white-label customization for reseller and enterprise clients
- Support Arabic/English bilingual interfaces and RTL layouts
- Integrate natively with eCommerce platforms for order-aware support
- Deliver measurable agent performance reporting

### 2.3 Success Metrics

| Metric | Target |
|---|---|
| First Response Time | < 2 hours (configurable per SLA) |
| Ticket Resolution Rate | > 90% within SLA |
| Customer Satisfaction (CSAT) | > 4.0 / 5.0 |
| Agent Utilization | Visible via dashboard |
| System Uptime | 99.9% |

---

## 3. Stakeholders

| Role | Responsibility |
|---|---|
| Platform Owner / Tenant Admin | Manages the entire workspace, billing, and configuration |
| Support Agent | Handles tickets, replies to customers, manages tasks |
| Team Lead / Supervisor | Monitors agents, assigns tickets, reviews performance |
| End Customer | Submits requests via forms, email, chat, or social media |
| System Administrator | Manages security, integrations, and system health |
| eCommerce Manager | Integrates store data for order-aware support |

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

### 4.2 Out of Scope

- Phone call recording or telephony (planned Phase 2)
- Full CRM (contacts only, not full pipeline)
- Payment processing within the platform
- Native mobile apps (web-responsive only at launch)

---

## 5. Functional Requirements

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

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | API response time < 300ms (p95) under normal load |
| **Scalability** | Horizontal scaling; supports 10,000+ concurrent agents per deployment |
| **Availability** | 99.9% SLA; planned maintenance during low-traffic windows with advance notice |
| **Security** | TLS 1.2+ for all traffic; AES-256 data at rest; SOC 2 Type II alignment |
| **Data Retention** | Ticket data retained for minimum 5 years; configurable per tenant |
| **Localization** | Full RTL support for Arabic; all UI strings externalized for i18n |
| **Accessibility** | WCAG 2.1 Level AA for end-customer portal |
| **Backup** | Automated daily database backups; point-in-time recovery to 7 days |
| **Audit** | Full audit trail on all data mutations; tamper-evident logs |
| **File Storage** | Attachments stored in S3-compatible object storage; max file size configurable |

---

## 7. Integration Requirements

| Integration | Type | Purpose |
|---|---|---|
| Gmail / Outlook | OAuth 2.0 | Mailbox connection |
| Facebook Graph API | OAuth 2.0 | Pages, Messenger, Instagram |
| Twitter/X API v2 | OAuth 2.0 | Mentions and DMs |
| WhatsApp Business API | Webhook + REST | Inbound/outbound messaging |
| Shopify Admin API | API Key | eCommerce order data |
| WooCommerce REST API | API Key | eCommerce order data |
| Salla API | OAuth 2.0 | Saudi eCommerce |
| Zid API | OAuth 2.0 | Saudi eCommerce |
| Google reCAPTCHA v3 | Client-side | Form spam prevention |
| hCaptcha | Client-side | Alternative CAPTCHA |
| Stripe / PayTabs | Webhook | Billing (platform SaaS billing) |
| SMTP (generic) | Credentials | Custom mail server |
| Webhook (outbound) | HTTP POST | Workflow action |
| Slack | OAuth 2.0 | Agent notifications |

---

## 8. Business Rules

- A ticket can belong to only one mailbox at a time but can be re-assigned to another mailbox.
- Deleting a contact does not delete their tickets (soft delete + anonymization).
- SLA timers pause when ticket status is "Pending" or "On Hold".
- A ticket may only be merged into a ticket that is not itself a merged ticket (no chain merges).
- Saved replies with team scope are visible to all agents in that team only.
- Workflows execute in order of priority; a workflow may halt subsequent workflows via a "stop processing" action.
- Billings (plans, seats) are managed at organization level, not user level.
- Agent accounts are scoped to one organization. Platform admins have cross-organization access.
- Custom domains require TLS certificate provisioning via Let's Encrypt.
- CSAT surveys expire 7 days after being sent if not responded to.

---

## 9. Assumptions & Constraints

- The platform is built as a multi-tenant SaaS; all tenants share infrastructure but are fully data-isolated.
- Each organization is billed per active agent seat.
- Email deliverability for hosted mailboxes is the responsibility of the platform operator.
- Social media integrations depend on third-party API availability and policies.
- WhatsApp Business API requires a Meta-approved BSP account.
- Arabic/RTL support applies to the end-customer portal and email templates; the agent dashboard is English-first with Arabic available as a locale option.

---

## 10. Glossary

| Term | Definition |
|---|---|
| Tenant / Organization | A customer of the platform operating their own isolated workspace |
| Agent | A support team member responding to tickets |
| Contact | An end customer who submits tickets |
| Mailbox | An email address connected to the platform for inbound/outbound email |
| Ticket | A single customer request tracked through its full lifecycle |
| SLA | Service Level Agreement — time targets for response and resolution |
| CSAT | Customer Satisfaction Score — collected via post-resolution survey |
| Saved Reply | A pre-written reply template inserted by agents |
| Workflow | An automation rule that triggers actions based on ticket events |
| Binaka | The platform's branded embeddable live chat widget |
| Knowledgebase | A self-service article library for end customers |
| Channel | A communication medium (email, chat, social, form) |
| Lookup | A configurable enum value stored in the centralized lookup system |
