# Feature Specification: Unified Customer Support & Ticket Management Platform

**Feature Branch**: `001-support-platform`  
**Created**: 2026-04-08  
**Status**: Draft  
**Input**: Unified Customer Support and Ticket Management Platform per BRD-FINAL.md and ERD-FINAL.md

## Clarifications

### Session 2026-04-08

- Q: Observability requirements (structured logs + metrics + distributed tracing) → A: Full observability with structured logs, metrics, and distributed tracing
- Q: API rate limiting approach → A: Per-key rate limits (1000 req/min standard, 5000 req/min Enterprise)
- Q: Empty state and error UX approach → A: Friendly placeholders with contextual guidance (e.g., "No tickets yet. Create your first ticket...")
- Q: Error recovery behavior for transient failures → A: Automatic retry with exponential backoff (3 attempts), then show error with manual retry button

---



## User Scenarios & Testing *(mandatory)*

### User Story 1 - Multi-Channel Ticket Submission (Priority: P1)

A customer can submit a support request through email, web form, live chat, or social media and receive a unique ticket reference. The request is routed to the appropriate team and the customer receives acknowledgment.

**Why this priority**: This is the core value proposition - unified multi-channel ticket submission. Without this, nothing else matters.

**Independent Test**: A customer submits a ticket via web form and receives a confirmation email with a reference number within 30 seconds.

**Acceptance Scenarios**:

1. **Given** a customer fills out a web form with name, email, and message, **When** they submit, **Then** a ticket is created with a unique reference number (e.g., `#TKT-00045`) and the customer receives an email acknowledgment.

2. **Given** an email is sent to a connected mailbox, **When** it arrives, **Then** a ticket is automatically created and threaded correctly based on the In-Reply-To header.

3. **Given** a ticket is created from any channel (email, form, chat, social), **When** it appears in the agent dashboard, **Then** it displays the correct channel badge and source information.

4. **Given** a new ticket is created, **When** the system evaluates routing rules, **Then** it is assigned to the correct team based on mailbox, sender domain, or keywords.

---

### User Story 2 - Agent Ticket Management (Priority: P1)

Support agents can view, update, and respond to tickets from a unified inbox that consolidates all channels. They can assign tickets, change status, add notes, and maintain a complete timeline of all interactions.

**Why this priority**: Agents are the primary users of the system. Their productivity directly impacts ticket resolution time and customer satisfaction.

**Independent Test**: An agent receives a new ticket, replies to the customer, changes the status to resolved, and the timeline shows all activities in order.

**Acceptance Scenarios**:

1. **Given** an agent is viewing the ticket inbox, **When** they open a ticket, **Then** they see the full conversation history, customer details, and any linked eCommerce order information.

2. **Given** an agent is replying to a ticket, **When** they type their response and send, **Then** the customer receives the email and the ticket timeline shows the agent's reply.

3. **Given** an agent needs to consult a colleague, **When** they add an internal note (private), **Then** the note is visible only to agents and not to the customer.

4. **Given** a ticket requires action from another agent, **When** the agent assigns it to a specific agent or team, **Then** the assigned party receives a notification and the ticket shows the new assignee.

5. **Given** two tickets are about the same issue, **When** an agent merges them, **Then** all messages from both tickets are combined into the master ticket and the merged ticket is linked.

---

### User Story 3 - SLA Enforcement and Escalation (Priority: P2)

The system enforces SLA policies based on ticket priority. When SLAs are at risk of breach, agents are alerted. When breached, escalations are triggered automatically.

**Why this priority**: SLA compliance is a key differentiator for B2B support. Automatic escalation ensures accountability without manual monitoring.

**Independent Test**: A high-priority ticket is created. After the SLA first-response time passes without a reply, the agent sees a visual warning and the ticket is flagged as breached.

**Acceptance Scenarios**:

1. **Given** an SLA policy defines a 2-hour first-response target for high-priority tickets, **When** a high-priority ticket reaches 2 hours without a response, **Then** the ticket displays a breach indicator and the assigned agent is notified.

2. **Given** a ticket is on "Pending" or "On Hold" status, **When** SLA time accumulates, **Then** the SLA timer pauses and resumes when the status changes to active.

