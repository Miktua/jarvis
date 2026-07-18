import type { ColumnDefinition, LogicalColumnType } from "./types";

const typeMap: Record<LogicalColumnType, string> = {
  text: "text", long_text: "text", integer: "bigint", decimal: "numeric", boolean: "boolean",
  date: "date", timestamp: "timestamptz", text_array: "text[]", json: "jsonb", attachment_reference: "uuid",
};

export function quoteIdentifier(identifier: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(identifier)) throw new Error("Untrusted SQL identifier rejected");
  return `"${identifier}"`;
}

export function physicalTableName(id: string): string {
  const compact = id.replaceAll("-", "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(compact)) throw new Error("Invalid internal table id");
  return `t_${compact}`;
}

export function physicalColumnName(id: string): string {
  const compact = id.replaceAll("-", "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(compact)) throw new Error("Invalid internal column id");
  return `c_${compact}`;
}

export function postgresType(type: LogicalColumnType): string { return typeMap[type]; }

export function compileCreateTable(name: string, columns: ColumnDefinition[]): string {
  const definitions = columns.map((column) => `${quoteIdentifier(physicalColumnName(column.id))} ${postgresType(column.type)}${column.required ? " not null" : ""}`);
  return `create table user_data.${quoteIdentifier(name)} (_id uuid primary key default gen_random_uuid(), _created_at timestamptz not null default now(), _updated_at timestamptz not null default now(), _created_by uuid not null, ${definitions.join(", ")})`;
}

export function compileWhere(filters: Array<{ columnId: string; operator: string; value?: unknown }>, allowed: Map<string, ColumnDefinition>) {
  const values: unknown[] = [];
  const clauses = filters.map((item) => {
    if (!allowed.has(item.columnId)) throw new Error("Unknown or unauthorized column");
    const name = quoteIdentifier(physicalColumnName(item.columnId));
    if (item.operator === "is_null") return `${name} is ${item.value === false ? "not " : ""}null`;
    values.push(item.value);
    const p = `$${values.length}`;
    const operators: Record<string,string> = { eq:"=",neq:"<>",lt:"<",lte:"<=",gt:">",gte:">=" };
    if (operators[item.operator]) return `${name} ${operators[item.operator]} ${p}`;
    if (item.operator === "contains") return `${name} ilike '%' || ${p} || '%'`;
    if (item.operator === "starts_with") return `${name} ilike ${p} || '%'`;
    throw new Error("Unsupported filter operator");
  });
  return { sql: clauses.length ? ` where ${clauses.join(" and ")}` : "", values };
}
