export interface MergeTagContext {
  ticket?: {
    referenceNumber?: string;
    subject?: string;
    status?: string;
    priority?: string;
    channel?: string;
  };
  contact?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
  };
  agent?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    displayName?: string;
  };
  organization?: {
    name?: string;
  };
  customFields?: Record<string, string | number | boolean>;
}

const MERGE_TAG_REGEX = /\{\{(\w+)(?:\.([^}]+))?\}\}/g;

export function applyMergeTags(
  content: string,
  context: MergeTagContext
): string {
  return content.replace(MERGE_TAG_REGEX, (match, category, field) => {
    if (category === "ticket" && context.ticket && field) {
      return String(context.ticket[field as keyof typeof context.ticket] ?? match);
    }
    if (category === "contact" && context.contact && field) {
      return String(context.contact[field as keyof typeof context.contact] ?? match);
    }
    if (category === "agent" && context.agent && field) {
      return String(context.agent[field as keyof typeof context.agent] ?? match);
    }
    if (category === "organization" && context.organization && field) {
      return String(context.organization[field as keyof typeof context.organization] ?? match);
    }
    if (category === "custom" && context.customFields && field) {
      return String(context.customFields[field] ?? match);
    }
    if (category === "ticket" && context.ticket && !field) {
      return JSON.stringify(context.ticket);
    }
    if (category === "contact" && context.contact && !field) {
      return JSON.stringify(context.contact);
    }
    return match;
  });
}

export function listMergeTags(): Array<{
  tag: string;
  category: string;
  field?: string;
  description: string;
}> {
  return [
    { tag: "{{ticket.referenceNumber}}", category: "ticket", field: "referenceNumber", description: "Ticket reference number" },
    { tag: "{{ticket.subject}}", category: "ticket", field: "subject", description: "Ticket subject" },
    { tag: "{{ticket.status}}", category: "ticket", field: "status", description: "Ticket status" },
    { tag: "{{ticket.priority}}", category: "ticket", field: "priority", description: "Ticket priority" },
    { tag: "{{ticket.channel}}", category: "ticket", field: "channel", description: "Ticket channel" },
    { tag: "{{contact.firstName}}", category: "contact", field: "firstName", description: "Contact first name" },
    { tag: "{{contact.lastName}}", category: "contact", field: "lastName", description: "Contact last name" },
    { tag: "{{contact.email}}", category: "contact", field: "email", description: "Contact email" },
    { tag: "{{contact.phone}}", category: "contact", field: "phone", description: "Contact phone" },
    { tag: "{{contact.company}}", category: "contact", field: "company", description: "Contact company" },
    { tag: "{{agent.firstName}}", category: "agent", field: "firstName", description: "Agent first name" },
    { tag: "{{agent.lastName}}", category: "agent", field: "lastName", description: "Agent last name" },
    { tag: "{{agent.email}}", category: "agent", field: "email", description: "Agent email" },
    { tag: "{{agent.displayName}}", category: "agent", field: "displayName", description: "Agent display name" },
    { tag: "{{organization.name}}", category: "organization", field: "name", description: "Organization name" },
  ];
}