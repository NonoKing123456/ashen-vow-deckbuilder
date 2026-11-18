const { _electron } = require('playwright-core');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const assert = require('node:assert/strict');
(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ashen-desktop-qa-'));
  const executablePath = process.argv[2] || require('electron');
  const args = [...(process.argv[2] ? [] : ['.']), '--user-data-dir=' + profile];
  const errors = [];
  async function open() {
    const app = await _electron.launch({ executablePath, args, timeout: 40000 });
    try {
      const w = await app.firstWindow();
      w.on('pageerror', (e) => errors.push(e.message));
      w.on('requestfailed', (r) => errors.push(r.url() + ' ' + r.failure().errorText));
      await w.waitForSelector('.hand-card', { timeout: 15000 });
      return { app, w };
    } catch (e) {
      await app.close();
      throw e;
    }
  }
  let state = await open(),
    saved;
  try {
    await state.w.locator('.hand-card').nth(2).click();
    saved = await state.w.evaluate(() => Campaign.load());
    assert.equal(saved.battle.ember, 4);
    assert.ok(fs.existsSync(path.join(profile, 'saves', 'expedition.json')));
    await state.w.locator('[data-act="map"]').click();
    await state.w.waitForSelector('#map-preview .ex-atlas');
    await state.w.keyboard.press('Escape');
    await state.w.locator('[data-act="settings"]').click();
    await state.w.getByLabel('减少动态效果').check();
    await state.w.keyboard.press('Escape');
  } finally {
    await state.app.close();
  }
  state = await open();
  try {
    assert.deepEqual(await state.w.evaluate(() => Campaign.load()), saved);
    assert.equal(await state.w.evaluate(() => document.documentElement.classList.contains('quiet')), true);
    await state.w.locator('[data-act="end"]').click();
    assert.equal(await state.w.evaluate(() => Campaign.load().battle.turn), 2);
    assert.equal(await state.w.locator('.hand-card').count(), 5);
    assert.deepEqual(errors, []);
  } finally {
    await state.app.close();
  }
  console.log(
    'Desktop OK: startup, native save files, card play, map, preferences, quit, restored hand and next turn.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
