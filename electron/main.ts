import { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, screen } from 'electron';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { advancePet, initialPet, petLiam, PET_WIDTH, type PetState } from '../src/core/behavior';
const SIZE = PET_WIDTH;
const isSupported = process.platform === 'darwin' || process.platform === 'win32';
let petWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let pet: PetState = initialPet(600);
let paused = false;
let allowClicks = false;
let timer: NodeJS.Timeout | null = null;
let lastTick = Date.now();
let alphaMask: Uint8Array | null = null;
function spritePath(): string {
  const packaged = path.join(__dirname, '../dist/assets/liam-walk.png');
  const dev = path.join(app.getAppPath(), 'public/assets/liam-walk.png');
  return existsSync(packaged) ? packaged : dev;
}
function settingsPath(): string { return path.join(app.getPath('userData'), 'settings.json'); }
function restoreSettings(): void {
  try { const raw = JSON.parse(readFileSync(settingsPath(), 'utf8'));
    paused = raw.paused === true;
  } catch { /* first launch */ }
}
function saveSettings(): void {
  try { writeFileSync(settingsPath(), JSON.stringify({ paused }), 'utf8'); } catch { /* non-critical */ }
}
function buildHitMask(image: Electron.NativeImage): void {
  const size = image.getSize();
  if (size.width !== 320 || size.height !== 160) return;
  const bytes = image.toBitmap(); // Electron RGBA layout; byte 3 is alpha
  const mask = new Uint8Array(80 * 80);
  for (let frame = 0; frame < 8; frame++) {
    const sx = (frame % 4) * 80, sy = Math.floor(frame / 4) * 80;
    for (let y = 0; y < 80; y++) for (let x = 0; x < 80; x++) {
      if (bytes[((sy + y) * size.width + sx + x) * 4 + 3] > 100) mask[y * 80 + x] = 1;
    }
  }
  alphaMask = mask;
}
function hitTest(point: Electron.Point, bounds: Electron.Rectangle): boolean {
  const rx = (point.x - bounds.x) * 80 / bounds.width;
  const ry = (point.y - bounds.y) * 80 / bounds.height;
  if (rx < 0 || rx >= 80 || ry < 0 || ry >= 80) return false;
  const x = Math.floor(rx), y = Math.floor(ry);
  // Fallback only used if an asset cannot be loaded.
  return alphaMask ? alphaMask[y * 80 + x] === 1 : (x > 7 && x < 75 && y > 12 && y < 76);
}
function keepOnDisplay(): void {
  if (!petWindow) return;
  const display = screen.getDisplayMatching(petWindow.getBounds());
  const area = display.workArea;
  pet.x = Math.max(0, Math.min(pet.x, area.width - SIZE));
  petWindow.setPosition(area.x + Math.round(pet.x), area.y + area.height - SIZE, false);
}
function tick(): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  const now = Date.now(), dt = Math.min(250, now - lastTick); lastTick = now;
  const area = screen.getDisplayMatching(petWindow.getBounds()).workArea;
  if (!paused) pet = advancePet(pet, dt, area.width - SIZE);
  keepOnDisplay();
  petWindow.webContents.send('dpet:state', pet);
  // Transparent regions should never block clicks intended for other apps.
  const overPet = hitTest(screen.getCursorScreenPoint(), petWindow.getBounds());
  if (allowClicks !== overPet) {
    allowClicks = overPet;
    petWindow.setIgnoreMouseEvents(!overPet, { forward: true });
  }
}
function menu(): Electron.Menu {
  return Menu.buildFromTemplate([
    { label: paused ? 'Let Liam roam' : 'Pause Liam', click: () => { paused = !paused; saveSettings(); updateTray(); } },
    { label: 'Pet Liam', click: () => pat() },
    { label: 'Turn around', click: () => { pet.direction = pet.direction === 1 ? -1 : 1; pet.activity = 'walk'; pet.elapsedMs = 0; pet.activityMs = 2400; } },
    { type: 'separator' },
    { label: 'Launch at login', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin, enabled: app.isPackaged && isSupported,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }) },
    { type: 'separator' },
    { label: 'Quit DPet', click: () => app.quit() }
  ]);
}
function updateTray(): void { tray?.setContextMenu(menu()); }
function pat(): void {
  pet = petLiam(pet);
  petWindow?.webContents.send('dpet:pat');
  petWindow?.webContents.send('dpet:state', pet);
}
function createApp(): void {
  restoreSettings();
  const area = screen.getPrimaryDisplay().workArea;
  pet = initialPet(Math.max(0, area.width - SIZE));
  const atlas = nativeImage.createFromPath(spritePath());
  if (!atlas.isEmpty()) buildHitMask(atlas);
  const icon = atlas.isEmpty() ? nativeImage.createEmpty() : atlas.crop({x:0,y:0,width:80,height:80}).resize({width:32,height:32});
  if (!icon.isEmpty()) {
    tray = new Tray(icon);
    tray.setToolTip('DPet · Liam');
    updateTray();
    tray.on('double-click', () => pat());
  }
  petWindow = new BrowserWindow({
    width:SIZE, height:SIZE, x:area.x+Math.round(pet.x),
    y:area.y+area.height-SIZE, frame:false, transparent:true,
    resizable:false, fullscreenable:false, hasShadow:false,
    skipTaskbar:true, alwaysOnTop:true, show:false, backgroundColor:'#00000000',
    webPreferences: {
      preload:path.join(__dirname,'preload.cjs'), contextIsolation:true,
      nodeIntegration:false, sandbox:true
    }
  });
  petWindow.setAlwaysOnTop(true, 'floating');
  petWindow.setVisibleOnAllWorkspaces(true, {visibleOnFullScreen:false});
  petWindow.setIgnoreMouseEvents(true, {forward:true});
  petWindow.webContents.setWindowOpenHandler(() => ({ action:'deny' }));
  const isDev = !app.isPackaged;
  if (isDev) void petWindow.loadURL('http://127.0.0.1:5173/');
  else void petWindow.loadFile(path.join(__dirname,'../dist/index.html'));
  petWindow.once('ready-to-show', () => petWindow?.showInactive());
  petWindow.webContents.on('did-finish-load', () => petWindow?.webContents.send('dpet:state', pet));
  ipcMain.on('dpet:ready', () => petWindow?.webContents.send('dpet:state', pet));
  ipcMain.on('dpet:pat', pat);
  screen.on('display-metrics-changed', keepOnDisplay);
  lastTick = Date.now(); timer = setInterval(tick, 60);
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => petWindow?.showInactive());
  app.whenReady().then(() => {
    if (process.platform === 'darwin') app.dock?.hide();
    if (process.platform === 'win32') app.setAppUserModelId('ir.dpet.liam');
    createApp();
  }).catch(console.error);
  app.on('before-quit', () => { if (timer) clearInterval(timer); saveSettings(); });
  app.on('window-all-closed', () => app.quit());
}
