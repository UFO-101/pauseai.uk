import { defineField, defineType } from "sanity";
import { messagingValidation } from "@/lib/sanity/messagingValidation";

export const incident = defineType({
  name: "incident",
  title: "Incident",
  type: "document",
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (r) => [r.required().max(140), ...messagingValidation(r)],
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title" },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "date",
      title: "Incident date",
      type: "date",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "summary",
      title: "Summary",
      type: "text",
      rows: 3,
      validation: (r) => [r.required().max(600), ...messagingValidation(r)],
    }),
    defineField({
      name: "body",
      title: "Full write-up",
      type: "array",
      of: [{ type: "block" }],
    }),
    defineField({
      name: "pullQuote",
      title: "Pull quote",
      type: "object",
      fields: [
        defineField({ name: "text", type: "text", rows: 2, validation: messagingValidation }),
        defineField({ name: "attribution", type: "string", validation: messagingValidation }),
        { name: "image", title: "Portrait", type: "image", options: { hotspot: true } },
      ],
    }),
    defineField({
      name: "severity",
      type: "string",
      options: {
        list: [
          { title: "Low", value: "low" },
          { title: "Medium", value: "medium" },
          { title: "High", value: "high" },
        ],
        layout: "radio",
      },
      initialValue: "medium",
    }),
    defineField({
      name: "companies",
      type: "array",
      of: [{ type: "reference", to: [{ type: "company" }] }],
      validation: (r) => r.required().min(1),
    }),
    defineField({
      name: "categories",
      type: "array",
      of: [{ type: "reference", to: [{ type: "category" }] }],
      validation: (r) => r.required().min(1),
    }),
    defineField({
      name: "sources",
      type: "array",
      of: [
        {
          type: "object",
          name: "source",
          fields: [
            { name: "title", type: "string", validation: (r) => r.required() },
            { name: "url", type: "url", validation: (r) => r.required() },
            { name: "publisher", type: "string" },
          ],
          preview: { select: { title: "title", subtitle: "publisher" } },
        },
      ],
      validation: (r) => r.required().min(1),
    }),
    defineField({
      name: "featured",
      title: "Feature on landing",
      type: "boolean",
      initialValue: false,
    }),
  ],
  orderings: [
    { title: "Date, newest first", name: "dateDesc", by: [{ field: "date", direction: "desc" }] },
  ],
  preview: {
    select: { title: "title", subtitle: "date", severity: "severity" },
    prepare: ({ title, subtitle, severity }) => ({
      title,
      subtitle: `${subtitle ?? ""} · ${severity ?? ""}`,
    }),
  },
});
