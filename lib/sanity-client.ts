import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId, useCdn } from "@/lib/sanity/env";

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn,
  perspective: "published",
});