3. **Given** a ticket breaches its SLA, **When** the escalation workflow triggers, **Then** the ticket is reassigned or notified to the supervisor as configured in the policy.

---

### User Story 4 - Self-Service Knowledgebase (Priority: P2)

Organizations can publish help articles that customers can search. Articles deflect tickets by enabling self-service. Agents can insert article links when composing replies.

**Why this priority**: Knowledgebases reduce ticket volume by enabling self-service. They also help agents provide consistent, accurate responses.

**Independent Test**: A customer searches the knowledgebase, finds a relevant article, and resolves their question without submitting a ticket.

**Acceptance Scenarios**:

1. **Given** a customer visits the support portal, **When** they search for a topic, **Then** relevant knowledgebase articles are returned with titles and excerpts.

2. **Given** an agent is composing a reply, **When** they search for an article, **Then** they can insert a link to the article directly into their response.

3. **Given** a knowledgebase article exists, **When** a customer rates it as helpful or not helpful, **Then** the feedback is recorded and visible to administrators.

---

### User Story 5 - Billing and Subscription Management (Priority: P1)

Organization owners can view their current plan, upgrade or downgrade, manage seats, and view invoices. The system enforces plan limits and prompts upgrades when limits are reached.

**Why this priority**: Billing is a core revenue mechanism. Organizations must have clear visibility into their subscription status and usage.

**Independent Test**: An organization with 3 agents attempts to add a 4th agent. The system blocks the action and shows an upgrade prompt since the Starter plan limits agents to 3.

**Acceptance Scenarios**:

1. **Given** an organization owner is on the Starter plan with 3 agent seats, **When** they attempt to invite a 4th agent, **Then** the action is blocked and an upgrade prompt appears.

2. **Given** an organization owner views their billing portal, **When** they see their current plan details, **Then** they see seat count, billing cycle, next billing date, and monthly cost.

3. **Given** an organization owner upgrades their plan, **When** the change takes effect, **Then** the new plan limits apply immediately and they are billed a prorated amount for the remainder of the cycle.

4. **Given** an invoice is generated, **When** the organization locale is Arabic, **Then** the invoice PDF displays correctly in Arabic with RTL formatting.

---

### User Story 6 - Workflow Automation (Priority: P2)

 Administrators can create automation rules that trigger actions based on ticket events. For example, when a ticket is created from a specific mailbox with high priority, it is automatically assigned to the urgent team.

**Why this priority**: Automation reduces manual work and ensures consistent handling. It allows small teams to handle high volume efficiently.

**Independent Test**: An admin creates a rule: "When ticket priority is Urgent, assign to the Urgent Team." When an urgent ticket is created, it is automatically assigned without manual intervention.

**Acceptance Scenarios**:

1. **Given** an automation rule is configured, **When** a ticket matches the rule conditions, **Then** the specified actions execute automatically and an execution log entry is created.

2. **Given** two automation rules could both fire for the same ticket, **When** the first rule has "stop processing" enabled, **Then** subsequent rules do not execute.

3. **Given** a workflow creates a circular trigger, **When** the system detects the loop, **Then** the workflow execution stops after one cycle to prevent infinite loops.

---

### User Story 7 - Social Media Integration (Priority: P3)

Organizations can connect their social media accounts (Facebook, Instagram, Twitter, WhatsApp). Messages and mentions arrive as tickets and agents can reply without switching platforms.

**Why this priority**: Social media is an important channel for customer communication, especially for younger demographics. Unified management reduces context switching.

**Independent Test**: A customer sends a Direct Message on Instagram. An agent sees it appear as a ticket in their inbox and replies from the same interface.

**Acceptance Scenarios**:

1. **Given** a Facebook page is connected via OAuth, **When** a customer sends a message, **Then** a ticket is created with the Facebook channel badge and the message content.

2. **Given** an agent replies to a social media ticket, **When** they send the reply, **Then** the response is posted to the original social media platform.

3. **Given** a social account's connection becomes invalid (token expired), **When** the status is checked, **Then** the account shows as disconnected with an error indicator.

---

### User Story 8 - eCommerce Order-Aware Support (Priority: P3)

When a customer submits a ticket, agents can see their order history from connected eCommerce stores directly in the ticket sidebar. Agents can look up orders by email, phone, or order ID.

