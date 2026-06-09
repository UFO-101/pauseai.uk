// Server-only Sanity client with write access. Used by /api/submit. Do not
// import from client code — SANITY_WRITE_TOKEN must stay on the server.
import { createClient } from "@sanity/client";
import { apiVersion, dataset, projectId } from "@/lib/sanity/env";

export const sanityWriteClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});
