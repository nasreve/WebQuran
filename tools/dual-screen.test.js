const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

test('shared projector window switches content without recreating or reloading the same page', () => {
  const filename = path.resolve(__dirname, '../main.js');
  const code = fs.readFileSync(filename, 'utf8').split('// ── App Lifecycle + IPC Handlers')[0];
  const windows = [], events = [];
  class Window {
    constructor(options) { this.options = options; this.urls = []; windows.push(this); }
    isDestroyed() { return false; }
    loadURL(url) { this.urls.push(url); }
    focus() { this.focused = true; }
    on(name, handler) { if (name === 'closed') this.closed = handler; }
  }
  const primary = { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 } };
  const secondary = { id: 2, bounds: { x: 1920, y: 0, width: 1280, height: 720 } };
  const electron = { BrowserWindow: Window, screen: { getAllDisplays: () => [primary, secondary], getPrimaryDisplay: () => primary } };
  const ctx = vm.createContext({ require: name => name === 'electron' ? electron : require(name), __dirname: path.dirname(filename), URL, console });
  vm.runInContext(code, ctx);
  ctx.operator = { isDestroyed: () => false, webContents: { send: (channel, value) => events.push({ channel, value }) } };
  vm.runInContext('mainWindow = operator; createPresentationWindow(34730);', ctx);
  assert.equal(windows.length, 1);
  assert.equal(windows[0].options.x, secondary.bounds.x);
  assert.equal(windows[0].urls[0], 'http://localhost:34730/presentation.html');
  vm.runInContext('createPresentationWindow(34730, "hadith");', ctx);
  assert.equal(windows.length, 1);
  assert.equal(windows[0].urls.at(-1), 'http://localhost:34730/hadith-presentation.html');
  assert.equal(vm.runInContext('getPresentationState().content', ctx), 'hadith');
  vm.runInContext('createPresentationWindow(34730, "hadith"); createPresentationWindow(34730, "invalid");', ctx);
  assert.equal(windows[0].urls.length, 2);
  vm.runInContext('createPresentationWindow(34730, "quran");', ctx);
  assert.equal(windows.length, 1);
  assert.equal(windows[0].urls.at(-1), 'http://localhost:34730/presentation.html');
  windows[0].closed();
  assert.equal(vm.runInContext('getPresentationState().open', ctx), false);
  assert.equal(vm.runInContext('getPresentationState().content', ctx), null);
  assert.equal(events.findLast(event => event.channel === 'presentation-status').value, false);
});

test('browser projector reuses one popup and switches only on an explicit selection', () => {
  const calls = [], timers = [], statuses = [];
  const button = { classList: { add() {}, remove() {} }, setAttribute() {} };
  const popup = { closed: false, location: { href: '' }, focus() {}, close() { this.closed = true; } };
  const window = {
    screen: { availWidth: 1920, availHeight: 1080 },
    open: (...args) => { calls.push(args); return popup; },
    dispatchEvent: event => statuses.push(event.detail),
  };
  const ctx = vm.createContext({ window, document: { getElementById: () => button }, CustomEvent: class { constructor(name, options) { this.detail = options.detail; } }, showToast() {}, setInterval: callback => { timers.push(callback); return timers.length; }, clearInterval() {}, localStorage: { setItem() {} }, fetch: () => Promise.resolve() });
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../js/presentation.js'), 'utf8'), ctx);
  window.ProjectorScreen.selectIfOpen('quran');
  assert.equal(calls.length, 0, 'verse action must not open a projector that is closed');
  assert.equal(window.ProjectorScreen.open('hadith'), true);
  assert.equal(calls[0][0], 'hadith-presentation.html');
  assert.equal(window.ProjectorScreen.getState().content, 'hadith');
  assert.match(button.title, /Hadits/);
  window.ProjectorScreen.selectIfOpen('quran');
  assert.equal(calls.length, 1, 'switching must reuse the existing popup');
  assert.equal(popup.location.href, 'presentation.html');
  assert.match(button.title, /Ayat/);
  window.ProjectorScreen.open('hadith');
  assert.equal(popup.location.href, 'hadith-presentation.html');
  vm.runInContext('pushToPresentation("Arab ayat", "Terjemah ayat", "QS 1:1")', ctx);
  assert.equal(popup.location.href, 'hadith-presentation.html', 'updating Quran data alone must not steal the projector');
  window.ProjectorScreen.open('hadith');
  assert.equal(calls.length, 1);
  popup.closed = true;
  window.ProjectorScreen.selectIfOpen('quran');
  assert.equal(calls.length, 1, 'a manually closed popup must not reopen before the close timer detects it');
  timers[0]();
  assert.equal(window.ProjectorScreen.getState().open, false);
  assert.equal(statuses.at(-1).content, null);
});

test('blocked browser popup leaves projector inactive', () => {
  const ctx = vm.createContext({ window: { screen: {}, open: () => null }, document: {}, showToast() {} });
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../js/presentation.js'), 'utf8'), ctx);
  assert.equal(ctx.window.ProjectorScreen.open('hadith'), false);
  assert.equal(ctx.window.ProjectorScreen.getState().open, false);
});

test('Electron operator switches shared projector and ignores a stale initial status', async () => {
  const calls = [];
  let onState;
  const button = { classList: { add() {}, remove() {} }, setAttribute() {} };
  const window = {
    electronAPI: {
      isElectron: true,
      onPresentationState: callback => { onState = callback; },
      getPresentationState: () => Promise.resolve({ open: false, content: null }),
      openPresentation: content => calls.push(content),
      closePresentation: () => calls.push('close'),
    },
    dispatchEvent() {},
  };
  const ctx = vm.createContext({ window, document: { getElementById: () => button }, CustomEvent: class {}, clearInterval() {} });
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../js/presentation.js'), 'utf8'), ctx);
  window.ProjectorScreen.open('hadith');
  await Promise.resolve();
  assert.equal(window.ProjectorScreen.getState().content, 'hadith');
  window.ProjectorScreen.selectIfOpen('quran');
  assert.deepEqual(calls, ['hadith', 'quran']);
  onState({ open: true, content: 'quran' });
  assert.match(button.title, /Ayat/);
  onState({ open: false, content: null });
  window.ProjectorScreen.selectIfOpen('quran');
  assert.equal(calls.length, 2, 'closed Electron projector must remain closed on verse actions');
});
