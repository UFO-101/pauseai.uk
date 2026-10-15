"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type { Topology } from "topojson-specification";
import { localGroups } from "@/lib/content/local-groups";
import { connectorPath } from "@/lib/map-connector";

const MAP_W = 380;
const MAP_H = 608;

// Matches the breakpoint the stylesheet uses to drop the three-column
// arrangement. Below it the cards stand on their own, so the map data is
// never fetched and no connectors are drawn.
const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribeToDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function isDesktopNow() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

export default function LocalGroupsMap() {
  // False on the server and during hydration, then whether the window is wide enough.
  const isDesktop = useSyncExternalStore(subscribeToDesktop, isDesktopNow, () => false);
  const [ukFeature, setUkFeature] = useState<FeatureCollection<Geometry> | null>(null);
  const [links, setLinks] = useState<{ name: string; d: string }[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const pinRefs = useRef<Record<string, SVGCircleElement | null>>({});

  useEffect(() => {
    if (!isDesktop || ukFeature) return;
    let cancelled = false;
    // A dedicated UK-only topology (Natural Earth 10m, simplified ~12% with
    // mapshaper): the site's world-countries-50m file is coarse enough to
    // turn the coastline into a blocky silhouette at this zoom.
    fetch("/data/uk-local-groups-map.topo.json")
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
        ukFeature,
      )
    : null;
  const path = projection && geoPath(projection);

  // The cards are placed by CSS grid and the pins by the map projection, so
  // the only reliable way to join the two is to measure both after layout
  // and draw the connectors in a pixel-space overlay. It takes the wrapper
  // the effect found, not wrapRef.current: a resize can still call it as the
  // map unmounts, after React has set the ref to null.
  const measure = useCallback((wrap: HTMLDivElement) => {
    const w = wrap.getBoundingClientRect();
    setLinks(
      localGroups.flatMap((localGroup) => {
        const card = cardRefs.current[localGroup.name];
        const pin = pinRefs.current[localGroup.name];
        // When the window narrows past the breakpoint, React removes the pins
        // before this effect's cleanup stops the ResizeObserver, so a resize
        // in between finds no pin.
        if (!card || !pin) return [];
        return [
          {
            name: localGroup.name,
            d: connectorPath(card.getBoundingClientRect(), pin.getBoundingClientRect(), w, localGroup.side === "left"),
          },
        ];
      }),
    );
  }, []);

  useEffect(() => {
    if (!isDesktop || !ukFeature) return;
    const wrap = wrapRef.current!;
    const update = () => measure(wrap);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    for (const el of Object.values(cardRefs.current)) ro.observe(el!);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [isDesktop, ukFeature, measure]);

  return (
    <div className="local-groups-map" ref={wrapRef}>
      {isDesktop && ukFeature && links.length > 0 && (
        <svg className="local-groups-map-links" aria-hidden="true">
          {links.map((l) => (
            <path key={l.name} d={l.d} className={`local-groups-map-link ${hovered === l.name ? "active" : ""}`} />
          ))}
        </svg>
      )}

      {localGroups.map((localGroup, i) => {
        const row = (i % 3) + 1;
        const column = localGroup.side === "left" ? 1 : 3;
        return (
          <Link
            key={localGroup.name}
            href={localGroup.href}
            ref={(el) => {
              cardRefs.current[localGroup.name] = el;
            }}
            className="local-group-card local-groups-map-card"
            style={{ "--card-col": column, "--card-row": row } as CSSProperties}
            onMouseEnter={() => setHovered(localGroup.name)}
            onMouseLeave={() => setHovered((prev) => (prev === localGroup.name ? null : prev))}
          >
            <div
              className="image-frame"
              style={{ backgroundImage: `url("${localGroup.imageSrc}")`, ...localGroup.imageStyle }}
            ></div>
            <div className="card-copy">
              <div className="card-header">
                <h3>{localGroup.name}</h3>
                {/* Just "Explore" rather than "Explore <name>": the cards are
                    narrower in this layout and the longer names wrapped the
                    header onto two lines. The card is one link, so the name
                    in the heading beside it still carries the context. */}
                <span className="card-link">Explore →</span>
              </div>
              <p>{localGroup.blurb}</p>
            </div>
          </Link>
        );
      })}

      {/* Rendered from the server so the grid reserves the map's column and
          height before the topology arrives; filling it in later then moves
          nothing below, including the section anchors further down the page.
          The stylesheet hides it below the three-column breakpoint. */}
      <div className="local-groups-map-canvas">
        {isDesktop && path && (
          <svg
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Map of the UK showing where PauseAI local groups are based"
          >
            {ukFeature!.features.map((f, i) => (
              <path key={i} d={path(f) || undefined} className="uk-map-outline" />
            ))}
            {localGroups.map((localGroup) => {
              // Mercator projects every point on Earth, so this is never null.
              const [x, y] = projection!([localGroup.lng, localGroup.lat])!;
              const isActive = hovered === localGroup.name;
              return (
                // The card is the accessible control for each local group; the
                // pin repeats that link for mouse users without adding a
                // second tab stop or a duplicate screen-reader entry.
                <Link
                  key={localGroup.name}
                  href={localGroup.href}
                  tabIndex={-1}
                  aria-hidden="true"
                  className={`uk-map-pin ${isActive ? "active" : ""}`}
                  onMouseEnter={() => setHovered(localGroup.name)}
                  onMouseLeave={() => setHovered((prev) => (prev === localGroup.name ? null : prev))}
                >
                  <circle cx={x} cy={y} r={isActive ? 10 : 8} className="uk-map-pin-halo" />
                  <circle
                    ref={(el) => {
                      pinRefs.current[localGroup.name] = el;
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
        )}
      </div>
    </div>
  );
}
