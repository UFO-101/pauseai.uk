import { defineField, defineType } from "sanity";

// Inbound submissions from the public "Submit a story" form. Separate doc type
// from `incident` so editors can triage without publishing anything by accident.
// Approved submissions get reformatted as proper `incident` docs.
export const submission = defineType({
  name: "submission",
  title: "Submission",
  type: "document",
  fields: [
    defineField({
      name: "status",
      type: "string",
      options: {
        list: [
          { title: "New", value: "new" },
          { title: "Reviewing", value: "reviewing" },
          { title: "Accepted", value: "accepted" },
          { title: "Rejected", value: "rejected" },
        ],
        layout: "radio",
      },
      initialValue: "new",
    }),
    defineField({ name: "receivedAt", title: "Received at", type: "datetime", readOnly: true }),
    defineField({
      name: "title",
      title: "Story title",
      type: "string",
      validation: (r) => r.required().max(200),
    }),
    defineField({ name: "date", title: "Incident date", type: "date" }),
    defineField({
      name: "summary",
      type: "text",
      rows: 4,
      validation: (r) => r.required().max(2000),
    }),
    defineField({
      name: "companyMentioned",
      title: "Company / lab",
      type: "string",
      validation: (r) => r.required().max(200),
    }),
    defineField({
      name: "categoryMentioned",
      title: "Type of incident",
      type: "string",
      description: "Free text from the submitter.",
    }),
    defineField({
      name: "sourceUrl",
      title: "Primary source URL",
      type: "url",
      validation: (r) => r.required().uri({ scheme: ["https", "http"] }),
    }),
    defineField({ name: "sourceTitle", title: "Source headline", type: "string" }),
    defineField({ name: "pullQuoteText", title: "Pull quote", type: "text", rows: 2 }),
    defineField({ name: "pullQuoteAttribution", title: "Quoted by", type: "string" }),
    defineField({
      name: "submitterName",
      title: "Submitter name",
      type: "string",
      validation: (r) => r.required().max(200),
    }),
    defineField({
      name: "submitterEmail",
      title: "Submitter email",
      type: "string",
      validation: (r) => r.required().email(),
    }),
    defineField({ name: "submitterContext", title: "Anything else?", type: "text", rows: 3 }),
  ],
  orderings: [
    { title: "Most recent", name: "receivedDesc", by: [{ field: "receivedAt", direction: "desc" }] },
  ],
  preview: {
    select: { title: "title", submitter: "submitterName", status: "status" },
    prepare: ({ title, submitter, status }) => ({
      title: title || "(untitled)",
      subtitle: `${status ?? "new"} · ${submitter ?? "anonymous"}`,
    }),
  },
});