**Why this priority**: Context-rich support reduces resolution time. Agents don't need to switch between the support platform and eCommerce dashboards.

**Independent Test**: A customer submits a ticket about a recent order. The agent sees the order details (items, status, tracking) in the ticket sidebar and can help without asking the customer for order information.

**Acceptance Scenarios**:

1. **Given** an eCommerce store (Shopify, WooCommerce, Salla, or Zid) is connected, **When** a ticket arrives from a known customer, **Then** the agent sees the customer's recent orders in the sidebar.

2. **Given** an agent is viewing a ticket, **When** they search for an order by ID, email, or phone, **Then** matching orders are displayed with full details.

3. **Given** an organization has a Professional or Enterprise plan, **When** they connect an eCommerce store, **Then** order data syncs every 15 minutes and agents can manually refresh.

---

### Edge Cases

- **Ticket merging**: A ticket may only be merged into a ticket that is not itself a merged ticket (no chain merges). All merged history must be preserved.
- **Duplicate detection**: If a contact submits a ticket within a configurable time window on the same topic, the system alerts the agent to the potential duplicate.
- **Ticket locking**: When an agent is actively replying, the ticket is soft-locked to prevent concurrent edits by another agent.
- **Spam handling**: Tickets flagged as spam are quarantined, not deleted. Administrators can review and restore false positives.
- **Payment failure**: When a payment fails, the subscription enters a grace period. The organization retains full access for 7 days before downgrade to Free plan.
- **Concurrent seat management**: When two administrators attempt to add seats simultaneously, the system uses database locking to prevent over-subscription.
- **Arabic/RTL**: The customer portal supports full RTL layouts. The agent dashboard defaults to LTR with Arabic locale available.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create a unique, auto-incremented ticket ID with a human-readable reference number (e.g., `#TKT-00045`).
- **FR-002**: System MUST accept ticket submissions from email, web forms, live chat, social media, and API.
- **FR-003**: System MUST route tickets to appropriate teams based on configurable rules (mailbox, sender domain, subject keywords).
- **FR-004**: System MUST maintain a complete timeline of all ticket activities (replies, notes, status changes, assignments, merges).
- **FR-005**: System MUST support CC/BCC recipients on tickets who receive notifications on all replies.
- **FR-006**: System MUST enforce SLA policies with configurable first-response and resolution time targets per priority level.
- **FR-007**: System MUST pause SLA timers when ticket status is "Pending" or "On Hold".
- **FR-008**: System MUST display visual breach indicators when SLA targets are exceeded.
- **FR-009**: System MUST support custom ticket fields (text, number, dropdown, date, checkbox, multi-select) configurable per organization.
- **FR-010**: System MUST support saved filtered views (e.g., "My Open Tickets", "Overdue Today") per agent or organization-wide.
- **FR-011**: System MUST support bulk operations (assign, tag, change status, delete) on multiple tickets.
- **FR-012**: System MUST support ticket locking during active reply to prevent concurrent edits.
- **FR-013**: System MUST support ticket merging with full history preservation and linked records.
- **FR-014**: System MUST quarantine spam tickets without deletion, allowing admin review.
- **FR-015**: System MUST send automated CSAT surveys after ticket resolution and collect 1-5 star ratings with optional comments.
- **FR-016**: System MUST support role-based access control with granular permissions (e.g., `tickets.view`, `tickets.delete`, `reports.view`).
- **FR-017**: System MUST support predefined roles (Owner, Administrator, Supervisor, Agent, Readonly) and custom roles.
- **FR-018**: System MUST enforce multi-tenant data isolation via organization_id partitioning at the database query level.
- **FR-019**: System MUST support two-factor authentication (TOTP and email OTP) with admin enforcement capability.
- **FR-020**: System MUST log all sensitive actions (delete, settings change, permission change) with timestamp, actor, IP, and before/after values.
- **FR-021**: System MUST support email mailbox connections via IMAP/SMTP and OAuth (Gmail, Outlook).
- **FR-022**: System MUST support email threading based on In-Reply-To headers to maintain conversation context.
- **FR-023**: System MUST support configurable auto-reply templates per mailbox.
- **FR-024**: System MUST support a drag-and-drop form builder with field types including text, email, phone, number, date, file upload, checkbox, radio, dropdown, rating, and hidden fields.
- **FR-025**: System MUST support conditional logic in forms (show/hide fields based on other field values).
- **FR-026**: System MUST support form embedding via JavaScript snippet and direct URL.
- **FR-027**: System MUST support CAPTCHA (reCAPTCHA v3 or hCaptcha) configurable per form.
- **FR-028**: System MUST support workflow automation rules with trigger events (ticket created, updated, status changed, SLA breached, time elapsed).
- **FR-029**: System MUST support workflow conditions combining AND/OR logic across ticket fields, tags, assignee, channel, and custom fields.
- **FR-030**: System MUST support workflow actions including assign, set priority/status, add/remove tags, send email, send webhook, create task, add note, apply saved reply.
- **FR-031**: System MUST detect and break circular workflow loops after one execution cycle.
- **FR-032**: System MUST support knowledgebase articles organized in two-level category hierarchy.
- **FR-033**: System MUST support multi-language articles with language selection per article version.
- **FR-034**: System MUST support article statuses: Draft, In Review, Published, Archived.
- **FR-035**: System MUST support full-text search across article titles and bodies.
- **FR-036**: System MUST support saved replies organized in folders with merge tags (customer_name, ticket_id, agent_name, organization_name, ticket_url).
- **FR-037**: System MUST scope saved replies to organization-wide, team-specific, or personal (agent-only).
- **FR-038**: System MUST support social media integrations via OAuth (Facebook, Instagram, Twitter/X, WhatsApp Business).
- **FR-039**: System MUST support real-time live chat via WebSocket with typing indicators and file sharing.
- **FR-040**: System MUST auto-convert unresolved chat sessions to tickets upon end.
- **FR-041**: System MUST support pre-chat form collection (name, email) before chat initiation.
- **FR-042**: System MUST support eCommerce integrations (Shopify, WooCommerce, Salla, Zid) with order data displayed in ticket sidebar.
- **FR-043**: System MUST sync eCommerce data every 15 minutes with manual refresh available.
- **FR-044**: System MUST support subscription plans (Free, Starter, Professional, Enterprise) with distinct feature flags and numeric limits.
- **FR-045**: System MUST enforce seat limits by blocking user creation when the limit is reached.
- **FR-046**: System MUST support add-ons (extra seats, storage, mailboxes, social accounts, eCommerce stores) with prorated billing.
- **FR-047**: System MUST generate invoices automatically with sequential numbering (INV-{org_slug}-{year}-{seq}).
- **FR-048**: System MUST support Arabic invoice PDF generation with RTL formatting when organization locale is Arabic.
- **FR-049**: System MUST support VAT calculation per GCC country rates (SA: 15%, AE: 5%, BH: 10%, QA: 0%, KW: 0%, OM: 5%).
- **FR-050**: System MUST support Stripe as primary payment gateway and PayTabs for MENA countries.
- **FR-051**: System MUST store all monetary amounts as BIGINT in smallest currency unit with no floating-point storage.
- **FR-052**: System MUST support dunning with configurable retry schedule (immediate, +3 days, +7 days) and grace period.
- **FR-053**: System MUST support coupon codes with percentage, fixed amount, and free trial extension types.
- **FR-054**: System MUST support trial period (default 14 days) with notifications at 72h, 24h, and 1h before expiry.
- **FR-055**: System MUST support white-label customization including custom domain, logo, colors, and hiding vendor branding.
- **FR-056**: System MUST support dark mode preference per agent for the dashboard interface.
- **FR-057**: System MUST support RTL layouts for Arabic in customer-facing portal and email templates.
- **FR-058**: System MUST log all audit events with actor, timestamp, action, and affected resource.
- **FR-059**: System MUST support API keys with configurable scopes and expiry dates for programmatic access.
- **FR-060**: System MUST support session management with configurable timeout and ability to terminate all active sessions.
- **FR-061**: System MUST emit structured logs for all significant events with timestamp, level, actor, and context.
- **FR-062**: System MUST expose metrics for dashboards (ticket volume, response times, SLA compliance, billing events).
- **FR-063**: System MUST support distributed tracing across services for debugging.
- **FR-064**: System MUST enforce per-key API rate limits (1000 requests/minute standard, 5000 requests/minute for Enterprise).
- **FR-065**: System MUST display friendly placeholders with contextual guidance in empty states (e.g., "No tickets yet. Create your first ticket or connect a mailbox to get started.").
- **FR-066**: System MUST automatically retry failed operations with exponential backoff (3 attempts) before showing error with manual retry option.

