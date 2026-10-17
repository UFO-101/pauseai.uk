import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import {
  COUNTRIES,
  DEMOGRAPHICS,
  GLOBAL_N,
  REGIONS,
  SURVEY_META,
  regionLabel,
  slowOrStopPct,
} from "@/lib/content/aiSentiment2026";
import CountryExplorer from "./CountryExplorer";
import DemographicsExplorer from "./DemographicsExplorer";
import DivergingBar, { BarAxisLabels } from "./DivergingBar";
import Dropdown from "./Dropdown";
import GlobalAverageBar from "./GlobalAverageBar";
import HeadlineStats from "./HeadlineStats";
import Methodology from "./Methodology";
import { ReportLede, ReportSection, TheQuestion } from "./Report";
import VerticalDivergingBar from "./VerticalDivergingBar";
import WorldMap from "./WorldMap";

afterEach(() => vi.restoreAllMocks());

const row = {
  stop_permanently_pct: 10,
  pause_until_safe_pct: 20,
  continue_oversight_pct: 30,
  continue_rapidly_pct: 25,
  not_sure_pct: 15,
};
const zeros = {
  stop_permanently_pct: 0,
  pause_until_safe_pct: 0,
  continue_oversight_pct: 0,
  continue_rapidly_pct: 0,
  not_sure_pct: 0,
};
const asCountry = (r: typeof row) => ({ country: "Testland", region: "Europe", n: 1000, moe_pp: 3, ...r });

