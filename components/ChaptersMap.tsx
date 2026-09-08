"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type { Topology } from "topojson-specification";
import { chapters } from "@/lib/data/chapters";

const MAP_W = 380;
const MAP_H = 608;
const PIN_CLEARANCE = 9;

// Matches the breakpoint the stylesheet uses to drop the three-column
// arrangement. Below it the cards stand on their own, so the map data is
// never fetched and no connectors are drawn.
const DESKTOP_QUERY = "(min-width: 1024px)";

export default function ChaptersMap() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [ukFeature, setUkFeature] = useState<FeatureCollection<Geometry> | null>(null);
  const [links, setLinks] = useState<{ name: string; d: string }[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const pinRefs = useRef<Record<string, SVGCircleElement | null>>({});

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isDesktop || ukFeature) return;
    let cancelled = false;
    // A dedicated UK-only topology (Natural Earth 10m, simplified ~12% with
    // mapshaper): the site's world-countries-50m file is coarse enough to
    // turn the coastline into a blocky silhouette at this zoom.
    fetch("/data/uk-chapters-map.topo.json")
      .then((res) => res.json())
      .then((topology: Topology) => {
        if (cancelled) return;
        const objectName = Object.keys(topology.objects)[0];
        setUkFeature(feature(topology, topology.objects[objectName]) as unknown as FeatureCollection<Geometry>);
      })
      .catch(() => {
        // Leave ukFeature null — the cards stand on their own without it.
      });
    return () => {
      cancelled = true;
    };
  }, [isDesktop, ukFeature]);

  const projection = ukFeature
    ? geoMercator().fitExtent(
        [
          [6, 6],
          [MAP_W - 6, MAP_H - 6],
        ],
        ukFeature
      )
    : null;
  const path = projection ? geoPath(projection) : null;

  // The cards are placed by CSS grid and the pins by the map projection, so
  // the only reliable way to join the two is to measure both after layout
  // and draw the connectors in a pixel-space overlay.
  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const w = wrap.getBoundingClientRect();
    const next: { name: string; d: string }[] = [];
    for (const chapter of chapters) {
      const card = cardRefs.current[chapter.name];
      const pin = pinRefs.current[chapter.name];
      if (!card || !pin) continue;
      const c = card.getBoundingClientRect();
      const p = pin.getBoundingClientRect();
      const isLeft = chapter.side === "left";
      const cx = (isLeft ? c.right : c.left) - w.left;
      const cy = c.top + c.height / 2 - w.top;
      const px = p.left + p.width / 2 - w.left;
      const py = p.top + p.height / 2 - w.top;
      const stubX = cx + (isLeft ? 14 : -14);
      // Stop the line short of the dot: the connectors are painted over the
      // map, so running them to the pin's centre would bisect it.
      const dx = px - stubX;
      const dy = py - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const endX = px - (dx / dist) * PIN_CLEARANCE;
      const endY = py - (dy / dist) * PIN_CLEARANCE;
      next.push({ name: chapter.name, d: `M${cx},${cy} H${stubX} L${endX},${endY}` });
    }
    setLinks(next);
  }, []);

  useEffect(() => {
    if (!isDesktop || !ukFeature) {
      setLinks([]);
      return;
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    for (const el of Object.values(cardRefs.current)) if (el) ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [isDesktop, ukFeature, measure]);

  return (
    <div className="chapters-map" ref={wrapRef}>
      {links.length > 0 && (
        <svg className="chapters-map-links" aria-hidden="true">
          {links.map((l) => (
            <path key={l.name} d={l.d} className={`chapters-map-link ${hovered === l.name ? "active" : ""}`} />
          ))}
        </svg>
      )}

      {chapters.map((chapter, i) => {
        const row = (i % 3) + 1;
        const column = chapter.side === "left" ? 1 : 3;
        return (
          <Link
            key={chapter.name}
            href={chapter.href}
            ref={(el) => {
              cardRefs.current[chapter.name] = el;
            }}
            className="chapter-card chapters-map-card"
            style={{ "--card-col": column, "--card-row": row } as CSSProperties}
            onMouseEnter={() => setHovered(chapter.name)}
            onMouseLeave={() => setHovered((prev) => (prev === chapter.name ? null : prev))}
          >
            <div className="image-frame" style={{ backgroundImage: `url("${chapter.imageSrc}")`, ...chapter.imageStyle }}></div>
            <div className="card-copy">
              <div className="card-header">
                <h3>{chapter.name}</h3>
                {/* Just "Explore" rather than "Explore <name>": the cards are
                    narrower in this layout and the longer names wrapped the
                    header onto two lines. The card is one link, so the name
                    in the heading beside it still carries the context. */}
                <span className="card-link">Explore →</span>
              </div>
              <p>{chapter.blurb}</p>
            </div>
          </Link>
        );
      })}

      {isDesktop && ukFeature && path && projection && (
        <div className="chapters-map-canvas">
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Map of the UK showing where PauseAI chapters are based">
            {ukFeature.features.map((f, i) => (
              <path key={i} d={path(f) || undefined} className="uk-map-outline" />
            ))}
            {chapters.map((chapter) => {
              const point = projection([chapter.lng, chapter.lat]);
              if (!point) return null;
              const [x, y] = point;
              const isActive = hovered === chapter.name;
              return (
                // The card is the accessible control for each chapter; the
                // pin repeats that link for mouse users without adding a
                // second tab stop or a duplicate screen-reader entry.
                <Link
                  key={chapter.name}
                  href={chapter.href}
                  tabIndex={-1}
                  aria-hidden="true"
                  className={`uk-map-pin ${isActive ? "active" : ""}`}
                  onMouseEnter={() => setHovered(chapter.name)}
                  onMouseLeave={() => setHovered((prev) => (prev === chapter.name ? null : prev))}
                >
                  <circle cx={x} cy={y} r={isActive ? 10 : 8} className="uk-map-pin-halo" />
                  <circle
                    ref={(el) => {
                      pinRefs.current[chapter.name] = el;
                    }}
                    cx={x}
                    cy={y}
                    r={4.5}
                    className="uk-map-pin-dot"
                  />
                </Link>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
