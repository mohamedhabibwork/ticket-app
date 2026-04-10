export const SYSTEM_PERMISSIONS = [
  // Ticket permissions
  { key: "tickets.view", label: "View Tickets", group: "Tickets" },
  { key: "tickets.create", label: "Create Tickets", group: "Tickets" },
  { key: "tickets.edit", label: "Edit Tickets", group: "Tickets" },
  { key: "tickets.delete", label: "Delete Tickets", group: "Tickets" },
  { key: "tickets.assign", label: "Assign Tickets", group: "Tickets" },
  { key: "tickets.merge", label: "Merge Tickets", group: "Tickets" },
  { key: "tickets.export", label: "Export Tickets", group: "Tickets" },

  // Contact permissions
  { key: "contacts.view", label: "View Contacts", group: "Contacts" },
  { key: "contacts.create", label: "Create Contacts", group: "Contacts" },
  { key: "contacts.edit", label: "Edit Contacts", group: "Contacts" },
  { key: "contacts.delete", label: "Delete Contacts", group: "Contacts" },
  { key: "contacts.import", label: "Import Contacts", group: "Contacts" },
  { key: "contacts.export", label: "Export Contacts", group: "Contacts" },

  // User management permissions
  { key: "users.view", label: "View Users", group: "Users" },
  { key: "users.create", label: "Create Users", group: "Users" },
  { key: "users.edit", label: "Edit Users", group: "Users" },
  { key: "users.delete", label: "Delete Users", group: "Users" },
  { key: "users.manage_roles", label: "Manage User Roles", group: "Users" },

  // Team permissions
  { key: "teams.view", label: "View Teams", group: "Teams" },
  { key: "teams.create", label: "Create Teams", group: "Teams" },
  { key: "teams.edit", label: "Edit Teams", group: "Teams" },
  { key: "teams.delete", label: "Delete Teams", group: "Teams" },

  // Organization permissions
  { key: "organization.view", label: "View Organization Settings", group: "Organization" },
  { key: "organization.edit", label: "Edit Organization Settings", group: "Organization" },
  { key: "organization.branding", label: "Manage Branding", group: "Organization" },
  { key: "organization.billing", label: "Manage Billing", group: "Organization" },

  // Mailbox permissions
  { key: "mailboxes.view", label: "View Mailboxes", group: "Mailboxes" },
  { key: "mailboxes.create", label: "Create Mailboxes", group: "Mailboxes" },
  { key: "mailboxes.edit", label: "Edit Mailboxes", group: "Mailboxes" },
  { key: "mailboxes.delete", label: "Delete Mailboxes", group: "Mailboxes" },
  { key: "mailboxes.configure", label: "Configure Mailbox Settings", group: "Mailboxes" },

  // Automation permissions
  { key: "workflows.view", label: "View Workflows", group: "Automation" },
  { key: "workflows.create", label: "Create Workflows", group: "Automation" },
  { key: "workflows.edit", label: "Edit Workflows", group: "Automation" },
  { key: "workflows.delete", label: "Delete Workflows", group: "Automation" },
  { key: "workflows.execute", label: "Execute Workflows", group: "Automation" },

  // SLA permissions
  { key: "sla.view", label: "View SLA Policies", group: "SLA" },
  { key: "sla.create", label: "Create SLA Policies", group: "SLA" },
  { key: "sla.edit", label: "Edit SLA Policies", group: "SLA" },
  { key: "sla.delete", label: "Delete SLA Policies", group: "SLA" },

  // Knowledgebase permissions
  { key: "kb.view", label: "View Knowledgebase", group: "Knowledgebase" },
  { key: "kb.create", label: "Create Articles", group: "Knowledgebase" },
  { key: "kb.edit", label: "Edit Articles", group: "Knowledgebase" },
  { key: "kb.delete", label: "Delete Articles", group: "Knowledgebase" },
  { key: "kb.publish", label: "Publish Articles", group: "Knowledgebase" },

  // Reports permissions
  { key: "reports.view", label: "View Reports", group: "Reports" },
  { key: "reports.export", label: "Export Reports", group: "Reports" },

  // Chat permissions
  { key: "chat.view", label: "View Chat", group: "Chat" },
  { key: "chat.configure", label: "Configure Chat Widget", group: "Chat" },

  // Social permissions
  { key: "social.view", label: "View Social Accounts", group: "Social" },
  { key: "social.connect", label: "Connect Social Accounts", group: "Social" },
  { key: "social.configure", label: "Configure Social Settings", group: "Social" },

  // eCommerce permissions
  { key: "ecommerce.view", label: "View eCommerce Stores", group: "eCommerce" },
  { key: "ecommerce.connect", label: "Connect eCommerce Stores", group: "eCommerce" },
  { key: "ecommerce.orders", label: "View Orders", group: "eCommerce" },

  // Forms permissions
  { key: "forms.view", label: "View Forms", group: "Forms" },
  { key: "forms.create", label: "Create Forms", group: "Forms" },
  { key: "forms.edit", label: "Edit Forms", group: "Forms" },
  { key: "forms.delete", label: "Delete Forms", group: "Forms" },
  { key: "forms.submissions", label: "View Form Submissions", group: "Forms" },

  // Saved replies permissions
  { key: "saved_replies.view", label: "View Saved Replies", group: "Saved Replies" },
  { key: "saved_replies.create", label: "Create Saved Replies", group: "Saved Replies" },
  { key: "saved_replies.edit", label: "Edit Saved Replies", group: "Saved Replies" },
  { key: "saved_replies.delete", label: "Delete Saved Replies", group: "Saved Replies" },

  // Platform admin permissions
  { key: "platform.admin", label: "Platform Administration", group: "Platform" },

  // Ticket view scope permissions
  { key: "tickets.view_scope.all", label: "View All Tickets", group: "Tickets" },
  { key: "tickets.view_scope.group", label: "View Group Tickets", group: "Tickets" },
  { key: "tickets.view_scope.self", label: "View Own Tickets", group: "Tickets" },

  // Thread permissions
  { key: "threads.lock", label: "Lock Threads", group: "Threads" },
  { key: "threads.unlock", label: "Unlock Threads", group: "Threads" },
  { key: "threads.view_locked", label: "View Locked Threads", group: "Threads" },
  { key: "threads.delete", label: "Delete Threads", group: "Threads" },
  { key: "threads.view_deleted", label: "View Deleted Threads", group: "Threads" },

  // GDPR permissions
  { key: "gdpr.requests.manage", label: "Manage GDPR Requests", group: "GDPR" },

  // Marketplace permissions
  { key: "marketplace.view", label: "View Marketplace", group: "Marketplace" },
  { key: "marketplace.reply", label: "Reply via Marketplace", group: "Marketplace" },

  // Chatbot permissions
  { key: "chatbot.configure", label: "Configure Chatbot", group: "Chatbot" },

  // Translation permissions
  { key: "translation.use", label: "Use Translation", group: "Translation" },

  // Calendar permissions
  { key: "calendar.connect", label: "Connect Calendar", group: "Calendar" },
] as const;

export async function seedPermissions() {
  console.log("Seeding system permissions...");

  for (const permission of SYSTEM_PERMISSIONS) {
    console.log(`  Seeding permission: ${permission.key}...`);
  }

  console.log("Permission seeding complete.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedPermissions()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
