'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1366, height: 768 },
      reducedMotion: 'no-preference',
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href, {
      waitUntil: 'networkidle',
    });
    await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T12:00:02Z'));
    const displayed = () => page.locator('.fighter-hud.enemy .hp-line strong').textContent();
    const play = (key) =>
      page.evaluate(
        (k) => document.querySelector('button.hand-card:has([data-card="' + k + '"])').click(),
        key,
      );
    await play('strike');
    assert.equal(await page.evaluate(() => Campaign.load().battle.enemy.hp), 32);
    assert.equal(await displayed(), '38 / 38');
    await page.clock.runFor(120);
    assert.equal(await displayed(), '38 / 38');
    await page.clock.runFor(90);
    assert.equal(await displayed(), '32 / 38');
    assert.equal(
      await page.locator('.hero-model.posed .pose-art').getAttribute('src'),
      'assets/motion/hero-cleave-03.webp',
    );
    assert.equal(
      await page.locator('.foe-model.posed .pose-art').getAttribute('src'),
      'assets/motion/foe-bellkeeper-hit.webp',
    );
    // Only one follow-up card can be committed during recovery.
    await play('ward');
    await play('ward');
    await page.clock.runFor(1050);
    assert.deepEqual(
      await page.evaluate(() => {
        const b = Campaign.load().battle;
        return [b.block, b.energy];
      }),
      [5, 1],
    );
    await page.locator('[data-act="end"]').evaluate((el) => el.click());
    await page.clock.runFor(430);
    const box = await page
      .locator('.combat-result[data-side="player"] .battle-number')
      .evaluateAll((els) =>
        els.map((el) => ({
          text: el.textContent,
          top: el.getBoundingClientRect().top,
          bottom: el.getBoundingClientRect().bottom,
        })),
      );
    assert.deepEqual(
      box.map((r) => r.text),
      ['−2', '格挡 5'],
    );
    assert.ok(box[1].top >= box[0].bottom, 'block and damage overlap');
    await page.clock.runFor(950);
    assert.equal(await page.locator('#arena.performing').count(), 0);
    const frames = await page.evaluate(() =>
      Object.values(AshMotion).flatMap((actor) => Object.values(actor.clips).flatMap((clip) => clip.frames)),
    );
    for (const file of frames) assert.ok(fs.existsSync(path.resolve(__dirname, '..', file)), file);
    assert.deepEqual(errors, []);
    console.log(
      'Combat presentation OK: pre-contact HP, saved outcome, impact pose, recoil, buffered play, partial block labels, and motion assets.',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
