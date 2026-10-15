import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  currentSchema,
  HEADER,
  normaliseSchema,
  PG_DUMP_MAJOR,
  pgDumpMajor,
  SCHEMA_FILE,
} from "@/scripts/db-schema.mjs";
import { describeWithDatabase } from "@/tests/database";

describe("normaliseSchema", () => {
  it("drops what differs between runs and machines, and starts with the header", () => {
    const dump = [
      "--",
      "-- PostgreSQL database dump",
      "--",
      "",
      "\\restrict abc123",
      "",
      "-- Dumped from database version 18.6",
      "-- Dumped by pg_dump version 18.6",
      "",
      "",
      "",
      "CREATE TABLE public.t (id int);",
      "\\unrestrict abc123",
      "",
    ].join("\n");
    expect(normaliseSchema(dump)).toBe(`${HEADER}\nCREATE TABLE public.t (id int);\n`);
  });
});

// Locally, a pg_dump other than 18 would word the schema differently, so the
// check is skipped with this note. CI installs 18, and never skips it.
const rightPgDump = pgDumpMajor() === PG_DUMP_MAJOR;

describeWithDatabase("netlify/database/schema.sql", () => {
  it.skipIf(!rightPgDump && !process.env.CI)(
    `matches the migrations (if this fails, run \`npm run db:schema\` and commit the file; needs pg_dump ${PG_DUMP_MAJOR})`,
    () => {
      expect(currentSchema(), "schema.sql is out of date: run `npm run db:schema` and commit it").toBe(
        readFileSync(SCHEMA_FILE, "utf8"),
      );
    },
  );
});
