import { db } from "@ticket-app/db";
import {
  contacts,
  contactTags,
  contactViews,
  contactMerges,
  tags,
  tagCategories,
} from "@ticket-app/db/schema";
import { eq, and, ilike, isNull, desc, inArray, or } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";
import { findFuzzyDuplicates, suggestMergeStrategy } from "../services/contactMatching";

const contactViewFiltersSchema = z.object({
  search: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  tags: z.array(z.number()).optional(),
  isBlocked: z.boolean().optional(),
  contactTypeId: z.number().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const fuzzyMatchOptionsSchema = z.object({
  emailWeight: z.number().min(0).max(1).optional(),
  phoneWeight: z.number().min(0).max(1).optional(),
  nameWeight: z.number().min(0).max(1).optional(),
  companyWeight: z.number().min(0).max(1).optional(),
  threshold: z.number().min(0).max(1).optional(),
});

export const contactsRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(contacts.organizationId, input.organizationId),
        isNull(contacts.deletedAt),
      ];

      if (input.search) {
        conditions.push(
          or(
            ilike(contacts.email, `%${input.search}%`),
            ilike(contacts.firstName, `%${input.search}%`),
            ilike(contacts.lastName, `%${input.search}%`),
            ilike(contacts.company, `%${input.search}%`),
          )!,
        );
      }

      return await db.query.contacts.findMany({
        where: and(...conditions),
        orderBy: [desc(contacts.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });
    }),

  get: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.id),
          eq(contacts.organizationId, input.organizationId),
          isNull(contacts.deletedAt),
        ),
      });
    }),

  getByEmail: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        email: z.string().email(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.contacts.findFirst({
        where: and(
          eq(contacts.email, input.email.toLowerCase()),
          eq(contacts.organizationId, input.organizationId),
          isNull(contacts.deletedAt),
        ),
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        company: z.string().optional(),
        contactTypeId: z.number().optional(),
        language: z.string().optional(),
        timezone: z.string().optional(),
        metadata: z.record(z.any()).optional(),
        tagIds: z.array(z.number()).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existingContact = input.email
        ? await db.query.contacts.findFirst({
            where: and(
              eq(contacts.email, input.email.toLowerCase()),
              eq(contacts.organizationId, input.organizationId),
              isNull(contacts.deletedAt),
            ),
          })
        : null;

      if (existingContact) {
        return { duplicate: true, contact: existingContact };
      }

      const [contact] = await db
        .insert(contacts)
        .values({
          organizationId: input.organizationId,
          email: input.email?.toLowerCase(),
          phone: input.phone,
          firstName: input.firstName,
          lastName: input.lastName,
          company: input.company,
          contactTypeId: input.contactTypeId,
          language: input.language,
          timezone: input.timezone,
          metadata: input.metadata,
        })
        .returning();

      if (input.tagIds && input.tagIds.length > 0 && contact) {
        await db.insert(contactTags).values(
          input.tagIds.map((tagId) => ({
            contactId: contact.id,
            tagId,
          })),
        );
      }

      return { duplicate: false, contact };
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        company: z.string().optional(),
        contactTypeId: z.number().optional(),
        language: z.string().optional(),
        timezone: z.string().optional(),
        isBlocked: z.boolean().optional(),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.id),
          eq(contacts.organizationId, input.organizationId),
          isNull(contacts.deletedAt),
        ),
      });

      if (!contact) {
        throw new Error("Contact not found");
      }

      const [updated] = await db
        .update(contacts)
        .set({
          email: input.email?.toLowerCase(),
          phone: input.phone,
          firstName: input.firstName,
          lastName: input.lastName,
          company: input.company,
          contactTypeId: input.contactTypeId,
          language: input.language,
          timezone: input.timezone,
          isBlocked: input.isBlocked,
          metadata: input.metadata,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, input.id))
        .returning();

      return updated;
    }),

  delete: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.id),
          eq(contacts.organizationId, input.organizationId),
          isNull(contacts.deletedAt),
        ),
      });

      if (!contact) {
        throw new Error("Contact not found");
      }

      await db
        .update(contacts)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, input.id));

      return { success: true };
    }),

  updatePushPreferences: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
        pushEnabled: z.boolean(),
        pushOptIn: z.boolean().optional(),
        emailNotifications: z.boolean().optional(),
        ticketUpdates: z.boolean().optional(),
        promotionalMessages: z.boolean().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.id),
          eq(contacts.organizationId, input.organizationId),
          isNull(contacts.deletedAt),
        ),
      });

      if (!contact) {
        throw new Error("Contact not found");
      }

      const currentMetadata = (contact.metadata || {}) as Record<string, unknown>;
      const updatedMetadata = {
        ...currentMetadata,
        pushPreferences: {
          pushEnabled: input.pushEnabled,
          pushOptIn: input.pushOptIn ?? true,
          emailNotifications: input.emailNotifications ?? true,
          ticketUpdates: input.ticketUpdates ?? true,
          promotionalMessages: input.promotionalMessages ?? false,
          updatedAt: new Date().toISOString(),
        },
      };

      const [updated] = await db
        .update(contacts)
        .set({
          metadata: updatedMetadata,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, input.id))
        .returning();

      return updated;
    }),

  getPushPreferences: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.id),
          eq(contacts.organizationId, input.organizationId),
          isNull(contacts.deletedAt),
        ),
      });

      if (!contact) {
        throw new Error("Contact not found");
      }

      const metadata = (contact.metadata || {}) as Record<string, unknown>;
      const pushPreferences = (metadata.pushPreferences || {
        pushEnabled: false,
        pushOptIn: true,
        emailNotifications: true,
        ticketUpdates: true,
        promotionalMessages: false,
      }) as Record<string, unknown>;

      return pushPreferences;
    }),

  findDuplicates: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        company: z.string().optional(),
        fuzzyMatch: z.boolean().default(true),
        options: fuzzyMatchOptionsSchema.optional(),
      }),
    )
    .handler(async ({ input }) => {
      if (input.fuzzyMatch) {
        return await findFuzzyDuplicates(
          input.organizationId,
          {
            email: input.email,
            phone: input.phone,
            firstName: input.firstName,
            lastName: input.lastName,
            company: input.company,
          },
          input.options,
        );
      }

      const conditions = [
        eq(contacts.organizationId, input.organizationId),
        isNull(contacts.deletedAt),
      ];

      if (input.email) {
        conditions.push(eq(contacts.email, input.email.toLowerCase()));
      } else if (input.phone) {
        conditions.push(eq(contacts.phone, input.phone));
      } else {
        return [];
      }

      return await db.query.contacts.findMany({
        where: and(...conditions),
      });
    }),

  getMergeSuggestions: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        sourceId: z.number(),
        targetId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const source = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.sourceId),
          eq(contacts.organizationId, input.organizationId),
          isNull(contacts.deletedAt),
        ),
      });

      const target = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.targetId),
          eq(contacts.organizationId, input.organizationId),
          isNull(contacts.deletedAt),
        ),
      });

      if (!source || !target) {
        throw new Error("Source or target contact not found");
      }

      const strategy = suggestMergeStrategy(source, target);

      return {
        source,
        target,
        suggestedMerge: strategy,
      };
    }),

  merge: publicProcedure
    .input(
      z.object({
        sourceId: z.number(),
        targetId: z.number(),
        organizationId: z.number(),
        mergedBy: z.number().optional(),
        preserveSourceTags: z.boolean().default(true),
      }),
    )
    .handler(async ({ input }) => {
      const source = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.sourceId),
          eq(contacts.organizationId, input.organizationId),
          isNull(contacts.deletedAt),
        ),
      });

      const target = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.targetId),
          eq(contacts.organizationId, input.organizationId),
          isNull(contacts.deletedAt),
        ),
      });

      if (!source || !target) {
        throw new Error("Source or target contact not found");
      }

      const strategy = suggestMergeStrategy(target, source);

      const mergedData = {
        email: strategy.email.value?.toLowerCase(),
        phone: strategy.phone.value,
        firstName: strategy.firstName.value,
        lastName: strategy.lastName.value,
        company: strategy.company.value,
        language: strategy.language.value,
        timezone: strategy.timezone.value,
        metadata: {
          ...((target.metadata || {}) as object),
          ...((source.metadata || {}) as object),
        },
      };

      await db
        .update(contacts)
        .set({
          ...mergedData,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, input.targetId));

      if (input.preserveSourceTags) {
        const sourceTags = await db.query.contactTags.findMany({
          where: eq(contactTags.contactId, input.sourceId),
        });

        for (const tag of sourceTags) {
          await db
            .insert(contactTags)
            .values({
              contactId: input.targetId,
              tagId: tag.tagId,
              createdBy: input.mergedBy,
            })
            .onConflictDoNothing();
        }
      }

      await db.insert(contactMerges).values({
        sourceContactId: input.sourceId,
        targetContactId: input.targetId,
        mergedBy: input.mergedBy,
      });

      await db
        .update(contacts)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, input.sourceId));

      return { success: true, targetId: input.targetId };
    }),

  split: publicProcedure
    .input(
      z.object({
        sourceId: z.number(),
        organizationId: z.number(),
        extractedFields: z
          .object({
            email: z.boolean().optional(),
            phone: z.boolean().optional(),
            firstName: z.boolean().optional(),
            lastName: z.boolean().optional(),
            company: z.boolean().optional(),
          })
          .optional(),
      }),
    )
    .handler(async ({ input }) => {
      const source = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.sourceId),
          eq(contacts.organizationId, input.organizationId),
          isNull(contacts.deletedAt),
        ),
      });

      if (!source) {
        throw new Error("Contact not found");
      }

      const extractedData: Partial<typeof contacts.$inferInsert> = {};
      const remainingData: Partial<typeof contacts.$inferInsert> = {};

      if (input.extractedFields) {
        if (input.extractedFields.email) {
          extractedData.email = source.email;
          remainingData.email = null;
        }
        if (input.extractedFields.phone) {
          extractedData.phone = source.phone;
          remainingData.phone = null;
        }
        if (input.extractedFields.firstName) {
          extractedData.firstName = source.firstName;
          remainingData.firstName = null;
        }
        if (input.extractedFields.lastName) {
          extractedData.lastName = source.lastName;
          remainingData.lastName = null;
        }
        if (input.extractedFields.company) {
          extractedData.company = source.company;
          remainingData.company = null;
        }
      } else {
        extractedData.email = source.email;
        extractedData.phone = source.phone;
        remainingData.email = null;
        remainingData.phone = null;
      }

      const [newContact] = await db
        .insert(contacts)
        .values({
          organizationId: source.organizationId,
          email: extractedData.email?.toLowerCase(),
          phone: extractedData.phone,
          firstName: extractedData.firstName,
          lastName: extractedData.lastName,
          company: extractedData.company,
          contactTypeId: source.contactTypeId,
          language: source.language,
          timezone: source.timezone,
          metadata: { splitFrom: source.id, splitAt: new Date().toISOString() },
        })
        .returning();

      await db
        .update(contacts)
        .set({
          ...remainingData,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, input.sourceId));

      return {
        success: true,
        originalContactId: input.sourceId,
        newContactId: newContact.id,
      };
    }),

  getTags: publicProcedure
    .input(
      z.object({
        contactId: z.number(),
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.contactId),
          eq(contacts.organizationId, input.organizationId),
          isNull(contacts.deletedAt),
        ),
      });

      if (!contact) {
        throw new Error("Contact not found");
      }

      return await db
        .select({
          id: tags.id,
          uuid: tags.uuid,
          name: tags.name,
          color: tags.color,
        })
        .from(tags)
        .innerJoin(contactTags, eq(contactTags.tagId, tags.id))
        .where(eq(contactTags.contactId, input.contactId));
    }),

  addTags: publicProcedure
    .input(
      z.object({
        contactId: z.number(),
        organizationId: z.number(),
        tagIds: z.array(z.number()),
        createdBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.contactId),
          eq(contacts.organizationId, input.organizationId),
          isNull(contacts.deletedAt),
        ),
      });

      if (!contact) {
        throw new Error("Contact not found");
      }

      const results = [];
      for (const tagId of input.tagIds) {
        const [result] = await db
          .insert(contactTags)
          .values({
            contactId: input.contactId,
            tagId,
            createdBy: input.createdBy,
          })
          .onConflictDoNothing()
          .returning();
        if (result) results.push(result);
      }

      return results;
    }),

  removeTag: publicProcedure
    .input(
      z.object({
        contactId: z.number(),
        tagId: z.number(),
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.contactId),
          eq(contacts.organizationId, input.organizationId),
          isNull(contacts.deletedAt),
        ),
      });

      if (!contact) {
        throw new Error("Contact not found");
      }

      await db
        .delete(contactTags)
        .where(and(eq(contactTags.contactId, input.contactId), eq(contactTags.tagId, input.tagId)));

      return { success: true };
    }),

  replaceTags: publicProcedure
    .input(
      z.object({
        contactId: z.number(),
        organizationId: z.number(),
        tagIds: z.array(z.number()),
        createdBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.contactId),
          eq(contacts.organizationId, input.organizationId),
          isNull(contacts.deletedAt),
        ),
      });

      if (!contact) {
        throw new Error("Contact not found");
      }

      await db.delete(contactTags).where(eq(contactTags.contactId, input.contactId));

      if (input.tagIds.length > 0) {
        await db.insert(contactTags).values(
          input.tagIds.map((tagId) => ({
            contactId: input.contactId,
            tagId,
            createdBy: input.createdBy,
          })),
        );
      }

      return { success: true };
    }),

  listTagCategories: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.tagCategories.findMany({
        where: eq(tagCategories.organizationId, input.organizationId),
        orderBy: [desc(tagCategories.createdAt)],
      });
    }),

  createTagCategory: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        name: z.string().min(1).max(100),
        nameAr: z.string().max(100).optional(),
        color: z.string().max(7).optional(),
        orderBy: z.number().optional(),
        createdBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [category] = await db
        .insert(tagCategories)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          nameAr: input.nameAr,
          color: input.color,
          orderBy: input.orderBy,
          createdBy: input.createdBy,
        })
        .returning();
      return category;
    }),

  updateTagCategory: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        nameAr: z.string().max(100).optional(),
        color: z.string().max(7).optional(),
        orderBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(tagCategories)
        .set({
          name: input.name,
          nameAr: input.nameAr,
          color: input.color,
          orderBy: input.orderBy,
          updatedAt: new Date(),
        })
        .where(eq(tagCategories.id, input.id))
        .returning();
      return updated;
    }),

  deleteTagCategory: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      await db.delete(tagCategories).where(eq(tagCategories.id, input.id));
      return { success: true };
    }),

  listViews: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        userId: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [eq(contactViews.organizationId, input.organizationId)];
      if (input.userId) {
        conditions.push(eq(contactViews.userId, input.userId));
      }
      return await db.query.contactViews.findMany({
        where: and(...conditions),
        orderBy: [desc(contactViews.createdAt)],
      });
    }),

  getView: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const [view] = await db.select().from(contactViews).where(eq(contactViews.id, input.id));
      return view ?? null;
    }),

  createView: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        userId: z.number().optional(),
        name: z.string().min(1).max(150),
        filters: contactViewFiltersSchema,
        sortBy: z.string().max(50).default("created_at"),
        sortDir: z.enum(["asc", "desc"]).default("desc"),
        isDefault: z.boolean().default(false),
        createdBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      if (input.isDefault) {
        await db
          .update(contactViews)
          .set({ isDefault: false })
          .where(eq(contactViews.organizationId, input.organizationId));
      }

      const [view] = await db
        .insert(contactViews)
        .values({
          organizationId: input.organizationId,
          userId: input.userId,
          name: input.name,
          filters: input.filters,
          sortBy: input.sortBy,
          sortDir: input.sortDir,
          isDefault: input.isDefault,
          createdBy: input.createdBy,
        })
        .returning();
      return view;
    }),

  updateView: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(150).optional(),
        filters: contactViewFiltersSchema.optional(),
        sortBy: z.string().max(50).optional(),
        sortDir: z.enum(["asc", "desc"]).optional(),
        isDefault: z.boolean().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [view] = await db.select().from(contactViews).where(eq(contactViews.id, input.id));

      if (input.isDefault && view) {
        await db
          .update(contactViews)
          .set({ isDefault: false })
          .where(eq(contactViews.organizationId, view.organizationId));
      }

      const [updated] = await db
        .update(contactViews)
        .set({
          name: input.name,
          filters: input.filters,
          sortBy: input.sortBy,
          sortDir: input.sortDir,
          isDefault: input.isDefault,
          updatedAt: new Date(),
        })
        .where(eq(contactViews.id, input.id))
        .returning();
      return updated;
    }),

  deleteView: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      await db.delete(contactViews).where(eq(contactViews.id, input.id));
      return { success: true };
    }),

  setDefaultView: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const [view] = await db.select().from(contactViews).where(eq(contactViews.id, input.id));

      if (view) {
        await db
          .update(contactViews)
          .set({ isDefault: false })
          .where(eq(contactViews.organizationId, view.organizationId));
      }

      const [updated] = await db
        .update(contactViews)
        .set({ isDefault: true })
        .where(eq(contactViews.id, input.id))
        .returning();
      return updated;
    }),

  bulkUpdate: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        contactIds: z.array(z.number()).min(1),
        data: z.object({
          isBlocked: z.boolean().optional(),
          contactTypeId: z.number().optional(),
          language: z.string().optional(),
          timezone: z.string().optional(),
          company: z.string().optional(),
        }),
      }),
    )
    .handler(async ({ input }) => {
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.data.isBlocked !== undefined) updateData.isBlocked = input.data.isBlocked;
      if (input.data.contactTypeId !== undefined)
        updateData.contactTypeId = input.data.contactTypeId;
      if (input.data.language !== undefined) updateData.language = input.data.language;
      if (input.data.timezone !== undefined) updateData.timezone = input.data.timezone;
      if (input.data.company !== undefined) updateData.company = input.data.company;

      const result = await db
        .update(contacts)
        .set(updateData)
        .where(
          and(
            eq(contacts.organizationId, input.organizationId),
            inArray(contacts.id, input.contactIds),
            isNull(contacts.deletedAt),
          ),
        )
        .returning();

      return {
        success: true,
        updatedCount: result.length,
      };
    }),

  bulkAddTags: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        contactIds: z.array(z.number()).min(1),
        tagIds: z.array(z.number()).min(1),
        createdBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const validContacts = await db.query.contacts.findMany({
        where: and(
          eq(contacts.organizationId, input.organizationId),
          inArray(contacts.id, input.contactIds),
          isNull(contacts.deletedAt),
        ),
        columns: { id: true },
      });

      const contactIdSet = new Set(validContacts.map((c) => c.id));
      const values: { contactId: number; tagId: number; createdBy?: number }[] = [];

      for (const contactId of contactIdSet) {
        for (const tagId of input.tagIds) {
          values.push({ contactId, tagId, createdBy: input.createdBy });
        }
      }

      await db.insert(contactTags).values(values).onConflictDoNothing();

      return {
        success: true,
        contactsUpdated: contactIdSet.size,
      };
    }),

  bulkRemoveTags: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        contactIds: z.array(z.number()).min(1),
        tagIds: z.array(z.number()).min(1),
      }),
    )
    .handler(async ({ input }) => {
      const validContacts = await db.query.contacts.findMany({
        where: and(
          eq(contacts.organizationId, input.organizationId),
          inArray(contacts.id, input.contactIds),
          isNull(contacts.deletedAt),
        ),
        columns: { id: true },
      });

      const contactIdSet = new Set(validContacts.map((c) => c.id));

      await db
        .delete(contactTags)
        .where(
          and(
            inArray(contactTags.contactId, Array.from(contactIdSet)),
            inArray(contactTags.tagId, input.tagIds),
          ),
        );

      return {
        success: true,
        contactsUpdated: contactIdSet.size,
      };
    }),

  bulkDelete: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        contactIds: z.array(z.number()).min(1),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .update(contacts)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(contacts.organizationId, input.organizationId),
            inArray(contacts.id, input.contactIds),
            isNull(contacts.deletedAt),
          ),
        );

      return {
        success: true,
        deletedCount: input.contactIds.length,
      };
    }),

  bulkMerge: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        sourceContactIds: z.array(z.number()).min(1),
        targetContactId: z.number(),
        preserveSourceTags: z.boolean().default(true),
        mergedBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const target = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.targetContactId),
          eq(contacts.organizationId, input.organizationId),
          isNull(contacts.deletedAt),
        ),
      });

      if (!target) {
        throw new Error("Target contact not found");
      }

      const sources = await db.query.contacts.findMany({
        where: and(
          eq(contacts.organizationId, input.organizationId),
          inArray(contacts.id, input.sourceContactIds),
          isNull(contacts.deletedAt),
        ),
      });

      for (const source of sources) {
        if (source.id === input.targetContactId) continue;

        const strategy = suggestMergeStrategy(target, source);

        const mergedData = {
          email: strategy.email.value?.toLowerCase() || target.email,
          phone: strategy.phone.value || target.phone,
          firstName: strategy.firstName.value || target.firstName,
          lastName: strategy.lastName.value || target.lastName,
          company: strategy.company.value || target.company,
          language: strategy.language.value || target.language,
          timezone: strategy.timezone.value || target.timezone,
          metadata: {
            ...((target.metadata || {}) as object),
            ...((source.metadata || {}) as object),
          },
        };

        await db
          .update(contacts)
          .set({
            ...mergedData,
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, input.targetContactId));

        if (input.preserveSourceTags) {
          const sourceTags = await db.query.contactTags.findMany({
            where: eq(contactTags.contactId, source.id),
          });

          for (const tag of sourceTags) {
            await db
              .insert(contactTags)
              .values({
                contactId: input.targetContactId,
                tagId: tag.tagId,
                createdBy: input.mergedBy,
              })
              .onConflictDoNothing();
          }
        }

        await db.insert(contactMerges).values({
          sourceContactId: source.id,
          targetContactId: input.targetContactId,
          mergedBy: input.mergedBy,
        });

        await db
          .update(contacts)
          .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, source.id));
      }

      return {
        success: true,
        mergedCount: sources.length,
        targetId: input.targetContactId,
      };
    }),

  getMergeHistory: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        contactId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.contactId),
          eq(contacts.organizationId, input.organizationId),
          isNull(contacts.deletedAt),
        ),
      });

      if (!contact) {
        throw new Error("Contact not found");
      }

      const mergedIntoThis = await db
        .select({
          id: contactMerges.id,
          sourceContactId: contactMerges.sourceContactId,
          mergedAt: contactMerges.mergedAt,
          mergedBy: contactMerges.mergedBy,
        })
        .from(contactMerges)
        .where(eq(contactMerges.targetContactId, input.contactId));

      const mergedFromThis = await db
        .select({
          id: contactMerges.id,
          targetContactId: contactMerges.targetContactId,
          mergedAt: contactMerges.mergedAt,
          mergedBy: contactMerges.mergedBy,
        })
        .from(contactMerges)
        .where(eq(contactMerges.sourceContactId, input.contactId));

      return {
        mergedInto: mergedIntoThis,
        mergedFrom: mergedFromThis,
      };
    }),
};
