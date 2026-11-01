// ============================================================================
// ep3/src/cfg3.js — Episode 3 config for the shared on-screen system (src/ui_series.js).
// (SC comes from src/scenes_street.js, which Ep3 includes for the street flashback.)
// ============================================================================
const EPCFG = {
  clock: [[-1, 'HOUR 5', '1:30 PM'], [EV.rule, 'HOUR 6', '2:30 PM']],
  rule: { num: 3, t0: EV.rule + 0.05, t1: SC(16).start - 0.2, h: 600, lines: [
    ['BEEN OUTSIDE?', EV.ruleLine2, '#ffffff', 72, 222],
    ['TAKE OFF YOUR OUTER CLOTHES.', EV.ruleLine2 + 1.2, '#ffffff', 46, 306],
    ['BRUSH OFF THE ASH.', EV.ruleLine3, '#ffffff', 62, 400],
    ['IT REMOVES MOST OF THE DANGER.', EV.ruleLine4, '#ff8a80', 42, 500]] },
  supplies: { t0: 0.4, water: '1', food: '0', light: '100%', phone: [[-1, '38%'], [EV.battery, '35%']], phoneRedAt: -1, waterHL: null },
  code: { letter: 'E', n: 3, word: 'S · H · E · _ · _ · _ · _' },
  vote: { ep: 2, a: 'A · FOLLOW THE LAUGH', b: 'B · WAKE THE MAN', won: 'b' },
  choice: { t0: SC(22).start, a: 'LET THE MAN IN', b: 'FOLLOW THE VOICE', next: 4 },
};
