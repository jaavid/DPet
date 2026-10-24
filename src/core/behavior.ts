/** Portable, deterministic pet logic. No DOM, Electron or platform imports. */
export type Activity = 'walk' | 'idle' | 'nap' | 'play';
export type Direction = 1 | -1;
export interface PetState {
  x: number; direction: Direction; activity: Activity;
  activityMs: number; elapsedMs: number; affection: number;
}
export const PET_WIDTH = 220;
export const WALK_SPEED = 42; // CSS px per second
export const initialPet = (maxX: number): PetState => ({
  x: Math.max(0, maxX / 2), direction: 1, activity: 'walk',
  activityMs: 2800, elapsedMs: 0, affection: 0
});
export const clamp = (x: number, min: number, max: number): number =>
  Math.min(Math.max(x, min), Math.max(min, max));
/** Random must be injected so behavior is predictable in tests. */
export function advancePet(state: PetState, deltaMs: number, maxX: number, random: () => number = Math.random): PetState {
  const s = { ...state };
  const dt = clamp(deltaMs, 0, 250);
  const bound = Math.max(0, maxX);
  s.elapsedMs += dt;
  if (s.activity === 'walk') {
    s.x += s.direction * WALK_SPEED * dt / 1000;
    if (s.x >= bound) { s.x = bound; s.direction = -1; s.activity = 'idle'; s.elapsedMs = 0; s.activityMs = 700; }
    if (s.x <= 0) { s.x = 0; s.direction = 1; s.activity = 'idle'; s.elapsedMs = 0; s.activityMs = 700; }
  }
  if (s.elapsedMs >= s.activityMs) {
    s.elapsedMs = 0;
    if (s.activity === 'play') { s.activity = 'idle'; s.activityMs = 700; }
    else if (s.activity === 'nap') { s.activity = 'idle'; s.activityMs = 900; }
    else if (s.activity === 'walk') {
      s.activity = random() < 0.22 ? 'nap' : 'idle'; s.activityMs = s.activity === 'nap' ? 4500 : 700 + random() * 1100;
    } else {
      const roll = random();
      s.activity = roll < 0.12 ? 'nap' : 'walk';
      if (roll > 0.7) s.direction = s.direction === 1 ? -1 : 1;
      s.activityMs = s.activity === 'walk' ? 2500 + random() * 4500 : 3800;
    }
  }
  s.x = clamp(s.x, 0, bound);
  return s;
}
export function petLiam(state: PetState): PetState {
  return { ...state, activity: 'play', elapsedMs: 0, activityMs: 1300, affection: state.affection + 1 };
}
