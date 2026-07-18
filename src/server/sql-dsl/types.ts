import { z } from "zod";

export const logicalColumnType = z.enum(["text","long_text","integer","decimal","boolean","date","timestamp","text_array","json","attachment_reference"]);
export type LogicalColumnType = z.infer<typeof logicalColumnType>;

export const columnDefinition = z.object({
  id: z.uuid(), label: z.string().trim().min(1).max(120), type: logicalColumnType,
  required: z.boolean().default(false),
}).strict();
export type ColumnDefinition = z.infer<typeof columnDefinition>;

export const filterOperator = z.enum(["eq","neq","lt","lte","gt","gte","contains","starts_with","is_null"]);
export const filter = z.object({ columnId: z.uuid(), operator: filterOperator, value: z.unknown().optional() }).strict();
export const sort = z.object({ columnId: z.uuid(), direction: z.enum(["asc","desc"]) }).strict();

export const searchInput = z.object({
  tableId: z.uuid(), filters: z.array(filter).max(10).default([]), sort: z.array(sort).max(3).default([]),
  limit: z.number().int().min(1).max(100).default(50), offset: z.number().int().min(0).max(10_000).default(0),
}).strict();

export const createTableInput = z.object({
  displayName: z.string().trim().min(1).max(120), description: z.string().max(1000).default(""),
  columns: z.array(columnDefinition).min(1).max(50),
}).strict();

export const alterOperation = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("add"), column: columnDefinition }).strict(),
  z.object({ kind: z.literal("rename"), columnId: z.uuid(), label: z.string().trim().min(1).max(120) }).strict(),
  z.object({ kind: z.literal("remove"), columnId: z.uuid() }).strict(),
  z.object({ kind: z.literal("change_type"), columnId: z.uuid(), type: logicalColumnType }).strict(),
]);
