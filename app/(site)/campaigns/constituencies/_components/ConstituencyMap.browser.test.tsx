import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";
import ConstituencyMap from "./ConstituencyMap";
import { EDINBURGH, exampleRows } from "./ConstituencyMap.examples";

const click = (code: string) =>
  document.querySelector(`[data-code="${code}"]`)!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

/** Answers the postcode lookup with `body`, or fails to reach it. */
function lookup(body: object | "offline") {
  return vi.spyOn(window, "fetch").mockImplementation(async (url, init) => {
    expect(url).toBe("/api/email-your-mp/lookup");
    expect(JSON.parse(String(init!.body))).toEqual({ postcode: "SW1A 1AA" });
    if (body === "offline") throw new TypeError("Failed to fetch");
    return new Response(JSON.stringify(body));
  });
}

afterEach(() => vi.restoreAllMocks());

async function renderMap() {
  const screen = await render(<ConstituencyMap rows={exampleRows} />);
  const find = async () => {
    await screen.getByLabelText(copy.finder.label).fill("SW1A 1AA");
    await screen.getByRole("button", { name: copy.finder.button }).click();
  };
  return { screen, find };
}

describe("ConstituencyMap", () => {
  it("says how far each layer reaches, switching between them", async () => {
    const { screen } = await renderMap();
    await expect.element(screen.getByText(copy.reach.supporters(4, 62))).toBeVisible();
    await expect.element(screen.getByRole("img")).toHaveAccessibleName(copy.mapLabel(copy.layers.supporters));
    await screen.getByRole("radio", { name: copy.layers.frontier }).click();
    await expect.element(screen.getByText(copy.reach.frontier(3, 16))).toBeVisible();
    await screen.getByRole("radio", { name: copy.layers.sobel }).click();
    await expect.element(screen.getByText(copy.reach.sobel(2, 5))).toBeVisible();
    expect(copy.reach.supporters(1, 1)).toContain("1 supporter in");
  });

  it("shows the picked constituency's card, the layer's count and letter first, and clears it", async () => {
    const { screen } = await renderMap();
    await expect.element(screen.getByText(copy.card.prompt)).toBeVisible();
    click(EDINBURGH);
    const card = screen.getByRole("article");
    await expect.element(card.getByRole("heading")).toHaveTextContent("Edinburgh East and Musselburgh");
    await expect.element(card.getByText(copy.card.mp("Edie Burgh MP", "SNP"))).toBeVisible();
    await expect.element(card.getByText(copy.card.yours)).not.toBeInTheDocument();
    expect([...card.element().querySelectorAll("li")].map((li) => li.textContent)).toEqual([
      "1 supporter",
      copy.card.frontier(1),
      copy.card.sobel(1),
    ]);
    expect(card.element().querySelector("a")!.textContent).toBe(copy.actions.sobel.label);

    await screen.getByRole("radio", { name: copy.layers.frontier }).click();
    expect(card.element().querySelector("li")!.textContent).toBe(copy.card.frontier(1));
    expect(card.element().querySelector("a")!.textContent).toBe(copy.actions.frontier.label);

    click("W07000090");
    await expect.element(card.getByText(copy.card.noMp)).toBeVisible();
    await card.getByRole("button", { name: copy.card.close }).click();
    await expect.element(screen.getByText(copy.card.prompt)).toBeVisible();
  });

  it("finds their constituency by postcode, and marks it theirs", async () => {
    lookup({ ok: true, mp: { constituency: "Cities of London and Westminster" } });
    const { screen, find } = await renderMap();
    await find();
    const card = screen.getByRole("article");
    await expect.element(card.getByText(copy.card.yours)).toBeVisible();
    await expect.element(card.getByText(copy.card.supporters(42))).toBeVisible();
    await expect.element(screen.getByRole("button", { name: copy.finder.button })).toBeEnabled();
  });

  it("says why a postcode isn't found on the map", async () => {
    lookup({ ok: true, mp: { constituency: "Testshire" } });
    const { screen, find } = await renderMap();
    await find();
    await expect.element(screen.getByRole("alert")).toHaveTextContent(copy.finder.notOnMap);
    await expect.element(screen.getByLabelText(copy.finder.label)).toHaveAttribute("aria-invalid", "true");

    vi.restoreAllMocks();
    lookup({ ok: false, message: "No such postcode" });
    await find();
    await expect.element(screen.getByRole("alert")).toHaveTextContent("No such postcode");

    vi.restoreAllMocks();
    lookup("offline");
    await find();
    await expect.element(screen.getByRole("alert")).toHaveTextContent(copy.finder.failed);
  });

  it("says it's finding while the lookup's out", async () => {
    let answer: (response: Response) => void = () => {};
    vi.spyOn(window, "fetch").mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    const { screen, find } = await renderMap();
    await find();
    await expect.element(screen.getByRole("button", { name: copy.finder.finding })).toBeDisabled();
    answer(new Response(JSON.stringify({ ok: false, message: "No such postcode" })));
    await expect.element(screen.getByRole("alert")).toHaveTextContent("No such postcode");
  });
});