### Key Entities *(include if feature involves data)*

- **Ticket**: A customer support request with unique reference, subject, description, status, priority, assignee, team, channel source, and timeline of messages.
- **Contact**: An end customer who submits tickets, identified by email and/or phone, with optional company association.
- **Agent**: A support team member who handles tickets, assigned roles and permissions within an organization.
- **Team**: A group of agents with a shared inbox and auto-assignment configuration.
- **Organization**: A tenant workspace containing users, tickets, settings, and billing configuration.
- **Mailbox**: A connected email account (IMAP/SMTP or OAuth) used for inbound/outbound email handling.
- **Form**: A configurable web form with fields, conditional logic, and ticket mapping rules.
- **Workflow**: An automation rule with trigger event, conditions, and actions.
- **Knowledgebase Article**: A help article with title, body, category, locale, and publication status.
- **Saved Reply**: A templated response with merge tags, organized in folders with scope (org/team/personal).
- **Subscription**: An organization's billing agreement linking them to a plan with seat count and billing cycle.
- **Invoice**: A billing document with line items, taxes, and payment status.
- **Payment Method**: A stored payment instrument (card, MADA, SADAD) tokenized at the gateway.
- **CSAT Survey**: A post-resolution satisfaction request with rating and optional comment.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: First response time averages under 2 hours across all priorities (configurable per SLA policy).
- **SC-002**: Ticket resolution rate exceeds 90% within SLA targets.
- **SC-003**: Customer satisfaction (CSAT) score averages above 4.0 out of 5.0.
- **SC-004**: System maintains 99.9% uptime excluding scheduled maintenance.
- **SC-005**: API response time remains under 300ms at p95 under normal load.
- **SC-006**: Invoice PDF generation completes in under 3 seconds.
- **SC-007**: Trial-to-paid conversion rate exceeds 25%.
- **SC-008**: Monthly churn rate stays below 3%.
- **SC-009**: Support agents can process tickets 30% faster than baseline with workflow automation enabled.
- **SC-010**: Billing portal page loads in under 500ms.
- **SC-011**: Knowledgebase deflection rate (tickets prevented via self-service) reaches measurable percentage within 6 months of launch.
- **SC-012**: Platform operators can diagnose issues via structured logs, metrics dashboards, and distributed traces.

