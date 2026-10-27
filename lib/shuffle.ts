// The seed for a fixture build's shuffles: any fixed number.
const FIXTURE_SEED = 2026;

/** A shuffled copy of `arr` (Fisher–Yates), `random` picking each position. */
export function shuffle<T>(arr: readonly T[], random: () => number = defaultRandom()): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Math.random, or in a fixture build (DATA_FIXTURES=1) a seeded sequence, so
 * what it picks, such as the order of the home page's hero or a download's
 * code, is the same on every render and the storyboard can compare it.
 */
export function defaultRandom(): () => number {
  return process.env.DATA_FIXTURES === "1" ? seededRandom(FIXTURE_SEED) : Math.random;
}

/** A random() in [0, 1) that gives the same sequence for the same seed (mulberry32). */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