// The chart parts have nothing a person could name them by, so they carry test ids.
const all = (root: ParentNode, id: string) => [...root.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`)];
const one = (root: ParentNode, id: string) => root.querySelector<HTMLElement>(`[data-testid="${id}"]`);

// Which way the bar's tooltip leans from its segment, read from where it's drawn:
// pinned at its left edge, centred, or pinned at its right edge.
function lean(tooltip: HTMLElement | null) {
  const shift = new DOMMatrix(getComputedStyle(tooltip!).transform).m41;
  const width = tooltip!.getBoundingClientRect().width;
  return Math.abs(shift) < 1
    ? "start"
    : Math.abs(shift + width) < 1
      ? "end"
      : Math.abs(shift + width / 2) < 1
        ? "center"
        : "other";
}

describe("small sections", () => {
  it("shows the headline numbers and how the survey was run", async () => {
    await render(
      <>
        <HeadlineStats />
        <Methodology />
      </>,
    );
    await expect.element(page.getByText(SURVEY_META.respondents.toLocaleString(), { exact: true })).toBeVisible();
    await expect.element(page.getByText("Countries surveyed")).toBeVisible();
  });

  it("shows the global average with its sample size", async () => {
    await render(<GlobalAverageBar />);
    await expect.element(page.getByText(`n=${GLOBAL_N.toLocaleString()}`)).toBeVisible();
  });
});

describe("Report", () => {
  it("lays out the lede, the question and each section, with or without an intro and tint", async () => {
    await render(
      <>
        <ReportLede>The lede</ReportLede>
        <TheQuestion />
        <ReportSection title="Tinted" intro="An intro" muted>
          <p>chart one</p>
        </ReportSection>
        <ReportSection title="Plain">
          <p>chart two</p>
        </ReportSection>
      </>,
    );
    await expect.element(page.getByText("The lede")).toBeVisible();
    await expect.element(page.getByRole("heading", { name: "The question asked" })).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: "Read the full report" }))
      .toHaveAttribute("href", SURVEY_META.reportUrl);
    await expect.element(page.getByText("An intro")).toBeVisible();
    const tinted = page.getByRole("heading", { name: "Tinted" }).element().closest("section")!;
    const plain = page.getByRole("heading", { name: "Plain" }).element().closest("section")!;
    expect(plain.querySelectorAll("p")).toHaveLength(1);
    expect(getComputedStyle(tinted).backgroundColor).not.toBe(getComputedStyle(plain).backgroundColor);
  });
});

describe("VerticalDivergingBar", () => {
  it("stacks each response with a label, and braces the total against", async () => {
    const { container } = await render(<VerticalDivergingBar row={asCountry(row)} meta={<span>meta</span>} />);
    expect(all(container, "vbar-label")).toHaveLength(5);
    expect(one(container, "vbar-brace")?.textContent).toBe("Total against 60%");
    expect(one(container, "vbar-meta")?.textContent).toBe("meta");
    await expect
      .element(page.getByRole("img"))
      .toHaveAttribute("aria-label", expect.stringContaining("Stop permanently 10%"));
  });

  it("copes with a row of zeros, labelling nothing", async () => {
    const { container } = await render(<VerticalDivergingBar row={asCountry(zeros)} />);
    expect(all(container, "vbar-label")).toHaveLength(0);
    expect(one(container, "vbar-brace")).toBeNull();
    expect(one(container, "vbar-meta")).toBeNull();
  });
});

describe("DivergingBar", () => {
  it("labels the row and shows a tooltip for the segment under the pointer", async () => {
    const { container } = await render(
      <div style={{ width: 800 }}>
        <BarAxisLabels />
        <DivergingBar label="Testland" row={asCountry(row)} rank={3} meta={<span>Europe</span>} />
      </div>,
    );
    expect(one(container, "bar-rank")?.textContent).toBe("#3");
    expect(one(container, "bar-meta")?.textContent).toBe("Europe");
    const segments = all(container, "bar-segment");
    expect(segments).toHaveLength(5);
    segments[0].dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    await expect.poll(() => one(container, "bar-tooltip")?.textContent).toBe("Stop permanently: 10%");
    segments[4].click();
    await expect.poll(() => one(container, "bar-tooltip")?.textContent).toBe("As quickly as possible: 25%");
    // Leaving the bar closes it.
    one(container, "bar-track")!.dispatchEvent(
      new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }),
    );
    await expect.poll(() => one(container, "bar-tooltip")).toBeNull();
  });

  it("keeps the tooltip inside the bar at either end", async () => {
    const { container } = await render(
      <div style={{ width: 800 }}>
        <DivergingBar label="Edges" row={asCountry({ ...row, stop_permanently_pct: 1, continue_rapidly_pct: 1 })} />
      </div>,
    );
    const segments = all(container, "bar-segment");
    const wrap = one(container, "bar-track")!;
    const at = (left: number) =>
      vi
        .spyOn(segments[0], "getBoundingClientRect")
        .mockReturnValue(new DOMRect(wrap.getBoundingClientRect().left + left, 0, 2, 10));
    at(0);
    segments[0].click();
    await expect.poll(() => lean(one(container, "bar-tooltip"))).toBe("start");
    at(wrap.getBoundingClientRect().width - 2);
    segments[0].click();
    await expect.poll(() => lean(one(container, "bar-tooltip"))).toBe("end");
    at(wrap.getBoundingClientRect().width / 2);
    segments[0].click();
    await expect.poll(() => lean(one(container, "bar-tooltip"))).toBe("center");
  });

  it("closes the tooltip on a tap elsewhere, but not a tap on the bar", async () => {
    const { container } = await render(
      <>
        <p data-testid="outside">elsewhere</p>
        <DivergingBar label="Tap" row={asCountry(row)} showNotSure={false} />
      </>,
    );
    const segments = all(container, "bar-segment");
    // Without "not sure" there are four segments.
    expect(segments).toHaveLength(4);
    segments[0].click();
    await expect.poll(() => one(container, "bar-tooltip")).not.toBeNull();
    segments[1].dispatchEvent(new TouchEvent("touchstart", { bubbles: true }));
    expect(one(container, "bar-tooltip")).not.toBeNull();
    page
      .getByTestId("outside")
      .element()
      .dispatchEvent(new TouchEvent("touchstart", { bubbles: true }));
    await expect.poll(() => one(container, "bar-tooltip")).toBeNull();
  });

  it("hides the value on an empty segment", async () => {
    const { container } = await render(<DivergingBar label="Zero" row={asCountry(zeros)} />);
    expect(all(container, "bar-segment-value")).toHaveLength(0);
    expect(one(container, "bar-rank")).toBeNull();
    expect(one(container, "bar-meta")).toBeNull();
  });
});

describe("Dropdown", () => {
  const options = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
    { value: "c", label: "Gamma" },
  ];

  it("opens on the selected option, moves with the arrow keys and picks with Enter or Space", async () => {
    const onChange = vi.fn();
    await render(<Dropdown id="dd" label="Pick" value="b" options={options} onChange={onChange} />);
    const trigger = page.getByRole("button", { name: /Pick/ });
    await expect.element(trigger).toHaveTextContent("Beta");
    await trigger.click();
    await expect.element(page.getByRole("option", { name: "Beta" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    await expect.element(page.getByRole("option", { name: "Gamma" })).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}");
    await expect.element(page.getByRole("option", { name: "Alpha" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("a");
    await expect.element(page.getByRole("listbox")).not.toBeInTheDocument();
    await trigger.click();
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenLastCalledWith("c");
  });

  it("picks with the mouse, closes with Escape, a second click or a click outside, and ignores other keys", async () => {
    const onChange = vi.fn();
    await render(
      <>
        <p>outside</p>
        <Dropdown id="dd" label="Pick" value="a" options={options} onChange={onChange} />
      </>,
    );
    const trigger = page.getByRole("button", { name: /Pick/ });
    await trigger.click();
    await page.getByRole("option", { name: "Gamma" }).hover();
    // The option under the pointer is highlighted; the others aren't.
    const background = (name: string) => getComputedStyle(page.getByRole("option", { name }).element()).backgroundColor;
    await expect.poll(() => background("Gamma")).not.toBe(background("Beta"));
    expect(background("Beta")).toBe("rgba(0, 0, 0, 0)");
    await userEvent.keyboard("x");
    await page.getByRole("option", { name: "Gamma" }).click();
    expect(onChange).toHaveBeenCalledWith("c");
    await trigger.click();
    await userEvent.keyboard("{Escape}");
    await expect.element(page.getByRole("listbox")).not.toBeInTheDocument();
    await trigger.click();
    await trigger.click();
    await expect.element(page.getByRole("listbox")).not.toBeInTheDocument();
    await trigger.click();
    await page.getByText("outside").click();
    await expect.element(page.getByRole("listbox")).not.toBeInTheDocument();
  });

  it("falls back to the first option for an unknown value, and copes with no options", async () => {
    const onChange = vi.fn();
    const { rerender } = await render(
      <Dropdown id="dd" label="Pick" value="zzz" options={options} onChange={onChange} />,
    );
    await expect.element(page.getByRole("button", { name: /Pick/ })).toHaveTextContent("Alpha");
    await page.getByRole("button", { name: /Pick/ }).click();
    await expect.element(page.getByRole("option", { name: "Alpha" })).toHaveFocus();
    await rerender(<Dropdown id="dd" label="Pick" value="zzz" options={[]} onChange={onChange} />);
    await page.getByRole("button", { name: /Pick/ }).click();
    await page.getByRole("button", { name: /Pick/ }).click();
    (document.querySelector('[role="listbox"]') as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("CountryExplorer", () => {
  it("lists every country, most opposed first, and filters, searches and re-sorts", async () => {
    const { container } = await render(<CountryExplorer />);
    const names = () => [...all(container, "bar-name")].map((n) => n.textContent);
    expect(names()).toHaveLength(COUNTRIES.length);
    expect(one(container, "bar-rank")?.textContent).toBe("#1");

    await page.getByRole("button", { name: /Region/ }).click();
    const region = REGIONS[0];
    await page.getByRole("option", { name: new RegExp(`^${regionLabel(region)} \\(`) }).click();
    expect(names()).toHaveLength(COUNTRIES.filter((c) => c.region === region).length);

    await page.getByRole("button", { name: /Sort by/ }).click();
    await page.getByRole("option", { name: "Country name (A–Z)" }).click();
    const sorted = names();
    expect(sorted).toEqual([...sorted].sort((a, b) => a!.localeCompare(b!)));
    expect(one(container, "bar-rank")).toBeNull();

    await page.getByRole("button", { name: /Sort by/ }).click();
    await page.getByRole("option", { name: "Most in favour of rapid development" }).click();
    expect(one(container, "bar-rank")?.textContent).toBe("#1");

    await page.getByRole("button", { name: /Region/ }).click();
    await page.getByRole("option", { name: /All regions/ }).click();
    await page.getByLabelText("Search").fill(" " + COUNTRIES[0].country.slice(0, 4).toUpperCase());
    expect(names()).toContain(COUNTRIES[0].country);
    await page.getByLabelText("Search").fill("no such place");
    await expect.element(page.getByText("No countries match that search.")).toBeVisible();

    await page.getByLabelText("Search").fill("");
    await page.getByLabelText(/Show .not sure./).click();
    expect(all(all(container, "bar-row")[0], "bar-segment")).toHaveLength(4);
  });
});

describe("DemographicsExplorer", () => {
  it("switches between demographic cuts, naming regions in full", async () => {
    const { container } = await render(<DemographicsExplorer />);
    const first = DEMOGRAPHICS.filter((d) => d.section === "region_average");
    expect(all(container, "bar-row")).toHaveLength(first.length);
    expect([...all(container, "bar-name")].map((n) => n.textContent)).toEqual(first.map((d) => regionLabel(d.group)));
    await page.getByRole("tab", { name: "Age" }).click();
    await expect.element(page.getByRole("tab", { name: "Age" })).toHaveAttribute("aria-selected", "true");
    expect(all(container, "bar-row")).toHaveLength(DEMOGRAPHICS.filter((d) => d.section === "age").length);
    await page.getByLabelText(/Show .not sure./).click();
    expect(all(all(container, "bar-row")[0], "bar-segment")).toHaveLength(4);
  });
});

describe("WorldMap", () => {
  it("colours the countries, switches metric, and shows a country's breakdown when picked", async () => {
    const { container } = await render(<WorldMap />);
    expect(page.getByText("Loading map…", { exact: true }).query()).not.toBeNull();
    await expect.poll(() => all(container, "map-country").length, { timeout: 10000 }).toBeGreaterThan(100);
    expect(
      all(container, "map-country").filter((c) => getComputedStyle(c).cursor === "default").length,
    ).toBeGreaterThan(0);

    for (const name of ["All opposed (combined)", "As quickly as possible", "Not sure", "Pause until safe"]) {
      await page.getByRole("button", { name, exact: true }).click();
      // The chosen metric's button is drawn bolder.
      await expect
        .poll(() => getComputedStyle(page.getByRole("button", { name, exact: true }).element()).fontWeight)
        .toBe("700");
    }

    const country = COUNTRIES.find((c) => container.querySelector(`[aria-label^="${c.country}:"]`))!;
    const shape = container.querySelector(`[aria-label^="${country.country}:"]`) as SVGElement;
    const placeholder = () => page.getByText("Click or tap a country to see its full breakdown.").query();
    // One panel shows a bar, the other a list, and the stylesheet shows one or the other by screen width.
    const closeButton = (panel: string) =>
      page
        .getByTestId(panel)
        .getByRole("button", { name: "Clear selection", includeHidden: true })
        .element() as HTMLElement;
    shape.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await expect.poll(() => one(container, "map-panel-title")?.textContent).toBe(country.country);
    expect(shape.getAttribute("aria-pressed")).toBe("true");
    expect(one(container, "map-selection-outline")).not.toBeNull();
    expect(one(container, "map-panel-total-value")?.textContent).toBe(`${slowOrStopPct(country)}%`);

    // Clicking it again clears the selection; so does the close button.
    shape.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await expect.poll(() => placeholder()).not.toBeNull();
    shape.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await expect.poll(() => one(container, "map-panel-title")).not.toBeNull();
    closeButton("map-panel-detail").click();
    await expect.poll(() => placeholder()).not.toBeNull();
    shape.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    await expect.poll(() => one(container, "map-panel-title")).not.toBeNull();
    closeButton("map-panel-bar").click();
    await expect.poll(() => placeholder()).not.toBeNull();
    shape.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
    expect(one(container, "map-panel-title")).toBeNull();
  });

  it("keeps showing 'Loading map…' if the map can't load, and ignores a map that arrives after it has gone", async () => {
    vi.spyOn(window, "fetch").mockRejectedValueOnce(new Error("offline"));
    const { unmount } = await render(<WorldMap />);
    await new Promise((r) => setTimeout(r, 50));
    expect(page.getByText("Loading map…", { exact: true }).query()).not.toBeNull();
    await unmount();
    let resolve: (r: Response) => void = () => {};
    vi.spyOn(window, "fetch").mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const second = await render(<WorldMap />);
    await second.unmount();
    resolve(
      new Response(
        JSON.stringify({
          type: "Topology",
          objects: { countries: { type: "GeometryCollection", geometries: [] } },
          arcs: [],
        }),
      ),
    );
  });

  it("draws nothing for a country with no shape", async () => {
    const topology = {
      type: "Topology",
      arcs: [],
      objects: {
        countries: {
          type: "GeometryCollection",
          geometries: [{ type: null, properties: { name: COUNTRIES[0].country } }],
        },
      },
    };
    vi.spyOn(window, "fetch").mockResolvedValueOnce(new Response(JSON.stringify(topology)));
    const { container } = await render(<WorldMap />);
    await expect.poll(() => all(container, "map-country").length).toBe(1);
    const shape = container.querySelector('[data-testid="map-country"]') as SVGElement;
    expect(shape.getAttribute("d")).toBeNull();
    shape.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await expect
      .poll(() => container.querySelector('[data-testid="map-selection-outline"] path')?.getAttribute("d"))
      .toBeNull();
  });
});
