// ============================================================================
// ep2/src/ui2.js — Episode 2 config for the shared on-screen system (src/ui_series.js).
// ============================================================================
const SC = n => SCENES_T[n - 1];
const EPCFG = {
  clock: [[-1, 'HOUR 3', '11:30 AM'], [EV.hour4, 'HOUR 4', '12:30 PM'], [EV.hour5, 'HOUR 5', '1:30 PM']],
  rule: { num: 2, t0: EV.rule + 0.05, t1: SC(11).start - 0.2, h: 560, lines: [
    ['STAY INSIDE', EV.ruleLine2, '#ffffff', 78, 222], ['AT LEAST 24 HOURS.', EV.ruleLine2 + 1.0, '#ffffff', 64, 312],
    ['THE FIRST DAY IS', EV.ruleLine3, '#ff8a80', 46, 408], ['THE MOST DANGEROUS.', EV.ruleLine3 + 0.9, '#ff8a80', 46, 466]] },
  supplies: { t0: 0.4, water: '1', food: '0', light: '100%', phone: [[-1, '41%'], [EV.battery, '38%']], phoneRedAt: EV.battery, waterHL: [SC(5).start + 1.7, SC(6).start] },
  code: { letter: 'H', n: 2, word: 'S · H · _ · _ · _ · _ · _' },
  vote: { ep: 1, a: 'A · OPEN THE GATE', b: 'B · KEEP IT SHUT', won: 'b' },
  choice: { t0: SC(20).start, a: 'FOLLOW THE LAUGH', b: 'WAKE THE MAN', next: 3 },
};
