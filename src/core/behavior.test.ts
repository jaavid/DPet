import { describe, it, expect } from 'vitest';
import { advancePet, initialPet, petLiam } from './behavior';
describe('portable pet behavior', () => {
  it('starts on screen', () => { expect(initialPet(400).x).toBe(200); });
  it('keeps the cat inside the visible screen', () => {
    let p = initialPet(50); p.x=49;
    p=advancePet(p,200,50,()=>0.5);
    expect(p.x).toBe(50); expect(p.direction).toBe(-1);
  });
  it('does not jump when the computer resumes from sleep', () => {
    const p=advancePet(initialPet(1000),30000,1000,()=>0.5);
    expect(p.x).toBeLessThan(520);
  });
  it('petting switches to play without mutating input', () => {
    const old=initialPet(200), next=petLiam(old);
    expect(next.activity).toBe('play');expect(next.affection).toBe(1);expect(old.affection).toBe(0);
  });
  it('changes activity after a timed walk', () => {
    const p=initialPet(1000);p.elapsedMs=2750;
    expect(advancePet(p,100,1000,()=>0.0).activity).toBe('nap');
  });
});
