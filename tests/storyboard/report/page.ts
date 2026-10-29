import { SECTIONS, type Storyboard } from "./frames.ts";

// The storyboard page: `test-results/storyboard/index.html`, built from the
// same data as storyboard.json, with each section's name and part
// (frames.ts). One file, nothing to install: the pictures are referenced
// where the runs left them, so it opens from disk.
//
// Its title is when the run was made. A run's page is
// runs/<when>/index.html, and scripts/storyboard.mjs writes the newest run's
// name and time (its title's) to ../../latest.js. The page reads that every few seconds, as a
// script (a page opened from disk can't fetch), and once a newer run has
// finished it links to it.

/** The data, safe to inline in a <script>. */
function inlineJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function renderStoryboardPage(storyboard: Storyboard): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Storyboard</title>
<script src="../../latest.js"></script>
<style>${CSS}</style>
</head>
<body data-viewport="desktop">
<header class="bar">
  <h1 id="title">Storyboard</h1>
  <a id="newer" href="../../index.html" hidden></a>
  <p id="summary"></p>
  <div class="controls">
    <span class="segmented" role="radiogroup" aria-label="Viewport">
      <button type="button" data-viewport="desktop" aria-pressed="true">Desktop</button><button type="button" data-viewport="phone" aria-pressed="false">Phone</button>
    </span>
  </div>
</header>
<div class="layout">
  <aside id="sidebar">
    <div class="tools">
      <input type="search" id="filter" placeholder="Filter flows and frames  /" aria-label="Filter flows and frames" autocomplete="off">
      <label><input type="checkbox" id="changed-only"> Changed only</label>
    </div>
    <nav id="section-list" aria-label="Sections and flows"></nav>
  </aside>
  <main id="board"></main>
</div>
<dialog id="lightbox">
  <div class="lightbox-bar">
    <span id="lightbox-caption"></span>
    <span class="segmented" id="lightbox-sides"></span>
    <button type="button" id="lightbox-close" aria-label="Close">×</button>
  </div>
  <div class="lightbox-image"><img id="lightbox-img" alt=""></div>
