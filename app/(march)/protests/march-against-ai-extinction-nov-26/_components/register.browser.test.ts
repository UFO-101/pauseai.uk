import { afterEach, describe, expect, it, vi } from "vitest";
import { registerForMarch } from "./register";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("registerForMarch", () => {
  it("posts the form to the march's endpoint and gives back its answer", async () => {
    const fetch = vi.spyOn(window, "fetch").mockResolvedValue(Response.json({ ok: false, reason: "luma-failed" }));
    expect(await registerForMarch({ name: "Testy McTestface" })).toEqual({ ok: false, reason: "luma-failed" });
    expect(fetch).toHaveBeenCalledWith("/api/march/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"name":"Testy McTestface"}',
    });
  });

  it("throws when the server errs, as there's no answer to give", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(new Response("Internal Server Error", { status: 500 }));
    await expect(registerForMarch({})).rejects.toThrow("The march sign-up answered 500");
  });
});
