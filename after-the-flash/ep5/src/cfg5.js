// ============================================================================
// ep5/src/cfg5.js — Episode 5 config for the shared on-screen system (src/ui_series.js).
// ============================================================================
const SC = n => SCENES_T[n - 1];
const EPCFG = {
  clock: [[-1, 'HOUR 7', '3:30 PM'], [EV.rule, 'HOUR 8', '4:30 PM']],
  rule: { num: 5, t0: EV.rule + 0.05, t1: SC(19).start - 0.2, h: 600, lines: [
    ['IN THE DARK,', EV.ruleLine2, '#ffffff', 74, 226],
    ['STAY QUIET.', EV.ruleLine2 + 0.8, '#ffffff', 74, 314],
    ['LIGHT AND NOISE TELL THEM', EV.ruleLine3, '#ff8a80', 46, 414],
    ['WHERE YOU ARE.', EV.ruleLine3 + 1.0, '#ff8a80', 46, 480]] },
  supplies: { t0: 0.4, water: '12', food: '6', light: '100%', phone: [[-1, '33%']], phoneRedAt: -1, waterHL: null },
  code: { letter: 'T', n: 5, word: 'S · H · E · L · T · _ · _' },
  vote: { ep: 4, a: '🙈 HIDE IN THE BOOTH', b: '🔦 SHINE THE LIGHT', won: 'a' },
  choice: { t0: SC(24).start, a: 'STEP OUT AND TALK', b: 'STAY HIDDEN', next: 6, ea: '🗣️', eb: '🤫' },
};
