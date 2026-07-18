import { describe,expect,it } from "vitest";
import { compileCreateTable,compileWhere,physicalColumnName,physicalTableName,quoteIdentifier } from "@/server/sql-dsl/compiler";
import type { ColumnDefinition } from "@/server/sql-dsl/types";

const tableId="123e4567-e89b-12d3-a456-426614174000";
const column:ColumnDefinition={id:"123e4567-e89b-12d3-a456-426614174001",label:"Amount; drop schema public --",type:"decimal",required:false};

describe("SQL DSL injection boundaries",()=>{
  it("derives identifiers only from internal UUIDs",()=>{expect(physicalTableName(tableId)).toBe("t_123e4567e89b12d3a456426614174000");expect(physicalColumnName(column.id)).toBe("c_123e4567e89b12d3a456426614174001");expect(()=>quoteIdentifier('x";drop table users;--')).toThrow();});
  it("never places display labels in DDL",()=>{const sql=compileCreateTable(physicalTableName(tableId),[column]);expect(sql).not.toContain(column.label);expect(sql).not.toContain("drop schema");expect(sql).toContain('"c_123e4567e89b12d3a456426614174001" numeric');});
  it("binds hostile values instead of interpolating them",()=>{const attack="'; drop table anything; --";const result=compileWhere([{columnId:column.id,operator:"eq",value:attack}],new Map([[column.id,column]]));expect(result.sql).toContain("= $1");expect(result.sql).not.toContain(attack);expect(result.values).toEqual([attack]);});
  it("rejects unsupported operators and unauthorized columns",()=>{expect(()=>compileWhere([{columnId:column.id,operator:"raw_sql",value:"1=1"}],new Map([[column.id,column]]))).toThrow("Unsupported");expect(()=>compileWhere([{columnId:tableId,operator:"eq",value:1}],new Map([[column.id,column]]))).toThrow("unauthorized");});
});
