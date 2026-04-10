import { db } from "@ticket-app/db";
import {
  forms,
  formFields,
  formSubmissions,
  formSubmissionValues,
  tickets,
  ticketMessages,
  contacts,
  lookups,
  type FieldConditionalLogic,
} from "@ticket-app/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { evaluateConditionalLogic, verifyCaptcha, type CaptchaProvider } from "../lib/captcha";

export interface FormSubmissionData {
  formId: number;
  organizationId: number;
  fields: Record<string, string>;
  ipAddress?: string;
  userAgent?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  captchaToken?: string;
}

function getVisibleFields(
  fieldsList: Array<{
    id: number;
    showWhen: FieldConditionalLogic | null;
    hideWhen: FieldConditionalLogic | null;
  }>,
  fieldValues: Record<string, string>,
): Set<number> {
  const visible = new Set<number>();

  for (const field of fieldsList) {
    const showWhen = field.showWhen as FieldConditionalLogic | null;
    const hideWhen = field.hideWhen as FieldConditionalLogic | null;

    const showConditionMet = evaluateConditionalLogic(showWhen, fieldValues);
    const hideConditionMet = evaluateConditionalLogic(hideWhen, fieldValues);

    if (showConditionMet && !hideConditionMet) {
      visible.add(field.id);
    }
  }

  return visible;
}

export async function convertFormToTicket(
  data: FormSubmissionData,
): Promise<{ ticket: any; submission: any }> {
  const form = await db.query.forms.findFirst({
    where: and(
      eq(forms.id, data.formId),
      eq(forms.organizationId, data.organizationId),
      eq(forms.isPublished, true),
      isNull(forms.deletedAt),
    ),
  });

  if (!form) {
    throw new Error("Form not found or not published");
  }

  const formFieldsList = await db.query.formFields.findMany({
    where: and(eq(formFields.formId, data.formId), eq(formFields.isActive, true)),
  });

  const visibleFieldIds = getVisibleFields(
    formFieldsList as Array<{
      id: number;
      showWhen: FieldConditionalLogic | null;
      hideWhen: FieldConditionalLogic | null;
    }>,
    data.fields,
  );
  const visibleFields = formFieldsList.filter((f) => visibleFieldIds.has(f.id));

  for (const field of visibleFields) {
    if (field.isRequired) {
      const value = data.fields[field.id.toString()];
      if (!value || value.trim() === "") {
        throw new Error(`Field "${field.label}" is required`);
      }
    }
  }

  if (form.captchaEnabled && data.captchaToken) {
    const captchaSecret =
      process.env[
        (form as any).captchaProvider === "recaptcha_v3" ? "RECAPTCHA_V3_SECRET" : "HCAPTCHA_SECRET"
      ];
    if (captchaSecret) {
      const result = await verifyCaptcha(
        ((form as any).captchaProvider as CaptchaProvider) || "hcaptcha",
        captchaSecret,
        data.captchaToken,
        data.ipAddress,
      );
      if (!result.success) {
        throw new Error("CAPTCHA verification failed");
      }
    }
  }

  let contactId: number | undefined;

  if (data.email) {
    let contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.email, data.email.toLowerCase()),
        eq(contacts.organizationId, data.organizationId),
        isNull(contacts.deletedAt),
      ),
    });

    if (!contact) {
      const [newContact] = await db
        .insert(contacts)
        .values({
          organizationId: data.organizationId,
          email: data.email.toLowerCase(),
          firstName: data.firstName,
          lastName: data.lastName,
        })
        .returning();
      contact = newContact;
    }

    contactId = contact!.id;
  }

  const [submission] = await db
    .insert(formSubmissions)
    .values({
      formId: data.formId,
      contactId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    })
    .returning();

  const fieldValues = Object.entries(data.fields);
  for (const [fieldId, value] of fieldValues) {
    const field = visibleFields.find((f) => f.id === parseInt(fieldId));
    if (field) {
      await db.insert(formSubmissionValues).values({
        submissionId: submission!.id,
        fieldId: field.id,
        value,
      });
    }
  }

  const subjectField = visibleFields.find(
    (f) => f.fieldType === "subject" || f.label.toLowerCase() === "subject",
  );
  const descriptionField = visibleFields.find(
    (f) => f.fieldType === "description" || f.label.toLowerCase() === "description",
  );

  const subject = subjectField
    ? data.fields[subjectField.id.toString()] || "Web Form Submission"
    : "Web Form Submission";

  let descriptionHtml = descriptionField ? data.fields[descriptionField.id.toString()] : "";

  if (!descriptionHtml) {
    const fieldEntries = Object.entries(data.fields)
      .map(([fieldId, value]) => {
        const field = visibleFields.find((f) => f.id === parseInt(fieldId));
        if (field && field.fieldType !== "subject" && field.fieldType !== "description") {
          return `<p><strong>${field.label}:</strong> ${value}</p>`;
        }
        return null;
      })
      .filter(Boolean);

    descriptionHtml = fieldEntries.join("\n");
  }

  const channelLookup = await db.query.lookups.findFirst({
    where: and(
      eq(lookups.lookupTypeId, sql`(SELECT id FROM lookup_types WHERE name = 'channel')`),
      sql`${lookups.metadata}->>'slug' = 'web'`,
    ),
  });

  const defaultStatusId = (
    await db.query.lookups.findFirst({
      where: and(
        eq(lookups.lookupTypeId, sql`(SELECT id FROM lookup_types WHERE name = 'ticket_status')`),
        eq(lookups.isDefault, true),
      ),
    })
  )?.id;

  const defaultPriorityId = (
    await db.query.lookups.findFirst({
      where: and(
        eq(lookups.lookupTypeId, sql`(SELECT id FROM lookup_types WHERE name = 'ticket_priority')`),
        eq(lookups.isDefault, true),
      ),
    })
  )?.id;

  const year = new Date().getFullYear();
  const prefix = `TKT-${year}-`;
  const countResult = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(tickets)
    .where(
      sql`${tickets.organizationId} = ${data.organizationId} AND ${tickets.referenceNumber} LIKE ${prefix}%`,
    );
  const sequence = (countResult[0]?.count ?? 0) + 1;
  const referenceNumber = `${prefix}${sequence.toString().padStart(6, "0")}`;

  const [ticket] = await db
    .insert(tickets)
    .values({
      organizationId: data.organizationId,
      referenceNumber,
      subject,
      descriptionHtml,
      channelId: channelLookup?.id,
      contactId,
      statusId: defaultStatusId,
      priorityId: defaultPriorityId,
      formSubmissionId: submission!.id,
    })
    .returning();

  await db
    .update(formSubmissions)
    .set({ ticketId: ticket!.id })
    .where(eq(formSubmissions.id, submission!.id));

  await db
    .insert(ticketMessages)
    .values({
      ticketId: ticket!.id,
      authorType: contactId ? "contact" : "system",
      authorContactId: contactId,
      messageType: "form_submission",
      bodyHtml: descriptionHtml,
    })
    .returning();

  return { ticket, submission };
}
