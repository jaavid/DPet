import { advancePet, initialPet, petLiam, type PetState } from './core/behavior';
import './style.css';
const canvas = document.querySelector<HTMLCanvasElement>('#liam')!;
const ctx = canvas.getContext('2d', { alpha: true })!;
ctx.imageSmoothingEnabled = false;
const desktop = Boolean(window.dpet);
document.body.classList.add(desktop ? 'desktop' : 'preview');
const image = new Image();
image.src = './assets/liam-walk.png';
let ready = false; image.onload = () => { ready = true; };
const freeze = document.querySelector<HTMLButtonElement>('#pause')!;
const petButton = document.querySelector<HTMLButtonElement>('#pet')!;
let state: PetState = initialPet(Math.max(0, innerWidth - 220));
let halted = false;
let last = performance.now();
let sceneTime = 0;
let playbackAt = performance.now();
const sayHello = () => {
  if (desktop) window.dpet?.pat();
  else state = petLiam(state);
  playbackAt = performance.now();
};
canvas.addEventListener('click', sayHello);
petButton.addEventListener('click', sayHello);
freeze.addEventListener('click', () => {
  halted = !halted; freeze.textContent = halted ? 'Resume' : 'Pause';
});
window.dpet?.onState((next) => {
  if (next.activity !== state.activity || next.direction !== state.direction) playbackAt = performance.now();
  state = next;
});
window.dpet?.onPat(() => { playbackAt = performance.now(); });
function drawFallback(): void {
  ctx.fillStyle = '#f5ecdb';ctx.fillRect(10,30,57,31);ctx.fillRect(10,60,11,14);ctx.fillRect(53,58,10,16);
  ctx.fillStyle = '#4d3b33';ctx.fillRect(24,32,11,14);ctx.fillRect(44,37,14,15);ctx.fillRect(4,9,10,43);
  ctx.fillStyle = '#f5ecdb';ctx.fillRect(51,20,26,24);
  ctx.fillStyle = '#7d614b';ctx.fillRect(51,10,8,14);ctx.fillRect(68,9,7,15);
  ctx.fillStyle = '#f3ce5a';ctx.fillRect(70,29,5,5);
  ctx.fillStyle = '#dc989a';ctx.fillRect(77,34,3,3);
}
function render(now: number): void {
  const dt = Math.min(250, now - last); last = now; sceneTime += dt;
  if (!desktop && !halted) {
    state = advancePet(state, dt, Math.max(0, innerWidth - 220));
    canvas.style.left = state.x + 'px';
  }
  ctx.clearRect(0, 0, 80, 80);
  ctx.save();
  const t = now - playbackAt;
  const frame = state.activity === 'walk' ? Math.floor(t / 125) % 8 : 1;
  if (state.direction === -1) { ctx.translate(80, 0); ctx.scale(-1, 1); }
  if (state.activity === 'play') ctx.translate(0, Math.round(-Math.abs(Math.sin(t / 130)) * 4));
  if (state.activity === 'nap') { ctx.translate(0, 5); ctx.scale(1, 0.92); }
  if (ready) ctx.drawImage(image, (frame % 4) * 80, Math.floor(frame / 4) * 80, 80, 80, 0, 0, 80, 80);
  else drawFallback();
  ctx.restore();
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
