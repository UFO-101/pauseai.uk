// MSW server for the "node" Vitest project (started in vitest.setup.node.ts).
// Every outside request gets its fixture from outside-services.ts; anything
// else fails the test, so no test can reach a real API by accident.
import { http } from "msw";
import { setupServer } from "msw/node";
import { fixtureResponse } from "./outside-services";

export const server = setupServer(
  http.all("*", ({ request }) => fixtureResponse(request.url)),
);
