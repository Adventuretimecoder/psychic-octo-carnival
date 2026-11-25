/** Small seeded PRNG (mulberry32) so dungeons and inheritance are reproducible in tests. */
export type Rng = () => number;

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randInt = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
export const pick = <T>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
export const chance = (rng: Rng, p: number) => rng() < p;
export function weighted<T>(rng: Rng, items: readonly T[], weight: (t: T) => number): T {
  const total = items.reduce((s, i) => s + Math.max(0, weight(i)), 0);
  let r = rng() * total;
  for (const i of items) {
    r -= Math.max(0, weight(i));
    if (r <= 0) return i;
  }
  return items[items.length - 1];
}
export const uid = (rng: Rng = Math.random) => Math.floor(rng() * 0xffffffff).toString(36) + Date.now().toString(36).slice(-4);
