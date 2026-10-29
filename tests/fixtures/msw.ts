// MSW server for the "node" Vitest project (started in tests/vitest.setup.node.ts).
// Every outside request gets its fixture from outside-services.ts; anything
// else fails the test, so no test can reach a real API by accident.
import { http } from "msw";
import { setupServer } from "msw/node";
import { fixtureResponse } from "./outside-services";

export const server = setupServer(
  http.all("*", async ({ request }) =>
    fixtureResponse(request.url, {
      method: request.method,
      headers: request.headers,
      // A PUT stores bytes (Netlify Blobs); everything else sends text.
      body: request.method === "PUT" ? await request.arrayBuffer() : await request.text(),
    }),
  ),
);
