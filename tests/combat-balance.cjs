'use strict';
const E = require('../game/engine.js');

// One-card policy for repeatable playtesting. It values the previewed attack,
// health, sustained effects and deck cycling. It never searches a future turn.
function position(b) {
  const e = b.enemy;
  const incoming = Math.max(0, e.intent.damage * e.intent.hits - b.block);
  const powers = b.powers;
  const imminentWin = e.burn >= e.hp;
  return (
    (b.status === 'won' || imminentWin ? 1000 : 0) +
    2.2 * b.hp -
    e.hp -
    0.55 * e.block -
    1.85 * incoming +
    1.8 * e.burn +
    1.7 * e.vulnerable +
    e.weak +
    3.5 * b.strength +
    0.8 * Math.min(b.ember, 3) +
    0.15 * b.ember +
    b.hand.length * 0.65 +
    1.3 * b.retain +
    2.5 * powers.thorns +
    3 * powers.bulwark +
    powers.pilot +
    3 * powers.kindling +
    5 * powers.zeal
  );
}
function choose(b) {
  let best = -1,
    score = 0;
  const base = position(b);
  const seen = new Set();
  for (let i = 0; i < b.hand.length; i++) {
    const key = b.hand[i];
    if (seen.has(key) || !E.canPlay(b, i)) continue;
    seen.add(key);
    const next = structuredClone(b);
    E.playCard(next, i);
    const energyUsed = b.energy - next.energy;
    const gain = (position(next) - base) / Math.max(1, energyUsed) + (energyUsed <= 0 ? 2 - energyUsed : 0);
    if (gain > score) {
      score = gain;
      best = i;
    }
  }
  return best;
}
function autoFight(b) {
  let actions = 0;
  while (b.status === 'active' && b.turn <= 80) {
    if (++actions > 1000) throw new Error('Battle stalled');
    const index = choose(b);
    if (index === -1) E.endTurn(b);
    else E.playCard(b, index);
  }
  return b;
}
module.exports = { autoFight, choose };
if (require.main === module) {
  const samples = Number(process.argv[2]) || 24;
  const list = [];
  for (const enemy of Object.values(E.enemies)) {
    let wins = 0,
      loss = 0,
      turns = 0;
    for (let seed = 0; seed < samples; seed++) {
      const deck = E.starterDeck();
      const relics = ['wick'];
      if (enemy.act >= 2) {
        deck[0] = 'shackle';
        deck[1] = 'cinder+';
        deck[3] = 'prayer';
        deck.push('oath');
        relics.push('rivet');
      }
      if (enemy.act >= 3) {
        deck[2] = 'brand+';
        deck[4] = 'parry+';
        deck.push('ribbons+', 'censer');
        relics.push('lens', 'pin');
      }
      const b = autoFight(E.createBattle({ enemy: enemy.id, deck, relics, seed }));
      if (b.status === 'won') wins++;
      loss += b.maxHp - b.hp;
      turns += b.turn;
    }
    list.push({
      id: enemy.id,
      wins: wins + '/' + samples,
      meanHpLost: (loss / samples).toFixed(1),
      meanTurns: (turns / samples).toFixed(1),
    });
  }
  console.table(list);
}