</dialog>
<script id="data" type="application/json">${inlineJson(storyboard)}</script>
<script id="sections" type="application/json">${inlineJson(SECTIONS)}</script>
<script>${JS}</script>
</body>
</html>
`;
}

const CSS = `
:root { color-scheme: light; --line: #e2e2e2; --muted: #666; --changed: #c2410c; --failed: #b91c1c; --ok: #15803d; --bg: #f7f7f7; --here: #fff1e6; --bar: 53px; }
* { box-sizing: border-box; }
body { margin: 0; font: 14px/1.4 system-ui, sans-serif; color: #111; background: #fff; }
h1, h2, h3, h4, p { margin: 0; }
.bar { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 8px 20px; align-items: center; min-height: var(--bar); padding: 8px 16px; border-bottom: 1px solid var(--line); background: #fff; }
.bar h1 { font-size: 16px; }
.bar p { color: var(--muted); flex: 1; }
#newer { padding: 4px 10px; border-radius: 4px; background: var(--changed); color: #fff; font-weight: 600; text-decoration: none; }
.controls { display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: center; }
#filter { width: 100%; font: inherit; padding: 6px 10px; border: 1px solid #bbb; border-radius: 6px; background: #fff; }
#filter:focus { outline: 2px solid #111; outline-offset: -1px; border-color: #111; }
.segmented button { font: inherit; padding: 4px 10px; border: 1px solid #999; background: #fff; cursor: pointer; }
.segmented button:first-child { border-radius: 4px 0 0 4px; }
.segmented button:last-child { border-radius: 0 4px 4px 0; }
.segmented button + button { border-left: 0; }
.segmented button[aria-pressed="true"] { background: #111; color: #fff; border-color: #111; }
.layout { display: grid; grid-template-columns: 360px 1fr; }
/* The sidebar: the filter and Changed only at its top, staying put, and the sections scrolling under them. */
#sidebar { position: sticky; top: var(--bar); display: flex; flex-direction: column; height: calc(100vh - var(--bar)); border-right: 1px solid var(--line); background: var(--bg); }
#sidebar .tools { display: grid; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--line); }
#sidebar .tools label { display: flex; gap: 6px; align-items: center; color: #333; cursor: pointer; }
#section-list { flex: 1; overflow: auto; overscroll-behavior: contain; padding: 0 0 40vh; }
/* A part: the public site, the staff pages, the tools. */
#sidebar .part { position: sticky; top: 0; z-index: 1; padding: 14px 16px 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); background: var(--bg); }
#sidebar summary { display: flex; justify-content: space-between; gap: 8px; padding: 6px 16px 6px 12px; cursor: pointer; font-weight: 600; list-style: none; border-radius: 0; }
#sidebar summary:hover { background: #ececec; }
#sidebar summary::-webkit-details-marker { display: none; }
#sidebar summary::before { content: "▸"; display: inline-block; width: 14px; color: var(--muted); transition: transform 0.12s; }
#sidebar details[open] > summary::before { transform: rotate(90deg); }
#sidebar summary .name { flex: 1; }
#sidebar details.current > summary { color: #000; }
#sidebar a { display: flex; justify-content: space-between; gap: 8px; padding: 4px 16px 4px 30px; color: #333; text-decoration: none; border-left: 3px solid transparent; }
/* A route stays on one line; a flow's title may wrap. */
#sidebar a .name { overflow-wrap: anywhere; }
#sidebar a .name.route { white-space: nowrap; }
#sidebar a:hover { background: #ececec; }
/* The flow in view. */
#sidebar a[aria-current="true"] { background: var(--here); border-left-color: var(--changed); color: #000; font-weight: 600; }
#sidebar .count { color: var(--muted); white-space: nowrap; font-weight: normal; font-variant-numeric: tabular-nums; }
#sidebar .count.changed { color: var(--changed); font-weight: 600; }
#sidebar a.failed .name::before, h4.failed::before { content: "✕ "; color: var(--failed); }
/* Room below the last flow, so picking it in the sidebar scrolls it to the top like any other. */
main { padding: 8px 32px calc(100vh - 60px); min-width: 0; }
.part-block > h2 { margin: 28px 0 0; padding: 18px 0 10px; font-size: 24px; border-bottom: 3px solid #111; }
.part-block:first-child > h2 { margin-top: 8px; }
section > h3 { font-size: 18px; margin: 28px 0 4px; }
/* A hash link lands under the sticky bar without this. */
section, .flow { scroll-margin-top: calc(var(--bar) + 8px); }
.flow { margin: 12px 0 28px; }
.flow h4 { font-size: 15px; margin-bottom: 8px; padding-top: 12px; border-top: 1px solid var(--line); }
.flow h4 .shot { margin-left: 8px; font-size: 12px; font-weight: normal; color: var(--muted); }
.flow .status { font-weight: normal; color: var(--muted); font-size: 13px; margin-left: 8px; }
.frame { display: grid; grid-template-columns: 220px 1fr; gap: 16px; padding: 10px 0; border-top: 1px solid #f0f0f0; }
.frame:first-of-type { border-top: 0; }
.frame .caption { color: #333; }
.frame .caption .n { color: var(--muted); margin-right: 6px; font-variant-numeric: tabular-nums; }
.frame .mismatch { display: block; margin-top: 4px; font-size: 12px; color: var(--muted); }
.frame.changed .mismatch { color: var(--changed); font-weight: 600; }
mark { background: #fde68a; color: inherit; border-radius: 2px; }
.thumbs { display: flex; gap: 12px; flex-wrap: wrap; }
.thumb { display: block; width: 240px; text-align: center; font-size: 12px; color: var(--muted); background: none; border: 0; padding: 0; cursor: zoom-in; font: inherit; }
.thumb img { display: block; width: 240px; height: 160px; object-fit: cover; object-position: top; border: 1px solid var(--line); background: #fff; margin-bottom: 4px; transition: box-shadow 0.12s; }
.thumb:hover img { box-shadow: 0 2px 10px rgb(0 0 0 / 15%); }
body[data-viewport="phone"] .thumb img { width: 120px; height: 220px; margin-left: auto; margin-right: auto; }
.thumb .blank { display: block; width: 240px; height: 160px; border: 1px solid var(--line); margin-bottom: 4px; background: repeating-linear-gradient(45deg, #f3f3f3 0 8px, #fff 8px 16px); }
body[data-viewport="phone"] .thumb .blank { width: 120px; height: 220px; margin-left: auto; margin-right: auto; }
.no-frames { color: var(--muted); padding: 10px 0; }
.error { margin: 8px 0 0; padding: 8px 12px; background: #fef2f2; color: var(--failed); border-left: 3px solid var(--failed); white-space: pre-wrap; font-family: ui-monospace, monospace; font-size: 12px; }
.hidden { display: none !important; }
.empty-note { color: var(--muted); padding: 40px 0; }
dialog { width: 100vw; height: 100vh; max-width: none; max-height: none; margin: 0; padding: 0; border: 0; background: #222; color: #eee; }
dialog::backdrop { background: #000; }
.lightbox-bar { display: flex; gap: 16px; align-items: center; padding: 8px 16px; background: #111; position: sticky; top: 0; }
.lightbox-bar span:first-child { flex: 1; }
.lightbox-bar .segmented button { background: #333; color: #eee; border-color: #555; }
.lightbox-bar .segmented button[aria-pressed="true"] { background: #eee; color: #111; border-color: #eee; }
#lightbox-close { font: inherit; font-size: 20px; background: none; color: #eee; border: 0; cursor: pointer; }
.lightbox-image { overflow: auto; height: calc(100vh - 41px); }
.lightbox-image img { display: block; margin: 0 auto; max-width: none; }
/* Narrow: the bar scrolls away, the sidebar is a list above the board, and the frames stack. */
@media (max-width: 800px) { .bar { position: static; } :root { --bar: 0px; } .layout { grid-template-columns: 1fr; } #sidebar { position: static; height: auto; } #section-list { padding-bottom: 12px; } #sidebar .part { position: static; } main { padding: 8px 16px 40px; } .frame { grid-template-columns: 1fr; } }
`;

const JS = `
const data = JSON.parse(document.getElementById("data").textContent);
const sectionInfo = new Map(JSON.parse(document.getElementById("sections").textContent).map((s) => [s.id, s]));
// The browser restores the checkbox's tick and the filter's words on a
// reload, so the page starts from them. \`opened\` and \`closed\` hold the
// sections folded open or shut by hand; any other opens while it's in view.
const state = {
  viewport: "desktop",
  changedOnly: document.getElementById("changed-only").checked,
  query: document.getElementById("filter").value,
  opened: new Set(),
  closed: new Set(),
};
const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) node.setAttribute(k, v);
  }
  for (const child of children) node.append(child);
  return node;
};
const sectionName = (id) => sectionInfo.get(id)?.name ?? id.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
const partOf = (id) => sectionInfo.get(id)?.part ?? "Other";
/** Local time as "2026-10-16 16:33". */
const isoLocal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16).replace("T", " ");
// The newest run's flows say nothing; a carried flow says when it was shot.
const newestShot = data.flows.reduce((newest, f) => (f.shotAt && f.shotAt > newest ? f.shotAt : newest), "");
const shotTime = (iso) => new Date(iso).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });
const plural = (n, word) => n + " " + word + (n === 1 ? "" : "s");
const pct = (n) => (n * 100 < 0.01 && n > 0 ? "<0.01" : (n * 100).toFixed(2)) + "%";
const slug = (...parts) => parts.join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-");
const framesOf = (flow) => data.frames.filter((f) => f.section === flow.section && f.flow === flow.flow && f.viewport === flow.viewport);

/** The filter's words, each of which must be somewhere in what's searched. */
const words = () => state.query.toLowerCase().split(/\\s+/).filter(Boolean);
const matches = (text, terms) => terms.every((t) => text.toLowerCase().includes(t));
/** \`text\` with each of the filter's words marked. */
function marked(text, terms) {
  if (!terms.length) return [text];
  const pattern = new RegExp("(" + terms.map((t) => t.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&")).join("|") + ")", "gi");
  return text.split(pattern).map((part, i) => (i % 2 ? el("mark", {}, [part]) : part));
}

function render() {
  const terms = words();
  const flows = data.flows.filter((f) => f.viewport === state.viewport);
  // In the order of the sections' list, whatever order an older run's data has them in.
  const order = [...sectionInfo.keys()];
  const rank = (id) => (order.includes(id) ? order.indexOf(id) : order.length);
  const sections = [...new Set(flows.map((f) => f.section))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const sidebar = document.getElementById("section-list");
  const board = document.getElementById("board");
  sidebar.replaceChildren();
  board.replaceChildren();
  let shownFlows = 0;
  let part = null;
  let partBlock = null;
  for (const section of sections) {
    const shown = flows
      .filter((f) => f.section === section && (!state.changedOnly || f.changed > 0 || f.status !== "passed"))
      .map((flow) => {
        // A flow matches by its section or title, and then shows every frame;
        // or by some captions, and then shows those.
        const frames = framesOf(flow).filter((f) => !state.changedOnly || f.changed);
        if (!terms.length || matches(sectionName(section) + " " + flow.flow, terms)) return { flow, frames };
        const hits = frames.filter((f) => matches(f.caption, terms));
        return hits.length ? { flow, frames: hits } : null;
      })
      .filter(Boolean);
    if (!shown.length) continue;
    shownFlows += shown.length;
    if (partOf(section) !== part) {
      part = partOf(section);
      sidebar.append(el("h2", { class: "part" }, [part]));
      partBlock = el("div", { class: "part-block" }, [el("h2", {}, [part])]);
      board.append(partBlock);
    }
    const id = slug(section);
    const changed = shown.reduce((n, { flow }) => n + flow.changed, 0);
    const frameCount = shown.reduce((n, { flow }) => n + flow.frames, 0);
    // Open while filtering, or by hand; otherwise shut until it's in view (trackPlace).
    const open = (terms.length && !state.closed.has(id)) || state.opened.has(id);
    const group = el("details", { "data-section": id, open: open ? "" : undefined }, [
      el("summary", {}, [
        el("span", { class: "name" }, [sectionName(section)]),
        el("span", { class: "count" + (changed ? " changed" : "") }, [data.withMain ? changed + "/" + frameCount : String(frameCount)]),
      ]),
    ]);
    group.querySelector("summary").addEventListener("click", () => {
      // The toggle event comes after; this is the only way to tell a person's click from trackPlace's.
      const opening = !group.open;
      (opening ? state.opened : state.closed).add(id);
      (opening ? state.closed : state.opened).delete(id);
    });
    sidebar.append(group);
    const sec = el("section", { id }, [el("h3", {}, [sectionName(section)])]);
    for (const { flow, frames } of shown) {
      const flowId = slug(section, flow.flow);
      group.append(
        el("a", { href: "#" + flowId, "data-flow": flowId, class: flow.status !== "passed" ? "failed" : "" }, [
          el("span", { class: "name" + (flow.flow.startsWith("/") ? " route" : "") }, marked(flow.flow, terms)),
          el("span", { class: "count" + (flow.changed ? " changed" : "") }, [
            flow.frames === 0 ? "–" : data.withMain ? flow.changed + "/" + flow.frames : String(flow.frames),
          ]),
        ]),
      );
      const h4 = el("h4", { class: flow.status !== "passed" ? "failed" : "" }, marked(flow.flow, terms));
      // Carried from an earlier, fuller run by a partial one (scripts/storyboard.mjs).
      if (flow.shotAt && flow.shotAt !== newestShot) h4.append(el("span", { class: "shot" }, ["shot " + shotTime(flow.shotAt)]));
      if (flow.status !== "passed") h4.append(el("span", { class: "status" }, [flow.status]));
      else if (flow.mainStatus && flow.mainStatus !== "passed") h4.append(el("span", { class: "status" }, ["main: " + flow.mainStatus]));
      const div = el("div", { class: "flow", id: flowId, "data-section": id }, [h4]);
      for (const frame of frames) div.append(renderFrame(frame, terms));
      // A flow that checks without picturing: redirects over HTTP, a scroll position, a header.
      if (flow.frames === 0) div.append(el("p", { class: "no-frames" }, [flow.status === "passed" ? "Passed. No frames: this flow only checks." : "No frames: this flow only checks."]));
      if (flow.error) div.append(el("pre", { class: "error" }, [flow.error]));
      sec.append(div);
    }
    partBlock.append(sec);
  }
  if (!shownFlows)
    board.append(el("p", { class: "empty-note" }, [terms.length ? "No flow or frame matches “" + state.query.trim() + "”." : state.changedOnly ? "Nothing changed on this viewport." : "No flows ran on this viewport."]));
  here = { section: null, flow: null };
  trackPlace();
  const frames = data.frames.filter((f) => f.viewport === state.viewport);
  const changed = frames.filter((f) => f.changed).length;
  const failed = flows.filter((f) => f.status !== "passed").length;
  const carried = flows.filter((f) => f.shotAt && f.shotAt !== newestShot).length;
  document.getElementById("summary").textContent =
    (terms.length ? shownFlows + " of " + plural(flows.length, "flow") + " match. " : "") +
    frames.length + " frames in " + flows.length + " flows" +
    (data.withMain ? ", " + changed + " changed against main" : ", no run of main to compare with") +
    (failed ? ", " + failed + " failed" : "") + "." +
    (carried ? " " + plural(flows.length - carried, "flow") + " shot now, " + carried + " carried from earlier runs." : "");
}

function renderFrame(frame, terms) {
  const caption = el("div", { class: "caption" }, [el("span", { class: "n" }, [String(frame.index)]), ...marked(frame.caption, terms)]);
  if (frame.mismatch !== undefined) caption.append(el("span", { class: "mismatch" }, [frame.noise ? "same as main, but for noise: " + pct(frame.mismatch) + " of pixels differ slightly" : frame.mismatch ? pct(frame.mismatch) + " of pixels differ" : "identical to main"]));
  else if (data.withMain) caption.append(el("span", { class: "mismatch" }, [frame.branch ? "new: main didn't get here" : "gone: only main has it"]));
  const thumbs = el("div", { class: "thumbs" });
  const sides = data.withMain ? ["branch", "main", "diff"] : ["branch"];
  for (const side of sides) {
    const src = frame[side];
    const button = el("button", { type: "button", class: "thumb" + (src ? "" : " empty"), onclick: () => src && openLightbox(frame, side) }, [
      src ? el("img", { src, alt: "", loading: "lazy" }) : el("span", { class: "blank" }),
      side === "diff" && !src && frame.mismatch === 0 ? "no difference" : side === "diff" && !src ? "" : side,
    ]);
    if (!src) button.disabled = true;
    thumbs.append(button);
  }
  return el("div", { class: "frame" + (frame.changed ? " changed" : ""), "data-index": frame.index }, [caption, thumbs]);
}

/** The flow being looked at: the last whose top has come a quarter of the way down the window. */
function flowInView() {
  const top = document.querySelector(".bar").offsetHeight + window.innerHeight / 4;
  let current = null;
  for (const flow of document.querySelectorAll(".flow")) {
    if (flow.getBoundingClientRect().top <= top) current = flow;
    else break;
  }
  return current ?? document.querySelector(".flow");
}

// The sidebar follows the board: the section in view is open, unless it was
// shut by hand, and the one left behind shuts, unless it was opened by hand;
// the flow in view is marked, and kept in the sidebar's view. While
// filtering, every section that matches stays open. On a narrow screen the
// sidebar is above the board, so opening and shutting there would move the
// page: it only marks. Nor does it open anything until the page is first
// scrolled, so it starts with every section shut.
const narrow = window.matchMedia("(max-width: 800px)");
let scrolled = false;
let here = { section: null, flow: null };
function trackPlace() {
  const flow = flowInView();
  const section = flow?.dataset.section ?? null;
  if (flow?.id === here.flow && section === here.section) return;
  const filtering = words().length > 0;
  for (const group of document.querySelectorAll("#sidebar details")) {
    const id = group.dataset.section;
    group.classList.toggle("current", id === section);
    if (filtering || narrow.matches || !scrolled || state.opened.has(id)) continue;
    group.open = id === section && !state.closed.has(id);
  }
  for (const link of document.querySelectorAll("#sidebar a[aria-current]")) link.removeAttribute("aria-current");
  const link = flow && document.querySelector('#sidebar a[data-flow="' + flow.id + '"]');
  here = { section, flow: flow?.id ?? null };
  if (!link) return;
  link.setAttribute("aria-current", "true");
  if (narrow.matches) return;
  // Into the sidebar's own view, below its part's heading. Not scrollIntoView:
  // on a phone the sidebar isn't sticky, and that would scroll the page to it.
  const sidebar = document.getElementById("section-list");
  const target = link.closest("details").open ? link : link.closest("details").querySelector("summary");
  const box = target.getBoundingClientRect();
  const view = sidebar.getBoundingClientRect();
  const heading = 40;
  if (box.top < view.top + heading || box.bottom > view.bottom - 20) sidebar.scrollTop += box.top - view.top - view.height / 3;
}
let tracking = false;
document.addEventListener("scroll", () => {
  if (tracking) return;
  tracking = true;
  requestAnimationFrame(() => {
    tracking = false;
    if (!scrolled) {
      scrolled = true;
      here = { section: null, flow: null };
    }
    trackPlace();
  });
}, { passive: true });

const lightbox = document.getElementById("lightbox");
let shown = null;
function openLightbox(frame, side) {
  shown = { frame, side };
  document.getElementById("lightbox-caption").textContent = frame.flow + " · " + frame.index + ". " + frame.caption;
  const sides = document.getElementById("lightbox-sides");
  sides.replaceChildren();
  for (const s of ["branch", "main", "diff"]) {
    if (!frame[s]) continue;
    sides.append(el("button", { type: "button", "aria-pressed": String(s === side), onclick: () => openLightbox(frame, s) }, [s]));
  }
  document.getElementById("lightbox-img").src = frame[side];
  if (!lightbox.open) lightbox.showModal();
}
document.getElementById("lightbox-close").addEventListener("click", () => lightbox.close());
lightbox.addEventListener("click", (e) => { if (e.target === lightbox) lightbox.close(); });
document.addEventListener("keydown", (e) => {
  if (!lightbox.open || !shown) return;
  const order = ["branch", "main", "diff"].filter((s) => shown.frame[s]);
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    const at = order.indexOf(shown.side);
    openLightbox(shown.frame, order[(at + (e.key === "ArrowRight" ? 1 : order.length - 1)) % order.length]);
  }
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    const frames = framesOf(shown.frame).filter((f) => f[shown.side] || f.branch || f.main);
    const at = frames.indexOf(shown.frame);
    const next = frames[at + (e.key === "ArrowDown" ? 1 : -1)];
    if (next) openLightbox(next, next[shown.side] ? shown.side : next.branch ? "branch" : "main");
  }
});

for (const button of document.querySelectorAll(".bar [data-viewport]")) {
  button.addEventListener("click", () => {
    // Stay on the flow being looked at: the same flow on the other viewport,
    // or, if it didn't run there, the top of the same section.
    const flow = flowInView()?.id;
    const section = flowInView()?.dataset.section;
    state.viewport = button.dataset.viewport;
    document.body.dataset.viewport = state.viewport;
    for (const b of document.querySelectorAll(".bar [data-viewport]")) b.setAttribute("aria-pressed", String(b === button));
    render();
    const target = (flow && document.getElementById(flow)) || (section && document.getElementById(section));
    if (target) {
      target.scrollIntoView({ block: "start" });
      trackPlace();
    }
  });
}
document.getElementById("changed-only").addEventListener("change", (e) => { state.changedOnly = e.target.checked; render(); });
// Filtering as you type, a moment after the last key; / to start, Escape to clear.
const filter = document.getElementById("filter");
let typing = null;
filter.addEventListener("input", () => {
  clearTimeout(typing);
  typing = setTimeout(() => {
    state.query = filter.value;
    state.closed.clear();
    render();
    window.scrollTo({ top: 0 });
  }, 120);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== filter && !lightbox.open) {
    e.preventDefault();
    filter.focus();
    filter.select();
  } else if (e.key === "Escape" && document.activeElement === filter && filter.value) {
    filter.value = "";
    filter.dispatchEvent(new Event("input"));
  }
});
if (!data.flows.some((f) => f.viewport === "desktop") && data.flows.some((f) => f.viewport === "phone")) document.querySelector('.bar [data-viewport="phone"]').click();
else render();

// The run's time in its title, and a link to a newer run once there is one.
const titled = "Storyboard " + isoLocal(new Date(data.generatedAt));
document.title = titled;
document.getElementById("title").textContent = titled;
/** This page's run, from its folder: runs/<run>/index.html. */
const thisRun = decodeURIComponent(location.pathname.split("/").slice(-2)[0]);
function showNewer() {
  const latest = window.storyboardLatest;
  if (!latest || latest.run === thisRun || latest.run < thisRun) return;
  const newer = document.getElementById("newer");
  newer.textContent = "Newer review: " + isoLocal(new Date(latest.at)) + " →";
  newer.hidden = false;
}
function checkLatest() {
  const script = document.createElement("script");
  script.src = "../../latest.js?" + Date.now();
  script.onload = () => { script.remove(); showNewer(); };
  script.onerror = () => script.remove();
  document.head.append(script);
}
showNewer();
setInterval(checkLatest, 5000);
`;
