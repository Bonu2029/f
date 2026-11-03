// ============================================================================
// ep4/src/cfg4.js — Episode 4 config for the shared on-screen system (src/ui_series.js).
// ============================================================================
const SC = n => SCENES_T[n - 1];
const rollUp = (t0, from, to, dt = 0.09) => { const out = [[-1, String(from)]]; for (let v = from + 1; v <= to; v++) out.push([t0 + (v - from - 1) * dt, String(v)]); return out; };
const EPCFG = {
  clock: [[-1, 'HOUR 6', '2:30 PM'], [EV.rule, 'HOUR 7', '3:30 PM']],
  rule: { num: 4, t0: EV.rule + 0.05, t1: SC(14).start - 0.2, h: 600, lines: [
    ['ONLY EAT AND DRINK', EV.ruleLine2, '#ffffff', 64, 222],
    ['WHAT WAS SEALED.', EV.ruleLine2 + 0.9, '#ffffff', 64, 306],
    ['WIPE THE PACKAGE', EV.ruleLine3, '#ffd36b', 54, 410],
    ['BEFORE YOU OPEN IT.', EV.ruleLine3 + 0.8, '#ffd36b', 54, 484]] },
  supplies: { t0: 0.4, water: rollUp(EV.water + 0.9, 1, 12), food: rollUp(EV.crackers + 0.2, 0, 6), light: '100%',
    phone: [[-1, '35%'], [EV.booth, '33%']], phoneRedAt: -1, waterHL: null },
  code: { letter: 'L', n: 4, word: 'S · H · E · L · _ · _ · _' },
  vote: { ep: 3, a: 'A · LET THE MAN IN', b: 'B · FOLLOW THE VOICE', won: 'a' },
  choice: { t0: SC(22).start, a: 'HIDE IN THE BOOTH', b: 'SHINE THE LIGHT', next: 5 },
};
