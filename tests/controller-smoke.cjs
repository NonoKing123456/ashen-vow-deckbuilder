'use strict';
// Real Chromium document, normal game entry points, synthetic standard Gamepad.
// Set CHROME_PATH for another Chromium executable.
const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
(async () => {
  const locations = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
  ];
  const executablePath = locations.find((p) => p && fs.existsSync(p));
  const browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.addInitScript(() => {
      const pad = {
        connected: true,
        index: 0,
        id: 'QA Virtual Controller',
        mapping: 'standard',
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
      };
      Object.defineProperty(navigator, 'getGamepads', { value: () => [pad.connected ? pad : null] });
      window.testPad = pad;
      localStorage.setItem('ashenvow.prefs', JSON.stringify({ reduced: true, muted: true }));
      localStorage.setItem('ashenvow.chronicle.v1', JSON.stringify({ maxAscension: 3, history: [] }));
    });
    const dir = path.resolve(__dirname, '..');
    await page.goto(pathToFileURL(path.join(dir, 'index.html')).href);
    if (!(await page.locator('#pad-styles').count()))
      await page.addScriptTag({ path: path.join(dir, 'game/controller.js') });
    await page.waitForSelector('[data-play="0"]');
    const settle = () =>
      page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    async function press(i, on) {
      await page.evaluate(
        ([i, on]) => {
          testPad.buttons[i].pressed = on;
          testPad.buttons[i].value = +on;
        },
        [i, on],
      );
      await settle();
    }
    async function tap(i) {
      await press(i, true);
      await press(i, false);
    }
    async function focused(selector) {
      return page.evaluate((s) => document.activeElement?.matches(s), selector);
    }
    async function find(selector) {
      for (let n = 0; n < 85; n++) {
        if (await focused(selector)) return;
        await tap(5);
      }
      throw new Error('Unreachable controller target: ' + selector);
    }
    const saved = () => page.evaluate(() => Campaign.load());
    assert.equal(await page.locator('.using-pad').count(), 0);
    await tap(15);
    assert.ok(await focused('[data-play="0"]'));
    await tap(6);
    assert.equal(await page.locator('.inspect-layout').count(), 1);
    await tap(1);
    assert.ok(await focused('[data-play="0"]'));
    await tap(15);
    assert.ok(await focused('[data-play="1"]'));
    await tap(0);
    assert.equal((await saved()).battle.block, 5);
    assert.ok(await focused('[data-play="1"]'));
    const t = (await saved()).battle.turn;
    await press(2, true);
    await page.waitForTimeout(450);
    assert.equal((await saved()).battle.turn, t + 1);
    await press(2, false);
    await tap(3);
    assert.equal(await page.locator('#overlay[open] #map-preview').count(), 1);
    await tap(2);
    assert.equal((await saved()).battle.turn, t + 1);
    await tap(1);
    assert.equal(await page.locator('#overlay[open]').count(), 0);
    await tap(1);
    await find('input[data-setting=music]');
    const volume = +(await page.locator('input[data-setting=music]').inputValue());
    await tap(15);
    assert.equal(+(await page.locator('input[data-setting=music]').inputValue()), volume + 5);
    await find('[data-setting=reduced]');
    await tap(0);
    await tap(0);
    await find('[data-act=newform]');
    await tap(0);
    await find('#ascend');
    await tap(15);
    assert.equal(await page.locator('#ascend').inputValue(), '1');
    await find('#run-seed');
    await tap(0);
    await find('[data-pad-key=A]');
    await tap(0);
    await tap(15);
    await tap(0);
    await find('[data-pad-key=apply]');
    await tap(0);
    assert.equal(await page.locator('#run-seed').inputValue(), 'AB');
    await tap(1);
    assert.ok(await page.locator('#overlay [data-setting=music]').count());
    await tap(1);
    await find('#hud [data-act=codex]');
    await tap(0);
    await find('.card-grid [data-card]');
    await tap(0);
    assert.equal(await page.locator('.inspect-layout').count(), 1);
    await tap(1);
    assert.equal(await page.locator('.card-grid').count(), 1);
    await page.evaluate(() => {
      testPad.axes[3] = 1;
    });
    await page.waitForTimeout(260);
    await page.evaluate(() => {
      testPad.axes[3] = 0;
    });
    assert.ok(await page.locator('.modal-content').evaluate((el) => el.scrollTop > 0));
    await tap(1);
    await page.evaluate(() => {
      testPad.axes[0] = -0.85;
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      testPad.axes[0] = 0;
    });
    await settle();
    await page.mouse.move(10, 12);
    assert.equal(await page.locator('.using-pad').count(), 0);
    await page.keyboard.press('m');
    assert.equal(await page.locator('#overlay[open] #map-preview').count(), 1);
    await tap(1);
    assert.equal(await page.locator('#overlay[open]').count(), 0);
    await page.evaluate(() => {
      testPad.connected = false;
    });
    await settle();
    assert.equal(await page.locator('.using-pad, .pad-help').count(), 0);
    await press(2, true);
    await page.evaluate(() => {
      testPad.connected = true;
    });
    await settle();
    assert.equal((await saved()).battle.turn, t + 1);
    await press(2, false);
    // Load a near-victory position, then advance through the game's reward and
    // route screens strictly through the controller UI.
    await page.evaluate(() => {
      const run = Campaign.newRun({ seed: 'PAD-ROUTE' });
      run.battle.enemy.hp = 1;
      Campaign.save(run);
    });
    await page.reload();
    if (!(await page.locator('#pad-styles').count()))
      await page.addScriptTag({ path: path.join(dir, 'game/controller.js') });
    await tap(0);
    await tap(0);
    await page.waitForSelector('.ex-card-offer');
    await find('.ex-card-offer');
    await tap(0);
    await page.waitForSelector('.ex-map-actions .ex-route');
    await find('.ex-map-actions .ex-route');
    await tap(0);
    assert.equal((await saved()).floor, 2);
    assert.deepEqual(errors, []);
    console.log(
      'Gamepad OK: spatial navigation, redraw, hold edges, combat, reward, route selection, inspection, modal guard, settings, seed entry, select, archive scrolling, mouse/keyboard handoff, disconnect and reconnect.',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
