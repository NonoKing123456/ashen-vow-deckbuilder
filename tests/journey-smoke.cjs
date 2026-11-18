'use strict';
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const { chromium } = require('playwright-core');
const C = require('../game/campaign');
const E = require('../game/engine');
const { choose } = require('./combat-balance.cjs');

// Derive commands from the public rules, then replay each choice through the UI.
function plan(seed) {
  const run = C.newRun({ seed }),
    inputs = [];
  const priority = [
    'oath',
    'censer',
    'ribbons',
    'aegis',
    'shackle',
    'brand',
    'riposte',
    'absolution',
    'sundering',
    'prayer',
    'bulwark',
    'cinder',
  ];
  const score = (k) => (priority.includes(k) ? 100 - priority.indexOf(k) : 0);
  const ex = (k) => inputs.push({ ex: k });
  for (let guard = 0; guard < 2500; guard++) {
    if (run.phase === 'defeat') return null;
    if (run.phase === 'victory') return { inputs, id: run.seed, deck: run.deck, hp: run.hp };
    if (run.phase === 'combat') {
      const index = choose(run.battle);
      const end = index < 0;
      inputs.push(end ? { act: 'end' } : { index, card: run.battle.hand[index] });
      if (end) E.endTurn(run.battle);
      else E.playCard(run.battle, index);
      const last = run.battle.status !== 'active';
      if (end || last) inputs.at(-1).wait = true;
      C.syncBattle(run);
    } else if (run.phase === 'map') {
      const nodes = C.choices(run);
      const order =
        run.hp < 45
          ? ['camp', 'shop', 'event', 'combat', 'elite']
          : ['camp', 'shop', 'elite', 'event', 'combat'];
      const next = nodes.slice().sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))[0];
      ex('node:' + next.id);
      C.enter(run, next.id);
    } else if (run.phase === 'reward') {
      const cards = run.room.cards;
      const offer = cards.slice().sort((a, b) => score(b) - score(a))[0];
      const take = score(offer) > 0 || run.deck.length < 12;
      ex(take ? 'reward:' + cards.indexOf(offer) : 'skip');
      C.reward(run, take ? offer : null);
    } else if (run.phase === 'camp') {
      if (run.hp < run.maxHp * 0.7) {
        ex('rest');
        C.camp(run, 'rest');
      } else {
        let i = run.deck.findIndex(
          (k) => !k.endsWith('+') && ['oath', 'cinder', 'brand', 'ward'].includes(k),
        );
        if (i < 0) i = run.deck.findIndex((k) => !k.endsWith('+'));
        if (i >= 0) {
          ex('pick:camp');
          ex('index:' + i);
          C.camp(run, 'upgrade', i);
        } else {
          ex('leave');
          C.leave(run);
        }
      }
    } else if (run.phase === 'event') {
      const choice = C.currentEvent(run).options.find(
        (o) => ['respite', 'vigor', 'wage'].includes(o.effect) && C.eventEnabled(run, o.effect),
      );
      if (choice) {
        ex('event:' + choice.id);
        C.event(run, choice.id);
      } else {
        ex('leave');
        C.leave(run);
      }
    } else if (run.phase === 'shop') {
      const relic = run.room.items.find((w) => w.type === 'relic' && !w.sold && w.price <= run.gold);
      if (run.hp < run.maxHp - 11 && run.gold >= 19 && !run.room.items.find((w) => w.key === 'tend').sold) {
        ex('buy:tend');
        C.purchase(run, 'tend');
      } else if (relic) {
        ex('buy:' + relic.key);
        C.purchase(run, relic.key);
      } else {
        ex('leave');
        C.leave(run);
      }
    } else if (run.phase === 'transition') {
      ex('continue');
      C.continueAct(run);
    } else throw new Error('Unknown phase ' + run.phase);
  }
  throw new Error('Run exceeded command budget');
}

(async () => {
  let itinerary;
  for (let attempt = 1; attempt <= 12 && !itinerary; attempt++) itinerary = plan('VIGIL-QA-' + attempt);
  assert.ok(itinerary);
  const { id, inputs } = itinerary;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('requestfailed', (r) => errors.push(r.url() + ' ' + r.failure().errorText));
    page.setDefaultTimeout(5000);
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    for (const action of ['settings', 'newform']) await page.locator('[data-act="' + action + '"]').click();
    await page.locator('#run-seed').fill(id);
    await page.locator('[data-act="restart"]').click();
    for (const cmd of inputs) {
      let selector;
      if ('index' in cmd) selector = '[data-play="' + cmd.index + '"]';
      else if (cmd.ex) selector = 'button[data-ex="' + cmd.ex + '"]';
      else selector = '[data-act="' + cmd.act + '"]';
      const button = page.locator(selector).first();
      if (cmd.card) assert.equal(await button.locator('.playing-card').getAttribute('data-card'), cmd.card);
      await button.click({ timeout: 5000 });
      if (cmd.wait) await page.waitForTimeout(130);
    }
    assert.equal(await page.locator('.ex-ending h1').innerText(), '长夜，终有余火');
    const actual = await page.evaluate(() => ({ run: Campaign.load(), profile: Campaign.profile() }));
    assert.equal(actual.run.hp, itinerary.hp);
    assert.deepEqual(actual.run.deck, itinerary.deck);
    assert.equal(actual.profile.wins, 1);
    assert.equal(actual.profile.maxAscension, 1);
    assert.deepEqual(errors, []);
    console.log(
      'Browser victory verified: ' +
        id +
        ', ' +
        inputs.length +
        ' UI commands, 24 floors, ' +
        actual.run.hp +
        '/' +
        actual.run.maxHp +
        ' HP.',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
