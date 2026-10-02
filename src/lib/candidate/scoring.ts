import type { Enums } from "@/types/database";

type Dir = Enums<"swipe_dir">;

/** Kártyaválasz értéke egy kompetenciára: balra = nem megy, jobbra = megy, fel = kifejezetten erős. */
const SKILL_VALUE: Record<Dir, number> = { left: 0, right: 3, up: 5 };

/**
 * Kompetenciaszint (1–5) a kompetenciához tartozó kártyaválaszokból.
 * Ha minden válasz "nem", nincs szint (null). Minden így kapott készség "bemondott" státuszú.
 */
export function skillLevel(answers: Dir[]): number | null {
  if (!answers.length) return null;
  const mean = answers.reduce((s, d) => s + SKILL_VALUE[d], 0) / answers.length;
  if (mean === 0) return null;
  return Math.min(5, Math.max(1, Math.round(mean)));
}

/**
 * Munkastílus-dimenzió pontszáma (0–100) a helyzetkártyákból.
 * jobbra = +1, fel = +2, balra = −1, a fordított állításoknál (polarity −1) előjelváltással.
 */
export function workStyleScore(answers: { direction: Dir; polarity: number }[]): number | null {
  if (!answers.length) return null;
  const raw = answers.reduce((s, a) => s + (a.direction === "up" ? 2 : a.direction === "right" ? 1 : -1) * a.polarity, 0);
  const score = 50 + (50 * raw) / (2 * answers.length);
  return Math.round(Math.min(100, Math.max(0, score)));
}
