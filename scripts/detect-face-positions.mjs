#!/usr/bin/env node
// Detects the largest face in each photo under public/images/people/ and
// writes a suggested `background-position` into the matching person's
// `imageStyle` in lib/data/people.ts (the .person-avatar /
// .person-detail-avatar square crop). Re-run after adding/replacing a
// photo. Pass --dry-run to only print suggestions without writing.
import "@tensorflow/tfjs-backend-cpu";
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";
import sharp from "sharp";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// tfjs-node (native binding) crashes on this project's Node version, so we run
// on the plain CPU backend instead — slower, but fine for a handful of small
// images run manually. Prod mode silences its "install tfjs-node for speed" nag.
tf.enableProdMode();
await tf.setBackend("cpu");

async function decodeImage(filePath) {
  const { data, info } = await sharp(filePath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return tf.tensor3d(data, [info.height, info.width, info.channels], "int32");
}

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const peopleDir = path.join(rootDir, "public/images/people");
const peopleTsPath = path.join(rootDir, "lib/data/people.ts");

// The `people` array is a plain JSON-compatible literal inside people.ts —
// pull it out by its surrounding markers, JSON.parse it, and splice the
// updated JSON back in, leaving the type defs and helper functions as-is.
const PEOPLE_ARRAY_PATTERN = /(export const people: Person\[\] =\n)([\s\S]*?\n\])(;)/;

function readPeople(source) {
  const match = source.match(PEOPLE_ARRAY_PATTERN);
  if (!match) throw new Error(`Could not find the people array literal in ${peopleTsPath}`);
  // It's a .ts file, so an editor's format-on-save happily leaves trailing
  // commas (valid JS, not valid JSON) before a closing `}` or `]`.
  const withoutTrailingCommas = match[2].replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(withoutTrailingCommas);
}

function writePeople(source, persons) {
  return source.replace(PEOPLE_ARRAY_PATTERN, (_, before, _array, after) => `${before}${JSON.stringify(persons, null, 2)}${after}`);
}

const args = process.argv.slice(2);
const write = !args.includes("--dry-run");
const files = args.filter((a) => a !== "--dry-run");
const targets = files.length > 0 ? files : readdirSync(peopleDir).filter((f) => /\.(jpe?g|png)$/i.test(f));

const peopleTsSource = write ? readFileSync(peopleTsPath, "utf8") : null;
const persons = write ? readPeople(peopleTsSource) : null;
let updated = 0;

const model = await blazeface.load();

for (const file of targets) {
  const filePath = path.isAbsolute(file) ? file : path.join(peopleDir, file);
  const imageTensor = await decodeImage(filePath);
  const [height, width] = imageTensor.shape;

  const predictions = await model.estimateFaces(imageTensor, false);
  imageTensor.dispose();

  if (predictions.length === 0) {
    console.log(`${path.basename(filePath)}: no face found (${width}x${height})`);
    continue;
  }

  // Largest face by bounding-box area, in case of multiple people.
  const largest = predictions.reduce((best, p) => {
    const area = (p.bottomRight[0] - p.topLeft[0]) * (p.bottomRight[1] - p.topLeft[1]);
    return area > best.area ? { p, area } : best;
  }, { p: null, area: -1 }).p;

  const cx = (largest.topLeft[0] + largest.bottomRight[0]) / 2;
  const cy = (largest.topLeft[1] + largest.bottomRight[1]) / 2;
  const px = Math.round((100 * cx) / width);
  const py = Math.round((100 * cy) / height);
  const imageStyle = `background-position: ${px}% ${py}%;`;

  if (write) {
    const basename = path.basename(filePath);
    const person = persons.find((s) => s.imageSrc && path.basename(s.imageSrc) === basename);
    if (!person) {
      console.log(`${basename}: ${width}x${height}, ${predictions.length} face(s) -> no matching person in people.json, skipped`);
      continue;
    }
    person.imageStyle = imageStyle;
    updated++;
    console.log(`${basename}: ${width}x${height}, ${predictions.length} face(s) -> updated "${person.name}" imageStyle: "${imageStyle}"`);
  } else {
    console.log(`${path.basename(filePath)}: ${width}x${height}, ${predictions.length} face(s) -> imageStyle: "${imageStyle}"`);
  }
}

if (write && updated > 0) {
  writeFileSync(peopleTsPath, writePeople(peopleTsSource, persons));
  console.log(`\nWrote ${updated} update(s) to lib/data/people.ts`);
}
