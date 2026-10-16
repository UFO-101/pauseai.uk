import type { Storyboard } from "./frames";

// The storyboard page: `test-results/storyboard/index.html`, built from the
// same data as storyboard.json. One file, nothing to install: the pictures
// are referenced where the runs left them, so it opens from disk.

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
<style>${CSS}</style>
</head>
<body data-viewport="desktop">
<header class="bar">
  <h1>Storyboard</h1>
  <p id="summary"></p>
  <div class="controls">
    <span class="segmented" role="radiogroup" aria-label="Viewport">
      <button type="button" data-viewport="desktop" aria-pressed="true">Desktop</button><button type="button" data-viewport="phone" aria-pressed="false">Phone</button>
    </span>
    <label><input type="checkbox" id="changed-only"> Changed only</label>
  </div>
</header>
<div class="layout">
  <nav id="sidebar" aria-label="Sections and flows"></nav>
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
<script>${JS}</script>
</body>
</html>
`;
}

const CSS = `
:root { color-scheme: light; --line: #ddd; --muted: #666; --changed: #c2410c; --failed: #b91c1c; --ok: #15803d; --bg: #fafafa; }
* { box-sizing: border-box; }
body { margin: 0; font: 14px/1.4 system-ui, sans-serif; color: #111; background: #fff; }
h1, h2, h3, p { margin: 0; }
.bar { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 8px 20px; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--line); background: #fff; }
.bar h1 { font-size: 16px; }
.bar p { color: var(--muted); flex: 1; }
.controls { display: flex; gap: 16px; align-items: center; }
.segmented button { font: inherit; padding: 4px 10px; border: 1px solid #999; background: #fff; cursor: pointer; }
.segmented button:first-child { border-radius: 4px 0 0 4px; }
.segmented button:last-child { border-radius: 0 4px 4px 0; }
.segmented button + button { border-left: 0; }
.segmented button[aria-pressed="true"] { background: #111; color: #fff; border-color: #111; }
.layout { display: grid; grid-template-columns: 380px 1fr; }
#sidebar { position: sticky; top: 49px; height: calc(100vh - 49px); overflow: auto; padding: 12px 0 24px; border-right: 1px solid var(--line); background: var(--bg); }
#sidebar summary { display: flex; justify-content: space-between; gap: 8px; padding: 8px 16px 8px 12px; cursor: pointer; font-weight: 600; list-style: none; }
#sidebar summary::-webkit-details-marker { display: none; }
#sidebar summary::before { content: "▸"; display: inline-block; width: 12px; color: var(--muted); }
#sidebar details[open] summary::before { content: "▾"; }
#sidebar summary .name { flex: 1; }
#sidebar details.current summary { background: #eee; }
#sidebar a { display: flex; justify-content: space-between; gap: 8px; padding: 4px 16px 4px 28px; color: inherit; text-decoration: none; }
/* A route stays on one line; a flow's sentence may wrap. */
#sidebar a .name { overflow-wrap: anywhere; }
#sidebar a .name.route { white-space: nowrap; }
#sidebar a:hover { background: #eee; }
#sidebar .count { color: var(--muted); white-space: nowrap; font-weight: normal; }
#sidebar .count.changed { color: var(--changed); font-weight: 600; }
#sidebar a.failed .name::before, h3.failed::before { content: "✕ "; color: var(--failed); }
main { padding: 8px 24px 80px; min-width: 0; }
section > h2 { font-size: 18px; margin: 32px 0 8px; padding-top: 16px; border-top: 1px solid var(--line); }
section:first-child > h2 { border-top: 0; margin-top: 16px; }
.flow { margin: 16px 0 28px; }
.flow h3 { font-size: 15px; margin-bottom: 8px; }
.flow .status { font-weight: normal; color: var(--muted); font-size: 13px; margin-left: 8px; }
.frame { display: grid; grid-template-columns: 200px 1fr; gap: 16px; padding: 10px 0; border-top: 1px solid #eee; }
.frame .caption { color: #333; }
.frame .caption .n { color: var(--muted); margin-right: 6px; }
.frame .mismatch { display: block; margin-top: 4px; font-size: 12px; color: var(--muted); }
.frame.changed .mismatch { color: var(--changed); font-weight: 600; }
.thumbs { display: flex; gap: 12px; flex-wrap: wrap; }
.thumb { display: block; width: 240px; text-align: center; font-size: 12px; color: var(--muted); background: none; border: 0; padding: 0; cursor: zoom-in; font: inherit; }
.thumb img { display: block; width: 240px; height: 160px; object-fit: cover; object-position: top; border: 1px solid var(--line); background: #fff; margin-bottom: 4px; }
body[data-viewport="phone"] .thumb img { width: 120px; height: 220px; margin-left: auto; margin-right: auto; }
.thumb .blank { display: block; width: 240px; height: 160px; border: 1px solid var(--line); margin-bottom: 4px; background: repeating-linear-gradient(45deg, #f3f3f3 0 8px, #fff 8px 16px); }
body[data-viewport="phone"] .thumb .blank { width: 120px; height: 220px; margin-left: auto; margin-right: auto; }
.no-frames { color: var(--muted); padding: 10px 0; border-top: 1px solid #eee; }
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
@media (max-width: 800px) { .layout { grid-template-columns: 1fr; } #sidebar { position: static; height: auto; } .frame { grid-template-columns: 1fr; } }
`;

const JS = `
const data = JSON.parse(document.getElementById("data").textContent);
const state = { viewport: "desktop", changedOnly: false };
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
const title = (s) => s.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
const pct = (n) => (n * 100 < 0.01 && n > 0 ? "<0.01" : (n * 100).toFixed(2)) + "%";
const slug = (...parts) => parts.join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-");
const framesOf = (flow) => data.frames.filter((f) => f.section === flow.section && f.flow === flow.flow && f.viewport === flow.viewport);

function render() {
  const flows = data.flows.filter((f) => f.viewport === state.viewport);
  const sections = [...new Set(flows.map((f) => f.section))];
  const sidebar = document.getElementById("sidebar");
  const board = document.getElementById("board");
  sidebar.replaceChildren();
  board.replaceChildren();
  let shownFrames = 0;
  for (const section of sections) {
    const sectionFlows = flows.filter((f) => f.section === section && (!state.changedOnly || f.changed > 0 || f.status !== "passed"));
    if (!sectionFlows.length) continue;
    const sectionChanged = sectionFlows.reduce((n, f) => n + f.changed, 0);
    const sectionFrames = sectionFlows.reduce((n, f) => n + f.frames, 0);
    // One folded list per section; the one in view is open (see trackSection).
    const group = el("details", { "data-section": slug(section) }, [
      el("summary", {}, [
        el("span", { class: "name" }, [title(section)]),
        el("span", { class: "count" + (sectionChanged ? " changed" : "") }, [
          data.withMain ? sectionChanged + "/" + sectionFrames : String(sectionFrames),
        ]),
      ]),
    ]);
    sidebar.append(group);
    const sec = el("section", { id: slug(section) }, [el("h2", {}, [title(section)])]);
    for (const flow of sectionFlows) {
      const id = slug(section, flow.flow);
      group.append(
        el("a", { href: "#" + id, class: flow.status !== "passed" ? "failed" : "" }, [
          el("span", { class: "name" + (flow.flow.startsWith("/") ? " route" : "") }, [flow.flow]),
          el("span", { class: "count" + (flow.changed ? " changed" : "") }, [
            flow.frames === 0 ? "–" : data.withMain ? flow.changed + "/" + flow.frames : String(flow.frames),
          ]),
        ]),
      );
      const frames = framesOf(flow).filter((f) => !state.changedOnly || f.changed);
      shownFrames += frames.length;
      const h3 = el("h3", { class: flow.status !== "passed" ? "failed" : "" }, [flow.flow]);
      if (flow.status !== "passed") h3.append(el("span", { class: "status" }, [flow.status]));
      else if (flow.mainStatus && flow.mainStatus !== "passed") h3.append(el("span", { class: "status" }, ["main: " + flow.mainStatus]));
      const div = el("div", { class: "flow", id }, [h3]);
      for (const frame of frames) div.append(renderFrame(frame));
      // A flow that checks without picturing: redirects over HTTP, a scroll position, a header.
      if (flow.frames === 0) div.append(el("p", { class: "no-frames" }, [flow.status === "passed" ? "Passed. No frames: this flow only checks." : "No frames: this flow only checks."]));
      if (flow.error) div.append(el("pre", { class: "error" }, [flow.error]));
      sec.append(div);
    }
    board.append(sec);
  }
  if (!shownFrames && !board.children.length) board.append(el("p", { class: "empty-note" }, [state.changedOnly ? "Nothing changed on this viewport." : "No flows ran on this viewport."]));
  trackSection();
  const frames = data.frames.filter((f) => f.viewport === state.viewport);
  const changed = frames.filter((f) => f.changed).length;
  const failed = flows.filter((f) => f.status !== "passed").length;
  document.getElementById("summary").textContent =
    frames.length + " frames in " + flows.length + " flows" +
    (data.withMain ? ", " + changed + " changed against main" : ", no run of main to compare with") +
    (failed ? ", " + failed + " failed" : "") + ". " + new Date(data.generatedAt).toLocaleString();
}

function renderFrame(frame) {
  const caption = el("div", { class: "caption" }, [el("span", { class: "n" }, [String(frame.index)]), frame.caption]);
  if (frame.mismatch !== undefined) caption.append(el("span", { class: "mismatch" }, [frame.mismatch ? pct(frame.mismatch) + " of pixels differ" : "identical to main"]));
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

// The sidebar folds every section but the one in view: the first whose
// heading hasn't scrolled past the top of the board.
let currentSection = null;
function sectionInView() {
  const top = document.querySelector(".bar").offsetHeight + 1;
  let current = null;
  for (const sec of document.querySelectorAll("main > section")) {
    if (sec.getBoundingClientRect().top <= top) current = sec.id;
    else break;
  }
  return current ?? document.querySelector("main > section")?.id ?? null;
}
function trackSection() {
  const section = sectionInView();
  if (section === currentSection && document.querySelector("#sidebar details.current")) return;
  currentSection = section;
  for (const group of document.querySelectorAll("#sidebar details")) {
    const here = group.dataset.section === section;
    group.classList.toggle("current", here);
    group.open = here;
  }
  document.querySelector("#sidebar details.current")?.scrollIntoView({ block: "nearest" });
}
document.addEventListener("scroll", trackSection, { passive: true });

// The flow nearest the top of the board, so switching viewport can stay on it.
function flowInView() {
  const top = document.querySelector(".bar").offsetHeight + 1;
  let current = null;
  for (const flow of document.querySelectorAll(".flow")) {
    if (flow.getBoundingClientRect().top <= top) current = flow.id;
    else break;
  }
  return current;
}

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
    const flow = flowInView();
    const section = sectionInView();
    state.viewport = button.dataset.viewport;
    document.body.dataset.viewport = state.viewport;
    for (const b of document.querySelectorAll(".bar [data-viewport]")) b.setAttribute("aria-pressed", String(b === button));
    render();
    const target = (flow && document.getElementById(flow)) || (section && document.getElementById(section));
    if (target) {
      target.scrollIntoView({ block: "start" });
      // Under the sticky bar, not behind it.
      window.scrollBy(0, -document.querySelector(".bar").offsetHeight);
      trackSection();
    }
  });
}
document.getElementById("changed-only").addEventListener("change", (e) => { state.changedOnly = e.target.checked; render(); });
if (!data.flows.some((f) => f.viewport === "desktop") && data.flows.some((f) => f.viewport === "phone")) document.querySelector('.bar [data-viewport="phone"]').click();
else render();
`;
