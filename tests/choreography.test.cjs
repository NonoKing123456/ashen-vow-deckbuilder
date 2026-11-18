const assert = require('node:assert/strict');
const test = require('node:test');
const E = require('../game/engine');
const { choreography } = require('../game/combat-fx');
function cast(b, idx) {
  const card = E.card(b.hand[idx]);
  assert.ok(E.playCard(b, idx));
  return choreography({
    card,
    enemyId: b.enemy.id,
    end: false,
    intent: null,
    outcome: b.status,
    events: b.events,
  });
}
function end(b) {
  const intent = b.enemy.intent;
  E.endTurn(b);
  return choreography({
    card: null,
    enemyId: b.enemy.id,
    end: true,
    intent,
    outcome: b.status,
    events: b.events,
  });
}
test('one partially absorbed sword impact carries both shield and health changes', () => {
  const b = E.createBattle({ enemy: 'bellkeeper', seed: 11 });
  b.hand = ['strike'];
  b.enemy.block = 2;
  const a = cast(b, 0);
  assert.equal(a.beats.length, 1);
  assert.equal(a.beats[0].at, 176);
  assert.deepEqual(
    a.beats[0].group.map((e) => [e.type, e.value]),
    [
      ['blocked', 2],
      ['damage', 4],
    ],
  );
});
test('each of three strikes keeps its own hit pause and contact', () => {
  const b = E.createBattle({ enemy: 'bellkeeper', seed: 11 });
  b.hand = ['ribbons'];
  const a = cast(b, 0);
  assert.equal(a.beats.length, 3);
  assert.ok(a.beats.every((x, i) => i === 0 || x.at > a.beats[i - 1].at));
  assert.equal(
    a.beats.flatMap((x) => x.group).reduce((sum, e) => sum + e.value, 0),
    15,
  );
});
test('lethal burning has no enemy swing, while surviving foes still act after the burn', () => {
  const b = E.createBattle({ enemy: 'bellkeeper', seed: 11 });
  b.enemy.hp = 2;
  b.enemy.burn = 3;
  const p = end(b);
  assert.equal(p.burnOnly, true);
  assert.deepEqual(
    p.beats.map((e) => e.kind),
    ['burn'],
  );
  const c = E.createBattle({ enemy: 'bellkeeper', seed: 11 });
  c.enemy.burn = 2;
  const q = end(c);
  assert.equal(q.burnOnly, false);
  assert.deepEqual(
    q.beats.map((e) => e.kind),
    ['burn', 'hammer'],
  );
});
test('a block is visible when the enemy braces after taking burn damage', () => {
  const b = E.createBattle({ enemy: 'bellkeeper', seed: 1 });
  E.endTurn(b);
  b.enemy.burn = 1;
  const p = end(b);
  assert.deepEqual(
    p.beats.map((e) => e.kind),
    ['burn', 'ward'],
  );
  assert.ok(p.beats[1].group.some((e) => e.type === 'block' && e.target === 'enemy'));
});
