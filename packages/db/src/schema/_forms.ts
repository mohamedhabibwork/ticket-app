import {
  pgTable,
  bigint,
  boolean,
  integer,
  jsonb,
  text,
  timestamp,
  uuid,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { contacts } from "./_contacts";
import { organizations } from "./_organizations";
import { tickets } from "./_tickets";
import { users } from "./_users";

export const forms = pgTable(
  "forms",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    description: text("description"),
    isPublished: boolean("is_published").default(false).notNull(),
    submitButtonText: varchar("submit_button_text", { length: 100 }).default("Submit").notNull(),
    successMessage: text("success_message"),
    redirectUrl: varchar("redirect_url", { length: 500 }),
    captchaEnabled: boolean("captcha_enabled").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgIdx: index("forms_org_idx").on(table.organizationId),
  }),
);

export type FieldConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "is_empty"
  | "is_not_empty";
export type FieldConditionLogic = "AND" | "OR";

export interface FieldCondition {
  field: string;
  operator: FieldConditionOperator;
  value?: string;
}

export interface FieldConditionalLogic {
  operator: FieldConditionLogic;
  conditions: FieldCondition[];
}

export const formFields = pgTable(
  "form_fields",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    formId: bigint("form_id", { mode: "number" })
      .references(() => forms.id)
      .notNull(),
    fieldType: varchar("field_type", { length: 50 }).notNull(),
    label: varchar("label", { length: 150 }).notNull(),
    placeholder: varchar("placeholder", { length: 255 }),
    helpText: text("help_text"),
    options: jsonb("options"),
    isRequired: boolean("is_required").default(false).notNull(),
    orderBy: integer("order_by").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    showWhen: jsonb("show_when"),
    hideWhen: jsonb("hide_when"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    formIdx: index("form_fields_form_idx").on(table.formId),
  }),
);

export const formSubmissions = pgTable(
  "form_submissions",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    formId: bigint("form_id", { mode: "number" })
      .references(() => forms.id)
      .notNull(),
    contactId: bigint("contact_id", { mode: "number" }).references((): any => contacts.id),
    ticketId: bigint("ticket_id", { mode: "number" }).references((): any => tickets.id),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    formIdx: index("form_submissions_form_idx").on(table.formId),
  }),
);

export const formSubmissionValues = pgTable(
  "form_submission_values",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    submissionId: bigint("submission_id", { mode: "number" })
      .references(() => formSubmissions.id)
      .notNull(),
    fieldId: bigint("field_id", { mode: "number" })
      .references(() => formFields.id)
      .notNull(),
    value: text("value"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    submissionIdx: index("form_submission_values_submission_idx").on(table.submissionId),
  }),
);

export const formsRelations = relations(forms, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [forms.organizationId],
    references: [organizations.id],
  }),
  fields: many(formFields),
  submissions: many(formSubmissions),
}));

export const formFieldsRelations = relations(formFields, ({ one }) => ({
  form: one(forms, {
    fields: [formFields.formId],
    references: [forms.id],
  }),
}));

export const formSubmissionsRelations = relations(formSubmissions, ({ one }) => ({
  form: one(forms, {
    fields: [formSubmissions.formId],
    references: [forms.id],
  }),
  contact: one(contacts, {
    fields: [formSubmissions.contactId],
    references: [contacts.id],
  }),
  ticket: one(tickets, {
    fields: [formSubmissions.ticketId],
    references: [tickets.id],
  }),
}));

export const formSubmissionValuesRelations = relations(formSubmissionValues, ({ one }) => ({
  submission: one(formSubmissions, {
    fields: [formSubmissionValues.submissionId],
    references: [formSubmissions.id],
  }),
  field: one(formFields, {
    fields: [formSubmissionValues.fieldId],
    references: [formFields.id],
  }),
}));
