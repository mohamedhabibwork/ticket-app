import { z } from "zod";

export function createSelectSchema<T extends z.ZodTypeAny>(schema: T) {
  return schema;
}

export function createInsertSchema<T extends z.ZodTypeAny>(schema: T) {
  return schema;
}

export function createUpdateSchema<T extends z.ZodTypeAny>(schema: T) {
  return schema;
}

export const setupSchemaFactory = () => ({
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
});
