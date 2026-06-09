import { defineField, defineType } from "sanity";
import { messagingValidation } from "@/lib/sanity/messagingValidation";

export const category = defineType({
  name: "category",
  title: "Category",
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
      name: "description",
      type: "text",
      rows: 2,
      validation: messagingValidation,
    }),
  ],
  preview: { select: { title: "name" } },
});
