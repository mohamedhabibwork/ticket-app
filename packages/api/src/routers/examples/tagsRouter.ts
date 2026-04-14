import { db } from "@ticket-app/db";
import { tags } from "@ticket-app/db/schema";
import { eq, and, desc } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../../index";

export const tagsRouter = publicProcedure.tag("Tags").router({
  list: publicProcedure
    .route({
      method: "GET",
      path: "/tags",
      tags: ["Tags"],
      summary: "List tags",
      description: "Retrieve all tags for an organization",
    })
    .input(
      z.object({
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.tags.findMany({
        where: and(eq(tags.organizationId, input.organizationId)),
        orderBy: [desc(tags.createdAt)],
      });
    }),

  get: publicProcedure
    .route({
      method: "GET",
      path: "/tags/{id}",
      tags: ["Tags"],
      summary: "Get tag by ID",
      description: "Retrieve a single tag by its ID",
    })
    .input(
      z.object({
        organizationId: z.coerce.number(),
        id: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.tags.findFirst({
        where: and(eq(tags.id, input.id), eq(tags.organizationId, input.organizationId)),
      });
    }),

  create: publicProcedure
    .route({
      method: "POST",
      path: "/tags",
      tags: ["Tags"],
      summary: "Create a new tag",
      description: "Create a new tag with a name and optional color",
    })
    .input(
      z.object({
        organizationId: z.coerce.number(),
        name: z.string().min(1).max(100),
        color: z.string().max(7).optional(),
        createdBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [tag] = await db
        .insert(tags)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          color: input.color,
          createdBy: input.createdBy,
        })
        .returning();
      return tag;
    }),

  update: publicProcedure
    .route({
      method: "PATCH",
      path: "/tags/{id}",
      tags: ["Tags"],
      summary: "Update a tag",
      description: "Update an existing tag's name or color",
    })
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        name: z.string().min(1).max(100).optional(),
        color: z.string().max(7).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(tags)
        .set({
          name: input.name,
          color: input.color,
        })
        .where(and(eq(tags.id, input.id), eq(tags.organizationId, input.organizationId)))
        .returning();
      return updated;
    }),

  delete: publicProcedure
    .route({
      method: "DELETE",
      path: "/tags/{id}",
      tags: ["Tags"],
      summary: "Delete a tag",
      description: "Permanently delete a tag",
    })
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .delete(tags)
        .where(and(eq(tags.id, input.id), eq(tags.organizationId, input.organizationId)));
      return { success: true };
    }),
});
