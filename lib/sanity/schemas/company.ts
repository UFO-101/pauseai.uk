import { defineField, defineType } from "sanity";
import { messagingValidation } from "@/lib/sanity/messagingValidation";

export const company = defineType({
  name: "company",
  title: "Company",
  type: "document",
  fields: [
    defineField({
      name: "name",
      type: "string",
      validation: (r) => [r.required(), ...messagingValidation(r)],
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "name" },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "swatch",
      title: "Swatch (hex)",
      type: "string",
      description: "Tag colour, e.g. #E1F5EE.",
    }),
    defineField({
      name: "blurb",
      type: "text",
      rows: 2,
      validation: messagingValidation,
    }),
  ],
  preview: { select: { title: "name" } },
});
