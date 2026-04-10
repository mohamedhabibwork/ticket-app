export const SYSTEM_ROLES = [
  {
    slug: "owner",
    name: "Owner",
    description: "Full access to all organization resources including billing and user management",
    isSystem: true,
  },
  {
    slug: "administrator",
    name: "Administrator",
    description: "Full access to manage organization settings, users, and all support operations",
    isSystem: true,
  },
  {
    slug: "supervisor",
    name: "Supervisor",
    description:
      "Can manage tickets, agents, and view reports but cannot modify organization settings",
    isSystem: true,
  },
  {
    slug: "agent",
    name: "Agent",
    description: "Can view and respond to tickets assigned to them or their team",
    isSystem: true,
  },
  {
    slug: "readonly",
    name: "Read Only",
    description: "Can view tickets and reports but cannot make any changes",
    isSystem: true,
  },
] as const;

export async function seedRoles() {
  console.log("Seeding system roles...");

  for (const role of SYSTEM_ROLES) {
    console.log(`  Seeding role: ${role.slug}...`);
  }

  console.log("Role seeding complete.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedRoles()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
