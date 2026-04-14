# ORPC Router OpenAPI Pattern Guide

This document describes the pattern for setting up OpenAPI tags, input/output schemas, and route metadata in ORPC routers using Drizzle ORM's factory functions.

## Dependencies

- `drizzle-orm` - Provides `createSchemaFactory` for generating Zod schemas from Drizzle tables
- `zod` v4 - Schema validation
- `@orpc/server` v1.12.2 - RPC server with OpenAPI support

## Pattern Overview

```typescript
import { publicProcedure } from "../index";
import { createSelectSchema, createInsertSchema, createUpdateSchema } from "../schemaFactory";
import { tableName } from "@ticket-app/db/schema";
import * as z from "zod";

// 1. Create schemas from Drizzle tables using factory functions
const EntitySelectSchema = createSelectSchema(entityTable);
const EntityInsertSchema = createInsertSchema(entityTable);
const EntityUpdateSchema = createUpdateSchema(entityTable);

// 2. Wrap router with .tag() and use .router({}) to group all procedures under one tag
export const entityRouter = publicProcedure.tag("EntityName").router({
  // 3. Each procedure uses .route() for OpenAPI metadata
  list: publicProcedure
    .route({
      method: "GET",
      path: "/entities",
      tags: ["EntityName"],
      summary: "List entities",
      description: "Retrieve a paginated list of entities",
    })
    .input(
      z.object({
        organizationId: z.coerce.number(),
        limit: z.coerce.number().min(1).max(100).default(50),
        offset: z.coerce.number().min(0).default(0),
      }),
    )
    .handler(async ({ input }) => {
      // Handler implementation
      return [];
    }),

  get: publicProcedure
    .route({
      method: "GET",
      path: "/entities/{id}",
      tags: ["EntityName"],
      summary: "Get entity by ID",
      description: "Retrieve a single entity by its ID",
    })
    .input(
      z.object({
        organizationId: z.coerce.number(),
        id: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      // Handler implementation
      return null;
    }),

  create: publicProcedure
    .route({
      method: "POST",
      path: "/entities",
      tags: ["EntityName"],
      summary: "Create a new entity",
      description: "Create a new entity with the specified data",
    })
    .input(
      z.object({
        organizationId: z.coerce.number(),
        name: z.string().min(1).max(100),
        // ... other fields
      }),
    )
    .handler(async ({ input }) => {
      // Handler implementation
      return null;
    }),

  update: publicProcedure
    .route({
      method: "PATCH",
      path: "/entities/{id}",
      tags: ["EntityName"],
      summary: "Update an entity",
      description: "Update an existing entity's information",
    })
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        name: z.string().min(1).max(100).optional(),
        // ... other fields (all optional for PATCH)
      }),
    )
    .handler(async ({ input }) => {
      // Handler implementation
      return null;
    }),

  delete: publicProcedure
    .route({
      method: "DELETE",
      path: "/entities/{id}",
      tags: ["EntityName"],
      summary: "Delete an entity",
      description: "Soft delete an entity",
    })
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      // Handler implementation
      return { success: true };
    }),
});
```

## Key Concepts

### 1. Schema Factory (`packages/api/src/schemaFactory.ts`)

```typescript
import { createSchemaFactory } from "drizzle-orm/zod";
import { z } from "zod/v4";

export const { createSelectSchema, createInsertSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z,
  coerce: {
    date: true,
  },
});
```

This factory creates three schema generators:

- `createSelectSchema(table)` - Schema for querying/selecting (matches table columns)
- `createInsertSchema(table)` - Schema for inserting (required fields, generated fields omitted)
- `createUpdateSchema(table)` - Schema for updating (all fields optional except where needed)

### 2. OpenAPI Route Metadata

Each procedure should have `.route()` with metadata:

```typescript
.route({
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: "/resource" | "/resource/{id}" | "/resource/by-field/{value}",
  tags: ["ResourceName"],  // Should match the .tag() on the router
  summary: "Brief summary",
  description: "Detailed description of what this endpoint does",
})
```

### 3. URL Path Conventions

- `GET /resources` - List all
- `GET /resources/{id}` - Get by ID
- `GET /resources/by-field/{value}` - Get by unique field
- `POST /resources` - Create
- `PATCH /resources/{id}` - Update (partial)
- `PUT /resources/{id}` - Update (full replace)
- `DELETE /resources/{id}` - Delete

### 4. Input Schemas

Use `z.object()` to define input validation. Common patterns:

```typescript
// List input with filters
z.object({
  organizationId: z.coerce.number(),
  search: z.string().optional(),
  statusId: z.coerce.number().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// Create input (required fields)
z.object({
  organizationId: z.coerce.number(),
  name: z.string().min(1).max(100),
  email: z.email().optional(),
});

// Update input (all fields optional)
z.object({
  id: z.coerce.number(),
  organizationId: z.coerce.number(),
  name: z.string().min(1).max(100).optional(),
  email: z.email().optional(),
});

// ID-only input
z.object({
  id: z.coerce.number(),
  organizationId: z.coerce.number(),
});
```

### 5. Output Schemas

Output is inferred from the handler return type. For OpenAPI documentation, you can optionally specify:

```typescript
.output(z.array(EntitySelectSchema))
```

## Migration Steps for Existing Routers

To migrate an existing router to use this pattern:

1. **Add imports** for schema factory
2. **Create schema definitions** using factory functions
3. **Wrap router with `.tag()` and `.router({})`**:

   ```typescript
   // Before:
   export const routerName = { ... }

   // After:
   export const routerName = publicProcedure
     .tag("RouterName")
     .router({ ... })
   ```

4. **Add `.route()` metadata** to each procedure
5. **Ensure proper closing**: Change `};` at the end to `});`

## Example: Simple Router

See `packages/api/src/routers/examples/tagsRouter.ts` for a complete example.
