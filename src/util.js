// Shared date / week helpers
const todayISO = () => new Date().toISOString().slice(0, 10);

const weekStartISO = (d = new Date()) => {
  const day = d.getUTCDay();            // 0 = Sunday
  const diff = (day + 6) % 7;           // Monday = 0
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - diff);
  return start.toISOString().slice(0, 10);
};

const isValidUsername = (u) => /^[a-zA-Z0-9_.-]{3,20}$/.test(u);
const isValidPassword = (p) => typeof p === 'string' && p.length >= 6 && p.length <= 128;

// 6-char league code, excluding confusing chars
const LEAGUE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeLeagueCode = () =>
  Array.from({ length: 6 }, () => LEAGUE_CHARS[Math.floor(Math.random() * LEAGUE_CHARS.length)]).join('');

module.exports = { todayISO, weekStartISO, isValidUsername, isValidPassword, makeLeagueCode };
