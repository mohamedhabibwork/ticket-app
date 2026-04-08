import { db } from "../index";

export const LOOKUP_TYPES = {
  TICKET_STATUS: "ticket_status",
  TICKET_PRIORITY: "ticket_priority",
  TASK_STATUS: "task_status",
  TASK_PRIORITY: "task_priority",
  ARTICLE_STATUS: "article_status",
  CHANNEL_TYPE: "channel_type",
  SOCIAL_PLATFORM: "social_platform",
  ECOMMERCE_PLATFORM: "ecommerce_platform",
  WIDGET_POSITION: "widget_position",
  FORM_FIELD_TYPE: "form_field_type",
  WORKFLOW_TRIGGER: "workflow_trigger",
  WORKFLOW_ACTION_TYPE: "workflow_action_type",
  SLA_BREACH_ACTION: "sla_breach_action",
  CONTACT_TYPE: "contact_type",
  AGENT_ROLE: "agent_role",
} as const;

export const LOOKUP_SEEDS = {
  ticket_status: [
    { name: "open", label: "Open", labelAr: "مفتوح", color: "#3B82F6", orderBy: 1, isDefault: true },
    { name: "pending", label: "Pending", labelAr: "معلق", color: "#F59E0B", orderBy: 2 },
    { name: "on_hold", label: "On Hold", labelAr: "في الانتظار", color: "#6366F1", orderBy: 3 },
    { name: "resolved", label: "Resolved", labelAr: "تم الحل", color: "#10B981", orderBy: 4 },
    { name: "closed", label: "Closed", labelAr: "مغلق", color: "#6B7280", orderBy: 5 },
  ],
  ticket_priority: [
    { name: "low", label: "Low", labelAr: "منخفض", color: "#10B981", orderBy: 1 },
    { name: "normal", label: "Normal", labelAr: "عادي", color: "#3B82F6", orderBy: 2, isDefault: true },
    { name: "high", label: "High", labelAr: "عالي", color: "#F59E0B", orderBy: 3 },
    { name: "urgent", label: "Urgent", labelAr: "عاجل", color: "#EF4444", orderBy: 4 },
    { name: "critical", label: "Critical", labelAr: "حرج", color: "#991B1B", orderBy: 5 },
  ],
  task_status: [
    { name: "todo", label: "To Do", labelAr: "للقيام", color: "#6B7280", orderBy: 1, isDefault: true },
    { name: "in_progress", label: "In Progress", labelAr: "قيد التنفيذ", color: "#3B82F6", orderBy: 2 },
    { name: "done", label: "Done", labelAr: "تم", color: "#10B981", orderBy: 3 },
  ],
  task_priority: [
    { name: "low", label: "Low", labelAr: "منخفض", color: "#10B981", orderBy: 1 },
    { name: "medium", label: "Medium", labelAr: "متوسط", color: "#F59E0B", orderBy: 2, isDefault: true },
    { name: "high", label: "High", labelAr: "عالي", color: "#EF4444", orderBy: 3 },
  ],
  article_status: [
    { name: "draft", label: "Draft", labelAr: "مسودة", color: "#6B7280", orderBy: 1 },
    { name: "published", label: "Published", labelAr: "منشور", color: "#10B981", orderBy: 2, isDefault: true },
    { name: "archived", label: "Archived", labelAr: "مؤرشف", color: "#6B7280", orderBy: 3 },
  ],
  channel_type: [
    { name: "email", label: "Email", labelAr: "البريد الإلكتروني", icon: "mail", orderBy: 1, isDefault: true },
    { name: "web", label: "Web Form", labelAr: "نموذج الويب", icon: "globe", orderBy: 2 },
    { name: "chat", label: "Live Chat", labelAr: "الدردشة المباشرة", icon: "message-circle", orderBy: 3 },
    { name: "api", label: "API", labelAr: "واجهة برمجة", icon: "code", orderBy: 4 },
    { name: "twitter", label: "Twitter/X", labelAr: "تويتر", icon: "twitter", orderBy: 5 },
    { name: "facebook", label: "Facebook", labelAr: "فيسبوك", icon: "facebook", orderBy: 6 },
    { name: "instagram", label: "Instagram", labelAr: "إنستغرام", icon: "instagram", orderBy: 7 },
    { name: "whatsapp", label: "WhatsApp", labelAr: "واتساب", icon: "message-circle", orderBy: 8 },
  ],
  social_platform: [
    { name: "twitter", label: "Twitter/X", orderBy: 1, isDefault: true },
    { name: "facebook", label: "Facebook", orderBy: 2 },
    { name: "instagram", label: "Instagram", orderBy: 3 },
    { name: "whatsapp", label: "WhatsApp", orderBy: 4 },
  ],
  ecommerce_platform: [
    { name: "shopify", label: "Shopify", orderBy: 1, isDefault: true },
    { name: "woocommerce", label: "WooCommerce", orderBy: 2 },
    { name: "salla", label: "Salla", orderBy: 3 },
    { name: "zid", label: "Zid", orderBy: 4 },
  ],
  widget_position: [
    { name: "bottom_right", label: "Bottom Right", orderBy: 1, isDefault: true },
    { name: "bottom_left", label: "Bottom Left", orderBy: 2 },
    { name: "top_right", label: "Top Right", orderBy: 3 },
    { name: "top_left", label: "Top Left", orderBy: 4 },
  ],
  form_field_type: [
    { name: "text", label: "Text", orderBy: 1, isDefault: true },
    { name: "email", label: "Email", orderBy: 2 },
    { name: "number", label: "Number", orderBy: 3 },
    { name: "phone", label: "Phone", orderBy: 4 },
    { name: "textarea", label: "Textarea", orderBy: 5 },
    { name: "select", label: "Dropdown", orderBy: 6 },
    { name: "multiselect", label: "Multi Select", orderBy: 7 },
    { name: "checkbox", label: "Checkbox", orderBy: 8 },
    { name: "radio", label: "Radio", orderBy: 9 },
    { name: "date", label: "Date", orderBy: 10 },
    { name: "file", label: "File Upload", orderBy: 11 },
  ],
  workflow_trigger: [
    { name: "ticket_created", label: "Ticket Created", orderBy: 1, isDefault: true },
    { name: "ticket_updated", label: "Ticket Updated", orderBy: 2 },
    { name: "ticket_assigned", label: "Ticket Assigned", orderBy: 3 },
    { name: "ticket_status_changed", label: "Status Changed", orderBy: 4 },
    { name: "ticket_priority_changed", label: "Priority Changed", orderBy: 5 },
    { name: "sla_breached", label: "SLA Breached", orderBy: 6 },
    { name: "new_contact", label: "New Contact", orderBy: 7 },
    { name: "form_submitted", label: "Form Submitted", orderBy: 8 },
  ],
  workflow_action_type: [
    { name: "assign_agent", label: "Assign Agent", orderBy: 1, isDefault: true },
    { name: "assign_team", label: "Assign Team", orderBy: 2 },
    { name: "set_priority", label: "Set Priority", orderBy: 3 },
    { name: "set_status", label: "Set Status", orderBy: 4 },
    { name: "add_tags", label: "Add Tags", orderBy: 5 },
    { name: "remove_tags", label: "Remove Tags", orderBy: 6 },
    { name: "send_email", label: "Send Email", orderBy: 7 },
    { name: "send_webhook", label: "Send Webhook", orderBy: 8 },
    { name: "create_task", label: "Create Task", orderBy: 9 },
    { name: "add_note", label: "Add Note", orderBy: 10 },
    { name: "apply_saved_reply", label: "Apply Saved Reply", orderBy: 11 },
  ],
  sla_breach_action: [
    { name: "notify_agent", label: "Notify Agent", orderBy: 1, isDefault: true },
    { name: "notify_supervisor", label: "Notify Supervisor", orderBy: 2 },
    { name: "escalate", label: "Escalate", orderBy: 3 },
    { name: "add_tags", label: "Add Tags", orderBy: 4 },
  ],
  contact_type: [
    { name: "customer", label: "Customer", labelAr: "عميل", orderBy: 1, isDefault: true },
    { name: "lead", label: "Lead", labelAr: " lead", orderBy: 2 },
    { name: "vip", label: "VIP", labelAr: "مهم", orderBy: 3 },
    { name: "partner", label: "Partner", labelAr: "شريك", orderBy: 4 },
  ],
  agent_role: [
    { name: "owner", label: "Owner", labelAr: "المالك", orderBy: 1, isDefault: true },
    { name: "administrator", label: "Administrator", labelAr: "مدير", orderBy: 2 },
    { name: "supervisor", label: "Supervisor", labelAr: "مشرف", orderBy: 3 },
    { name: "agent", label: "Agent", labelAr: "وكيل", orderBy: 4 },
    { name: "readonly", label: "Read Only", labelAr: "للقراءة فقط", orderBy: 5 },
  ],
} as const;

export async function seedLookups() {
  console.log("Seeding lookup types and lookups...");

  for (const [typeName, lookups] of Object.entries(LOOKUP_SEEDS)) {
    console.log(`  Seeding ${typeName}...`);
  }

  console.log("Lookup seeding complete.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedLookups()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