---

## Assumptions

- **Target market**: The platform serves B2B customers in MENA region (Saudi Arabia, UAE, Egypt, Kuwait, Bahrain, Oman, Qatar) and globally.
- **User technical proficiency**: Agents and administrators are expected to have basic technical literacy. End customers (ticket submitters) have varying technical skills.
- **Internet connectivity**: Users have stable internet connectivity for web-based access. Mobile-responsive design is required but native mobile apps are out of scope for v1.
- **Email deliverability**: For hosted mailboxes, email deliverability is the platform operator's responsibility. Custom mailbox deliverability depends on customer's email infrastructure.
- **Payment readiness**: Organizations have valid payment methods and understand subscription-based billing before upgrade.
- **Social media availability**: Social media integrations depend on third-party API availability and policies. WhatsApp Business requires a Meta-approved BSP account.
- **Data retention**: Ticket data is retained for a minimum of 5 years per non-functional requirements. Organization data is retained for 90 days post-cancellation.
- **Scaling trajectory**: Initial launch targets smaller teams (1-25 agents). Architecture must support horizontal scaling to 10,000+ concurrent agents.
- **Existing patterns**: The implementation follows the monorepo structure already established with apps/server (Hono), apps/web (React), and packages/api (ORPC).
- **Database choice**: PostgreSQL 16+ is used as the primary database as specified in the ERD.
- **RTL priority**: Arabic/RTL support is required for customer-facing portal and email templates. Agent dashboard is English-first with Arabic locale option.
- **Observability**: Full observability stack with structured logging, metrics, and distributed tracing is implemented for operational debugging.
