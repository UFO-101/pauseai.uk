// A small map of the United Kingdom, drawn as a line: its outline, from
// Natural Earth's 1:10m map (public domain, naturalearthdata.com, the same
// file as the local groups' map), and where a place falls on it. Worked out
// once, when first asked for.
import { geoMercator, geoPath, type GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection } from "geojson";
import type { Topology } from "topojson-specification";
import topology from "@/public/data/uk-local-groups-map.topo.json";

/** The map's size, in its own units: as tall as the country is, for its width. */
export const UK_MAP_WIDTH = 60;
export const UK_MAP_HEIGHT = 100;

let drawn: { outline: string; projection: GeoProjection } | undefined;

function draw() {
  if (!drawn) {
    const uk = topology as unknown as Topology;
    const shape = feature(uk, uk.objects[Object.keys(uk.objects)[0]]) as FeatureCollection;
    const projection = geoMercator().fitExtent(
      [
        [1, 1],
        [UK_MAP_WIDTH - 1, UK_MAP_HEIGHT - 1],
      ],
      shape,
    );
    drawn = { outline: geoPath(projection)(shape)!, projection };
  }
  return drawn;
}

/** The UK's outline, as an SVG path in the map's units. */
export function ukOutline(): string {
  return draw().outline;
}

/** Where a place is on the map, or undefined if it's off it. */
export function ukMapPoint(latitude: number, longitude: number): { x: number; y: number } | undefined {
  const [x, y] = draw().projection([longitude, latitude])!;
  return x >= 0 && x <= UK_MAP_WIDTH && y >= 0 && y <= UK_MAP_HEIGHT ? { x, y } : undefined;
}
