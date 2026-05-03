const {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback
} = React;

/* ==========================================================================
   DOODLE OR NOT — Daily Doodles NFT trivia game
   Single-file React app. Tailwind utility classes only.
   No emojis — all iconography is custom inline SVG in Doodles line-art style.
   ========================================================================== */

/* ---------- Body scroll lock hook for modals (mobile) ---------- */
const useBodyScrollLock = (active) => {
  useEffect(() => {
    if (!active) return;
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, [active]);
};

/* ---------- Storage helper: localStorage with in-memory fallback ---------- */
const _mem = {};
const storage = {
  get(k, fb = null) {
    try {
      const v = localStorage.getItem(k);
      return v === null ? fb : JSON.parse(v);
    } catch {
      return _mem[k] === undefined ? fb : _mem[k];
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      _mem[k] = v;
    }
  },
  remove(k) {
    try {
      localStorage.removeItem(k);
    } catch {}
    delete _mem[k];
  },
  allKeys() {
    try {
      return Object.keys(localStorage);
    } catch {
      return Object.keys(_mem);
    }
  }
};

/* ---------- Auth: client-side only (toy app). Passwords hashed SHA-256. ---------- */
const ADMIN_USERNAME = 'degos';

async function sha256Hex(text) {
  try {
    const data = new TextEncoder().encode('don:v1::' + text);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback: simple non-crypto hash (still better than plaintext)
    let h = 2166136261;
    const s = 'don:v1::' + text;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }
}
const USERS_KEY = 'don:users'; // { [username]: { name, passHash, color, avatar, joined, isAdmin } }
const SESSION_KEY = 'don:session'; // { username, remember }

const getUsers = () => storage.get(USERS_KEY, {});
const saveUsers = u => storage.set(USERS_KEY, u);
const getSession = () => storage.get(SESSION_KEY, null);
const setSession = s => s ? storage.set(SESSION_KEY, s) : storage.remove(SESSION_KEY);
const userStatsKey = u => `don:stats:${u}`;
const userProgressKey = (u, d) => `don:progress:${u}:${d}`;
const userStreakKey = u => `don:streak:${u}`;
const userAchvKey = u => `don:achv:${u}`;

// Wipe all data for a given user
const wipeUserData = username => {
  const users = getUsers();
  delete users[username];
  saveUsers(users);
  for (const k of storage.allKeys()) {
    if (k === `don:stats:${username}` || k === `don:streak:${username}` || k === `don:achv:${username}` || k.startsWith(`don:progress:${username}:`)) {
      storage.remove(k);
    }
  }
};

/* ---------- Achievements ---------- */
const ACHIEVEMENTS = [{
  id: 'first_blood',
  name: 'First Blood',
  desc: 'Complete your first mode.',
  tint: '#FFB7C5'
}, {
  id: 'perfect_day',
  name: 'Perfect Day',
  desc: 'Clear all 3 modes in a single day.',
  tint: '#FFE082'
}, {
  id: 'streak_3',
  name: 'Hat Trick',
  desc: 'Play 3 days in a row.',
  tint: '#A8E6CF'
}, {
  id: 'streak_7',
  name: 'Seven Heavens',
  desc: 'Maintain a 7-day streak.',
  tint: '#90CAF9'
}, {
  id: 'streak_30',
  name: 'Month of Doodles',
  desc: 'Maintain a 30-day streak.',
  tint: '#C5B3E6'
}, {
  id: 'century',
  name: 'Century Club',
  desc: 'Earn 100 total points.',
  tint: '#FFAB91'
}, {
  id: 'rarity_hunter',
  name: 'Rarity Hunter',
  desc: 'Score 15+ in Trait Roulette.',
  tint: '#A8E6CF'
}, {
  id: 'whale_spotter',
  name: 'Whale Spotter',
  desc: 'Score 15+ in Higher Sale.',
  tint: '#FFE082'
}, {
  id: 'eye_for_rare',
  name: 'Eye for Rare',
  desc: 'Score 15+ in Rarity Duel.',
  tint: '#FFB7C5'
}, {
  id: 'top_10',
  name: 'Top 10',
  desc: 'Crack the weekly top 10.',
  tint: '#90CAF9'
}, {
  id: 'comeback_kid',
  name: 'Comeback Kid',
  desc: 'Use Freeze and answer correctly after.',
  tint: '#B3D4FC'
}, {
  id: 'points_500',
  name: 'Half Grand',
  desc: 'Earn 500 total points.',
  tint: '#FFE082'
}, {
  id: 'games_50',
  name: 'Doodle Addict',
  desc: 'Play 50 game modes total.',
  tint: '#FFAB91'
}, {
  id: 'flawless',
  name: 'Flawless Victory',
  desc: 'Get all perfect scores in a single mode.',
  tint: '#A8E6CF'
}];

// Progress for a given achievement as a 0..1 ratio given current stats/streak/progress/dexCount
const achievementProgress = (id, {
  stats,
  streak,
  progress,
  dexCount
}) => {
  const ratio = (cur, target) => Math.max(0, Math.min(1, (cur || 0) / target));
  switch (id) {
    case 'first_blood':
      return ratio(stats.gamesPlayed || 0, 1);
    case 'perfect_day':
      return ratio(Object.values(progress || {}).filter(Boolean).length, 3);
    case 'streak_3':
      return ratio(streak.count, 3);
    case 'streak_7':
      return ratio(streak.count, 7);
    case 'streak_30':
      return ratio(streak.count, 30);
    case 'century':
      return ratio(stats.totalPts, 100);
    case 'rarity_hunter':
    case 'whale_spotter':
    case 'eye_for_rare':
      return (stats.gamesPlayed || 0) > 0 ? 0.33 : 0;
    case 'top_10':
      return ratio(stats.bestWeek, 30);
    case 'comeback_kid':
    case 'flawless':
      return (stats.gamesPlayed || 0) > 0 ? 0.33 : 0;
    case 'points_500':
      return ratio(stats.totalPts, 500);
    case 'games_50':
      return ratio(stats.gamesPlayed, 50);
    default:
      return 0;
  }
};

// Returns newly unlocked achievement ids given a finishMode event
const checkAchievements = ({
  prev,
  mode,
  points,
  icons,
  clutch,
  newStats,
  newProgress,
  newStreak
}) => {
  const unlocked = new Set(prev);
  const add = id => {
    if (!unlocked.has(id)) unlocked.add(id);
  };
  add('first_blood');
  const allDone = newProgress.guess && newProgress.price && newProgress.trait;
  if (allDone) add('perfect_day');
  if (newStreak.count >= 3) add('streak_3');
  if (newStreak.count >= 7) add('streak_7');
  if (newStreak.count >= 30) add('streak_30');
  if (newStats.totalPts >= 100) add('century');
  if (mode === 'trait' && points >= 15) add('rarity_hunter');
  if (mode === 'price' && points >= 15) add('whale_spotter');
  if (mode === 'guess' && points >= 15) add('eye_for_rare');
  if (newStats.totalPts >= 500) add('points_500');
  if (newStats.gamesPlayed >= 50) add('games_50');
  if (clutch) add('comeback_kid');
  if (Array.isArray(icons) && icons.length > 0 && icons.every(i => i === 'perfect')) add('flawless');
  const newly = [...unlocked].filter(id => !prev.includes(id));
  return {
    all: [...unlocked],
    newly
  };
};

/* ---------- Doodle Dex: track unique doodle IDs seen by a user ---------- */
const userDexKey = u => `don:dex:${u}`;
const getDex = username => {
  const raw = storage.get(userDexKey(username), []);
  return Array.isArray(raw) ? raw : [];
};
const addToDex = (username, ids) => {
  if (!username) return [];
  const set = new Set(getDex(username));
  for (const id of ids) if (id !== undefined && id !== null) set.add(id);
  const arr = [...set];
  storage.set(userDexKey(username), arr);
  return arr;
};
const recordDexGlobal = ids => {
  const u = (getSession() || {}).username;
  if (u) addToDex(u, ids);
};

/* ---------- Onboarding flag ---------- */
const userOnboardedKey = u => `don:onboarded:${u}`;

/* ---------- Preferences (sound, haptics, motion, font, lang) ---------- */
const PREFS_KEY = 'don:prefs';
const DEFAULT_PREFS = {
  sound: true,
  haptics: true,
  reducedMotion: false,
  fontScale: 1,
  // 0.9 | 1 | 1.1 | 1.25
  lang: 'en',
  // 'en' | 'es' | 'de'
  darkMode: 'auto',
  // 'auto' | 'light' | 'dark'
  notifications: false
};
const getPrefs = () => ({
  ...DEFAULT_PREFS,
  ...(storage.get(PREFS_KEY, {}) || {})
});
const setPrefs = p => storage.set(PREFS_KEY, p);

/* ---------- Sound engine: tiny Tone.js wrapper, lazy-inits on first gesture ---------- */
const Sound = {
  enabled: true,
  _melodySynth: null,
  _bassSynth: null,
  _bellSynth: null,
  _fx: null,
  _initted: false,
  _resumed: false,
  _bootPrefs() {
    try {
      this.enabled = !!getPrefs().sound;
    } catch {}
  },
  _ensureResumed() {
    if (this._resumed) return;
    const T = window.Tone;
    if (!T) return;
    try {
      if (T.context && T.context.state !== 'running') {
        T.start();
        T.context.resume();
      }
      this._resumed = true;
    } catch {}
  },
  init() {
    if (this._initted) return;
    if (typeof window === 'undefined') return;
    const T = window.Tone;
    if (!T) return;
    this._initted = true;
    try {
      this._ensureResumed();
      // FX chain: light reverb + compression for polish
      const reverb = new T.Reverb({ decay: 1.4, wet: 0.18 }).toDestination();
      const comp = new T.Compressor({ threshold: -18, ratio: 3 }).connect(reverb);
      this._fx = comp;
      // Melody synth: warm sine+triangle for correct/jingle/levelUp
      this._melodySynth = new T.PolySynth(T.Synth, {
        oscillator: { type: 'fatsine', spread: 20, count: 3 },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.08, release: 0.5 }
      }).connect(comp);
      this._melodySynth.volume.value = -12;
      // Bass synth: deep for wrong/error
      this._bassSynth = new T.PolySynth(T.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.0, release: 0.4 }
      }).connect(comp);
      this._bassSynth.volume.value = -10;
      // Bell synth: bright sparkle for shimmer/streak/freeze
      this._bellSynth = new T.PolySynth(T.Synth, {
        oscillator: { type: 'sine', partialCount: 4 },
        envelope: { attack: 0.002, decay: 0.15, sustain: 0.02, release: 0.6 }
      }).connect(comp);
      this._bellSynth.volume.value = -14;
    } catch {
      this._initted = false;
    }
  },
  setEnabled(v) {
    this.enabled = !!v;
  },
  _play(fn) {
    if (!this.enabled) return;
    this._ensureResumed();
    this.init();
    if (!this._melodySynth || !window.Tone) return;
    try {
      fn({ melody: this._melodySynth, bass: this._bassSynth, bell: this._bellSynth }, window.Tone);
    } catch {}
  },
  jingle() {
    this._play((s, T) => {
      const n = T.now();
      s.melody.triggerAttackRelease('G4', '8n', n);
      s.melody.triggerAttackRelease('B4', '8n', n + 0.12);
      s.melody.triggerAttackRelease('D5', '8n', n + 0.24);
      s.bell.triggerAttackRelease('G5', '4n', n + 0.36);
    });
  },
  correct() {
    this._play((s, T) => {
      const n = T.now();
      s.melody.triggerAttackRelease('C5', '16n', n);
      s.melody.triggerAttackRelease('E5', '16n', n + 0.06);
      s.melody.triggerAttackRelease('G5', '8n', n + 0.12);
      s.bell.triggerAttackRelease('C6', '16n', n + 0.18);
    });
  },
  wrong() {
    this._play((s, T) => {
      const n = T.now();
      s.bass.triggerAttackRelease('D3', '8n', n);
      s.bass.triggerAttackRelease('Ab2', '4n', n + 0.12);
    });
  },
  shimmer() {
    this._play((s, T) => {
      const n = T.now();
      s.bell.triggerAttackRelease('E5', '32n', n);
      s.bell.triggerAttackRelease('G#5', '32n', n + 0.045);
      s.bell.triggerAttackRelease('B5', '32n', n + 0.09);
      s.bell.triggerAttackRelease('E6', '16n', n + 0.14);
      s.bell.triggerAttackRelease('G#6', '8n', n + 0.2);
    });
  },
  levelUp() {
    this._play((s, T) => {
      const n = T.now();
      s.melody.triggerAttackRelease('C5', '16n', n);
      s.melody.triggerAttackRelease('E5', '16n', n + 0.09);
      s.melody.triggerAttackRelease('G5', '16n', n + 0.18);
      s.melody.triggerAttackRelease('C6', '8n', n + 0.28);
      s.bell.triggerAttackRelease('E6', '4n', n + 0.38);
      s.bell.triggerAttackRelease('G6', '4n', n + 0.48);
    });
  },
  streak() {
    this._play((s, T) => {
      const n = T.now();
      s.bell.triggerAttackRelease('A5', '32n', n);
      s.bell.triggerAttackRelease('C#6', '32n', n + 0.04);
      s.bell.triggerAttackRelease('E6', '16n', n + 0.08);
      s.melody.triggerAttackRelease('A6', '8n', n + 0.13);
    });
  },
  freeze() {
    this._play((s, T) => {
      const n = T.now();
      s.bell.triggerAttackRelease('E6', '32n', n);
      s.bell.triggerAttackRelease('B5', '16n', n + 0.05);
      s.bell.triggerAttackRelease('E6', '16n', n + 0.12);
      s.bell.triggerAttackRelease('G#6', '8n', n + 0.18);
    });
  },
  tap() {
    this._play((s, T) => s.bell.triggerAttackRelease('A5', '32n', T.now()));
  },
  reveal() {
    this._play((s, T) => {
      const n = T.now();
      s.melody.triggerAttackRelease('G4', '16n', n);
      s.melody.triggerAttackRelease('D5', '16n', n + 0.07);
      s.bell.triggerAttackRelease('B5', '16n', n + 0.14);
    });
  }
};
Sound._bootPrefs();
// Resume AudioContext on first user interaction (browser autoplay policy)
if (typeof document !== 'undefined') {
  const _resumeAudio = () => {
    Sound._ensureResumed();
    document.removeEventListener('click', _resumeAudio);
    document.removeEventListener('touchstart', _resumeAudio);
    document.removeEventListener('keydown', _resumeAudio);
  };
  document.addEventListener('click', _resumeAudio, { once: false, passive: true });
  document.addEventListener('touchstart', _resumeAudio, { once: false, passive: true });
  document.addEventListener('keydown', _resumeAudio, { once: false, passive: true });
}
const Haptics = {
  enabled: true,
  _bootPrefs() {
    try {
      this.enabled = !!getPrefs().haptics;
    } catch {}
  },
  setEnabled(v) {
    this.enabled = !!v;
  },
  buzz(p) {
    if (!this.enabled) return;
    try {
      if (navigator && navigator.vibrate) navigator.vibrate(p);
    } catch {}
  }
};
Haptics._bootPrefs();

/* ---------- Mood of the Day lore lines ---------- */
const MOOD_LINES = ["Today the clouds are rehearsing a soft ballet.", "A doodle dreamed of octopuses last night.", "Somewhere, a rainbow is practicing its curve.", "The sun forgot its hat. Again.", "Noodles whispered to the trees at dawn.", "Every petal opened a little louder today.", "A small cat wizard is tuning the stars.", "The moon left a note. It just said 'soon'.", "Two koi swapped colors, just for fun.", "A sleepy flower is learning to dance.", "The ocean is telling a long, slow joke.", "Someone taught a cloud to sneeze glitter.", "A comet is taking the scenic route.", "Today's secret word is: blorp.", "Your hat has been missing you, doodle.", "A unicorn misplaced its shyness.", "The stars rehearsed a new song, off-key.", "A frog is considering a career in jazz.", "The breeze is running errands this morning.", "All the snails agreed: it's a good day.", "A tiny doodle just beat their record for naps.", "The kettle whistled in perfect harmony.", "Today's horoscope: look at something small, slowly.", "The hills are experimenting with pastel.", "A goblin invented a new color. They won't share.", "Somewhere a whale is humming your name.", "The shadows are practicing their bow.", "A wizard lost their glasses inside their own hat.", "The rain is shy today. Maybe tomorrow.", "A very polite spider fixed the wifi."];

// XP / level: 100 XP per level, curve flattens slightly
const xpFromPoints = totalPts => totalPts; // 1 pt = 1 xp (simple)
const levelFromXp = xp => {
  // Level N requires N*100 XP cumulative. Level 1 at 0 XP.
  let lvl = 1,
    need = 100,
    acc = 0;
  while (xp >= acc + need) {
    acc += need;
    lvl++;
    need = Math.round(need * 1.15);
  }
  const into = xp - acc;
  return {
    level: lvl,
    into,
    need,
    pct: Math.min(100, Math.round(into / need * 100))
  };
};

/* ---------- XP tiers with named ranks ---------- */
const XP_TIERS = [{
  min: 1,
  name: 'Sapling',
  color: '#A8E6CF',
  icon: '🌱'
}, {
  min: 5,
  name: 'Collector',
  color: '#90CAF9',
  icon: '🌸'
}, {
  min: 10,
  name: 'Curator',
  color: '#FFE082',
  icon: '🐝'
}, {
  min: 18,
  name: 'Rare Hunter',
  color: '#FFB7C5',
  icon: '🦋'
}, {
  min: 28,
  name: 'Doodle Sage',
  color: '#C5B3E6',
  icon: '🌙'
}, {
  min: 42,
  name: 'Cloudwalker',
  color: '#FFAB91',
  icon: '☁️'
}, {
  min: 60,
  name: 'Mythic',
  color: '#F8BBD0',
  icon: '🌈'
}];
const tierFromLevel = lvl => {
  let t = XP_TIERS[0];
  for (const x of XP_TIERS) if (lvl >= x.min) t = x;
  return t;
};

/* ---------- i18n (ES/EN/DE) ---------- */
const I18N = {
  en: {
    good_morning: 'good morning',
    good_afternoon: 'good afternoon',
    good_evening: 'good evening',
    happy_late_night: 'happy late night',
    daily_challenge: 'Daily Challenge',
    day: 'Day',
    play: 'Play',
    ranks: 'Ranks',
    profile: 'Profile',
    back: 'Back',
    home: 'Home',
    locked: 'Locked',
    done: 'Done',
    edit_profile: 'Edit profile',
    log_out: 'Log out',
    settings: 'Settings',
    sound_fx: 'Sound effects',
    haptics: 'Haptics',
    reduced_motion: 'Reduced motion',
    text_size: 'Text size',
    language: 'Language',
    wipe_data: 'Wipe local data',
    wipe: 'Wipe',
    total_points: 'Total points',
    games_played: 'Games played',
    best_week: 'Best week',
    this_week: 'This week',
    current_streak: 'Current streak',
    level: 'Level',
    how_to_play: 'How to play',
    doodle_dex: 'Doodle Dex',
    achievements: 'Achievements',
    danger_zone: 'Danger zone',
    delete_account: 'Delete account',
    lives_left: 'lives',
    hint: 'Hint',
    skip: 'Skip',
    freeze: 'Freeze',
    no_hints: 'out of hints today',
    no_skips: 'out of skips today',
    share: 'Share',
    copy_image: 'Copy image',
    download_png: 'Download PNG',
    challenge_friend: 'Challenge a friend',
    play_my_game: 'Play my game',
    challenge_incoming: 'Incoming challenge',
    private_leagues: 'Private leagues',
    create_league: 'Create league',
    join_league: 'Join league',
    league_code: 'League code',
    members: 'members',
    yesterday_recap: 'Yesterday\u2019s recap',
    streak_alive: 'Streak alive',
    install_app: 'Install app',
    notifications: 'Notifications',
    daily_reminder: 'Daily reminder',
    dark_mode: 'Dark mode',
    shortcuts: 'Keyboard shortcuts',
    mood_of_day: 'Mood of the day',
    weekly_reading: 'Weekly reading',
    clutch_bonus: 'Clutch bonus!',
    no_petals: 'No pétalos lost',
    league_empty: 'No one here yet',
    be_first: 'Be the first to claim the top spot today.',
    points: 'pts',
    new_tier: 'New tier!',
    empty_dex: 'Empty dex — play to collect.'
  },
  es: {
    good_morning: 'buenos días',
    good_afternoon: 'buenas tardes',
    good_evening: 'buenas noches',
    happy_late_night: 'feliz madrugada',
    daily_challenge: 'Reto diario',
    day: 'Día',
    play: 'Jugar',
    ranks: 'Rankings',
    profile: 'Perfil',
    back: 'Atrás',
    home: 'Inicio',
    locked: 'Bloqueado',
    done: 'Hecho',
    edit_profile: 'Editar perfil',
    log_out: 'Cerrar sesión',
    settings: 'Ajustes',
    sound_fx: 'Efectos de sonido',
    haptics: 'Vibración',
    reduced_motion: 'Menos animación',
    text_size: 'Tamaño de letra',
    language: 'Idioma',
    wipe_data: 'Borrar datos locales',
    wipe: 'Borrar',
    total_points: 'Puntos totales',
    games_played: 'Partidas',
    best_week: 'Mejor semana',
    this_week: 'Esta semana',
    current_streak: 'Racha actual',
    level: 'Nivel',
    how_to_play: 'Cómo jugar',
    doodle_dex: 'Doodle Dex',
    achievements: 'Logros',
    danger_zone: 'Zona de peligro',
    delete_account: 'Borrar cuenta',
    lives_left: 'vidas',
    hint: 'Pista',
    skip: 'Saltar',
    freeze: 'Congelar',
    no_hints: 'sin pistas hoy',
    no_skips: 'sin saltos hoy',
    share: 'Compartir',
    copy_image: 'Copiar imagen',
    download_png: 'Descargar PNG',
    challenge_friend: 'Reta a un amigo',
    play_my_game: 'Juega mi partida',
    challenge_incoming: 'Reto recibido',
    private_leagues: 'Ligas privadas',
    create_league: 'Crear liga',
    join_league: 'Unirme a liga',
    league_code: 'Código de liga',
    members: 'miembros',
    yesterday_recap: 'Resumen de ayer',
    streak_alive: 'Racha viva',
    install_app: 'Instalar app',
    notifications: 'Notificaciones',
    daily_reminder: 'Recordatorio diario',
    dark_mode: 'Modo oscuro',
    shortcuts: 'Atajos de teclado',
    mood_of_day: 'Ánimo del día',
    weekly_reading: 'Lectura semanal',
    clutch_bonus: '¡Clutch!',
    no_petals: 'Sin pétalos perdidos',
    league_empty: 'Aún no hay nadie',
    be_first: 'Sé la primera ola del día.',
    points: 'pts',
    new_tier: '¡Nuevo rango!',
    empty_dex: 'Dex vacío — juega para coleccionar.'
  },
  de: {
    good_morning: 'guten Morgen',
    good_afternoon: 'guten Tag',
    good_evening: 'guten Abend',
    happy_late_night: 'späte Nachtgrüße',
    daily_challenge: 'Tagesquest',
    day: 'Tag',
    play: 'Spielen',
    ranks: 'Rangliste',
    profile: 'Profil',
    back: 'Zurück',
    home: 'Start',
    locked: 'Gesperrt',
    done: 'Fertig',
    edit_profile: 'Profil bearbeiten',
    log_out: 'Abmelden',
    settings: 'Einstellungen',
    sound_fx: 'Soundeffekte',
    haptics: 'Vibration',
    reduced_motion: 'Weniger Bewegung',
    text_size: 'Schriftgröße',
    language: 'Sprache',
    wipe_data: 'Lokale Daten löschen',
    wipe: 'Löschen',
    total_points: 'Punkte gesamt',
    games_played: 'Spiele',
    best_week: 'Beste Woche',
    this_week: 'Diese Woche',
    current_streak: 'Aktuelle Serie',
    level: 'Level',
    how_to_play: 'So spielst du',
    doodle_dex: 'Doodle Dex',
    achievements: 'Erfolge',
    danger_zone: 'Gefahrenzone',
    delete_account: 'Konto löschen',
    lives_left: 'Leben',
    hint: 'Tipp',
    skip: 'Skip',
    freeze: 'Einfrieren',
    no_hints: 'Keine Tipps mehr',
    no_skips: 'Keine Skips mehr',
    share: 'Teilen',
    copy_image: 'Bild kopieren',
    download_png: 'PNG laden',
    challenge_friend: 'Freund herausfordern',
    play_my_game: 'Spiel mein Spiel',
    challenge_incoming: 'Herausforderung',
    private_leagues: 'Private Ligen',
    create_league: 'Liga erstellen',
    join_league: 'Liga beitreten',
    league_code: 'Liga-Code',
    members: 'Mitglieder',
    yesterday_recap: 'Gestern',
    streak_alive: 'Serie lebt',
    install_app: 'App installieren',
    notifications: 'Benachrichtigungen',
    daily_reminder: 'Tägliche Erinnerung',
    dark_mode: 'Dunkler Modus',
    shortcuts: 'Tastenkürzel',
    mood_of_day: 'Stimmung des Tages',
    weekly_reading: 'Wochenlesung',
    clutch_bonus: 'Clutch!',
    no_petals: 'Kein Leben verloren',
    league_empty: 'Noch niemand hier',
    be_first: 'Sei die erste Welle heute.',
    points: 'Pkt',
    new_tier: 'Neuer Rang!',
    empty_dex: 'Dex leer — spiel zum Sammeln.'
  }
};
const t = key => {
  return I18N.en[key] || key;
};

/* ---------- Daily power-ups ---------- */
const POWERUPS_KEY = (u, d) => `don:pu:${u}:${d}`;
const HINTS_PER_DAY = 1;
const SKIPS_PER_DAY = 1;
const FREEZES_PER_DAY = 1;
const getPowerups = u => {
  const defaults = { hints: HINTS_PER_DAY, skips: SKIPS_PER_DAY, freezes: FREEZES_PER_DAY };
  const raw = storage.get(POWERUPS_KEY(u, todayStr()), defaults);
  // Ensure freezes field exists for users with old cached data
  if (typeof raw.freezes !== 'number') raw.freezes = FREEZES_PER_DAY;
  return raw;
};
const savePowerups = (u, pu) => storage.set(POWERUPS_KEY(u, todayStr()), pu);
/* Helpers for consuming powerups from inside game modes. Server-side sync is
   attempted best-effort; local state is the source of truth for the UI. */
const getActiveUsername = () => {
  try {
    return (storage.get('don:session', {}) || {}).username || null;
  } catch {
    return null;
  }
};
const consumePowerup = kind => {
  const u = getActiveUsername();
  if (!u) return false;
  const pu = getPowerups(u);
  if ((pu[kind] || 0) <= 0) return false;
  pu[kind] = Math.max(0, (pu[kind] || 0) - 1);
  savePowerups(u, pu);
  if (window.DON_API && window.DON_API.usePowerup) {
    // Server expects singular ('hint'/'skip'/'freeze'), client uses plural
    const serverKind = kind === 'hints' ? 'hint' : kind === 'skips' ? 'skip' : kind === 'freezes' ? 'freeze' : kind;
    window.DON_API.usePowerup(serverKind).catch(() => {});
  }
  return true;
};
const currentPowerups = () => {
  const u = getActiveUsername();
  return u ? getPowerups(u) : {
    hints: 0,
    skips: 0,
    freezes: 0
  };
};

/* ---------- Private leagues (local-only, code-based) ---------- */
const LEAGUES_KEY = 'don:leagues';
const makeLeagueCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
};
const getLeagues = () => storage.get(LEAGUES_KEY, {});
const saveLeagues = obj => storage.set(LEAGUES_KEY, obj);
const joinLeague = (code, username) => {
  const all = getLeagues();
  const key = code.toUpperCase().trim();
  if (!all[key]) all[key] = {
    code: key,
    createdAt: Date.now(),
    members: {}
  };
  all[key].members[username] = {
    joinedAt: all[key].members[username]?.joinedAt || Date.now()
  };
  saveLeagues(all);
  return all[key];
};
const userLeaguesKey = u => `don:userleagues:${u}`;
const getUserLeagues = u => storage.get(userLeaguesKey(u), []);
const setUserLeagues = (u, arr) => storage.set(userLeaguesKey(u), arr);

/* ---------- Daily recap ---------- */
const recapKey = u => `don:recap:${u}`;
const getLastRecap = u => storage.get(recapKey(u), {
  lastShown: null,
  snapshot: null
});
const setLastRecap = (u, v) => storage.set(recapKey(u), v);

/* ---------- Challenge link: read ?c=SEED from URL ---------- */
const readChallengeSeed = () => {
  try {
    const p = new URLSearchParams(window.location.search);
    const c = p.get('c');
    if (!c) return null;
    const n = parseInt(c, 36);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
};
const writeChallengeLink = seed => {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('c', (seed >>> 0).toString(36));
    return url.toString();
  } catch {
    return '';
  }
};

/* ---------- Share PNG (canvas render) ---------- */
const renderShareCard = ({
  modeName,
  points,
  icons,
  profileName,
  avatarColor,
  streak,
  day,
  url
}) => new Promise(resolve => {
  const W = 1080,
    H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  // Background sky gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#FFE4CC');
  g.addColorStop(0.5, '#FFD0E0');
  g.addColorStop(1, '#C5B3E6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Cloud bubble
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  const rx = 80,
    rw = W - 160,
    rh = H - 300;
  ctx.beginPath();
  const r = 60;
  ctx.moveTo(rx + r, 200);
  ctx.arcTo(rx + rw, 200, rx + rw, 200 + rh, r);
  ctx.arcTo(rx + rw, 200 + rh, rx, 200 + rh, r);
  ctx.arcTo(rx, 200 + rh, rx, 200, r);
  ctx.arcTo(rx, 200, rx + rw, 200, r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2D2D3F';
  ctx.lineWidth = 6;
  ctx.stroke();
  // Title
  ctx.fillStyle = '#2D2D3F';
  ctx.font = '700 72px Fredoka, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Doodle or Not', W / 2, 130);
  ctx.font = '500 36px Fredoka, system-ui, sans-serif';
  ctx.fillStyle = '#7B7B9A';
  ctx.fillText(`Day #${day}`, W / 2, 175);
  // Avatar circle with smiley face
  ctx.beginPath();
  ctx.fillStyle = avatarColor || '#C5B3E6';
  ctx.arc(W / 2, 310, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2D2D3F';
  ctx.lineWidth = 5;
  ctx.stroke();
  // Draw smiley face on avatar
  ctx.fillStyle = '#2D2D3F';
  ctx.beginPath(); ctx.arc(W / 2 - 18, 300, 6, 0, Math.PI * 2); ctx.fill(); // left eye
  ctx.beginPath(); ctx.arc(W / 2 + 18, 300, 6, 0, Math.PI * 2); ctx.fill(); // right eye
  ctx.beginPath(); ctx.arc(W / 2, 322, 18, 0.1 * Math.PI, 0.9 * Math.PI); ctx.lineWidth = 4; ctx.strokeStyle = '#2D2D3F'; ctx.stroke(); // smile
  // Username
  ctx.fillStyle = '#2D2D3F';
  ctx.font = '700 52px Fredoka, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('@' + profileName, W / 2, 430);
  // Mode
  ctx.font = '600 40px Fredoka, system-ui, sans-serif';
  ctx.fillStyle = '#4140FF';
  ctx.fillText(modeName, W / 2, 490);
  // Score big
  ctx.font = "700 180px 'Paytone One', Fredoka, sans-serif";
  ctx.fillStyle = '#2D2D3F';
  ctx.fillText(String(points) + ' pts', W / 2, 680);
  // Icons row
  const sym = {
    perfect: '◉',
    correct: '✿',
    close: '★',
    near: '✦',
    wrong: '·',
    up: '▲',
    down: '▼',
    skip: '⊘'
  };
  ctx.font = '600 64px Fredoka, system-ui, sans-serif';
  ctx.fillStyle = '#4140FF';
  ctx.fillText((icons || []).map(i => sym[i] || '·').join('  '), W / 2, 770);
  // Streak badge (if any)
  if (streak && streak > 0) {
    ctx.font = '600 38px Fredoka, system-ui, sans-serif';
    ctx.fillStyle = '#FF8A50';
    ctx.fillText('\uD83D\uDD25 ' + streak + ' day streak', W / 2, 840);
  }
  // URL footer
  ctx.font = '500 32px Fredoka, system-ui, sans-serif';
  ctx.fillStyle = '#7B7B9A';
  ctx.fillText(url || 'doodleornot.xyz', W / 2, 960);
  canvas.toBlob(b => resolve(b), 'image/png', 0.95);
});

/* ---------- PWA install prompt state ---------- */
let _deferredInstall = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _deferredInstall = e;
    window.dispatchEvent(new CustomEvent('don:installable'));
  });
}
const promptInstall = async () => {
  if (!_deferredInstall) return false;
  _deferredInstall.prompt();
  const {
    outcome
  } = await _deferredInstall.userChoice;
  _deferredInstall = null;
  return outcome === 'accepted';
};
// SW registration moved to index.html (must survive app.js syntax errors)

/* ---------- Notifications ---------- */
const requestNotifPermission = async () => {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
};
const scheduleDailyReminder = () => {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const now = new Date();
  const next = new Date(now);
  next.setHours(9, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  const ms = next.getTime() - now.getTime();
  setTimeout(() => {
    try {
      new Notification('Doodle or Not', {
        body: 'New daily puzzles are live 🌸',
        icon: './icon-192.png'
      });
    } catch {}
    scheduleDailyReminder();
  }, Math.min(ms, 2147483000));
};

/* ---------- Daily seed (deterministic pseudo-random per day) ---------- */
const hashCode = str => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const mulberry32 = seed => () => {
  seed |= 0;
  seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const todayStr = () => new Date().toISOString().slice(0, 10);
const DAY1_EPOCH = Date.UTC(2026, 3, 16); // April 16, 2026 = Day #1
const dayNumber = () => {
  const now = Date.now();
  return Math.max(1, Math.floor((now - DAY1_EPOCH) / 86400000) + 1);
};
// Monday-based week key matching server's weekStartISO (all UTC)
const getWeekKey = () => {
  const d = new Date();
  const day = d.getUTCDay(); // 0=Sun
  const diff = (day + 6) % 7; // Mon=0
  const mon = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
  return mon.toISOString().slice(0, 10); // e.g. "2026-04-13"
};
// Week number: Week 1 = week of 2026-04-13 (Monday). Increments every Monday.
const WEEK1_EPOCH = Date.UTC(2026, 3, 13); // Monday Apr 13, 2026 00:00 UTC
const getWeekNumber = () => {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  const monUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff);
  const weeksSince = Math.floor((monUTC - WEEK1_EPOCH) / (7 * 86400000));
  return Math.max(1, weeksSince + 1);
};

/* ==========================================================================
   REAL DOODLES DATASET
   Loaded from window.DOODLES_DATA (see doodles-dataset.js).
   Shape: { imgPrefix: string, total: number,
            rarity: { [traitType]: { [value]: percent, __none__?: percent } },
            doodles: [{ id, i, t: { face, head, background, body, hair, piercing? }, r, rank }] }
   ========================================================================== */

const DATA = typeof window !== 'undefined' && window.DOODLES_DATA || {
  imgPrefix: '',
  total: 0,
  rarity: {},
  doodles: []
};
const RARITY = DATA.rarity;
const IMG_PREFIX = DATA.imgPrefix;
const TRAIT_TYPES = ['face', 'head', 'background', 'body', 'hair', 'piercing'];

// Filter out doodles with bad/foreign-contract image URLs (238 entries point to matic/base contracts)
// Only keep doodles whose .i is a plain filename (hash.png) — these use the correct Doodles Ethereum CDN
const DOODLES = DATA.doodles.filter(d => d.i && !d.i.startsWith('http'));

const doodleImage = d => {
  if (!d || !d.i) return IMG_PREFIX + 'missing.png';
  return d.i.startsWith('http') ? d.i : IMG_PREFIX + d.i;
};
const openseaUrl = d => `https://opensea.io/assets/ethereum/0x8a90cab2b38dba80c64b7734e58ee1db38b8992e/${d.id}`;

/* Rarity % for a (type, value). Returns 100 when unknown (very common fallback). */
const rarityPct = (type, value) => {
  const r = (RARITY[type] || {})[value];
  return r == null ? 100 : r;
};

/* Whether a doodle has a specific trait (type + value). */
const hasTrait = (d, type, value) => {
  if (!d) return false;
  const v = d.t ? d.t[type] : undefined;
  if (value === '__none__') return v == null;
  return v === value;
};

/* Labels */
const titleCase = s => (s || '').replace(/\b\w/g, c => c.toUpperCase());
const traitLabel = (type, value) => `${titleCase(value)} ${titleCase(type)}`;

/* Build a pool of "askable" traits for Guess mode:
   Pick traits that are neither super-common nor ultra-rare,
   so yes/no questions feel fair and discriminating. */
const GUESS_POOL = (() => {
  const pool = [];
  for (const type of TRAIT_TYPES) {
    const map = RARITY[type] || {};
    for (const [value, pct] of Object.entries(map)) {
      if (value === '__none__') continue;
      if (pct >= 0.3 && pct <= 20) pool.push({
        type,
        value,
        pct
      });
    }
  }
  return pool;
})();

/* ==========================================================================
   ICON SYSTEM — all custom inline SVG, thick black outlines, pastel fills
   ========================================================================== */

const STROKE = 'var(--c-text)';
const BaseSVG = ({
  size = 24,
  children,
  viewBox = '0 0 24 24',
  className = ''
}) => /*#__PURE__*/React.createElement("svg", {
  width: size,
  height: size,
  viewBox: viewBox,
  fill: "none",
  className: className,
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, children);
const FlowerIcon = ({
  size = 24,
  petal = '#FFFFFF',
  center = '#FFE082'
}) => /*#__PURE__*/React.createElement(BaseSVG, {
  size: size
}, /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "6.5",
  r: "3.2",
  fill: petal,
  stroke: STROKE,
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "16.8",
  cy: "9.8",
  r: "3.2",
  fill: petal,
  stroke: STROKE,
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "14.8",
  cy: "15.5",
  r: "3.2",
  fill: petal,
  stroke: STROKE,
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "9.2",
  cy: "15.5",
  r: "3.2",
  fill: petal,
  stroke: STROKE,
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "7.2",
  cy: "9.8",
  r: "3.2",
  fill: petal,
  stroke: STROKE,
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "11.5",
  r: "2.6",
  fill: center,
  stroke: STROKE,
  strokeWidth: "2"
}));
const CloudRainIcon = ({
  size = 24
}) => /*#__PURE__*/React.createElement(BaseSVG, {
  size: size
}, /*#__PURE__*/React.createElement("path", {
  d: "M6 13a3 3 0 0 1 .5-5.95A5 5 0 0 1 16 8a4 4 0 0 1 0 8H7a3 3 0 0 1-1-3z",
  fill: "#D5C8E8",
  stroke: STROKE,
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("path", {
  d: "M9 18l-1 3M13 18l-1 3M17 18l-1 3",
  stroke: "#90CAF9",
  strokeWidth: "2"
}));
const ButterflyIcon = ({
  size = 24
}) => /*#__PURE__*/React.createElement(BaseSVG, {
  size: size
}, /*#__PURE__*/React.createElement("ellipse", {
  cx: "7",
  cy: "9",
  rx: "4.5",
  ry: "5",
  fill: "#FFB7C5",
  stroke: STROKE,
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("ellipse", {
  cx: "17",
  cy: "9",
  rx: "4.5",
  ry: "5",
  fill: "#C5B3E6",
  stroke: STROKE,
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("ellipse", {
  cx: "7",
  cy: "16",
  rx: "4",
  ry: "4",
  fill: "#FFE082",
  stroke: STROKE,
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("ellipse", {
  cx: "17",
  cy: "16",
  rx: "4",
  ry: "4",
  fill: "#A8E6CF",
  stroke: STROKE,
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("path", {
  d: "M12 5v15",
  stroke: STROKE,
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "5",
  r: "1",
  fill: STROKE
}));

/* Neon rainbow — glowing fluid arcs, crisp color, no outlines */
const RainbowIcon = ({
  size = 24
}) => {
  const uid = 'n' + Math.floor(Math.random() * 1e6);
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size * 0.55,
    viewBox: "0 0 48 26",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      overflow: 'visible'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("filter", {
    id: `glow-${uid}`,
    x: "-150%",
    y: "-150%",
    width: "400%",
    height: "400%"
  }, /*#__PURE__*/React.createElement("feGaussianBlur", {
    stdDeviation: "1.2",
    result: "b1"
  }), /*#__PURE__*/React.createElement("feGaussianBlur", {
    stdDeviation: "2.6",
    in: "SourceGraphic",
    result: "b2"
  }), /*#__PURE__*/React.createElement("feMerge", null, /*#__PURE__*/React.createElement("feMergeNode", {
    in: "b2"
  }), /*#__PURE__*/React.createElement("feMergeNode", {
    in: "b1"
  }), /*#__PURE__*/React.createElement("feMergeNode", {
    in: "SourceGraphic"
  })))), /*#__PURE__*/React.createElement("g", {
    filter: `url(#glow-${uid})`
  }, /*#__PURE__*/React.createElement("path", {
    stroke: "#FF3EA5",
    strokeWidth: "2.2",
    fill: "none",
    d: "M3 22 Q 24 1 45 22"
  }, /*#__PURE__*/React.createElement("animate", {
    attributeName: "d",
    dur: "5s",
    repeatCount: "indefinite",
    values: "M3 22 Q 24 1 45 22; M3 22 Q 24 4 45 22; M3 22 Q 24 0 45 22; M3 22 Q 24 1 45 22"
  })), /*#__PURE__*/React.createElement("path", {
    stroke: "#FFCC33",
    strokeWidth: "2",
    fill: "none",
    d: "M6 22 Q 24 5 42 22"
  }, /*#__PURE__*/React.createElement("animate", {
    attributeName: "d",
    dur: "4.2s",
    repeatCount: "indefinite",
    values: "M6 22 Q 24 5 42 22; M6 22 Q 24 8 42 22; M6 22 Q 24 3 42 22; M6 22 Q 24 5 42 22"
  })), /*#__PURE__*/React.createElement("path", {
    stroke: "#39FFB0",
    strokeWidth: "1.9",
    fill: "none",
    d: "M9 22 Q 24 9 39 22"
  }, /*#__PURE__*/React.createElement("animate", {
    attributeName: "d",
    dur: "4.6s",
    repeatCount: "indefinite",
    values: "M9 22 Q 24 9 39 22; M9 22 Q 24 12 39 22; M9 22 Q 24 7 39 22; M9 22 Q 24 9 39 22"
  })), /*#__PURE__*/React.createElement("path", {
    stroke: "#3EA5FF",
    strokeWidth: "1.8",
    fill: "none",
    d: "M12 22 Q 24 13 36 22"
  }, /*#__PURE__*/React.createElement("animate", {
    attributeName: "d",
    dur: "3.8s",
    repeatCount: "indefinite",
    values: "M12 22 Q 24 13 36 22; M12 22 Q 24 16 36 22; M12 22 Q 24 11 36 22; M12 22 Q 24 13 36 22"
  }))));
};
const ShootingStarIcon = ({
  size = 24
}) => /*#__PURE__*/React.createElement(BaseSVG, {
  size: size
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 20L9 14",
  stroke: "#FFB7C5",
  strokeWidth: "3"
}), /*#__PURE__*/React.createElement("path", {
  d: "M5 18L10 13",
  stroke: "#FFE082",
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("path", {
  d: "M14 4l1.5 3.5L19 9l-3.5 1.5L14 14l-1.5-3.5L9 9l3.5-1.5L14 4z",
  fill: "#FFE082",
  stroke: STROKE,
  strokeWidth: "2"
}));
const SparkleIcon = ({
  size = 24,
  fill = '#90CAF9'
}) => /*#__PURE__*/React.createElement(BaseSVG, {
  size: size
}, /*#__PURE__*/React.createElement("path", {
  d: "M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7z",
  fill: fill,
  stroke: STROKE,
  strokeWidth: "2"
}));
const CrownIcon = ({
  size = 24
}) => /*#__PURE__*/React.createElement(BaseSVG, {
  size: size
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 8l3 8h12l3-8-4 3-3-6-3 6-4-3-4-3z",
  fill: "#FFE082",
  stroke: STROKE,
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("path", {
  d: "M6 16h12",
  stroke: STROKE,
  strokeWidth: "2"
}));
const MagnifierIcon = ({
  size = 24
}) => /*#__PURE__*/React.createElement(BaseSVG, {
  size: size
}, /*#__PURE__*/React.createElement("circle", {
  cx: "10",
  cy: "10",
  r: "6",
  fill: "#C5B3E6",
  stroke: STROKE,
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "10",
  cy: "9",
  r: "1.5",
  fill: "#FFFFFF",
  stroke: STROKE,
  strokeWidth: "1.5"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "8",
  cy: "10.5",
  r: "1.5",
  fill: "#FFFFFF",
  stroke: STROKE,
  strokeWidth: "1.5"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "10.5",
  r: "1.5",
  fill: "#FFFFFF",
  stroke: STROKE,
  strokeWidth: "1.5"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "10",
  cy: "12",
  r: "1.5",
  fill: "#FFFFFF",
  stroke: STROKE,
  strokeWidth: "1.5"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "10",
  cy: "10",
  r: "1",
  fill: "#FFE082",
  stroke: STROKE,
  strokeWidth: "1"
}), /*#__PURE__*/React.createElement("path", {
  d: "M14.5 14.5L20 20",
  stroke: STROKE,
  strokeWidth: "3"
}));
const ArrowsIcon = ({
  size = 24
}) => /*#__PURE__*/React.createElement(BaseSVG, {
  size: size
}, /*#__PURE__*/React.createElement("path", {
  d: "M8 5v12m0-12l-3 3m3-3l3 3",
  stroke: "#FFAB91",
  strokeWidth: "2.5",
  fill: "none"
}), /*#__PURE__*/React.createElement("path", {
  d: "M16 19V7m0 12l3-3m-3 3l-3-3",
  stroke: "#FF8A8A",
  strokeWidth: "2.5",
  fill: "none"
}));
const WheelIcon = ({
  size = 24
}) => /*#__PURE__*/React.createElement(BaseSVG, {
  size: size,
  viewBox: "0 0 24 24"
}, /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "12",
  r: "9",
  fill: "#FFFFFF",
  stroke: STROKE,
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("path", {
  d: "M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4",
  stroke: STROKE,
  strokeWidth: "1.5"
}), /*#__PURE__*/React.createElement("path", {
  d: "M12 3 A9 9 0 0 1 18.4 5.6 L12 12 Z",
  fill: "#FFB7C5"
}), /*#__PURE__*/React.createElement("path", {
  d: "M18.4 5.6 A9 9 0 0 1 21 12 L12 12 Z",
  fill: "#FFE082"
}), /*#__PURE__*/React.createElement("path", {
  d: "M21 12 A9 9 0 0 1 18.4 18.4 L12 12 Z",
  fill: "#A8E6CF"
}), /*#__PURE__*/React.createElement("path", {
  d: "M18.4 18.4 A9 9 0 0 1 12 21 L12 12 Z",
  fill: "#90CAF9"
}), /*#__PURE__*/React.createElement("path", {
  d: "M12 21 A9 9 0 0 1 5.6 18.4 L12 12 Z",
  fill: "#C5B3E6"
}), /*#__PURE__*/React.createElement("path", {
  d: "M5.6 18.4 A9 9 0 0 1 3 12 L12 12 Z",
  fill: "#FFAB91"
}), /*#__PURE__*/React.createElement("path", {
  d: "M3 12 A9 9 0 0 1 5.6 5.6 L12 12 Z",
  fill: "#FFB7C5"
}), /*#__PURE__*/React.createElement("path", {
  d: "M5.6 5.6 A9 9 0 0 1 12 3 L12 12 Z",
  fill: "#FFE082"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "12",
  r: "2",
  fill: "#FFFFFF",
  stroke: STROKE,
  strokeWidth: "2"
}));
const TrophyIcon = ({
  size = 24
}) => /*#__PURE__*/React.createElement(BaseSVG, {
  size: size
}, /*#__PURE__*/React.createElement("path", {
  d: "M7 4h10v5a5 5 0 0 1-10 0V4z",
  fill: "#FFE082",
  stroke: STROKE,
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("path", {
  d: "M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3",
  stroke: STROKE,
  strokeWidth: "2",
  fill: "none"
}), /*#__PURE__*/React.createElement("path", {
  d: "M10 14h4v4h-4z",
  fill: "#FFE082",
  stroke: STROKE,
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("path", {
  d: "M7 20h10",
  stroke: STROKE,
  strokeWidth: "2.5"
}));
/* Powerup icons — custom SVG, Doodles style */
const HintIcon = ({ size = 20 }) => /*#__PURE__*/React.createElement(BaseSVG, { size },
  /*#__PURE__*/React.createElement("circle", { cx: "12", cy: "10", r: "6", fill: "#FFE082", stroke: STROKE, strokeWidth: "2" }),
  /*#__PURE__*/React.createElement("path", { d: "M10 16h4v2a2 2 0 0 1-4 0v-2z", fill: "#FFE082", stroke: STROKE, strokeWidth: "2" }),
  /*#__PURE__*/React.createElement("path", { d: "M12 4v1M12 13v1M15.5 6.5l-.7.7M8.5 6.5l.7.7", stroke: STROKE, strokeWidth: "1.5" }),
  /*#__PURE__*/React.createElement("line", { x1: "10", y1: "19", x2: "14", y2: "19", stroke: STROKE, strokeWidth: "1.5" }));
const SkipIcon = ({ size = 20 }) => /*#__PURE__*/React.createElement(BaseSVG, { size },
  /*#__PURE__*/React.createElement("circle", { cx: "12", cy: "12", r: "9", fill: "#A8E6CF", stroke: STROKE, strokeWidth: "2" }),
  /*#__PURE__*/React.createElement("path", { d: "M10 8l5 4-5 4V8z", fill: STROKE }),
  /*#__PURE__*/React.createElement("line", { x1: "16", y1: "8", x2: "16", y2: "16", stroke: STROKE, strokeWidth: "2" }));
const FreezeIcon = ({ size = 20 }) => /*#__PURE__*/React.createElement(BaseSVG, { size },
  /*#__PURE__*/React.createElement("circle", { cx: "12", cy: "12", r: "9", fill: "#B3D4FC", stroke: STROKE, strokeWidth: "2" }),
  /*#__PURE__*/React.createElement("path", { d: "M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4", stroke: "#FFF", strokeWidth: "1.5", opacity: "0.7" }),
  /*#__PURE__*/React.createElement("circle", { cx: "12", cy: "12", r: "3", fill: "#FFF", stroke: STROKE, strokeWidth: "1.5" }));

const FaceIcon = ({
  size = 24,
  fill = '#FFAB91'
}) => /*#__PURE__*/React.createElement(BaseSVG, {
  size: size
}, /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "12",
  r: "9",
  fill: fill,
  stroke: STROKE,
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "9",
  cy: "11",
  r: "1",
  fill: STROKE
}), /*#__PURE__*/React.createElement("circle", {
  cx: "15",
  cy: "11",
  r: "1",
  fill: STROKE
}), /*#__PURE__*/React.createElement("path", {
  d: "M9.5 14.5c1 1 4 1 5 0",
  stroke: STROKE,
  strokeWidth: "2",
  fill: "none"
}));
const StarNavIcon = ({
  size = 24,
  fill = '#A8E6CF'
}) => /*#__PURE__*/React.createElement(BaseSVG, {
  size: size
}, /*#__PURE__*/React.createElement("path", {
  d: "M12 3l2.5 5 5.5 1-4 4 1 5.5-5-2.5L7 18.5l1-5.5-4-4 5.5-1L12 3z",
  fill: fill,
  stroke: STROKE,
  strokeWidth: "2"
}));
const CloudIcon = ({
  size = 24,
  fill = '#FFFFFF'
}) => /*#__PURE__*/React.createElement(BaseSVG, {
  size: size
}, /*#__PURE__*/React.createElement("path", {
  d: "M6 16a3.5 3.5 0 0 1 .5-6.95A5 5 0 0 1 16 10a3.5 3.5 0 0 1 0 7H7a3 3 0 0 1-1-1z",
  fill: fill,
  stroke: STROKE,
  strokeWidth: "2"
}));
const CheckIcon = ({
  size = 16
}) => /*#__PURE__*/React.createElement(BaseSVG, {
  size: size
}, /*#__PURE__*/React.createElement("path", {
  d: "M5 12l4 4 10-10",
  stroke: STROKE,
  strokeWidth: "2.5",
  fill: "none"
}));
const XIcon = ({
  size = 20
}) => /*#__PURE__*/React.createElement(BaseSVG, {
  size: size
}, /*#__PURE__*/React.createElement("path", {
  d: "M6 6l12 12M18 6L6 18",
  stroke: STROKE,
  strokeWidth: "2.5"
}));
const ShareIcon = ({
  size = 20
}) => /*#__PURE__*/React.createElement(BaseSVG, {
  size: size
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 20l18-8-18-8 4 8-4 8z",
  fill: "#FFB7C5",
  stroke: STROKE,
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("path", {
  d: "M7 12l14 0",
  stroke: STROKE,
  strokeWidth: "2"
}));
const ChevronLeftIcon = ({
  size = 20
}) => /*#__PURE__*/React.createElement(BaseSVG, {
  size: size
}, /*#__PURE__*/React.createElement("path", {
  d: "M15 6l-6 6 6 6",
  stroke: STROKE,
  strokeWidth: "2.5",
  fill: "none"
}));

/* ==========================================================================
   PROFILE AVATAR — photo upload with fallback to FaceIcon
   ========================================================================== */

const ProfileAvatar = ({
  profile,
  size = 80,
  animated = true
}) => {
  const [imgError, setImgError] = useState(false);
  const borderW = Math.max(2, Math.round(size / 26));
  const style = {
    width: size,
    height: size,
    background: profile.color,
    border: `${borderW}px solid ${STROKE}`,
    boxShadow: animated ? `0 8px 22px ${profile.color}66` : 'none'
  };
  const hasValidAvatar = !imgError && profile.avatar && typeof profile.avatar === 'string'
    && (profile.avatar.startsWith('data:') || profile.avatar.startsWith('http'));
  if (hasValidAvatar) {
    return /*#__PURE__*/React.createElement("div", {
      className: `rounded-full overflow-hidden flex items-center justify-center ${animated ? 'avatar-glow' : ''}`,
      style: style
    }, /*#__PURE__*/React.createElement("img", {
      src: profile.avatar,
      alt: "avatar",
      draggable: false,
      onError: function() { setImgError(true); },
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        userSelect: 'none'
      }
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: `rounded-full flex items-center justify-center ${animated ? 'avatar-glow' : ''}`,
    style: style
  }, /*#__PURE__*/React.createElement(FaceIcon, {
    size: Math.round(size * 0.65),
    fill: profile.color
  }));
};

/* ==========================================================================
   DOODLE AVATAR — procedural SVG of a Doodle-style character
   ========================================================================== */

/* Global image cache: prevents re-requesting URLs we already loaded successfully */
const _imgCache = new Set();
const _imgFailed = new Set();

/* Prefetch a list of doodle objects so images are warm in browser cache */
const prefetchDoodleImages = doodles => {
  if (!Array.isArray(doodles)) return;
  doodles.forEach(d => {
    if (!d || !d.i) return;
    const url = doodleImage(d);
    if (_imgCache.has(url)) return;
    // Clear from failed set — allow retries during prefetch
    _imgFailed.delete(url);
    const img = new Image();
    img.onload = () => _imgCache.add(url);
    img.onerror = () => {
      // Try resized variant
      const alt = new Image();
      alt.onload = () => _imgCache.add(url);
      alt.onerror = () => {
        // Try cache-bust before giving up
        const alt2 = new Image();
        alt2.onload = () => _imgCache.add(url);
        alt2.onerror = () => _imgFailed.add(url);
        alt2.src = url + (url.includes('?') ? '&' : '?') + 'cb=' + Date.now();
      };
      alt.src = url + (url.includes('?') ? '&' : '?') + 'w=500&auto=format';
    };
    img.src = url;
  });
};
const DoodleAvatar = ({
  doodle,
  size = 120,
  rounded = true,
  eager = false,
  onFail
}) => {
  const [status, setStatus] = useState('loading'); // loading | loaded | retrying | failed
  const [attempt, setAttempt] = useState(0);
  const [visible, setVisible] = useState(false);
  const wrapRef = useRef(null);

  // Reset on doodle change
  useEffect(() => {
    const url = doodle ? doodleImage(doodle) : '';
    if (_imgCache.has(url)) {
      setStatus('loaded');
      setAttempt(0);
    } else {
      setStatus('loading');
      setAttempt(0);
    }
  }, [doodle ? doodle.id : null]);

  // IntersectionObserver — only load when near viewport
  useEffect(() => {
    if (eager) { setVisible(true); return; }
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setVisible(true);
        io.disconnect();
      }
    }, {
      rootMargin: '200px'
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // CDN strategies with cache-bust on last attempt
  const primaryUrl = doodleImage(doodle);
  const sources = doodle ? [primaryUrl,
  // primary CDN
  primaryUrl + (primaryUrl.includes('?') ? '&' : '?') + 'w=500&auto=format',
  // resized variant
  primaryUrl + (primaryUrl.includes('?') ? '&' : '?') + 'cb=' + Date.now(),
  // cache-bust retry
  primaryUrl + (primaryUrl.includes('?') ? '&' : '?') + 'cb=' + (Date.now() + 1) + '&w=250',
  // second cache-bust with smaller size
  primaryUrl  // final retry with original URL
  ] : [];
  const currentSrc = sources[attempt] || sources[0];

  // Fallback placeholder
  const palette = ['#FFB7C5', '#FFE082', '#A8E6CF', '#90CAF9', '#C5B3E6', '#FFAB91'];
  const seed = doodle ? doodle.id : 0;
  const c1 = palette[seed % palette.length];
  const c2 = palette[(seed + 2) % palette.length];
  const radius = rounded ? '0.75rem' : '0';

  // Shimmer skeleton while loading
  const shimmer = /*#__PURE__*/React.createElement("div", {
    ref: wrapRef,
    className: "doodle-shimmer",
    style: {
      width: size,
      height: size,
      borderRadius: radius,
      background: `linear-gradient(135deg, ${c1}44, ${c2}44)`,
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s ease-in-out infinite'
    }
  }));
  // Auto-retry failed images (max 3 attempts) — hooks must be before early returns
  const retryCountRef = useRef(0);
  useEffect(() => {
    if (!doodle || status !== 'failed') return;
    if (retryCountRef.current >= 3) return; // give up after 3 retries
    const timer = setTimeout(() => {
      retryCountRef.current++;
      _imgFailed.delete(doodleImage(doodle));
      setAttempt(0);
      setStatus('loading');
    }, 2500);
    return () => clearTimeout(timer);
  }, [status, doodle]);
  if (!doodle) {
    return shimmer;
  }
  if (status === 'failed') {
    const retryFn = () => {
      retryCountRef.current = 0;
      _imgFailed.delete(doodleImage(doodle));
      setAttempt(0);
      setStatus('loading');
    };
    return /*#__PURE__*/React.createElement("div", {
      ref: wrapRef,
      className: rounded ? 'rounded-2xl' : '',
      onClick: retryFn,
      style: {
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${c1}66, ${c2}66)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 4,
        color: 'var(--c-text-sub)',
        fontWeight: 600,
        fontSize: Math.max(9, size * 0.1),
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: { fontSize: Math.max(9, size * 0.09), opacity: 0.6 }
    }, "Loading #", doodle.id, "..."));
  }
  if (!visible) return shimmer;
  return /*#__PURE__*/React.createElement("div", {
    ref: wrapRef,
    style: {
      width: size,
      height: size,
      position: 'relative',
      borderRadius: radius,
      overflow: 'hidden'
    }
  }, status !== 'loaded' && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: `linear-gradient(135deg, ${c1}44, ${c2}44)`,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s ease-in-out infinite'
    }
  })), /*#__PURE__*/React.createElement("img", {
    src: currentSrc,
    alt: doodle ? `Doodle #${doodle.id}` : '',
    width: size,
    height: size,
    loading: eager ? "eager" : "lazy",
    draggable: false,
    onLoad: () => {
      _imgCache.add(doodleImage(doodle));
      setStatus('loaded');
    },
    onError: () => {
      if (attempt < sources.length - 1) {
        setAttempt(a => a + 1);
        setStatus('retrying');
      } else {
        _imgFailed.add(doodleImage(doodle));
        setStatus('failed');
        if (onFail) onFail(doodle);
      }
    },
    style: {
      display: 'block',
      width: size,
      height: size,
      objectFit: 'cover',
      userSelect: 'none',
      position: 'relative',
      opacity: status === 'loaded' ? 1 : 0,
      transition: 'opacity 0.3s ease'
    }
  }));
};

/* ==========================================================================
   FLOATING DECORATIVE BACKGROUND
   ========================================================================== */

/* Reactive particle overlay: listens to pointerdown globally and spawns 4-6
   tiny floating sparkles/flowers that rise and fade. Respects reduced motion. */
const ParticleOverlay = () => {
  const [parts, setParts] = useState([]);
  const idRef = useRef(0);
  useEffect(() => {
    const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const handler = e => {
      // Skip when tapping form controls/text
      const t = e.target;
      if (t && t.closest && t.closest('input, textarea, select, button[data-no-fx]')) {
        // still allow buttons, just not form fields
        if (t.closest('input, textarea, select')) return;
      }
      const x = e.clientX,
        y = e.clientY;
      if (x == null || y == null) return;
      const palette = ['#FFB7C5', '#FFE082', '#A8E6CF', '#90CAF9', '#C5B3E6', '#FFAB91'];
      const count = 5 + Math.floor(Math.random() * 2);
      const now = Date.now();
      const news = [];
      for (let i = 0; i < count; i++) {
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.3;
        const dist = 30 + Math.random() * 44;
        news.push({
          id: ++idRef.current + ':' + now,
          x,
          y,
          dx: Math.cos(ang) * dist,
          dy: Math.sin(ang) * dist,
          rot: (Math.random() - 0.5) * 300,
          color: palette[Math.floor(Math.random() * palette.length)],
          size: 8 + Math.random() * 6,
          shape: Math.random() > 0.5 ? 'petal' : 'dot'
        });
      }
      setParts(p => [...p, ...news]);
      setTimeout(() => {
        setParts(p => p.filter(pp => !news.find(n => n.id === pp.id)));
      }, 1100);
    };
    window.addEventListener('pointerdown', handler, {
      passive: true
    });
    return () => window.removeEventListener('pointerdown', handler);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "pointer-events-none fixed inset-0 z-[60]",
    "aria-hidden": "true"
  }, parts.map(p => /*#__PURE__*/React.createElement("span", {
    key: p.id,
    className: "absolute block",
    style: {
      left: p.x,
      top: p.y,
      width: p.size,
      height: p.shape === 'petal' ? p.size * 1.4 : p.size,
      background: p.color,
      borderRadius: p.shape === 'petal' ? '60% 60% 30% 30% / 80% 80% 30% 30%' : '50%',
      transform: 'translate(-50%,-50%)',
      animation: 'partRise 1s cubic-bezier(.2,.8,.2,1) forwards',
      ['--dx']: p.dx + 'px',
      ['--dy']: p.dy + 'px',
      ['--rot']: p.rot + 'deg',
      boxShadow: `0 0 6px ${p.color}88`,
      pointerEvents: 'none'
    }
  })), /*#__PURE__*/React.createElement("style", null, `
        @keyframes partRise {
          0%   { opacity: 0; transform: translate(-50%,-50%) scale(0.4) rotate(0deg); }
          20%  { opacity: 1; }
          100% { opacity: 0;
                 transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.7) rotate(var(--rot)); }
        }
      `));
};

/* Dynamic sky: color phases interpolate based on local hour. Night shows stars,
   day shows clouds, dawn/dusk show a soft sun glow. Updates every 60s. */
const SKY_PHASES = [{
  t: 0,
  top: '#2B2870',
  mid: '#3D3894',
  bot: '#554EB8'
},
// deep night (lighter)
{
  t: 5,
  top: '#5B5499',
  mid: '#8A75B5',
  bot: '#C89BB3'
},
// pre-dawn
{
  t: 7,
  top: '#F4C6D4',
  mid: '#FFD9B8',
  bot: '#FFE6C5'
},
// sunrise
{
  t: 10,
  top: '#BFE3FF',
  mid: '#D8EEFF',
  bot: '#F2F8FF'
},
// morning
{
  t: 14,
  top: '#A6D8FF',
  mid: '#CFE8FF',
  bot: '#EDF5FF'
},
// noon
{
  t: 18,
  top: '#FFB785',
  mid: '#FFA0B5',
  bot: '#E08BB6'
},
// sunset
{
  t: 20,
  top: '#7A4FB5',
  mid: '#9A5FA8',
  bot: '#B070A0'
},
// dusk
{
  t: 22,
  top: '#3A3580',
  mid: '#4A4499',
  bot: '#5D52B0'
},
// early night
{
  t: 24,
  top: '#2B2870',
  mid: '#3D3894',
  bot: '#554EB8'
}];
const _hexToRgb = h => {
  const p = parseInt(h.slice(1), 16);
  return [p >> 16 & 0xff, p >> 8 & 0xff, p & 0xff];
};
const _lerp = (a, b, p) => {
  const ra = _hexToRgb(a),
    rb = _hexToRgb(b);
  const r = Math.round(ra[0] + (rb[0] - ra[0]) * p);
  const g = Math.round(ra[1] + (rb[1] - ra[1]) * p);
  const bl = Math.round(ra[2] + (rb[2] - ra[2]) * p);
  return `rgb(${r},${g},${bl})`;
};
const skyAt = h => {
  let i = 0;
  while (i < SKY_PHASES.length - 1 && !(h >= SKY_PHASES[i].t && h < SKY_PHASES[i + 1].t)) i++;
  const a = SKY_PHASES[i],
    b = SKY_PHASES[i + 1];
  const p = Math.min(1, Math.max(0, (h - a.t) / (b.t - a.t)));
  return {
    top: _lerp(a.top, b.top, p),
    mid: _lerp(a.mid, b.mid, p),
    bot: _lerp(a.bot, b.bot, p)
  };
};
const SkyBackground = () => {
  const [tick, setTick] = useState(0);
  const [themeOverride, setThemeOverride] = useState(() => typeof document !== 'undefined' && document.documentElement.dataset.theme || '');
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    // Watch <html data-theme> changes so Day/Night toggle takes effect instantly
    if (typeof MutationObserver !== 'undefined') {
      const mo = new MutationObserver(() => {
        setThemeOverride(document.documentElement.dataset.theme || '');
      });
      mo.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      });
      return () => {
        clearInterval(id);
        mo.disconnect();
      };
    }
    return () => clearInterval(id);
  }, []);
  const now = new Date();
  const realH = now.getHours() + now.getMinutes() / 60;
  // If user pinned light → noon; dark → 23h; else use real hour
  const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const h = themeOverride === 'light' ? 12 : themeOverride === 'dark' ? 23 : (prefersDark && !themeOverride ? 23 : realH);
  const {
    top,
    mid,
    bot
  } = skyAt(h);
  const isNight = h < 5.5 || h >= 20.5;
  const isDawn = h >= 5.5 && h < 8;
  const isDusk = h >= 17.5 && h < 20.5;
  const clouds = useRef(null);
  if (!clouds.current) {
    const rng = mulberry32(777);
    clouds.current = Array.from({
      length: 7
    }, (_, i) => ({
      id: i,
      left: rng() * 110 - 5,
      top: 6 + rng() * 55,
      size: 22 + rng() * 28,
      delay: rng() * 12,
      duration: 28 + rng() * 20,
      opacity: 0.12 + rng() * 0.18
    }));
  }
  const stars = useRef(null);
  if (!stars.current) {
    const rng = mulberry32(909);
    stars.current = Array.from({
      length: 60
    }, (_, i) => ({
      id: i,
      left: rng() * 100,
      top: rng() * 85,
      size: 1 + rng() * 2.5,
      delay: rng() * 6,
      duration: 2 + rng() * 4,
      opacity: 0.5 + rng() * 0.5
    }));
  }

  // Sun/moon position: left→right across the sky from 5h to 21h (day) or at top for night
  const dayProgress = Math.min(1, Math.max(0, (h - 5) / 16));
  const luminaryX = 6 + dayProgress * 88; // vw
  const luminaryY = 14 + Math.sin(dayProgress * Math.PI) * -8; // pulls up at midday
  const isSun = h >= 5.5 && h < 20.5;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 overflow-hidden pointer-events-none -z-10",
    style: {
      contain: 'layout style paint',
      willChange: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0",
    style: {
      background: `linear-gradient(180deg, ${top} 0%, ${mid} 55%, ${bot} 100%)`,
      transition: 'background 6s linear'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute rounded-full",
    style: {
      left: `calc(${luminaryX}vw - 28px)`,
      top: `${luminaryY}vh`,
      width: 56,
      height: 56,
      background: isSun ? isDawn ? 'radial-gradient(circle,#FFF2D2 0%,#FFE29A 60%,transparent 72%)' : isDusk ? 'radial-gradient(circle,#FFDBC0 0%,#FF9E88 55%,transparent 70%)' : 'radial-gradient(circle,#FFFBE8 0%,#FFE5A0 58%,transparent 72%)' : 'radial-gradient(circle,#F5F1FF 0%,#D8CFF0 55%,transparent 72%)',
      filter: 'blur(0.4px)',
      opacity: 0.9,
      transition: 'all 6s linear'
    }
  }), isNight && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0"
  }, stars.current.map(s => /*#__PURE__*/React.createElement("span", {
    key: s.id,
    className: "absolute rounded-full",
    style: {
      left: `${s.left}%`,
      top: `${s.top}%`,
      width: s.size,
      height: s.size,
      background: '#FFF8E2',
      opacity: s.opacity,
      boxShadow: `0 0 ${s.size * 2}px rgba(255,248,226,0.55)`,
      animation: `starBlink ${s.duration}s ease-in-out ${s.delay}s infinite`
    }
  }))), !isNight && clouds.current.map(d => /*#__PURE__*/React.createElement("div", {
    key: d.id,
    className: "absolute",
    style: {
      left: `${d.left}%`,
      top: `${d.top}%`,
      opacity: d.opacity,
      animation: `cloudDrift ${d.duration}s linear ${d.delay}s infinite`
    }
  }, /*#__PURE__*/React.createElement(CloudIcon, {
    size: d.size * 1.8,
    fill: "#FFFFFF"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 overflow-hidden",
    style: {
      opacity: isNight ? 0.5 : 0.3
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sky-aurora sky-aurora-a"
  }), /*#__PURE__*/React.createElement("div", {
    className: "sky-aurora sky-aurora-b"
  }), /*#__PURE__*/React.createElement("div", {
    className: "sky-aurora sky-aurora-c"
  })), isNight && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shooting-star",
    style: {
      top: '12%',
      left: '5%',
      animationDelay: '0s'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "shooting-star",
    style: {
      top: '25%',
      left: '45%',
      animationDelay: '4.5s'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "shooting-star",
    style: {
      top: '8%',
      left: '72%',
      animationDelay: '9s'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 overflow-hidden pointer-events-none",
    style: {
      opacity: isNight ? 0.3 : 0.5
    }
  }, [{
    emoji: '🌸',
    x: 8,
    y: 15,
    dur: 32,
    del: 0,
    sz: 18
  }, {
    emoji: '✿',
    x: 25,
    y: 35,
    dur: 40,
    del: -6,
    sz: 14
  }, {
    emoji: '🦋',
    x: 55,
    y: 12,
    dur: 36,
    del: -12,
    sz: 16
  }, {
    emoji: '☁️',
    x: 72,
    y: 28,
    dur: 44,
    del: -18,
    sz: 20
  }, {
    emoji: '🌈',
    x: 88,
    y: 45,
    dur: 38,
    del: -24,
    sz: 15
  }, {
    emoji: '⭐',
    x: 40,
    y: 50,
    dur: 42,
    del: -9,
    sz: 12
  }].map((f, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "floating-doodle-face",
    style: {
      left: `${f.x}%`,
      top: `${f.y}%`,
      fontSize: f.sz,
      animationDuration: `${f.dur}s`,
      animationDelay: `${f.del}s`
    }
  }, f.emoji))), /*#__PURE__*/React.createElement(DreamLandscape, {
    isNight: isNight
  }), /*#__PURE__*/React.createElement("style", null, `
        /* Floating mini doodle faces */
        .floating-doodle-face {
          position: absolute;
          animation: doodleFaceDrift ease-in-out infinite;
          will-change: transform;
          filter: blur(0.3px);
          opacity: 0.6;
        }
        @keyframes doodleFaceDrift {
          0%,100% { transform: translate(0, 0) rotate(0deg) scale(1); }
          25%     { transform: translate(12px, -20px) rotate(8deg) scale(1.05); }
          50%     { transform: translate(-8px, -35px) rotate(-5deg) scale(0.95); }
          75%     { transform: translate(18px, -15px) rotate(12deg) scale(1.02); }
        }

        /* Aurora blobs */
        .sky-aurora {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          will-change: transform;
          mix-blend-mode: screen;
        }
        .sky-aurora-a {
          width: 40vw; height: 40vw;
          top: -5%; left: -10%;
          background: radial-gradient(circle, rgba(255,183,197,0.4), transparent 70%);
          animation: auroraA 18s ease-in-out infinite;
        }
        .sky-aurora-b {
          width: 35vw; height: 35vw;
          top: 10%; right: -8%;
          background: radial-gradient(circle, rgba(168,230,207,0.35), transparent 70%);
          animation: auroraB 22s ease-in-out infinite;
        }
        .sky-aurora-c {
          width: 30vw; height: 30vw;
          top: 30%; left: 30%;
          background: radial-gradient(circle, rgba(197,179,230,0.35), transparent 70%);
          animation: auroraC 25s ease-in-out infinite;
        }
        @keyframes auroraA {
          0%,100% { transform: translate(0, 0) scale(1); }
          33%     { transform: translate(8vw, 3vh) scale(1.15); }
          66%     { transform: translate(-4vw, 6vh) scale(0.9); }
        }
        @keyframes auroraB {
          0%,100% { transform: translate(0, 0) scale(1); }
          40%     { transform: translate(-6vw, 5vh) scale(1.1); }
          70%     { transform: translate(3vw, -3vh) scale(0.95); }
        }
        @keyframes auroraC {
          0%,100% { transform: translate(0, 0) scale(1); }
          50%     { transform: translate(5vw, -4vh) scale(1.2); }
        }

        /* Shooting stars */
        .shooting-star {
          position: absolute;
          width: 3px; height: 3px;
          background: #FFF8E2;
          border-radius: 50%;
          box-shadow: 0 0 6px 2px rgba(255,248,226,0.8);
          opacity: 0;
          animation: shootingStar 12s ease-in infinite;
        }
        .shooting-star::after {
          content: '';
          position: absolute;
          top: 0; right: 0;
          width: 60px; height: 1.5px;
          background: linear-gradient(90deg, rgba(255,248,226,0.8), transparent);
          transform: rotate(35deg);
          transform-origin: 0% 50%;
        }
        @keyframes shootingStar {
          0%        { opacity: 0; transform: translate(0,0); }
          2%        { opacity: 1; }
          8%        { opacity: 0; transform: translate(25vw, 15vh); }
          100%      { opacity: 0; transform: translate(25vw, 15vh); }
        }

        @keyframes cloudDrift {
          0%   { transform: translateX(-30px) translateY(0); }
          50%  { transform: translateX(30px) translateY(-6px); }
          100% { transform: translateX(-30px) translateY(0); }
        }
        @keyframes starBlink {
          0%,100% { opacity: 0.25; transform: scale(0.85); }
          50%     { opacity: 1;    transform: scale(1.15); }
        }
        @keyframes flutter {
          0%,100% { transform: translate(0,0) rotate(-6deg); }
          25%     { transform: translate(6px,-4px) rotate(4deg); }
          50%     { transform: translate(12px,-2px) rotate(-3deg); }
          75%     { transform: translate(4px,-6px) rotate(6deg); }
        }
        @keyframes hillBreathe {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-2px); }
        }
        @keyframes rainbowShimmer {
          0%,100% { opacity: 0.95; }
          50%     { opacity: 0.75; }
        }
        @keyframes riverFlow {
          0%   { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -120; }
        }
        @keyframes flowerBob {
          0%,100% { transform: translateY(0) rotate(0deg); }
          50%     { transform: translateY(-3px) rotate(2deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .landscape-motion, .landscape-motion * { animation: none !important; }
        }
      `));
};

/* ==========================================================================
   DREAM LANDSCAPE — illustrated scene: hills, rainbow path, river, mountains,
   flowers & butterflies. Inspired by Doodles brand scenery.
   ========================================================================== */
const DreamLandscape = ({
  isNight
}) => {
  // night palette dims the whole scene
  const dim = isNight ? 0.55 : 1;
  return /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-x-0 bottom-0 pointer-events-none landscape-motion",
    style: {
      height: '72vh',
      minHeight: 480,
      opacity: dim,
      contain: 'layout style paint',
      WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, transparent 5%, rgba(0,0,0,0.05) 12%, rgba(0,0,0,0.15) 18%, rgba(0,0,0,0.35) 25%, rgba(0,0,0,0.6) 32%, rgba(0,0,0,0.85) 40%, black 50%)',
      maskImage: 'linear-gradient(to bottom, transparent 0%, transparent 5%, rgba(0,0,0,0.05) 12%, rgba(0,0,0,0.15) 18%, rgba(0,0,0,0.35) 25%, rgba(0,0,0,0.6) 32%, rgba(0,0,0,0.85) 40%, black 50%)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 1000 620",
    preserveAspectRatio: "xMidYMax slice",
    width: "100%",
    height: "100%",
    style: {
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "mtnA",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#D6CEF0"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "0.55",
    stopColor: "#B9AFE0"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#8E82C9"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "mtnB",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#E6DDF6"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#A89ED4"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "hillG1",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#C8EBC0"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#8FD59A"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "hillG2",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#B7E3BA"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#76C888"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "hillP",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#FFD9E3"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#F9A8C1"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "hillV",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#CBB8EE"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#9782D2"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "river",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#CDE7FA"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#8FC8F0"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "rainbow1",
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "0"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#FFB7C5"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#FFD6DE"
  }))), /*#__PURE__*/React.createElement("g", {
    style: {
      animation: 'hillBreathe 16s ease-in-out infinite'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M -20 340 Q 40 240 90 220 Q 125 248 160 280 Q 200 210 240 180 Q 285 222 330 270 Q 375 230 420 210 Q 470 255 520 300 Q 570 230 620 200 Q 670 240 720 280 Q 770 245 820 230 Q 870 270 920 310 Q 970 278 1020 260 L 1020 460 L -20 460 Z",
    fill: "url(#mtnA)",
    stroke: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 78 232 Q 90 220 102 232 Q 95 248 78 248 Z",
    fill: "#FFFFFF",
    stroke: "var(--c-text)",
    strokeWidth: "1.8",
    strokeLinejoin: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 225 195 Q 240 180 255 195 Q 248 218 225 218 Z",
    fill: "#FFFFFF",
    stroke: "var(--c-text)",
    strokeWidth: "1.8",
    strokeLinejoin: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 405 222 Q 420 210 435 222 Q 428 242 405 242 Z",
    fill: "#FFFFFF",
    stroke: "var(--c-text)",
    strokeWidth: "1.8",
    strokeLinejoin: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 605 212 Q 620 200 635 212 Q 628 232 605 232 Z",
    fill: "#FFFFFF",
    stroke: "var(--c-text)",
    strokeWidth: "1.8",
    strokeLinejoin: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 805 242 Q 820 230 835 242 Q 828 258 805 258 Z",
    fill: "#FFFFFF",
    stroke: "var(--c-text)",
    strokeWidth: "1.8",
    strokeLinejoin: "round"
  }), /*#__PURE__*/React.createElement("g", {
    fill: "#FFFFFF",
    opacity: "0.9"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "135",
    cy: "300",
    r: "3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "170",
    cy: "320",
    r: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "200",
    cy: "285",
    r: "2.3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 180 340 l 0 -8 M 176 336 l 8 0",
    stroke: "#FFFFFF",
    strokeWidth: "1.8",
    strokeLinecap: "round"
  }))), /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M -20 400 Q 80 340 180 365 Q 280 395 380 375 Q 480 350 580 370 Q 700 395 820 365 Q 920 345 1020 380 L 1020 500 L -20 500 Z",
    fill: "#A8C8E8",
    stroke: "var(--c-text)",
    strokeWidth: "2.4",
    strokeLinejoin: "round"
  })), /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M -20 430 Q 140 360 300 400 Q 420 428 560 395 Q 700 360 860 410 Q 960 440 1020 420 L 1020 560 L -20 560 Z",
    fill: "url(#hillG1)",
    stroke: "var(--c-text)",
    strokeWidth: "2.6",
    strokeLinejoin: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M -20 470 Q 160 410 320 450 Q 480 490 640 440 Q 800 395 1020 470 L 1020 580 L -20 580 Z",
    fill: "url(#hillG2)",
    stroke: "var(--c-text)",
    strokeWidth: "2.6",
    strokeLinejoin: "round"
  })), /*#__PURE__*/React.createElement("g", {
    style: {
      animation: 'rainbowShimmer 5s ease-in-out infinite'
    }
  }, [{
    c: '#FFB7C5',
    dy: 0
  }, {
    c: '#FFD89B',
    dy: 7
  }, {
    c: '#FFF4B1',
    dy: 14
  }, {
    c: '#B9E8BF',
    dy: 21
  }, {
    c: '#A8D8F0',
    dy: 28
  }, {
    c: '#C5B3E6',
    dy: 35
  }].map((s, i) => /*#__PURE__*/React.createElement("path", {
    key: i,
    d: `M -30 ${560 + s.dy} Q 220 ${470 + s.dy} 360 ${500 + s.dy} Q 540 ${540 + s.dy} 620 ${470 + s.dy} Q 720 ${410 + s.dy} 860 ${450 + s.dy} Q 960 ${475 + s.dy} 1030 ${460 + s.dy}`,
    fill: "none",
    stroke: s.c,
    strokeWidth: "9",
    strokeLinecap: "round",
    opacity: "0.95"
  })), /*#__PURE__*/React.createElement("path", {
    d: "M -30 560 Q 220 470 360 500 Q 540 540 620 470 Q 720 410 860 450 Q 960 475 1030 460",
    fill: "none",
    stroke: "var(--c-text)",
    strokeWidth: "2",
    strokeLinecap: "round",
    opacity: "0.25"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M -30 602 Q 220 512 360 542 Q 540 582 620 512 Q 720 452 860 492 Q 960 517 1030 502",
    fill: "none",
    stroke: "var(--c-text)",
    strokeWidth: "2",
    strokeLinecap: "round",
    opacity: "0.25"
  })), /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M 720 500 Q 760 540 820 555 Q 900 575 1020 570 L 1020 620 L 700 620 Z",
    fill: "url(#river)",
    stroke: "var(--c-text)",
    strokeWidth: "2.4",
    strokeLinejoin: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 760 530 Q 820 545 900 555",
    fill: "none",
    stroke: "#FFFFFF",
    strokeWidth: "3",
    strokeLinecap: "round",
    opacity: "0.7",
    strokeDasharray: "12 18",
    style: {
      animation: 'riverFlow 8s linear infinite'
    }
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 800 565 Q 880 575 980 578",
    fill: "none",
    stroke: "#FFFFFF",
    strokeWidth: "2",
    strokeLinecap: "round",
    opacity: "0.5",
    strokeDasharray: "8 22",
    style: {
      animation: 'riverFlow 12s linear infinite'
    }
  })), /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M -40 540 Q 60 470 180 530 Q 260 570 320 545 Q 400 515 470 560 Q 520 590 580 580 L 580 640 L -40 640 Z",
    fill: "url(#hillV)",
    stroke: "var(--c-text)",
    strokeWidth: "2.8",
    strokeLinejoin: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 680 595 Q 760 560 840 590 Q 920 618 1040 600 L 1040 640 L 680 640 Z",
    fill: "url(#hillP)",
    stroke: "var(--c-text)",
    strokeWidth: "2.6",
    strokeLinejoin: "round"
  })), /*#__PURE__*/React.createElement("g", {
    transform: "translate(870 495)",
    style: {
      animation: 'hillBreathe 9s ease-in-out infinite'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M 0 40 Q -5 10 5 -20 Q 15 -10 10 20",
    stroke: "var(--c-text)",
    strokeWidth: "3.5",
    fill: "#7A5AB6",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "-14",
    cy: "-22",
    r: "14",
    fill: "#FBD3E0",
    stroke: "var(--c-text)",
    strokeWidth: "2.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8",
    cy: "-30",
    r: "16",
    fill: "#F9BBD0",
    stroke: "var(--c-text)",
    strokeWidth: "2.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "20",
    cy: "-12",
    r: "13",
    fill: "#FBD3E0",
    stroke: "var(--c-text)",
    strokeWidth: "2.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "-4",
    cy: "-6",
    r: "11",
    fill: "#F9BBD0",
    stroke: "var(--c-text)",
    strokeWidth: "2.5"
  })), /*#__PURE__*/React.createElement("g", {
    transform: "translate(40 560)",
    style: {
      animation: 'flowerBob 5s ease-in-out infinite'
    }
  }, /*#__PURE__*/React.createElement("g", {
    transform: "translate(0 0)"
  }, /*#__PURE__*/React.createElement("circle", {
    r: "6",
    fill: "#FBD3E0"
  }), [0, 60, 120, 180, 240, 300].map(a => /*#__PURE__*/React.createElement("ellipse", {
    key: a,
    cx: Math.cos(a * Math.PI / 180) * 14,
    cy: Math.sin(a * Math.PI / 180) * 14,
    rx: "10",
    ry: "7",
    transform: `rotate(${a})`,
    fill: "#FFFFFF",
    stroke: "var(--c-text)",
    strokeWidth: "2"
  })), /*#__PURE__*/React.createElement("circle", {
    r: "6",
    fill: "#F9BBD0",
    stroke: "var(--c-text)",
    strokeWidth: "2"
  }))), /*#__PURE__*/React.createElement("g", {
    transform: "translate(95 605)",
    style: {
      animation: 'flowerBob 6s ease-in-out infinite 0.6s'
    }
  }, /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    r: "5",
    fill: "#FBD3E0"
  }), [0, 72, 144, 216, 288].map(a => /*#__PURE__*/React.createElement("ellipse", {
    key: a,
    cx: Math.cos(a * Math.PI / 180) * 11,
    cy: Math.sin(a * Math.PI / 180) * 11,
    rx: "8",
    ry: "6",
    transform: `rotate(${a})`,
    fill: "#FFFFFF",
    stroke: "var(--c-text)",
    strokeWidth: "1.8"
  })), /*#__PURE__*/React.createElement("circle", {
    r: "4.5",
    fill: "#F9A8C1",
    stroke: "var(--c-text)",
    strokeWidth: "1.6"
  }))), /*#__PURE__*/React.createElement("g", {
    fill: "#FFFFFF",
    opacity: "0.85"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M 460 430 l 0 -8 M 456 426 l 8 0",
    stroke: "#FFFFFF",
    strokeWidth: "2",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 720 400 l 0 -6 M 717 397 l 6 0",
    stroke: "#FFFFFF",
    strokeWidth: "1.8",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "330",
    cy: "460",
    r: "2.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "580",
    cy: "450",
    r: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "880",
    cy: "500",
    r: "2.4"
  })), /*#__PURE__*/React.createElement("g", {
    transform: "translate(230 380)",
    style: {
      animation: 'flutter 5.4s ease-in-out infinite'
    }
  }, /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("ellipse", {
    cx: "-6",
    cy: "0",
    rx: "7",
    ry: "10",
    fill: "#FFE082",
    stroke: "var(--c-text)",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "6",
    cy: "0",
    rx: "7",
    ry: "10",
    fill: "#FFE082",
    stroke: "var(--c-text)",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "-4",
    cy: "7",
    rx: "5",
    ry: "7",
    fill: "#FFCE66",
    stroke: "var(--c-text)",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "4",
    cy: "7",
    rx: "5",
    ry: "7",
    fill: "#FFCE66",
    stroke: "var(--c-text)",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "-6",
    x2: "0",
    y2: "8",
    stroke: "var(--c-text)",
    strokeWidth: "2",
    strokeLinecap: "round"
  }))), /*#__PURE__*/React.createElement("g", {
    transform: "translate(690 540)",
    style: {
      animation: 'flutter 6.2s ease-in-out infinite 1.3s'
    }
  }, /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("ellipse", {
    cx: "-5",
    cy: "0",
    rx: "6",
    ry: "9",
    fill: "#C5B3E6",
    stroke: "var(--c-text)",
    strokeWidth: "1.8"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "5",
    cy: "0",
    rx: "6",
    ry: "9",
    fill: "#C5B3E6",
    stroke: "var(--c-text)",
    strokeWidth: "1.8"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "-3",
    cy: "6",
    rx: "4",
    ry: "6",
    fill: "#A89ED4",
    stroke: "var(--c-text)",
    strokeWidth: "1.8"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "3",
    cy: "6",
    rx: "4",
    ry: "6",
    fill: "#A89ED4",
    stroke: "var(--c-text)",
    strokeWidth: "1.8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "-5",
    x2: "0",
    y2: "7",
    stroke: "var(--c-text)",
    strokeWidth: "1.8",
    strokeLinecap: "round"
  }))), /*#__PURE__*/React.createElement("g", {
    stroke: "var(--c-text)",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    fill: "none",
    opacity: "0.7"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M 140 440 q 5 -4 10 0 q 5 -4 10 0"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 175 455 q 4 -3 8 0 q 4 -3 8 0"
  }))));
};

/* ==========================================================================
   REUSABLE PRIMITIVES
   ========================================================================== */

const FrostedCard = ({
  children,
  className = '',
  onClick
}) => /*#__PURE__*/React.createElement("div", {
  onClick: onClick,
  className: `rounded-2xl border transition-all ${className}`,
  style: {
    background: 'var(--c-card)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    borderColor: 'var(--c-border)',
    boxShadow: '0 4px 20px rgba(100, 80, 160, 0.12)'
  }
}, children);
const PrimaryButton = ({
  children,
  onClick,
  disabled,
  className = ''
}) => /*#__PURE__*/React.createElement("button", {
  onClick: onClick,
  disabled: disabled,
  className: `rounded-xl px-5 py-3 font-bold text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${className}`,
  style: {
    background: 'var(--c-accent)',
    letterSpacing: '0.01em',
    boxShadow: '0 4px 14px rgba(65, 64, 255, 0.35)'
  }
}, children);
const SoftButton = ({
  children,
  onClick,
  className = ''
}) => /*#__PURE__*/React.createElement("button", {
  onClick: onClick,
  className: `rounded-xl px-4 py-2.5 font-semibold transition-all active:scale-95 ${className}`,
  style: {
    background: 'var(--c-soft-btn)',
    color: 'var(--c-text)',
    border: '1px solid var(--c-border)',
    letterSpacing: '0.01em'
  }
}, children);
const Pill = ({
  children,
  active,
  onClick,
  color = 'var(--c-accent)'
}) => /*#__PURE__*/React.createElement("button", {
  onClick: onClick,
  className: "rounded-full px-4 py-1.5 text-sm font-semibold transition-all active:scale-95",
  style: {
    background: active ? color : 'var(--c-pill-inactive)',
    color: active ? '#FFFFFF' : 'var(--c-text)',
    border: `1px solid ${active ? color : 'var(--c-border)'}`
  }
}, children);

/* ==========================================================================
   SPLASH / PROFILE CREATION
   ========================================================================== */

const PROFILE_COLORS = [{
  name: 'mint',
  hex: '#A8E6CF'
}, {
  name: 'pink',
  hex: '#FFB7C5'
}, {
  name: 'peach',
  hex: '#FFAB91'
}, {
  name: 'yellow',
  hex: '#FFE082'
}, {
  name: 'lavender',
  hex: '#C5B3E6'
}, {
  name: 'sky',
  hex: '#90CAF9'
}];

/* Floating sparkles overlay — absolute-positioned twinkles around hero elements.
   Random deterministic seeds keep them stable between renders. */
const FloatingSparkles = ({
  count = 10,
  seed = 42
}) => {
  const items = useRef(null);
  if (!items.current) {
    const rng = mulberry32(seed);
    items.current = Array.from({
      length: count
    }, (_, i) => ({
      id: i,
      left: `${Math.round(rng() * 100)}%`,
      top: `${Math.round(rng() * 100)}%`,
      sx: `${Math.round((rng() - 0.5) * 30)}px`,
      sy: `${-6 - Math.round(rng() * 20)}px`,
      delay: `${(rng() * 3).toFixed(2)}s`,
      duration: `${(2.8 + rng() * 2.4).toFixed(2)}s`,
      size: 6 + Math.round(rng() * 10)
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "pointer-events-none absolute inset-0",
    "aria-hidden": "true"
  }, items.current.map(s => /*#__PURE__*/React.createElement("span", {
    key: s.id,
    className: "sparkle",
    style: {
      left: s.left,
      top: s.top,
      width: s.size,
      height: s.size,
      animationDelay: s.delay,
      animationDuration: s.duration,
      '--sx': s.sx,
      '--sy': s.sy
    }
  })));
};

/* Decorative morphing blobs — soft pastel shapes that drift behind content */
const MorphBlobs = () => /*#__PURE__*/React.createElement("div", {
  className: "pointer-events-none absolute inset-0 overflow-hidden",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("div", {
  className: "blob blob-a",
  style: {
    width: 260,
    height: 260,
    top: '-8%',
    left: '-12%',
    animationDelay: '0s'
  }
}), /*#__PURE__*/React.createElement("div", {
  className: "blob blob-b",
  style: {
    width: 320,
    height: 320,
    top: '20%',
    right: '-18%',
    animationDelay: '-4s'
  }
}), /*#__PURE__*/React.createElement("div", {
  className: "blob blob-c",
  style: {
    width: 240,
    height: 240,
    bottom: '-10%',
    left: '25%',
    animationDelay: '-8s'
  }
}));

/* Fluid / water-like animated title — each glyph bobs on its own stagger,
   gradient sheen slides across, letters tilt like floating on waves.
   Words are grouped so they never break mid-word; font-size uses clamp()
   so the hero title scales smoothly on small viewports. */
const WaterTitle = ({
  text,
  size = 'text-5xl'
}) => {
  const words = text.split(' ');
  const clampMap = {
    'text-6xl': 'clamp(2.25rem, 11vw, 3.75rem)',
    'text-5xl': 'clamp(2rem, 9vw, 3rem)',
    'text-4xl': 'clamp(1.75rem, 7.5vw, 2.25rem)',
    'text-3xl': 'clamp(1.5rem, 6vw, 1.875rem)',
    'text-[26px]': 'clamp(1.35rem, 5.5vw, 1.625rem)'
  };
  const fontSize = clampMap[size];
  let idx = 0;
  // Rainbow gradient colors for each letter (cycling)
  const palette = ['#FFB7C5', '#FFAB91', '#FFE082', '#A8E6CF', '#90CAF9', '#C5B3E6'];
  return /*#__PURE__*/React.createElement("h1", {
    className: "select-none water-title-glow",
    style: {
      fontSize: fontSize || undefined,
      lineHeight: 1.05,
      fontFamily: "'Paytone One', 'Fredoka', sans-serif",
      fontWeight: 400,
      letterSpacing: '-0.01em',
      textAlign: 'center',
      wordBreak: 'keep-all',
      hyphens: 'none',
      maxWidth: '100%',
      filter: 'drop-shadow(0 3px 12px rgba(65,64,255,0.18))'
    }
  }, words.map((word, wi) => /*#__PURE__*/React.createElement("span", {
    key: wi,
    style: {
      display: 'inline-block',
      whiteSpace: 'nowrap',
      marginRight: wi < words.length - 1 ? '0.28em' : 0
    }
  }, [...word].map(ch => {
    const i = idx++;
    const delay = `${i * 0.15 % 2.4}s`;
    const color = palette[i % palette.length];
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "doodle-letter",
      style: {
        animationDelay: delay,
        display: 'inline-block',
        color: color,
        textShadow: `0 2px 0 rgba(0,0,0,0.12), 0 -1px 0 rgba(255,255,255,0.6), 0 4px 16px ${color}55`,
        WebkitTextStroke: '1.2px rgba(45,45,63,0.2)'
      }
    }, ch);
  }))));
};

/* Fancy section header with animated rainbow underline + optional icon */
const SectionHeader = ({
  icon,
  text,
  subtitle,
  className = ''
}) => /*#__PURE__*/React.createElement("div", {
  className: `section-header anim-fade-in ${className}`
}, /*#__PURE__*/React.createElement("div", {
  className: "flex items-center gap-2"
}, icon && /*#__PURE__*/React.createElement("span", {
  className: "section-header-icon"
}, icon), /*#__PURE__*/React.createElement("h2", {
  className: "font-display font-semibold text-xl",
  style: {
    color: 'var(--c-text)'
  }
}, text)), subtitle && /*#__PURE__*/React.createElement("p", {
  className: "text-xs mt-0.5",
  style: {
    color: 'var(--c-text-sub)'
  }
}, subtitle), /*#__PURE__*/React.createElement("div", {
  className: "section-header-bar",
  "aria-hidden": "true"
}));

/* ==========================================================================
   COUNT-UP number (animates from 0 to target value)
   ========================================================================== */

const CountUp = ({
  value,
  duration = 900,
  spring = true
}) => {
  const [n, setN] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    let raf;
    const from = prev.current;
    const delta = value - from;
    const start = performance.now();
    // Spring-like: slight overshoot then settle (cubic-bezier approximation)
    const tick = t => {
      const p = Math.min(1, (t - start) / duration);
      let eased;
      if (spring) {
        // Damped spring: overshoots by ~6% at p≈0.72, settles to 1 at p=1
        const s = 1.70158;
        eased = 1 + (p - 1) * (p - 1) * ((s + 1) * (p - 1) + s);
      } else {
        eased = 1 - Math.pow(1 - p, 3);
      }
      setN(Math.round(from + delta * eased));
      if (p < 1) raf = requestAnimationFrame(tick);else prev.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, spring]);
  return /*#__PURE__*/React.createElement(React.Fragment, null, n);
};

/* ==========================================================================
   FOOTER SIGNATURE — "vibe coded by Degos" with neon animated letters
   ========================================================================== */

/* DegosDoodle — renders Degos's own doodle image from /public/degos-doodle.png */
const DegosDoodle = () => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return /*#__PURE__*/React.createElement("div", { className: "degos-doodle-wrap" },
      /*#__PURE__*/React.createElement("div", { className: "degos-doodle-halo", "aria-hidden": "true" }),
      /*#__PURE__*/React.createElement("div", { className: "degos-doodle-img", style: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #A8E6CF, #C5B3E6)'
      }}, /*#__PURE__*/React.createElement(FaceIcon, { size: 60, fill: '#A8E6CF' }))
    );
  }
  return /*#__PURE__*/React.createElement("div", { className: "degos-doodle-wrap" },
    /*#__PURE__*/React.createElement("div", { className: "degos-doodle-halo", "aria-hidden": "true" }),
    /*#__PURE__*/React.createElement("img", {
      src: './degos-doodle.png',
      alt: "Degos's Doodle",
      className: "degos-doodle-img",
      loading: "eager",
      onError: () => setFailed(true)
    })
  );
};

const FooterSignature = () => {
  const full = 'vibe coded by Degos';
  return /*#__PURE__*/React.createElement("div", {
    className: "w-full flex flex-col items-center justify-center pt-8 select-none gap-4",
    style: { paddingBottom: 'calc(120px + env(safe-area-inset-bottom))' }
  }, /*#__PURE__*/React.createElement("div", {
    className: "degos-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "degos-sig"
  }, [...full].map((ch, i) => /*#__PURE__*/React.createElement("span", {
    key: i, className: "degos-letter",
    style: { animationDelay: (i * 0.08 % 1.6) + 's' }
  }, ch === ' ' ? '\u00A0' : ch))), /*#__PURE__*/React.createElement("span", {
    className: "degos-underline", "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement(DegosDoodle, null));
};

/* ==========================================================================
   PROGRESS RING — animated circular progress indicator
   ========================================================================== */

const ProgressRing = ({
  value,
  total,
  size = 60
}) => {
  const [p, setP] = useState(0);
  const pct = total === 0 ? 0 : value / total;
  useEffect(() => {
    let raf;
    const start = performance.now();
    const dur = 900;
    const tick = t => {
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setP(pct * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pct]);
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - p);
  return /*#__PURE__*/React.createElement("div", {
    className: "relative",
    style: {
      width: size,
      height: size
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    style: {
      transform: 'rotate(-90deg)'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: "rgba(65,64,255,0.12)",
    strokeWidth: 4
  }), /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "ringGrad",
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#FFB7C5"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "50%",
    stopColor: "#C5B3E6"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#4140FF"
  }))), /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: "url(#ringGrad)",
    strokeWidth: 4,
    strokeLinecap: "round",
    strokeDasharray: c,
    strokeDashoffset: off
  })), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex items-center justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-display font-semibold text-base leading-none",
    style: {
      color: 'var(--c-text)'
    }
  }, value, /*#__PURE__*/React.createElement("span", {
    className: "text-xs opacity-50"
  }, "/", total)))));
};

/* ==========================================================================
   APP HEADER — persistent "Doodle or Not" brand mark across screens
   ========================================================================== */

const AppHeader = ({
  compact = false
}) => {
  return /*#__PURE__*/React.createElement("div", {
    className: `w-full flex flex-col items-center ${compact ? 'pt-3 pb-0' : 'pt-5 pb-1'} anim-fade-in`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(WaterTitle, {
    text: "Doodle or Not",
    size: compact ? 'text-[26px]' : 'text-3xl'
  }), /*#__PURE__*/React.createElement("div", {
    className: "anim-rainbow-spin-slow"
  }, /*#__PURE__*/React.createElement(RainbowIcon, {
    size: compact ? 22 : 28
  }))));
};

/* Floating top-right action bar: sound toggle + settings */
const TopActions = ({
  sound,
  onToggleSound,
  onSettings
}) => /*#__PURE__*/React.createElement("div", {
  className: "fixed right-3 z-40 flex gap-2",
  style: { top: 'max(12px, calc(env(safe-area-inset-top, 0px) + 8px))' }
}, /*#__PURE__*/React.createElement("button", {
  onClick: onToggleSound,
  "aria-label": sound ? 'Mute sound' : 'Unmute sound',
  className: "w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform",
  style: {
    background: 'var(--c-card)',
    border: '1px solid var(--c-border)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxShadow: '0 4px 14px rgba(100,80,160,0.15)'
  }
}, /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24",
  width: "18",
  height: "18",
  fill: "none",
  stroke: "var(--c-text)",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("polygon", {
  points: "11 5 6 9 3 9 3 15 6 15 11 19 11 5"
}), sound ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
  d: "M15.54 8.46a5 5 0 0 1 0 7.07"
}), /*#__PURE__*/React.createElement("path", {
  d: "M19.07 4.93a10 10 0 0 1 0 14.14"
})) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("line", {
  x1: "22",
  y1: "9",
  x2: "16",
  y2: "15"
}), /*#__PURE__*/React.createElement("line", {
  x1: "16",
  y1: "9",
  x2: "22",
  y2: "15"
})))), /*#__PURE__*/React.createElement("button", {
  onClick: onSettings,
  "aria-label": "Settings",
  className: "w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform",
  style: {
    background: 'var(--c-card)',
    border: '1px solid var(--c-border)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxShadow: '0 4px 14px rgba(100,80,160,0.15)'
  }
}, /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24",
  width: "18",
  height: "18",
  fill: "none",
  stroke: "var(--c-text)",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "12",
  r: "3"
}), /*#__PURE__*/React.createElement("path", {
  d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
}))));

/* SETTINGS MODAL */
const SettingsModal = ({
  open,
  onClose,
  prefs,
  onChange,
  onWipe,
  onInstall,
  installable,
  onNotifToggle
}) => {
  useBodyScrollLock(open);
  if (!open) return null;
  const Row = ({
    label,
    desc,
    children
  }) => /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3 py-3 border-t first:border-t-0",
    style: {
      borderColor: 'var(--c-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-sm",
    style: {
      color: 'var(--c-text)'
    }
  }, label), desc && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] mt-0.5",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, desc)), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0"
  }, children));
  const Toggle = ({
    v,
    on
  }) => /*#__PURE__*/React.createElement("button", {
    onClick: () => on(!v),
    className: "w-11 h-6 rounded-full transition-colors relative",
    style: {
      background: v ? 'var(--c-accent)' : 'var(--c-toggle-off)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all",
    style: {
      left: v ? 22 : 2,
      boxShadow: '0 2px 4px rgba(0,0,0,.2)'
    }
  }));
  const Seg = ({
    value,
    options,
    on
  }) => /*#__PURE__*/React.createElement("div", {
    className: "flex rounded-lg overflow-hidden",
    style: {
      border: '1px solid var(--c-border)'
    }
  }, options.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    onClick: () => on(o.value),
    className: "px-2.5 py-1 text-[11px] font-bold transition-colors",
    style: {
      background: value === o.value ? 'var(--c-accent)' : 'var(--c-result-bg)',
      color: value === o.value ? '#fff' : 'var(--c-text)'
    }
  }, o.label)));
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-3",
    style: {
      background: 'var(--c-overlay)',
      backdropFilter: 'blur(4px)'
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-md rounded-2xl p-5 anim-pop-in overflow-y-auto",
    onClick: e => e.stopPropagation(),
    style: {
      background: 'var(--c-card-solid)',
      border: '1px solid var(--c-border)',
      boxShadow: '0 20px 50px rgba(45,45,63,0.3)',
      maxHeight: '85dvh'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-display font-semibold text-2xl",
    style: {
      color: 'var(--c-text)'
    }
  }, "Settings"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-10 h-10 rounded-full active:scale-90 font-bold text-lg",
    style: {
      background: 'var(--c-pill-inactive)',
      border: '1px solid var(--c-border)',
      color: 'var(--c-text)'
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Row, {
    label: "Sound effects",
    desc: "Gentle SFX on correct, reveal, level up."
  }, /*#__PURE__*/React.createElement(Toggle, {
    v: prefs.sound,
    on: v => onChange({
      sound: v
    })
  })), /*#__PURE__*/React.createElement(Row, {
    label: "Haptics",
    desc: "Subtle vibration on mobile devices."
  }, /*#__PURE__*/React.createElement(Toggle, {
    v: prefs.haptics,
    on: v => onChange({
      haptics: v
    })
  })), /*#__PURE__*/React.createElement(Row, {
    label: "Reduced motion",
    desc: "Less animation. Overrides particles and wipes."
  }, /*#__PURE__*/React.createElement(Toggle, {
    v: prefs.reducedMotion,
    on: v => onChange({
      reducedMotion: v
    })
  })), /*#__PURE__*/React.createElement(Row, {
    label: "Text size"
  }, /*#__PURE__*/React.createElement(Seg, {
    value: prefs.fontScale,
    options: [{
      label: 'S',
      value: 0.9
    }, {
      label: 'M',
      value: 1
    }, {
      label: 'L',
      value: 1.1
    }, {
      label: 'XL',
      value: 1.25
    }],
    on: v => onChange({
      fontScale: v
    })
  })), /*#__PURE__*/React.createElement(Row, {
    label: "Language",
    desc: "Full translation coming soon."
  }, /*#__PURE__*/React.createElement(Seg, {
    value: prefs.lang,
    options: [{
      label: 'EN',
      value: 'en'
    }, {
      label: 'ES',
      value: 'es'
    }, {
      label: 'DE',
      value: 'de'
    }],
    on: v => onChange({
      lang: v
    })
  })), /*#__PURE__*/React.createElement(Row, {
    label: t('dark_mode'),
    desc: "Override automatic sky."
  }, /*#__PURE__*/React.createElement(Seg, {
    value: prefs.darkMode || 'auto',
    options: [{
      label: 'Auto',
      value: 'auto'
    }, {
      label: 'Light',
      value: 'light'
    }, {
      label: 'Dark',
      value: 'dark'
    }],
    on: v => onChange({
      darkMode: v
    })
  })), /*#__PURE__*/React.createElement(Row, {
    label: t('notifications'),
    desc: t('daily_reminder')
  }, /*#__PURE__*/React.createElement(Toggle, {
    v: !!prefs.notifications,
    on: v => onNotifToggle && onNotifToggle(v)
  })), installable && /*#__PURE__*/React.createElement(Row, {
    label: t('install_app'),
    desc: "Add to home screen."
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onInstall,
    className: "rounded-lg px-3 py-1.5 text-[11px] font-bold",
    style: {
      background: 'var(--c-accent)',
      color: '#fff'
    }
  }, "Install")), /*#__PURE__*/React.createElement(Row, {
    label: t('wipe_data'),
    desc: "Clears the data cached on this device."
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onWipe,
    className: "rounded-lg px-3 py-1.5 text-[11px] font-bold",
    style: {
      background: 'rgba(229,115,115,0.14)',
      color: '#B94A4A',
      border: '1px solid rgba(229,115,115,0.3)'
    }
  }, t('wipe'))))));
};

/* ONBOARDING — shown once after first register */
const OnboardingFlow = ({
  onDone
}) => {
  const [step, setStep] = useState(0);
  const steps = [{
    title: 'Welcome, Doodle.',
    body: 'Three tiny puzzles drop every day at midnight UTC. Everyone plays the same ones.',
    icon: /*#__PURE__*/React.createElement(RainbowIcon, {
      size: 90
    })
  }, {
    title: 'Guess, duel, rouletté.',
    body: 'Higher Sale, Rarity Duel, Trait Roulette. Win points, keep your streak alive, unlock badges.',
    icon: /*#__PURE__*/React.createElement(WheelIcon, {
      size: 78
    })
  }, {
    title: "It's a ritual.",
    body: 'Come back daily. Fill your Doodle Dex. Grow a garden. Read your weekly horoscope.',
    icon: /*#__PURE__*/React.createElement(SparkleIcon, {
      size: 82,
      fill: "#FFE082"
    })
  }];
  const s = steps[step];
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-app flex flex-col items-center justify-center px-4 py-8 anim-fade-in"
  }, /*#__PURE__*/React.createElement(FrostedCard, {
    className: "w-full max-w-sm p-8 text-center anim-pop-in"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center mb-4"
  }, s.icon), /*#__PURE__*/React.createElement("h2", {
    className: "font-display font-semibold text-3xl mb-2",
    style: {
      color: 'var(--c-text)'
    }
  }, s.title), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mb-6",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, s.body), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center gap-1.5 mb-5"
  }, steps.map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "h-1.5 rounded-full transition-all",
    style: {
      width: i === step ? 24 : 8,
      background: i <= step ? 'var(--c-accent)' : 'var(--c-border)'
    }
  }))), step < steps.length - 1 ? /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement(SoftButton, {
    onClick: onDone,
    className: "flex-1"
  }, "Skip"), /*#__PURE__*/React.createElement(PrimaryButton, {
    onClick: () => setStep(step + 1),
    className: "flex-1"
  }, "Next")) : /*#__PURE__*/React.createElement(PrimaryButton, {
    onClick: onDone,
    className: "w-full"
  }, "Let's play")));
};

/* Mood of the Day card — deterministic per day */
const MoodCard = () => {
  const idx = hashCode(todayStr() + 'mood') % MOOD_LINES.length;
  const doodleIdx = hashCode(todayStr() + 'mooddood') % Math.max(1, DOODLES.length || 1);
  const d = DOODLES[doodleIdx];
  return /*#__PURE__*/React.createElement(FrostedCard, {
    className: "p-4 mb-4 flex items-center gap-3 anim-float-in",
    style: {
      animationDelay: '0.03s'
    }
  }, d ? /*#__PURE__*/React.createElement("a", {
    href: openseaUrl(d),
    target: "_blank",
    rel: "noopener noreferrer",
    "aria-label": `Open Doodle #${d.id} on OpenSea`,
    onClick: e => {
      try {
        navigator.vibrate && navigator.vibrate(6);
      } catch (_) {}
    },
    className: "w-14 h-14 rounded-xl overflow-hidden shrink-0 block transition-transform active:scale-95 hover:scale-105",
    style: {
      border: `1.5px solid ${STROKE}`,
      background: 'linear-gradient(135deg,#FFE6C5,#FFB7C5)',
      boxShadow: '0 3px 10px rgba(100,80,160,0.18)'
    }
  }, /*#__PURE__*/React.createElement(DoodleAvatar, {
    doodle: d,
    size: 56
  })) : /*#__PURE__*/React.createElement("div", {
    className: "w-14 h-14 rounded-xl overflow-hidden shrink-0",
    style: {
      border: `1.5px solid ${STROKE}`,
      background: 'linear-gradient(135deg,#FFE6C5,#FFB7C5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-bold tracking-[0.15em] uppercase",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "Mood of the day", d ? ` · #${d.id}` : ''), /*#__PURE__*/React.createElement("p", {
    className: "font-display text-[15px] leading-tight italic",
    style: {
      color: 'var(--c-text)'
    }
  }, "\"", MOOD_LINES[idx], "\""), d && /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] mt-0.5",
    style: {
      color: 'var(--c-accent)'
    }
  }, "tap doodle \u2192 OpenSea \u2197")));
};

/* DOODLE DEX MODAL */
const DexModal = ({
  open,
  onClose,
  ids,
  onOpenDoodle
}) => {
  useBodyScrollLock(open);
  const doodles = DOODLES;
  const doodleMap = useMemo(() => {
    const m = new Map();
    for (const d of doodles) m.set(d.id, d);
    return m;
  }, [doodles]);
  if (!open) return null;
  const total = doodles.length;
  const seen = ids.length;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-3",
    style: {
      background: 'var(--c-overlay)',
      backdropFilter: 'blur(4px)'
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-lg rounded-2xl p-5 max-h-[85dvh] flex flex-col anim-pop-in",
    onClick: e => e.stopPropagation(),
    style: {
      background: 'var(--c-card-solid)',
      border: '1px solid var(--c-border)',
      boxShadow: '0 20px 50px rgba(45,45,63,0.3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-bold tracking-[0.15em] uppercase",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "Your collection"), /*#__PURE__*/React.createElement("h2", {
    className: "font-display font-semibold text-2xl",
    style: {
      color: 'var(--c-text)'
    }
  }, "Doodle Dex")), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-display font-semibold text-xl tabular-nums",
    style: {
      color: 'var(--c-accent)'
    }
  }, seen, " / ", total), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px]",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "seen"))), /*#__PURE__*/React.createElement("div", {
    className: "w-full h-1.5 rounded-full mb-3",
    style: {
      background: 'var(--c-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full rounded-full transition-all",
    style: {
      width: `${Math.min(100, seen / Math.max(1, total) * 100)}%`,
      background: 'linear-gradient(90deg,#FFB7C5,#FFE082,#A8E6CF,#90CAF9,#C5B3E6)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "overflow-auto flex-1 -mx-1 px-1"
  }, seen === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center text-center py-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "opacity-60 mb-2"
  }, /*#__PURE__*/React.createElement(MagnifierIcon, {
    size: 52
  })), /*#__PURE__*/React.createElement("p", {
    className: "font-display font-semibold text-lg",
    style: {
      color: 'var(--c-text)'
    }
  }, "Your shelf is empty."), /*#__PURE__*/React.createElement("p", {
    className: "text-xs mt-1",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "Play a round \u2014 every Doodle you see gets pinned here.")) : /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-4 sm:grid-cols-5 gap-2"
  }, ids.slice().reverse().slice(0, 200).map(id => {
    const d = doodleMap.get(id);
    if (!d) return null;
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => onOpenDoodle && onOpenDoodle(d),
      className: "aspect-square rounded-xl overflow-hidden active:scale-95 transition-transform",
      style: {
        border: `1.5px solid var(--c-border)`,
        background: 'var(--c-pill-inactive)'
      }
    }, /*#__PURE__*/React.createElement(DoodleAvatar, {
      doodle: d,
      size: 96
    }));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "pt-3"
  }, /*#__PURE__*/React.createElement(SoftButton, {
    onClick: onClose,
    className: "w-full"
  }, "Close"))));
};

/* Weekly "Doodle Reading" — a poetic horoscope generated from a user's stats + picks.
   Deterministic per user + week. */
const READING_ARCHETYPES = [{
  name: 'Rainbow Chaser',
  vibe: 'You gravitate toward mystical traits. The more impossible the color, the more your eye finds it.',
  color: '#C5B3E6'
}, {
  name: 'Whale Spotter',
  vibe: 'ETH flows through you like tide. You guess what the market whispers before it speaks.',
  color: '#90CAF9'
}, {
  name: 'Trait Mystic',
  vibe: 'Rarity is a feeling, not a number, and you feel the feeling first.',
  color: '#A8E6CF'
}, {
  name: 'Night Gardener',
  vibe: 'You play after the stars come out. Your instincts sharpen when others sleep.',
  color: '#FFB7C5'
}, {
  name: 'Pastel Pragmatist',
  vibe: 'You take small, kind bets. Over time, kindness compounds into precision.',
  color: '#FFE082'
}, {
  name: 'Storm Reader',
  vibe: 'You love the wrong answers more than the right ones. Each miss teaches your instinct a letter.',
  color: '#FFAB91'
}, {
  name: 'Koi Listener',
  vibe: 'You answer slowly. The current shows you the shape before you name it.',
  color: '#90CAF9'
}, {
  name: 'Petal Oracle',
  vibe: 'You trust first impressions. Your first guess is usually closer than your second.',
  color: '#FFB7C5'
}];
const WeeklyReading = ({
  username,
  stats,
  streak,
  achievements,
  dexCount
}) => {
  // Deterministic pick: based on username + week
  const wkSeed = hashCode((username || 'anon') + getWeekKey());
  const rng = mulberry32(wkSeed);
  const arch = READING_ARCHETYPES[Math.floor(rng() * READING_ARCHETYPES.length)];
  const lucky = ['mint', 'rose', 'cream', 'sky', 'lavender', 'apricot'][Math.floor(rng() * 6)];
  const number = 1 + Math.floor(rng() * 99);
  const d = new Date();
  const isSunday = d.getDay() === 0;
  return /*#__PURE__*/React.createElement(FrostedCard, {
    className: "p-5 mb-5 anim-float-in",
    style: {
      animationDelay: '0.09s',
      background: `linear-gradient(135deg, ${arch.color}38, rgba(255,255,255,0.6))`
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement(SparkleIcon, {
    size: 18,
    fill: "#FFE082"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-bold tracking-[0.15em] uppercase",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, isSunday ? 'Sunday reading' : 'Weekly reading')), /*#__PURE__*/React.createElement("h3", {
    className: "font-display font-semibold text-2xl mb-1",
    style: {
      color: 'var(--c-text)'
    }
  }, "You are a ", arch.name, "."), /*#__PURE__*/React.createElement("p", {
    className: "text-sm italic mb-3",
    style: {
      color: 'var(--c-text)',
      opacity: 0.85
    }
  }, "\"", arch.vibe, "\""), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl p-2",
    style: {
      background: 'var(--c-stat-bg)',
      border: '1px solid var(--c-border)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-bold tracking-wider uppercase",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "Color"), /*#__PURE__*/React.createElement("p", {
    className: "font-display font-semibold text-sm capitalize",
    style: {
      color: 'var(--c-text)'
    }
  }, lucky)), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl p-2",
    style: {
      background: 'var(--c-stat-bg)',
      border: '1px solid var(--c-border)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-bold tracking-wider uppercase",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "Number"), /*#__PURE__*/React.createElement("p", {
    className: "font-display font-semibold text-sm",
    style: {
      color: 'var(--c-text)'
    }
  }, number)), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl p-2",
    style: {
      background: 'var(--c-stat-bg)',
      border: '1px solid var(--c-border)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-bold tracking-wider uppercase",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "Streak"), /*#__PURE__*/React.createElement("p", {
    className: "font-display font-semibold text-sm",
    style: {
      color: 'var(--c-text)'
    }
  }, streak || 0, "\uD83D\uDD25"))));
};

/* ==========================================================================
   LIQUID WATER-WIPE TRANSITION
   ========================================================================== */
const WipeTransition = ({
  trigger
}) => {
  const [anim, setAnim] = useState(0); // render key to restart anim
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setAnim(a => a + 1);
  }, [trigger]);
  if (anim === 0) return null;
  const reduced = typeof document !== 'undefined' && document.documentElement.dataset.reducedMotion === '1';
  if (reduced) return null;
  return /*#__PURE__*/React.createElement("div", {
    key: anim,
    className: "fixed inset-0 z-[60] pointer-events-none overflow-hidden"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none",
    className: "absolute inset-0 w-full h-full"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "wipeGrad",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#C5B3E6",
    stopOpacity: "0.9"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "50%",
    stopColor: "#FFB7C5",
    stopOpacity: "0.75"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#90CAF9",
    stopOpacity: "0.85"
  }))), /*#__PURE__*/React.createElement("path", {
    fill: "url(#wipeGrad)"
  }, /*#__PURE__*/React.createElement("animate", {
    attributeName: "d",
    dur: "700ms",
    fill: "freeze",
    values: " M0,110 Q25,100 50,110 T100,110 L100,130 L0,130 Z; M0,-10 Q25,10 50,-6 T100,-10 L100,50 Q75,30 50,46 T0,50 Z; M0,-30 Q25,-30 50,-30 T100,-30 L100,-30 L0,-30 Z "
  }))));
};

/* ==========================================================================
   KEYBOARD SHORTCUTS OVERLAY ("?")
   ========================================================================== */
const ShortcutsOverlay = ({
  open,
  onClose
}) => {
  useBodyScrollLock(open);
  if (!open) return null;
  const rows = [['A / ← ', 'Pick left (Duel & Higher)'], ['L / →', 'Pick right (Duel & Higher)'], ['↑ / ↓', 'Adjust % in Trait Roulette'], ['Shift + ↑/↓', 'Jump by 5%'], ['Enter', 'Lock answer / reveal'], ['H', 'Use daily hint'], ['S', 'Skip this round (daily)'], ['M', 'Mute / unmute sound'], ['?', 'Toggle this overlay'], ['Esc', 'Close modal']];
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[65] flex items-center justify-center p-4",
    style: {
      background: 'var(--c-overlay)',
      backdropFilter: 'blur(5px)'
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-md rounded-2xl p-5 anim-pop-in",
    onClick: e => e.stopPropagation(),
    style: {
      background: 'var(--c-card-solid)',
      border: '1px solid var(--c-border)',
      boxShadow: '0 20px 50px rgba(45,45,63,0.35)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-display font-semibold text-2xl",
    style: {
      color: 'var(--c-text)'
    }
  }, t('shortcuts')), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-10 h-10 rounded-full font-bold text-lg",
    style: {
      background: 'var(--c-pill-inactive)',
      border: '1px solid var(--c-border)',
      color: 'var(--c-text)'
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, rows.map(([k, desc]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    className: "flex items-center justify-between py-1.5 border-t first:border-t-0",
    style: {
      borderColor: 'var(--c-border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm",
    style: {
      color: 'var(--c-text)'
    }
  }, desc), /*#__PURE__*/React.createElement("kbd", {
    className: "px-2 py-0.5 rounded-md text-xs font-bold tabular-nums",
    style: {
      background: 'var(--c-input-bg)',
      color: 'var(--c-accent)',
      border: '1px solid var(--c-border)'
    }
  }, k)))), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] mt-3 text-center",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "Press ", /*#__PURE__*/React.createElement("b", null, "?"), " anytime to see this again.")));
};

/* ==========================================================================
   DOODLE DETAIL MODAL (from Dex tap)
   ========================================================================== */
const DoodleDetailModal = ({
  doodle,
  onClose
}) => {
  if (!doodle) return null;
  const traits = [];
  for (const k of Object.keys(doodle)) {
    if (k === 'id' || k === 'image' || typeof doodle[k] === 'number') continue;
    if (typeof doodle[k] === 'string' && doodle[k]) traits.push({
      type: k,
      value: doodle[k]
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[65] flex items-end sm:items-center justify-center p-3",
    style: {
      background: 'var(--c-overlay)',
      backdropFilter: 'blur(4px)'
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-md rounded-2xl p-5 anim-pop-in",
    onClick: e => e.stopPropagation(),
    style: {
      background: 'var(--c-card-solid)',
      border: '1px solid var(--c-border)',
      boxShadow: '0 20px 50px rgba(45,45,63,0.3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-4 mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-28 h-28 rounded-2xl overflow-hidden shrink-0",
    style: {
      border: '1.5px solid var(--c-border)',
      background: '#F1EDF7'
    }
  }, /*#__PURE__*/React.createElement(DoodleAvatar, {
    doodle: doodle,
    size: 128
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-bold tracking-[0.15em] uppercase",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "Doodle"), /*#__PURE__*/React.createElement("h2", {
    className: "font-display font-semibold text-2xl",
    style: {
      color: 'var(--c-text)'
    }
  }, "#", doodle.id), typeof doodle.lastSale === 'number' && /*#__PURE__*/React.createElement("p", {
    className: "text-xs mt-1",
    style: {
      color: 'var(--c-accent)'
    }
  }, "Last sale: ", /*#__PURE__*/React.createElement("span", {
    className: "font-bold"
  }, doodle.lastSale, " ETH"))), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-10 h-10 rounded-full font-bold text-lg shrink-0",
    style: {
      background: 'var(--c-pill-inactive)',
      border: '1px solid var(--c-border)',
      color: 'var(--c-text)'
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    className: "max-h-64 overflow-auto -mx-1 px-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, traits.slice(0, 20).map(tr => /*#__PURE__*/React.createElement("div", {
    key: tr.type,
    className: "rounded-xl p-2",
    style: {
      background: 'var(--c-pill-inactive)',
      border: '1px solid var(--c-border)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-bold tracking-wider uppercase truncate",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, tr.type), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold capitalize truncate",
    style: {
      color: 'var(--c-text)'
    }
  }, String(tr.value))))))));
};

/* ==========================================================================
   SHARE CARD MODAL (PNG via canvas)
   ========================================================================== */
const ShareCardModal = ({
  open,
  onClose,
  payload
}) => {
  const [url, setUrl] = useState(null);
  useBodyScrollLock(open);
  useEffect(() => {
    let revoked = null;
    if (open && payload) {
      renderShareCard(payload).then(blob => {
        if (!blob) return;
        const u = URL.createObjectURL(blob);
        setUrl(u);
        revoked = u;
      });
    }
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [open]);
  if (!open) return null;
  const download = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `doodle-or-not-day${payload.day}.png`;
    a.click();
  };
  const copyImg = async () => {
    try {
      if (!url) return;
      const blob = await (await fetch(url)).blob();
      await navigator.clipboard.write([new ClipboardItem({
        [blob.type]: blob
      })]);
    } catch {}
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[65] flex items-center justify-center p-4",
    style: {
      background: 'var(--c-overlay)',
      backdropFilter: 'blur(5px)'
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-md rounded-2xl p-4 anim-pop-in overflow-y-auto",
    onClick: e => e.stopPropagation(),
    style: {
      background: 'var(--c-card-solid)',
      border: '1px solid var(--c-border)',
      boxShadow: '0 20px 50px rgba(45,45,63,0.35)',
      maxHeight: '90vh'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-display font-semibold text-xl",
    style: {
      color: 'var(--c-text)'
    }
  }, t('share')), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-10 h-10 rounded-full font-bold text-lg",
    style: {
      background: 'var(--c-pill-inactive)',
      border: '1px solid var(--c-border)',
      color: 'var(--c-text)'
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl overflow-hidden mb-3",
    style: {
      border: '1px solid var(--c-border)'
    }
  }, url ? /*#__PURE__*/React.createElement("img", {
    src: url,
    alt: "share card",
    className: "block w-full"
  }) : /*#__PURE__*/React.createElement("div", {
    className: "aspect-square flex items-center justify-center text-sm",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "Rendering\u2026")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: download,
    className: "rounded-xl py-2.5 font-bold text-sm",
    style: {
      background: 'var(--c-accent)',
      color: '#fff'
    }
  }, t('download_png')), /*#__PURE__*/React.createElement("button", {
    onClick: copyImg,
    className: "rounded-xl py-2.5 font-bold text-sm",
    style: {
      background: 'var(--c-soft-btn)',
      border: '1px solid var(--c-border)',
      color: 'var(--c-text)'
    }
  }, t('copy_image')))));
};

/* ==========================================================================
   LEAGUES MODAL
   ========================================================================== */
const LeaguesModal = ({
  open,
  onClose,
  username,
  weekPts
}) => {
  const [refresh, setRefresh] = useState(0);
  const [joinCode, setJoinCode] = useState('');
  const [createdCode, setCreatedCode] = useState(null);
  useBodyScrollLock(open);
  if (!open) return null;
  const myCodes = getUserLeagues(username);
  const all = getLeagues();
  const create = () => {
    const code = makeLeagueCode();
    joinLeague(code, username);
    setUserLeagues(username, Array.from(new Set([...myCodes, code])));
    setCreatedCode(code);
    setRefresh(r => r + 1);
  };
  const doJoin = () => {
    const c = joinCode.toUpperCase().trim();
    if (!/^[A-Z2-9]{4,8}$/.test(c)) return;
    joinLeague(c, username);
    setUserLeagues(username, Array.from(new Set([...myCodes, c])));
    setJoinCode('');
    setRefresh(r => r + 1);
  };
  const leave = code => {
    const nx = getUserLeagues(username).filter(c => c !== code);
    setUserLeagues(username, nx);
    const a = getLeagues();
    if (a[code] && a[code].members) {
      delete a[code].members[username];
      saveLeagues(a);
    }
    setRefresh(r => r + 1);
  };
  const copy = async c => {
    try {
      await navigator.clipboard.writeText(c);
    } catch {}
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[65] flex items-end sm:items-center justify-center p-3",
    style: {
      background: 'var(--c-overlay)',
      backdropFilter: 'blur(4px)'
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-md rounded-2xl p-5 max-h-[85dvh] overflow-auto anim-pop-in",
    onClick: e => e.stopPropagation(),
    style: {
      background: 'var(--c-card-solid)',
      border: '1px solid var(--c-border)',
      boxShadow: '0 20px 50px rgba(45,45,63,0.3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-display font-semibold text-2xl",
    style: {
      color: 'var(--c-text)'
    }
  }, t('private_leagues')), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-10 h-10 rounded-full font-bold text-lg",
    style: {
      background: 'var(--c-pill-inactive)',
      border: '1px solid var(--c-border)',
      color: 'var(--c-text)'
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2 mb-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: create,
    className: "rounded-xl py-2.5 font-bold text-sm",
    style: {
      background: 'var(--c-accent)',
      color: '#fff'
    }
  }, t('create_league')), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1"
  }, /*#__PURE__*/React.createElement("input", {
    value: joinCode,
    onChange: e => setJoinCode(e.target.value.toUpperCase()),
    placeholder: t('league_code'),
    className: "flex-1 rounded-xl px-3 text-sm font-semibold",
    style: {
      background: 'var(--c-card-solid)',
      border: '1px solid var(--c-border)',
      color: 'var(--c-text)'
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: doJoin,
    className: "rounded-xl px-3 font-bold text-sm",
    style: {
      background: 'var(--c-soft-btn)',
      border: '1px solid var(--c-border)',
      color: 'var(--c-text)'
    }
  }, t('join_league')))), createdCode && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl p-3 mb-3 text-center",
    style: {
      background: '#E0F5EC',
      border: '1.5px solid #A8E6CF'
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-bold tracking-wider uppercase",
    style: {
      color: 'var(--c-text)'
    }
  }, t('league_code')), /*#__PURE__*/React.createElement("p", {
    className: "font-display font-semibold text-3xl tracking-widest",
    style: {
      color: 'var(--c-text)'
    }
  }, createdCode), /*#__PURE__*/React.createElement("button", {
    onClick: () => copy(createdCode),
    className: "mt-2 rounded-lg px-3 py-1 text-[11px] font-bold",
    style: {
      background: 'var(--c-card-solid)',
      border: '1px solid #A8E6CF',
      color: 'var(--c-text)'
    }
  }, "Copy")), myCodes.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "text-center py-6 text-sm",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "No leagues yet. Create one and share the code with friends.") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, myCodes.map(code => {
    const L = all[code] || {
      members: {}
    };
    const members = Object.keys(L.members || {});
    const rows = members.map(u => {
      const st = storage.get(userStatsKey(u), {
        weekPts: 0
      });
      return {
        u,
        pts: u === username ? weekPts : st.weekPts || 0
      };
    }).sort((a, b) => b.pts - a.pts);
    return /*#__PURE__*/React.createElement("div", {
      key: code,
      className: "rounded-xl p-3",
      style: {
        background: 'var(--c-result-bg)',
        border: '1px solid var(--c-border)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-2"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
      className: "font-display font-semibold text-lg tracking-widest",
      style: {
        color: 'var(--c-text)'
      }
    }, code), /*#__PURE__*/React.createElement("p", {
      className: "text-[10px]",
      style: {
        color: 'var(--c-text-sub)'
      }
    }, members.length, " ", t('members'))), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-1"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => copy(code),
      className: "rounded-lg px-2 py-1 text-[11px] font-bold",
      style: {
        background: 'var(--c-input-bg)',
        color: 'var(--c-accent)',
        border: '1px solid var(--c-border)'
      }
    }, "Copy"), /*#__PURE__*/React.createElement("button", {
      onClick: () => leave(code),
      className: "rounded-lg px-2 py-1 text-[11px] font-bold",
      style: {
        background: 'rgba(229,115,115,0.14)',
        color: '#B94A4A',
        border: '1px solid rgba(229,115,115,0.3)'
      }
    }, "Leave"))), /*#__PURE__*/React.createElement("div", {
      className: "space-y-1"
    }, rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
      key: r.u,
      className: "flex items-center justify-between text-xs"
    }, /*#__PURE__*/React.createElement("span", {
      className: "truncate",
      style: {
        color: 'var(--c-text)'
      }
    }, /*#__PURE__*/React.createElement("b", null, i + 1, "."), " @", r.u, r.u === username && ' (you)'), /*#__PURE__*/React.createElement("span", {
      className: "font-bold tabular-nums",
      style: {
        color: 'var(--c-accent)'
      }
    }, r.pts)))));
  }))));
};

/* ==========================================================================
   DAILY RECAP MODAL (shown first visit of the day)
   ========================================================================== */
const DailyRecapModal = ({
  open,
  onClose,
  recap
}) => {
  useBodyScrollLock(open);
  if (!open || !recap) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[65] flex items-center justify-center p-4",
    style: {
      background: 'var(--c-overlay)',
      backdropFilter: 'blur(4px)'
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-sm rounded-2xl p-5 anim-pop-in overflow-y-auto",
    onClick: e => e.stopPropagation(),
    style: {
      background: 'var(--c-card-solid)',
      border: '1px solid var(--c-border)',
      maxHeight: '85dvh',
      boxShadow: '0 20px 50px rgba(45,45,63,0.3)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-bold tracking-[0.15em] uppercase text-center",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, t('yesterday_recap')), /*#__PURE__*/React.createElement("h2", {
    className: "font-display font-semibold text-3xl text-center mb-3",
    style: {
      color: 'var(--c-text)'
    }
  }, recap.pts, " ", t('points')), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl p-3 text-center",
    style: {
      background: '#FFECE0',
      border: '1px solid var(--c-border)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-bold tracking-wider uppercase",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, t('current_streak')), /*#__PURE__*/React.createElement("p", {
    className: "font-display font-semibold text-xl",
    style: {
      color: 'var(--c-text)'
    }
  }, recap.streak, " \uD83D\uDD25")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl p-3 text-center",
    style: {
      background: '#E0F5EC',
      border: '1px solid var(--c-border)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-bold tracking-wider uppercase",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, t('this_week')), /*#__PURE__*/React.createElement("p", {
    className: "font-display font-semibold text-xl",
    style: {
      color: 'var(--c-text)'
    }
  }, recap.weekPts))), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-center mb-3",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "New puzzles just dropped. Go get them."), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-full rounded-xl py-2.5 font-bold text-sm",
    style: {
      background: 'var(--c-accent)',
      color: '#fff'
    }
  }, "Let's play")));
};

/* ==========================================================================
   CHALLENGE BANNER (when ?c= URL param was parsed)
   ========================================================================== */
const ChallengeBanner = ({
  onDismiss
}) => /*#__PURE__*/React.createElement("div", {
  className: "mx-3 mt-3 rounded-2xl p-3 flex items-center gap-3 anim-float-in",
  style: {
    background: 'linear-gradient(135deg, #FFE082aa, #FFB7C5aa)',
    border: '1.5px solid #FFE082'
  }
}, /*#__PURE__*/React.createElement("span", {
  className: "text-2xl"
}, "\uD83C\uDFAF"), /*#__PURE__*/React.createElement("div", {
  className: "flex-1 min-w-0"
}, /*#__PURE__*/React.createElement("p", {
  className: "text-[11px] font-bold tracking-[0.15em] uppercase",
  style: {
    color: 'var(--c-text)'
  }
}, t('challenge_incoming')), /*#__PURE__*/React.createElement("p", {
  className: "text-xs",
  style: {
    color: 'var(--c-text)'
  }
}, "A friend sent you this seed. Same puzzles, face off.")), /*#__PURE__*/React.createElement("button", {
  onClick: onDismiss,
  className: "rounded-full w-7 h-7 font-bold shrink-0",
  style: {
    background: 'var(--c-result-bg)',
    border: '1px solid rgba(0,0,0,0.1)',
    color: 'var(--c-text)'
  }
}, "\xD7"));

/* ==========================================================================
   EMPTY STATE ILLUSTRATION
   ========================================================================== */
const EmptyState = ({
  title,
  subtitle
}) => /*#__PURE__*/React.createElement("div", {
  className: "flex flex-col items-center text-center py-10 px-4"
}, /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 160 120",
  width: "160",
  height: "120",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
  id: "esSky",
  x1: "0",
  y1: "0",
  x2: "0",
  y2: "1"
}, /*#__PURE__*/React.createElement("stop", {
  offset: "0%",
  stopColor: "#C5B3E6",
  stopOpacity: "0.65"
}), /*#__PURE__*/React.createElement("stop", {
  offset: "100%",
  stopColor: "#FFE4CC",
  stopOpacity: "0.85"
}))), /*#__PURE__*/React.createElement("rect", {
  x: "10",
  y: "10",
  width: "140",
  height: "100",
  rx: "18",
  fill: "url(#esSky)",
  stroke: "var(--c-text)",
  strokeWidth: "2.5"
}), /*#__PURE__*/React.createElement("ellipse", {
  cx: "54",
  cy: "66",
  rx: "20",
  ry: "14",
  fill: "#fff",
  stroke: "var(--c-text)",
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("ellipse", {
  cx: "86",
  cy: "60",
  rx: "28",
  ry: "18",
  fill: "#fff",
  stroke: "var(--c-text)",
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("ellipse", {
  cx: "112",
  cy: "70",
  rx: "14",
  ry: "10",
  fill: "#fff",
  stroke: "var(--c-text)",
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "125",
  cy: "30",
  r: "8",
  fill: "#FFE082",
  stroke: "var(--c-text)",
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("path", {
  d: "M40,96 Q80,86 120,96",
  stroke: "var(--c-text)",
  strokeWidth: "2",
  fill: "none",
  strokeLinecap: "round"
})), /*#__PURE__*/React.createElement("p", {
  className: "font-display font-semibold text-lg mt-3",
  style: {
    color: 'var(--c-text)'
  }
}, title), /*#__PURE__*/React.createElement("p", {
  className: "text-xs mt-1 max-w-xs",
  style: {
    color: 'var(--c-text-sub)'
  }
}, subtitle));

/* ==========================================================================
   POWER-UPS BAR (for Home)
   ========================================================================== */
const PowerupsBar = ({
  pu
}) => /*#__PURE__*/React.createElement("div", {
  className: "flex gap-1.5 mt-3 mb-4",
  title: "Use these inside a game"
}, /*#__PURE__*/React.createElement("div", {
  className: "flex-1 rounded-xl p-2 flex items-center gap-2",
  style: {
    background: pu.hints > 0 ? '#FFF4E0' : 'var(--c-stat-bg)',
    border: `1px solid ${pu.hints > 0 ? '#FFE082' : 'var(--c-border)'}`,
    opacity: pu.hints > 0 ? 1 : 0.55
  }
}, /*#__PURE__*/React.createElement(HintIcon, { size: 22 }), /*#__PURE__*/React.createElement("div", {
  className: "min-w-0"
}, /*#__PURE__*/React.createElement("p", {
  className: "text-[11px] font-bold tracking-wider uppercase",
  style: {
    color: 'var(--c-text)'
  }
}, t('hint')), /*#__PURE__*/React.createElement("p", {
  className: "text-[11px]",
  style: {
    color: 'var(--c-text-sub)'
  }
}, "x", pu.hints, " \xB7 use in-game"))), /*#__PURE__*/React.createElement("div", {
  className: "flex-1 rounded-xl p-2 flex items-center gap-2",
  style: {
    background: pu.skips > 0 ? '#E0F5EC' : 'var(--c-stat-bg)',
    border: `1px solid ${pu.skips > 0 ? '#A8E6CF' : 'var(--c-border)'}`,
    opacity: pu.skips > 0 ? 1 : 0.55
  }
}, /*#__PURE__*/React.createElement(SkipIcon, { size: 22 }), /*#__PURE__*/React.createElement("div", {
  className: "min-w-0"
}, /*#__PURE__*/React.createElement("p", {
  className: "text-[11px] font-bold tracking-wider uppercase",
  style: {
    color: 'var(--c-text)'
  }
}, t('skip')), /*#__PURE__*/React.createElement("p", {
  className: "text-[11px]",
  style: {
    color: 'var(--c-text-sub)'
  }
}, "x", pu.skips, " \xB7 use in-game"))), /*#__PURE__*/React.createElement("div", {
  className: "flex-1 rounded-xl p-2 flex items-center gap-2",
  style: {
    background: pu.freezes > 0 ? '#E0EEFF' : 'var(--c-stat-bg)',
    border: `1px solid ${pu.freezes > 0 ? '#90CAF9' : 'var(--c-border)'}`,
    opacity: pu.freezes > 0 ? 1 : 0.55
  }
}, /*#__PURE__*/React.createElement(FreezeIcon, { size: 22 }), /*#__PURE__*/React.createElement("div", {
  className: "min-w-0"
}, /*#__PURE__*/React.createElement("p", {
  className: "text-[11px] font-bold tracking-wider uppercase",
  style: {
    color: 'var(--c-text)'
  }
}, t('freeze') || 'Freeze'), /*#__PURE__*/React.createElement("p", {
  className: "text-[11px]",
  style: {
    color: 'var(--c-text-sub)'
  }
}, "x", pu.freezes, " \xB7 2nd chance"))));

/* Floating score popup: shows "+X" that rises and fades after each answer */
const ScorePopup = ({ points, type, visible }) => {
  if (!visible) return null;
  const color = type === 'perfect' ? '#FFE082' : type === 'correct' || type === 'up' ? '#7DD8A0' : type === 'near' ? '#90CAF9' : '#FF8A8A';
  const label = points > 0 ? `+${points}` : type === 'skip' ? 'Skip' : 'Miss';
  return /*#__PURE__*/React.createElement("div", {
    className: "score-popup",
    style: {
      position: 'absolute', top: '40%', left: '50%', transform: 'translateX(-50%)',
      zIndex: 50, fontSize: '2rem', fontWeight: 800,
      color: color, textShadow: `0 2px 8px ${color}66`,
      fontFamily: "'Paytone One', system-ui, sans-serif"
    }
  }, label);
};

/* In-game powerup row. Used inside each GameMode. */
const GamePowerBar = ({
  pu,
  onHint,
  onSkip,
  onFreeze,
  hintDisabled,
  skipDisabled,
  freezeDisabled,
  freezeActive,
  hintHint = "Eliminate a wrong option"
}) => /*#__PURE__*/React.createElement("div", {
  className: "flex gap-1.5 mb-3"
}, /*#__PURE__*/React.createElement("button", {
  onClick: onHint,
  disabled: hintDisabled || pu.hints <= 0,
  title: hintHint,
  className: "flex-1 rounded-xl p-2 flex items-center gap-1.5 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5",
  style: {
    background: !hintDisabled && pu.hints > 0 ? '#FFF4E0' : 'var(--c-stat-bg)',
    border: `1.5px solid ${!hintDisabled && pu.hints > 0 ? '#FFE082' : 'var(--c-border)'}`
  }
}, /*#__PURE__*/React.createElement(HintIcon, { size: 22 }), /*#__PURE__*/React.createElement("div", {
  className: "min-w-0 text-left"
}, /*#__PURE__*/React.createElement("p", {
  className: "text-[11px] font-bold tracking-wider uppercase",
  style: {
    color: 'var(--c-text)'
  }
}, "Hint"), /*#__PURE__*/React.createElement("p", {
  className: "text-[11px]",
  style: {
    color: 'var(--c-text-sub)'
  }
}, "x", pu.hints))), /*#__PURE__*/React.createElement("button", {
  onClick: onSkip,
  disabled: skipDisabled || pu.skips <= 0,
  title: "Skip this question (no points)",
  className: "flex-1 rounded-xl p-2 flex items-center gap-1.5 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5",
  style: {
    background: !skipDisabled && pu.skips > 0 ? '#E0F5EC' : 'var(--c-stat-bg)',
    border: `1.5px solid ${!skipDisabled && pu.skips > 0 ? '#A8E6CF' : 'var(--c-border)'}`
  }
}, /*#__PURE__*/React.createElement(SkipIcon, { size: 22 }), /*#__PURE__*/React.createElement("div", {
  className: "min-w-0 text-left"
}, /*#__PURE__*/React.createElement("p", {
  className: "text-[11px] font-bold tracking-wider uppercase",
  style: {
    color: 'var(--c-text)'
  }
}, "Skip"), /*#__PURE__*/React.createElement("p", {
  className: "text-[11px]",
  style: {
    color: 'var(--c-text-sub)'
  }
}, "x", pu.skips))), /*#__PURE__*/React.createElement("button", {
  onClick: onFreeze,
  disabled: freezeDisabled || pu.freezes <= 0,
  title: "Second chance — wrong answer won\u2019t count",
  className: "flex-1 rounded-xl p-2 flex items-center gap-1.5 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5",
  style: {
    background: freezeActive ? '#B3D4FC' : (!freezeDisabled && pu.freezes > 0 ? '#E0EEFF' : 'var(--c-stat-bg)'),
    border: `1.5px solid ${freezeActive ? 'var(--c-accent)' : (!freezeDisabled && pu.freezes > 0 ? '#90CAF9' : 'var(--c-border)')}`,
    boxShadow: freezeActive ? '0 0 12px rgba(65,64,255,0.3)' : 'none'
  }
}, /*#__PURE__*/React.createElement(FreezeIcon, { size: 22 }), /*#__PURE__*/React.createElement("div", {
  className: "min-w-0 text-left"
}, /*#__PURE__*/React.createElement("p", {
  className: "text-[11px] font-bold tracking-wider uppercase",
  style: {
    color: freezeActive ? 'var(--c-accent)' : 'var(--c-text)'
  }
}, freezeActive ? "Active!" : "Freeze"), /*#__PURE__*/React.createElement("p", {
  className: "text-[11px]",
  style: {
    color: 'var(--c-text-sub)'
  }
}, freezeActive ? "2nd chance" : "x" + pu.freezes))));

/* ==========================================================================
   AUTH SCREEN — login / register with hashed passwords
   ========================================================================== */

const AuthScreen = ({
  onAuth
}) => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const userValid = /^[a-zA-Z0-9_]{3,15}$/.test(username);
  const pwValid = password.length >= 6 && password.length <= 64;
  const canSubmit = userValid && pwValid && (mode === 'login' || password === confirm);
  const handleSubmit = async e => {
    e && e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setErr('');
    try {
      const key = username.toLowerCase();
      const api = window.DON_API;

      // Try backend first; fall back to local if API unavailable (offline dev)
      if (api) {
        try {
          let serverUser;
          if (mode === 'register') {
            const colorPool = ['#A8E6CF', '#FFB7C5', '#FFAB91', '#FFE082', '#C5B3E6', '#90CAF9'];
            const defaultColor = colorPool[hashCode(key) % colorPool.length];
            serverUser = await api.signup({
              username: key,
              password,
              avatarColor: defaultColor,
              faceShape: 'round'
            });
          } else {
            serverUser = await api.login({
              username: key,
              password
            });
          }
          // Mirror into local cache for legacy code paths
          const users = getUsers();
          const isAdminUser = key === ADMIN_USERNAME;
          const existing = users[key] || {};
          users[key] = {
            ...existing,
            name: serverUser.username,
            passHash: 'server',
            color: serverUser.avatarColor || existing.color || '#C5B3E6',
            // Use server avatarData if available; fall back to local data URL
            avatar: serverUser.avatarData
              || (existing.avatar && typeof existing.avatar === 'string' && existing.avatar.startsWith('data:') ? existing.avatar : null),
            faceShape: serverUser.faceShape || existing.faceShape || 'round',
            joined: existing.joined || Date.now(),
            isAdmin: isAdminUser,
            serverId: serverUser.id
          };
          saveUsers(users);
          setSession({
            username: key,
            remember
          });

          // Hydrate server-side state into local cache
          try {
            const me = await api.me();
            if (me && me.stats) storage.set(userStatsKey(key), {
              gamesPlayed: me.stats.totalGames || 0,
              totalPts: me.stats.totalPoints || 0,
              bestWeek: me.stats.bestWeek || 0,
              weekPts: me.stats.weekPoints || 0,
              weekKey: getWeekKey(),
              xp: me.stats.xp || me.stats.totalPoints || 0
            });
            if (me && me.streak) storage.set(userStreakKey(key), {
              count: me.streak.currentStreak || 0,
              lastDate: me.streak.lastPlayedDay || null,
              longest: me.streak.longestStreak || 0
            });
            if (me && Array.isArray(me.achievements)) storage.set(userAchvKey(key), me.achievements);
            if (me && Array.isArray(me.dex)) storage.set(userDexKey(key), me.dex);
          } catch (_) {}
          onAuth(users[key]);
          return;
        } catch (apiErr) {
          const code = apiErr.message || '';
          if (code === 'username_taken') {
            setErr('That username is taken.');
            setBusy(false);
            return;
          }
          if (code === 'bad_credentials') {
            setErr('Wrong username or password.');
            setBusy(false);
            return;
          }
          if (code === 'weak_password') {
            setErr('Password too short (6+).');
            setBusy(false);
            return;
          }
          if (code === 'invalid_username') {
            setErr('Invalid username format.');
            setBusy(false);
            return;
          }
          // network/server errors: fall through to local fallback so dev still works
          console.warn('API auth failed, falling back to local:', code);
        }
      }

      // -------- LOCAL FALLBACK (no network / no server) --------
      const users = getUsers();
      const hash = await sha256Hex(password);
      if (mode === 'register') {
        if (users[key]) {
          setErr('That username is taken.');
          setBusy(false);
          return;
        }
        if (key === ADMIN_USERNAME) {
          setErr('Reserved username.');
          setBusy(false);
          return;
        }
        const colorPool = ['#A8E6CF', '#FFB7C5', '#FFAB91', '#FFE082', '#C5B3E6', '#90CAF9'];
        const defaultColor = colorPool[hashCode(key) % colorPool.length];
        const newUser = {
          name: username,
          passHash: hash,
          color: defaultColor,
          avatar: null,
          joined: Date.now(),
          isAdmin: false
        };
        users[key] = newUser;
        saveUsers(users);
        setSession({
          username: key,
          remember
        });
        onAuth(newUser);
        return;
      }
      const u = users[key];
      if (!u) {
        setErr("That account doesn't exist.");
        setBusy(false);
        return;
      }
      if (u.passHash !== hash) {
        setErr('Wrong password.');
        setBusy(false);
        return;
      }
      setSession({
        username: key,
        remember
      });
      onAuth(u);
    } catch (e) {
      setErr('Something went wrong. Try again.');
      setBusy(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-app flex flex-col items-center justify-center px-4 py-8 anim-fade-in lg:grid lg:grid-cols-2 lg:gap-20 lg:max-w-[1400px] lg:mx-auto lg:px-12",
    style: {
      color: 'var(--c-text)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center mb-6 anim-float-in relative z-10 lg:mb-0 lg:items-start lg:text-left lg:order-1",
    style: {
      maxWidth: '100%',
      background: 'var(--c-card)',
      backdropFilter: 'blur(24px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
      borderRadius: '28px',
      padding: '32px 36px',
      border: '1.5px solid var(--c-border)',
      boxShadow: '0 8px 32px rgba(15,13,46,0.10), 0 2px 8px rgba(15,13,46,0.06)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative lg:self-start",
    style: {
      filter: 'drop-shadow(0 6px 24px rgba(197,179,230,0.35))'
    }
  }, /*#__PURE__*/React.createElement(FloatingSparkles, {
    count: 8,
    seed: mode === 'login' ? 101 : 207
  }), /*#__PURE__*/React.createElement(WaterTitle, {
    text: "Doodle or Not",
    size: "text-6xl"
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 opacity-95 anim-rainbow-spin-slow breathe lg:mt-5"
  }, /*#__PURE__*/React.createElement(RainbowIcon, {
    size: 64
  })), /*#__PURE__*/React.createElement("p", {
    className: "mt-3 text-sm px-3 py-1 rounded-full text-center lg:text-left lg:mt-5 lg:text-base lg:px-4 lg:py-2",
    style: {
      color: 'var(--c-text)',
      fontWeight: 600,
      background: 'var(--c-card-solid)',
      backdropFilter: 'blur(10px) saturate(1.2)',
      WebkitBackdropFilter: 'blur(10px) saturate(1.2)',
      border: '1px solid var(--c-border)',
      boxShadow: '0 4px 20px rgba(15,13,46,0.25), 0 2px 6px rgba(15,13,46,0.15)',
      maxWidth: '420px'
    }
  }, mode === 'login' ? 'Welcome back, Doodle' : 'Create your account to start playing'), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-3 mt-6 lg:mt-8",
    style: {
      maxWidth: '460px',
      background: 'var(--c-card-solid)',
      borderRadius: '18px',
      padding: '18px 22px',
      border: '2px solid #E8E4F0',
      boxShadow: '0 4px 16px rgba(15,13,46,0.10), 0 1px 3px rgba(15,13,46,0.06)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 text-sm font-semibold",
    style: {
      color: 'var(--c-text)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 14,
      background: '#D4F5E6',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14
    }
  }, "\u25C6"), /*#__PURE__*/React.createElement("span", null, "Daily NFT trivia \u2014 guess, price, trait.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 text-sm font-semibold",
    style: {
      color: 'var(--c-text)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 14,
      background: '#FFD6E0',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14
    }
  }, "\u2605"), /*#__PURE__*/React.createElement("span", null, "Collect your Dex, climb the weekly board.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 text-sm font-semibold",
    style: {
      color: 'var(--c-text)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 14,
      background: '#E0D6F0',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14
    }
  }, "\u2665"), /*#__PURE__*/React.createElement("span", null, "Join private leagues with your friends.")))), /*#__PURE__*/React.createElement(FrostedCard, {
    className: "w-full max-w-sm p-6 anim-pop-in lg:max-w-md lg:p-8 lg:order-2 lg:justify-self-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mb-5"
  }, /*#__PURE__*/React.createElement(Pill, {
    active: mode === 'login',
    onClick: () => {
      setMode('login');
      setErr('');
    }
  }, "Log in"), /*#__PURE__*/React.createElement(Pill, {
    active: mode === 'register',
    onClick: () => {
      setMode('register');
      setErr('');
    }
  }, "Create account")), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleSubmit
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold tracking-wider uppercase mb-1",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "Username"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: username,
    onChange: e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '')),
    maxLength: 15,
    placeholder: "doodlefan_42",
    autoComplete: "username",
    className: "w-full rounded-xl px-4 py-3 outline-none mb-1 font-medium transition-all focus:scale-[1.01]",
    style: {
      background: 'var(--c-result-bg)',
      border: '2px solid var(--c-border)',
      color: 'var(--c-text)'
    }
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] mb-3",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "3\u201315 chars \xB7 letters, numbers, _"), /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold tracking-wider uppercase mb-1",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "Password"), /*#__PURE__*/React.createElement("div", {
    className: "relative mb-1"
  }, /*#__PURE__*/React.createElement("input", {
    type: showPw ? 'text' : 'password',
    value: password,
    onChange: e => setPassword(e.target.value),
    maxLength: 64,
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    autoComplete: mode === 'login' ? 'current-password' : 'new-password',
    className: "w-full rounded-xl px-4 py-3 pr-12 outline-none font-medium transition-all focus:scale-[1.01]",
    style: {
      background: 'var(--c-result-bg)',
      border: '2px solid var(--c-border)',
      color: 'var(--c-text)'
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowPw(p => !p),
    className: "absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[11px] font-bold",
    style: {
      color: 'var(--c-text-sub)',
      background: 'var(--c-pill-inactive)'
    }
  }, showPw ? 'Hide' : 'Show')), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] mb-3",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "6+ characters"), mode === 'register' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold tracking-wider uppercase mb-1",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "Confirm password"), /*#__PURE__*/React.createElement("input", {
    type: showPw ? 'text' : 'password',
    value: confirm,
    onChange: e => setConfirm(e.target.value),
    maxLength: 64,
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    autoComplete: "new-password",
    className: "w-full rounded-xl px-4 py-3 outline-none mb-1 font-medium transition-all focus:scale-[1.01]",
    style: {
      background: 'var(--c-result-bg)',
      border: '2px solid var(--c-border)',
      color: 'var(--c-text)'
    }
  }), confirm && confirm !== password && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] mb-3",
    style: {
      color: '#E57373'
    }
  }, "Passwords don't match."), !(confirm && confirm !== password) && /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  })), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 mb-4 text-xs font-semibold cursor-pointer",
    style: {
      color: 'var(--c-text)'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: remember,
    onChange: e => setRemember(e.target.checked),
    style: {
      accentColor: 'var(--c-accent)'
    }
  }), "Remember me on this device"), err && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl px-3 py-2 mb-3 text-[12px] font-semibold",
    style: {
      background: 'rgba(229,115,115,0.14)',
      color: '#B94A4A',
      border: '1px solid rgba(229,115,115,0.3)'
    }
  }, err), /*#__PURE__*/React.createElement(PrimaryButton, {
    onClick: handleSubmit,
    disabled: !canSubmit || busy,
    className: "w-full flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(SparkleIcon, {
    size: 18,
    fill: "#FFFFFF"
  }), busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account')), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] mt-4 text-center",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "Your password is hashed locally (SHA-256) before being saved. No server, no tracking.")));
};

/* ==========================================================================
   ADMIN PANEL — for the degos account
   ========================================================================== */

const AdminPanel = ({
  profile,
  onExit,
  onLogout,
  onEnterApp,
  onWeeklyReset
}) => {
  const [users, setUsersState] = useState(() => getUsers());
  const [confirmWipe, setConfirmWipe] = useState(null);
  const [debug, setDebug] = useState(() => !!storage.get('don:debug', false));
  const refresh = () => setUsersState(getUsers());
  const rows = Object.entries(users).map(([key, u]) => {
    const stats = storage.get(userStatsKey(key), {
      totalPts: 0,
      gamesPlayed: 0,
      weekPts: 0
    });
    const streak = storage.get(userStreakKey(key), {
      count: 0,
      lastDate: null
    });
    const achv = storage.get(userAchvKey(key), []);
    return {
      key,
      ...u,
      stats,
      streak,
      achvCount: achv.length
    };
  }).sort((a, b) => (b.stats.totalPts || 0) - (a.stats.totalPts || 0));
  const totals = rows.reduce((acc, r) => ({
    users: acc.users + 1,
    games: acc.games + (r.stats.gamesPlayed || 0),
    pts: acc.pts + (r.stats.totalPts || 0)
  }), {
    users: 0,
    games: 0,
    pts: 0
  });
  const wipeUser = key => {
    wipeUserData(key);
    refresh();
    setConfirmWipe(null);
  };
  const resetAllWeekly = async () => {
    if (!window.confirm('Reset weekly leaderboard for ALL users?')) return;
    // Reset server DB
    const api = typeof window !== 'undefined' ? window.DON_API : null;
    if (api) {
      try { await api.resetWeeklyLeaderboard(); } catch(e) { console.warn('Server reset failed:', e); }
    }
    // Also reset localStorage
    for (const [key] of Object.entries(getUsers())) {
      const s = storage.get(userStatsKey(key), null);
      if (s) {
        s.weekPts = 0;
        s.bestWeek = 0;
        storage.set(userStatsKey(key), s);
      }
    }
    // Trigger leaderboard re-fetch from server + reset parent state
    if (window._refetchLeaderboard) window._refetchLeaderboard();
    if (onWeeklyReset) onWeeklyReset();
    refresh();
    alert('Weekly leaderboard reset!');
  };
  const unlockAllToday = () => {
    storage.set(userProgressKey(profile.name.toLowerCase(), todayStr()), {
      guess: true,
      price: true,
      trait: true
    });
    alert('Admin progress set to all-done for today.');
  };
  const toggleDebug = () => {
    const v = !debug;
    setDebug(v);
    storage.set('don:debug', v);
  };

  // ---- New per-user admin actions ----
  const resetUserStats = key => {
    storage.set(userStatsKey(key), {
      totalPts: 0,
      gamesPlayed: 0,
      bestWeek: 0,
      weekPts: 0,
      weekKey: getWeekKey()
    });
    storage.set(userStreakKey(key), {
      count: 0,
      lastDate: null
    });
    storage.set(userAchvKey(key), []);
    // Wipe all daily progress rows
    for (const k of storage.allKeys()) {
      if (k.startsWith(`don:progress:${key}:`)) storage.remove(k);
    }
    refresh();
  };
  const resetUserDex = key => {
    storage.remove(userDexKey(key));
    refresh();
  };
  const grantPowerups = (key, n = 3) => {
    const cur = storage.get(POWERUPS_KEY(key, todayStr()), {
      hints: 0,
      skips: 0
    });
    cur.hints = (cur.hints || 0) + n;
    cur.skips = (cur.skips || 0) + n;
    storage.set(POWERUPS_KEY(key, todayStr()), cur);
    refresh();
  };
  const resetAllStats = () => {
    if (!window.confirm('Reset stats + streaks + achievements for EVERY non-admin user?')) return;
    for (const [key, u] of Object.entries(getUsers())) {
      if (u.isAdmin) continue;
      resetUserStats(key);
    }
    refresh();
  };
  const resetAllDex = () => {
    if (!window.confirm('Clear the Doodle Dex for EVERY user?')) return;
    for (const [key] of Object.entries(getUsers())) {
      storage.remove(userDexKey(key));
    }
    refresh();
  };
  const resetMyDex = () => {
    storage.remove(userDexKey(profile.name.toLowerCase()));
    alert('Your Dex has been cleared.');
    refresh();
  };
  const grantMeMaxPowerups = () => {
    storage.set(POWERUPS_KEY(profile.name.toLowerCase(), todayStr()), {
      hints: 99,
      skips: 99,
      freezes: 99
    });
    alert('Maxed out your powerups for today.');
  };
  const clearTodayProgress = () => {
    if (!window.confirm('Wipe today\'s mode-completion flags for everyone?')) return;
    const today = todayStr();
    for (const k of storage.allKeys()) {
      if (k.endsWith(`:${today}`) && k.startsWith('don:progress:')) storage.remove(k);
    }
    refresh();
  };
  const [confirmResetStats, setConfirmResetStats] = useState(null);
  const [confirmResetDex, setConfirmResetDex] = useState(null);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 pt-6 pb-nav max-w-[720px] lg:max-w-[1100px] lg:px-8 mx-auto"
  }, /*#__PURE__*/React.createElement(FrostedCard, {
    className: "p-5 mb-5 anim-float-in"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-xl",
    style: {
      background: 'linear-gradient(135deg,#4140FF,#C5B3E6)',
      color: '#fff'
    }
  }, ADMIN_USERNAME.slice(0, 1).toUpperCase()), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-bold tracking-[0.15em] uppercase",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "Admin Panel"), /*#__PURE__*/React.createElement("h1", {
    className: "font-display font-semibold text-2xl",
    style: {
      color: 'var(--c-text)'
    }
  }, "Hi, @", ADMIN_USERNAME))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement(SoftButton, {
    onClick: onEnterApp
  }, "\u2190 Back to app"), /*#__PURE__*/React.createElement(SoftButton, {
    onClick: onLogout
  }, "Log out")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-3 mb-5"
  }, [{
    label: 'Users',
    value: totals.users,
    tint: '#E0F5EC'
  }, {
    label: 'Games',
    value: totals.games,
    tint: '#FFECE0'
  }, {
    label: 'Total pts',
    value: totals.pts,
    tint: '#E8D5F5'
  }].map((s, i) => /*#__PURE__*/React.createElement(FrostedCard, {
    key: s.label,
    className: "p-4 anim-pop-in",
    style: {
      background: `${s.tint}cc`,
      animationDelay: `${0.1 + i * 0.06}s`
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-display font-semibold text-3xl tabular-nums",
    style: {
      color: 'var(--c-text)'
    }
  }, /*#__PURE__*/React.createElement(CountUp, {
    value: s.value
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-semibold tracking-wider uppercase",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, s.label)))), /*#__PURE__*/React.createElement(FrostedCard, {
    className: "p-5 mb-5"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold mb-1",
    style: {
      color: 'var(--c-text)'
    }
  }, "Global tools"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] mb-3",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "These affect every non-admin user. Actions are instant."), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement(SoftButton, {
    onClick: resetAllWeekly
  }, "Reset weekly points (all)"), /*#__PURE__*/React.createElement("button", {
    onClick: resetAllStats,
    className: "rounded-full px-3 py-2 text-sm font-bold active:scale-95 transition-transform",
    style: {
      background: 'rgba(229,115,115,0.14)',
      color: '#B94A4A',
      border: '1px solid rgba(229,115,115,0.3)'
    }
  }, "Reset ALL stats"), /*#__PURE__*/React.createElement("button", {
    onClick: resetAllDex,
    className: "rounded-full px-3 py-2 text-sm font-bold active:scale-95 transition-transform",
    style: {
      background: 'rgba(229,115,115,0.14)',
      color: '#B94A4A',
      border: '1px solid rgba(229,115,115,0.3)'
    }
  }, "Clear ALL Dex"), /*#__PURE__*/React.createElement(SoftButton, {
    onClick: clearTodayProgress
  }, "Wipe today's completions")), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold mt-5 mb-2",
    style: {
      color: 'var(--c-text)'
    }
  }, "Just for me"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement(SoftButton, {
    onClick: unlockAllToday
  }, "Mark today complete"), /*#__PURE__*/React.createElement(SoftButton, {
    onClick: resetMyDex
  }, "Clear my Dex"), /*#__PURE__*/React.createElement(SoftButton, {
    onClick: grantMeMaxPowerups
  }, "Max my powerups (99/99)")), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold mt-5 mb-2",
    style: {
      color: 'var(--c-text)'
    }
  }, "System"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement(SoftButton, {
    onClick: toggleDebug
  }, debug ? 'Debug: ON' : 'Debug: OFF'), /*#__PURE__*/React.createElement(SoftButton, {
    onClick: refresh
  }, "Refresh data"))), /*#__PURE__*/React.createElement(FrostedCard, {
    className: "p-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold",
    style: {
      color: 'var(--c-text)'
    }
  }, "Users (", rows.length, ")"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px]",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "sorted by total points")), rows.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-sm",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "No users registered yet."), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, rows.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.key,
    className: "rounded-xl px-3 py-2 flex items-center justify-between gap-3",
    style: {
      background: 'var(--c-pill-inactive)',
      border: '1px solid var(--c-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-full flex items-center justify-center font-bold shrink-0",
    style: {
      background: r.color || '#C5B3E6',
      color: 'var(--c-text)',
      border: `2px solid ${STROKE}`
    }
  }, r.name.slice(0, 1).toUpperCase()), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-sm truncate",
    style: {
      color: 'var(--c-text)'
    }
  }, "@", r.name, " ", r.isAdmin && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-bold px-1.5 py-0.5 rounded ml-1",
    style: {
      background: 'var(--c-accent)',
      color: '#fff'
    }
  }, "ADMIN")), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px]",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, r.stats.totalPts || 0, " pts \xB7 ", r.stats.gamesPlayed || 0, " games \xB7 streak ", r.streak.count || 0, "\uD83D\uDD25 \xB7 ", r.achvCount, " badges"))), !r.isAdmin && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1 shrink-0 justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (window.confirm(`Reset stats for @${r.name}?`)) resetUserStats(r.key);
    },
    className: "rounded-lg px-2 py-1 text-[11px] font-bold",
    style: {
      background: 'rgba(255,224,130,0.35)',
      color: '#7A5A00',
      border: '1px solid rgba(255,200,80,0.45)'
    }
  }, "Reset stats"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (window.confirm(`Clear Dex for @${r.name}?`)) resetUserDex(r.key);
    },
    className: "rounded-lg px-2 py-1 text-[11px] font-bold",
    style: {
      background: 'rgba(144,202,249,0.35)',
      color: '#1A4A7A',
      border: '1px solid rgba(100,170,220,0.45)'
    }
  }, "Clear Dex"), /*#__PURE__*/React.createElement("button", {
    onClick: () => grantPowerups(r.key, 3),
    className: "rounded-lg px-2 py-1 text-[11px] font-bold",
    style: {
      background: 'rgba(168,230,207,0.45)',
      color: '#1B5A3B',
      border: '1px solid rgba(100,200,150,0.5)'
    }
  }, "+3 powerups"), confirmWipe === r.key ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    onClick: () => wipeUser(r.key),
    className: "rounded-lg px-2 py-1 text-[11px] font-bold",
    style: {
      background: '#E57373',
      color: '#fff'
    }
  }, "Confirm delete"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setConfirmWipe(null),
    className: "rounded-lg px-2 py-1 text-[11px] font-bold",
    style: {
      background: 'var(--c-soft-btn)',
      color: 'var(--c-text)',
      border: '1px solid var(--c-border)'
    }
  }, "Cancel")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setConfirmWipe(r.key),
    className: "rounded-lg px-2 py-1 text-[11px] font-bold",
    style: {
      background: 'rgba(229,115,115,0.14)',
      color: '#B94A4A',
      border: '1px solid rgba(229,115,115,0.3)'
    }
  }, "Delete account")))))));
};

/* ==========================================================================
   ACHIEVEMENT TOAST STACK
   ========================================================================== */

const AchievementToast = ({
  toasts,
  onDone
}) => {
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map(t => setTimeout(() => onDone(t.key), 3600));
    return () => timers.forEach(clearTimeout);
  }, [toasts, onDone]);
  if (toasts.length === 0) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-x-0 flex flex-col items-center gap-2 z-50 pointer-events-none px-3",
    style: { top: 'max(12px, calc(env(safe-area-inset-top, 0px) + 8px))' }
  }, toasts.map(t => {
    const def = ACHIEVEMENTS.find(a => a.id === t.id) || {
      name: t.id,
      desc: '',
      tint: '#FFE082'
    };
    return /*#__PURE__*/React.createElement("div", {
      key: t.key,
      className: "pointer-events-auto anim-pop-in max-w-sm w-full",
      style: {
        background: 'var(--c-card-solid)',
        border: '1.5px solid var(--c-border)',
        borderRadius: 18,
        boxShadow: '0 14px 40px rgba(65,64,255,0.22)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3 p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
      style: {
        background: def.tint,
        border: `2px solid ${STROKE}`
      }
    }, /*#__PURE__*/React.createElement(CrownIcon, {
      size: 24
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-[11px] font-bold tracking-[0.15em] uppercase",
      style: {
        color: 'var(--c-text-sub)'
      }
    }, "Achievement unlocked"), /*#__PURE__*/React.createElement("p", {
      className: "font-display font-semibold text-base leading-tight truncate",
      style: {
        color: 'var(--c-text)'
      }
    }, def.name), /*#__PURE__*/React.createElement("p", {
      className: "text-[11px] truncate",
      style: {
        color: 'var(--c-text-sub)'
      }
    }, def.desc))));
  }));
};
const SplashScreen = ({
  onCreate,
  initial,
  editMode = false
}) => {
  const [name, setName] = useState(initial?.name || '');
  const [color, setColor] = useState(initial?.color || PROFILE_COLORS[0].hex);
  const [avatar, setAvatar] = useState(initial?.avatar || null);
  const [uploadErr, setUploadErr] = useState('');
  const fileRef = useRef(null);
  const nameValid = /^[a-zA-Z0-9_]{3,15}$/.test(name);
  const isEdit = !!initial;
  const nameLocked = editMode;
  const handleFile = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr('');
    if (!file.type.startsWith('image/')) {
      setUploadErr('Please pick an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadErr('Image is too large (max 5 MB).');
      return;
    }
    // Downscale to 256x256 to keep localStorage small
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const s = 256;
        const canvas = document.createElement('canvas');
        canvas.width = s;
        canvas.height = s;
        const ctx = canvas.getContext('2d');
        // cover crop
        const ratio = Math.max(s / img.width, s / img.height);
        const nw = img.width * ratio,
          nh = img.height * ratio;
        ctx.drawImage(img, (s - nw) / 2, (s - nh) / 2, nw, nh);
        setAvatar(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => setUploadErr('Could not read that image.');
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-app flex flex-col items-center justify-center px-4 py-8 anim-fade-in lg:grid lg:grid-cols-2 lg:gap-20 lg:max-w-[1400px] lg:mx-auto lg:px-12",
    style: {
      color: 'var(--c-text)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center mb-6 anim-float-in relative z-10 lg:mb-0 lg:items-start lg:text-left lg:order-1",
    style: {
      maxWidth: '100%',
      background: 'var(--c-card)',
      backdropFilter: 'blur(24px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
      borderRadius: '28px',
      padding: '32px 36px',
      border: '1.5px solid var(--c-border)',
      boxShadow: '0 8px 32px rgba(15,13,46,0.10), 0 2px 8px rgba(15,13,46,0.06)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative lg:self-start",
    style: {
      filter: 'drop-shadow(0 6px 24px rgba(197,179,230,0.35))'
    }
  }, /*#__PURE__*/React.createElement(FloatingSparkles, {
    count: 8,
    seed: 313
  }), /*#__PURE__*/React.createElement(WaterTitle, {
    text: "Doodle or Not",
    size: "text-6xl"
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 opacity-95 anim-rainbow-spin-slow breathe lg:mt-5"
  }, /*#__PURE__*/React.createElement(RainbowIcon, {
    size: 64
  })), /*#__PURE__*/React.createElement("p", {
    className: "mt-3 text-sm px-3 py-1 rounded-full text-center lg:text-left lg:mt-5 lg:text-base lg:px-4 lg:py-2",
    style: {
      color: 'var(--c-text)',
      fontWeight: 600,
      background: 'var(--c-card-solid)',
      backdropFilter: 'blur(10px) saturate(1.2)',
      WebkitBackdropFilter: 'blur(10px) saturate(1.2)',
      border: '1px solid var(--c-border)',
      boxShadow: '0 4px 20px rgba(15,13,46,0.25), 0 2px 6px rgba(15,13,46,0.15)',
      maxWidth: '420px'
    }
  }, isEdit ? 'Edit your Doodle identity' : 'A daily Doodles trivia game · No wallet, just vibes')), /*#__PURE__*/React.createElement(FrostedCard, {
    className: "w-full max-w-sm p-6 anim-pop-in lg:max-w-md lg:p-8 lg:order-2 lg:justify-self-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement(SparkleIcon, {
    size: 18,
    fill: "#FFE082"
  }), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold"
  }, "Your Doodle photo")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4 mb-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement(ProfileAvatar, {
    profile: {
      name,
      color,
      avatar
    },
    size: 72
  }), avatar && /*#__PURE__*/React.createElement("button", {
    onClick: () => setAvatar(null),
    className: "absolute -top-1 -right-1 w-8 h-8 rounded-full text-sm font-bold transition-transform hover:scale-110 active:scale-90",
    title: "Remove photo",
    style: {
      background: 'var(--c-card-solid)',
      border: `2px solid ${STROKE}`,
      color: 'var(--c-text)'
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "image/*",
    onChange: handleFile,
    className: "hidden"
  }), /*#__PURE__*/React.createElement(SoftButton, {
    onClick: () => fileRef.current && fileRef.current.click()
  }, avatar ? 'Change photo' : 'Upload photo'), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] mt-2",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "PNG / JPG \xB7 up to 5 MB"), uploadErr && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] mt-1",
    style: {
      color: '#E57373'
    }
  }, uploadErr))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-4"
  }, /*#__PURE__*/React.createElement(FlowerIcon, {
    size: 24,
    petal: "#FFFFFF",
    center: "#FFE082"
  }), /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-lg"
  }, "Choose your name")), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: name,
    onChange: e => !nameLocked && setName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '')),
    maxLength: 15,
    placeholder: "doodlefan_42",
    disabled: nameLocked,
    className: "w-full rounded-xl px-4 py-3 outline-none mb-2 font-medium transition-all focus:scale-[1.01] disabled:opacity-70 disabled:cursor-not-allowed",
    style: {
      background: 'var(--c-result-bg)',
      border: '2px solid var(--c-border)',
      color: 'var(--c-text)'
    }
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-xs mb-5",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "3\u201315 chars, letters, numbers and _"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement(SparkleIcon, {
    size: 18,
    fill: "#FFE082"
  }), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold"
  }, "Pick your color")), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3 mb-6 justify-between"
  }, PROFILE_COLORS.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.hex,
    onClick: () => setColor(c.hex),
    className: "w-10 h-10 rounded-full transition-all duration-300 active:scale-90 hover:-translate-y-0.5",
    style: {
      background: c.hex,
      border: `2.5px solid ${STROKE}`,
      transform: color === c.hex ? 'scale(1.15)' : 'scale(1)',
      boxShadow: color === c.hex ? `0 0 0 3px rgba(65,64,255,0.4), 0 6px 16px ${c.hex}88` : 'none'
    }
  }))), /*#__PURE__*/React.createElement(PrimaryButton, {
    onClick: () => nameValid && onCreate({
      name,
      color,
      avatar
    }),
    disabled: !nameValid,
    className: "w-full flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(SparkleIcon, {
    size: 18,
    fill: "#FFFFFF"
  }), isEdit ? 'Save changes' : "Let's Play!")));
};

/* ==========================================================================
   ICON STRIP — result visualization (replaces emoji squares)
   ========================================================================== */

const ResultIcon = ({
  type,
  size = 24
}) => {
  switch (type) {
    case 'perfect':
      return /*#__PURE__*/React.createElement(RainbowIcon, {
        size: size
      });
    case 'correct':
      return /*#__PURE__*/React.createElement(FlowerIcon, {
        size: size,
        petal: "#FFFFFF",
        center: "#FFE082"
      });
    case 'close':
      return /*#__PURE__*/React.createElement(ButterflyIcon, {
        size: size
      });
    case 'near':
      return /*#__PURE__*/React.createElement(SparkleIcon, {
        size: size,
        fill: "#90CAF9"
      });
    case 'wrong':
      return /*#__PURE__*/React.createElement(CloudRainIcon, {
        size: size
      });
    default:
      return /*#__PURE__*/React.createElement(CloudRainIcon, {
        size: size
      });
  }
};

/* ==========================================================================
   HOME SCREEN
   ========================================================================== */

/* Daily Reward Strip — shows 7-day streak calendar with bonus points */
const DailyRewardStrip = ({ streak = 0, claimedToday = false }) => {
  const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayIdx = (new Date().getUTCDay() + 6) % 7; // Mon=0
  const bonusForDay = i => i < 5 ? 1 : 2; // weekends give 2x
  return /*#__PURE__*/React.createElement(FrostedCard, {
    className: "p-3 mb-4 anim-float-in"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold tracking-wider uppercase",
    style: { color: 'var(--c-text-sub)' }
  }, "\uD83D\uDD25 Daily Streak Bonus"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-semibold",
    style: { color: streak >= 7 ? 'var(--c-accent)' : 'var(--c-text-sub)' }
  }, streak, "-day streak")), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1.5 justify-between"
  }, DAYS.map((d, i) => {
    const isPast = i < todayIdx;
    const isToday = i === todayIdx;
    const active = isPast && streak > (todayIdx - i) ? true : (isToday && claimedToday);
    const bonus = bonusForDay(i);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "flex-1 flex flex-col items-center gap-0.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
      style: {
        background: active ? '#7DD8A0' : isToday ? '#FFE082' : 'var(--c-pill-inactive)',
        border: isToday ? '2px solid var(--c-accent)' : '1.5px solid var(--c-border)',
        color: active ? '#FFF' : isToday ? 'var(--c-text)' : 'var(--c-text-sub)',
        transform: isToday ? 'scale(1.1)' : 'none',
        boxShadow: isToday ? '0 2px 8px rgba(65,64,255,0.2)' : 'none'
      }
    }, active ? '✓' : d), /*#__PURE__*/React.createElement("span", {
      className: "text-[9px] font-semibold",
      style: { color: active ? '#7DD8A0' : 'var(--c-text-sub)' }
    }, "+", bonus));
  })));
};

const HomeScreen = ({
  profile,
  progress,
  onPlay,
  weekPts,
  streak = 0,
  powerups = {
    hints: 1,
    skips: 1
  },
  challengeSeed,
  onDismissChallenge,
  onOpenLeagues
}) => {
  const modes = [{
    id: 'guess',
    name: 'Higher Sale',
    desc: 'Which Doodle sold for more ETH?',
    tint: '#E8D5F5',
    icon: /*#__PURE__*/React.createElement(MagnifierIcon, {
      size: 40
    }),
    accent: '#C5B3E6'
  }, {
    id: 'price',
    name: 'Rarity Duel',
    desc: 'Which Doodle is rarer?',
    tint: '#FFECE0',
    icon: /*#__PURE__*/React.createElement(ArrowsIcon, {
      size: 40
    }),
    accent: '#FFAB91'
  }, {
    id: 'trait',
    name: 'Trait Roulette',
    desc: 'Guess the rarity %',
    tint: '#E0F5EC',
    icon: /*#__PURE__*/React.createElement(WheelIcon, {
      size: 40
    }),
    accent: '#A8E6CF'
  }];

  // Deterministic preview Doodles per mode, picked from the dataset
  const previews = useRef(null);
  if (!previews.current) {
    const rng = mulberry32(hashCode(todayStr() + 'preview'));
    previews.current = {};
    for (const m of modes) {
      const picks = [];
      for (let i = 0; i < 3; i++) {
        picks.push(DOODLES[Math.floor(rng() * DOODLES.length)]);
      }
      previews.current[m.id] = picks;
    }
  }
  const doneCount = Object.values(progress).filter(Boolean).length;
  const hour = new Date().getHours();
  const greet = hour < 5 ? t('happy_late_night') : hour < 12 ? t('good_morning') : hour < 18 ? t('good_afternoon') : t('good_evening');
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 pt-3 pb-nav max-w-[480px] lg:max-w-[1400px] lg:px-8 mx-auto scroll-momentum"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-5 anim-fade-in"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement(ProfileAvatar, {
    profile: profile,
    size: 46,
    animated: false
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-medium",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, greet, " \u2014"), /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-xl",
    style: {
      color: 'var(--c-text)'
    }
  }, "@", profile.name))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, streak > 0 && /*#__PURE__*/React.createElement(FrostedCard, {
    className: "px-2.5 py-2 flex items-center gap-1 hover-lift",
    style: {
      background: 'rgba(255,224,130,0.55)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-base leading-none",
    style: {
      filter: 'saturate(1.1)'
    }
  }, "\uD83D\uDD25"), /*#__PURE__*/React.createElement("span", {
    className: "font-display font-semibold text-base tabular-nums",
    style: {
      color: 'var(--c-text)'
    }
  }, streak)), /*#__PURE__*/React.createElement(FrostedCard, {
    className: "px-3 py-2 flex items-center gap-2 hover-lift"
  }, /*#__PURE__*/React.createElement(CrownIcon, {
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    className: "font-display font-semibold text-base tabular-nums",
    style: {
      color: 'var(--c-text)'
    }
  }, /*#__PURE__*/React.createElement(CountUp, {
    value: weekPts
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-semibold tracking-wider uppercase",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "pts")))), challengeSeed && /*#__PURE__*/React.createElement(ChallengeBanner, {
    onDismiss: onDismissChallenge
  }), streak >= 2 && doneCount === 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-3 anim-fade-in",
    style: {
      animationDelay: '0.1s'
    }
  }, /*#__PURE__*/React.createElement(FrostedCard, {
    className: "px-4 py-3 flex items-center gap-3",
    style: {
      background: 'rgba(255,183,197,0.35)',
      border: '1px solid rgba(255,183,197,0.6)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl",
    style: {
      animation: 'bsDot 1.2s ease-in-out infinite'
    }
  }, "\uD83D\uDD25"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold",
    style: {
      color: 'var(--c-text)'
    }
  }, streak, "-day streak at risk!"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "Play any mode to keep your streak alive.")))), /*#__PURE__*/React.createElement(PowerupsBar, {
    pu: powerups
  }), /*#__PURE__*/React.createElement(DailyRewardStrip, {
    streak: streak,
    claimedToday: Object.values(progress).some(Boolean)
  }), /*#__PURE__*/React.createElement("div", {
    className: "lg:grid lg:grid-cols-2 lg:gap-4"
  }, /*#__PURE__*/React.createElement(MoodCard, null), /*#__PURE__*/React.createElement("div", {
    className: "mb-3 lg:mb-5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onOpenLeagues,
    className: "w-full h-full rounded-xl py-2.5 lg:py-4 text-sm font-bold flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5 active:scale-[0.98]",
    style: {
      background: 'var(--c-result-bg)',
      border: '1px solid var(--c-border)',
      color: 'var(--c-text)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\uD83C\uDFC6"), " ", t('private_leagues')))), /*#__PURE__*/React.createElement(FrostedCard, {
    className: "p-5 mb-5 anim-float-in",
    style: {
      animationDelay: '0.06s'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-bold tracking-[0.15em] uppercase",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, t('daily_challenge')), /*#__PURE__*/React.createElement("h3", {
    className: "font-display font-semibold text-2xl",
    style: {
      color: 'var(--c-text)'
    }
  }, t('day'), " #", dayNumber())), /*#__PURE__*/React.createElement(ProgressRing, {
    value: doneCount,
    total: 3,
    size: 66
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 justify-between"
  }, modes.map(m => /*#__PURE__*/React.createElement("div", {
    key: m.id,
    className: "flex-1 flex flex-col items-center gap-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 rounded-full flex items-center justify-center transition-all",
    style: {
      background: progress[m.id] ? m.accent : 'var(--c-result-bg)',
      border: `2px solid ${STROKE}`,
      transform: progress[m.id] ? 'scale(1.05)' : 'scale(1)'
    }
  }, progress[m.id] ? /*#__PURE__*/React.createElement(CheckIcon, {
    size: 18
  }) : /*#__PURE__*/React.createElement("div", {
    className: "w-4 h-4 rounded-full border-2",
    style: {
      borderColor: STROKE,
      borderStyle: 'dashed'
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-medium",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, m.name))))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-5"
  }, modes.map((m, i) => {
    const done = progress[m.id];
    const picks = previews.current[m.id];
    return /*#__PURE__*/React.createElement(FrostedCard, {
      key: m.id,
      onClick: () => !done && onPlay(m.id),
      className: "p-4 cursor-pointer active:scale-[0.98] transition-all duration-300 hover-lift anim-float-in relative overflow-hidden",
      style: {
        background: `${m.tint}cc`,
        animationDelay: `${0.12 + i * 0.08}s`
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "absolute -right-8 -top-8 w-32 h-32 rounded-full pointer-events-none",
      style: {
        background: `radial-gradient(circle, ${m.accent}55, transparent 70%)`
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-4 relative"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
      style: {
        background: 'var(--c-card-solid)',
        border: `1.5px solid ${m.accent}aa`,
        boxShadow: `0 8px 16px ${m.accent}44`
      }
    }, m.icon), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 min-w-0"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "font-display font-semibold text-lg leading-tight",
      style: {
        color: 'var(--c-text)'
      }
    }, m.name), /*#__PURE__*/React.createElement("p", {
      className: "text-xs mt-0.5",
      style: {
        color: 'var(--c-text-sub)'
      }
    }, m.desc)), done ? /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1 rounded-full px-3 py-1.5 shrink-0",
      style: {
        background: '#A8E6CF',
        border: `1.5px solid ${STROKE}`
      }
    }, /*#__PURE__*/React.createElement(CheckIcon, {
      size: 14
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-bold",
      style: {
        color: 'var(--c-text)'
      }
    }, "Done")) : /*#__PURE__*/React.createElement("button", {
      className: "rounded-full px-4 py-2 font-bold text-sm text-white shrink-0 transition-all hover:scale-105",
      style: {
        background: 'var(--c-accent)',
        boxShadow: '0 6px 16px rgba(65,64,255,0.4)'
      }
    }, "Play")), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2 mt-3 justify-start"
    }, picks.map((d, j) => /*#__PURE__*/React.createElement("div", {
      key: j,
      className: "rounded-xl overflow-hidden",
      style: {
        transform: `rotate(${[-3, 1, -1][j]}deg) translateY(${[0, -2, 1][j]}px)`,
        boxShadow: '0 4px 10px rgba(45,45,63,0.1)',
        border: `1.5px solid #fff`
      }
    }, /*#__PURE__*/React.createElement(DoodleAvatar, {
      doodle: d,
      size: 46
    })))));
  })));
};

/* ==========================================================================
   GAME MODE 1: GUESS THE DOODLE (simplified — binary trait question)
   ========================================================================== */

const GuessMode = ({
  seed,
  onFinish,
  onBack
}) => {
  const rng = useRef(mulberry32(seed + 7));
  const pairs = useRef([]);
  if (pairs.current.length === 0 && DOODLES.length > 0) {
    const withSale = DOODLES.filter(d => d.s && d.s.p > 0);
    const used = new Set();
    let tries = 0;
    while (pairs.current.length < 10 && tries < 1000 && withSale.length >= 2) {
      tries++;
      const a = withSale[Math.floor(rng.current() * withSale.length)];
      const b = withSale[Math.floor(rng.current() * withSale.length)];
      if (a.id === b.id || used.has(a.id) || used.has(b.id)) continue;
      if (a.s.p === b.s.p) continue;
      const hi = Math.max(a.s.p, b.s.p);
      const lo = Math.min(a.s.p, b.s.p);
      // require a minimum gap so pairs aren't impossibly close
      if (hi / lo < 1.15) continue;
      used.add(a.id);
      used.add(b.id);
      pairs.current.push({
        a,
        b
      });
    }
    // Progressive difficulty: sort easiest (highest price ratio) first
    pairs.current.sort((p1, p2) => {
      const r1 = Math.max(p1.a.s.p, p1.b.s.p) / Math.min(p1.a.s.p, p1.b.s.p);
      const r2 = Math.max(p2.a.s.p, p2.b.s.p) / Math.min(p2.a.s.p, p2.b.s.p);
      return r2 - r1;
    });
    // Prefetch all doodle images for this session upfront
    prefetchDoodleImages(pairs.current.flatMap(p => [p.a, p.b]));
  }
  const [round, setRound] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState([]);
  const [pu, setPu] = useState(() => currentPowerups());
  const [hintedSide, setHintedSide] = useState(null); // which side to grey out
  const [freezeActive, setFreezeActive] = useState(false); // second-chance shield
  const [popup, setPopup] = useState(null);
  const [animSide, setAnimSide] = useState(null);
  const choosingRef = useRef(false);
  const current = pairs.current[round];
  if (!current) {
    return /*#__PURE__*/React.createElement("div", {
      className: "p-10 text-center",
      style: {
        color: 'var(--c-text-sub)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }
    }, "Loading dataset\u2026", onBack && /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      style: {
        background: 'var(--c-accent)',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        padding: '10px 28px',
        fontSize: '15px',
        fontWeight: 600,
        cursor: 'pointer'
      }
    }, "\u2190 Back"));
  }
  const correctSide = current.a.s.p > current.b.s.p ? 'a' : 'b';
  const wrongSide = correctSide === 'a' ? 'b' : 'a';

  // Clear hint highlight whenever the round changes
  useEffect(() => {
    setHintedSide(null);
  }, [round]);
  const doHint = () => {
    if (revealed || hintedSide) return;
    if (!consumePowerup('hints')) return;
    setHintedSide(wrongSide);
    setPu(currentPowerups());
    Haptics.buzz(8);
  };
  const doSkip = () => {
    if (revealed) return;
    if (!consumePowerup('skips')) return;
    setPu(currentPowerups());
    setHintedSide(null);
    Haptics.buzz(8);
    const newResults = [...results, 'skip'];
    setResults(newResults);
    if (round + 1 >= pairs.current.length) {
      const pts = newResults.filter(r => r === 'correct').length;
      onFinish({
        points: pts,
        icons: newResults,
        mode: 'guess'
      });
    } else {
      setRound(round + 1);
    }
  };
  const doFreeze = () => {
    if (revealed || freezeActive) return;
    if (!consumePowerup('freezes')) return;
    setFreezeActive(true);
    setPu(currentPowerups());
    Sound.shimmer();
    Haptics.buzz(14);
  };
  const fmtPrice = p => {
    if (p >= 1) return p.toFixed(2) + ' ETH';
    if (p >= 0.01) return p.toFixed(3) + ' ETH';
    return p.toFixed(4) + ' ETH';
  };
  const fmtDate = ts => {
    const dt = new Date(ts * 1000);
    return dt.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  };

  // Dex hook: record both doodles shown
  useEffect(() => {
    if (current) recordDexGlobal([current.a.id, current.b.id]);
  }, [round]);
  const choose = side => {
    if (revealed || choosingRef.current) return;
    if (hintedSide && side === hintedSide) return; // blocked by hint
    choosingRef.current = true;
    const correct = side === correctSide;
    if (!correct && freezeActive) {
      // Freeze absorbs the wrong answer — shake + let them try again
      choosingRef.current = false;
      setFreezeActive(false);
      Sound.wrong();
      Haptics.buzz([8, 40, 8, 40, 8]);
      return; // don't reveal, don't record — they get another shot
    }
    setRevealed(true);
    setPopup({ points: correct ? 1 : 0, type: correct ? 'correct' : 'wrong' });
    setAnimSide(side);
    if (correct) {
      Sound.correct();
      Haptics.buzz(14);
    } else {
      Sound.wrong();
      Haptics.buzz([8, 40, 8]);
    }
    setTimeout(() => {
      const newResults = [...results, correct ? 'correct' : 'wrong'];
      setResults(newResults);
      choosingRef.current = false;
      setFreezeActive(false);
      setPopup(null);
      setAnimSide(null);
      if (round + 1 >= pairs.current.length) {
        const pts = newResults.filter(r => r === 'correct').length;
        onFinish({
          points: pts,
          icons: newResults,
          mode: 'guess'
        });
      } else {
        setRound(round + 1);
        setRevealed(false);
      }
    }, 1600);
  };

  // Keyboard shortcuts (desktop)
  useEffect(() => {
    const h = e => {
      if (revealed) return;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') choose('a');
      if (e.key === 'l' || e.key === 'L' || e.key === 'ArrowRight') choose('b');
      if (e.key === 'h' || e.key === 'H') doHint();
      if (e.key === 's' || e.key === 'S') doSkip();
      if (e.key === 'f' || e.key === 'F') doFreeze();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [revealed, round, hintedSide, freezeActive]);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 pt-4 pb-nav max-w-[480px] lg:max-w-[1400px] lg:px-12 mx-auto",
    style: { position: 'relative' }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(MagnifierIcon, {
    size: 28
  }), /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-lg",
    style: {
      color: 'var(--c-text)'
    }
  }, "Higher Sale")), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-sm",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, round + 1, "/", pairs.current.length)), /*#__PURE__*/React.createElement(GamePowerBar, {
    pu: pu,
    onHint: doHint,
    onSkip: doSkip,
    onFreeze: doFreeze,
    hintDisabled: revealed || !!hintedSide,
    skipDisabled: revealed,
    freezeDisabled: revealed,
    freezeActive: freezeActive,
    hintHint: "Eliminates the wrong option for this round"
  }), /*#__PURE__*/React.createElement(FrostedCard, {
    className: "p-4 mb-4 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "Which one sold for"), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-xl",
    style: {
      color: 'var(--c-accent)'
    }
  }, "MORE ETH most recently?")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3 lg:gap-10 lg:max-w-5xl lg:mx-auto mb-4"
  }, ['a', 'b'].map(side => {
    const d = current[side];
    const isCorrect = revealed && side === correctSide;
    const isWrong = revealed && side !== correctSide;
    const isHintedOut = hintedSide === side && !revealed;
    return /*#__PURE__*/React.createElement(FrostedCard, {
      key: side,
      onClick: () => choose(side),
      className: `p-3 lg:p-6 transition-all ${isHintedOut ? 'cursor-not-allowed' : 'cursor-pointer'} ${revealed ? '' : 'active:scale-95 lg:hover:-translate-y-1'} ${animSide === side && side === correctSide ? 'anim-correct-pulse' : ''} ${animSide === side && side !== correctSide ? 'anim-shake' : ''}`,
      style: {
        outline: isCorrect ? '3px solid #7DD8A0' : isWrong ? '3px solid #FF8A8A' : 'none',
        outlineOffset: '2px',
        opacity: isHintedOut ? 0.35 : 1,
        filter: isHintedOut ? 'grayscale(0.8)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "doodle-card-img"
    }, /*#__PURE__*/React.createElement(DoodleAvatar, {
      doodle: d,
      size: 170,
      eager: true
    })), /*#__PURE__*/React.createElement("div", {
      className: "mt-2 text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] font-bold",
      style: {
        color: 'var(--c-text-sub)'
      }
    }, "#", d.id), revealed ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "font-bold text-lg",
      style: {
        color: isCorrect ? '#7DD8A0' : 'var(--c-text)'
      }
    }, fmtPrice(d.s.p)), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px]",
      style: {
        color: 'var(--c-text-sub)'
      }
    }, fmtDate(d.s.t))) : /*#__PURE__*/React.createElement("div", {
      className: "font-bold text-lg",
      style: {
        color: '#C5B3E6'
      }
    }, isHintedOut ? '✗ not this one' : '? ETH')));
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1 justify-center"
  }, Array.from({
    length: pairs.current.length
  }, (_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "w-7 h-7 flex items-center justify-center rounded-full",
    style: {
      background: results[i] ? 'var(--c-result-bg)' : 'var(--c-pill-inactive)'
    }
  }, results[i] ? /*#__PURE__*/React.createElement(ResultIcon, {
    type: results[i],
    size: 18
  }) : /*#__PURE__*/React.createElement("div", {
    className: "w-2 h-2 rounded-full",
    style: {
      background: '#C5B3E6'
    }
  })))), /*#__PURE__*/React.createElement(ScorePopup, { points: popup?.points || 0, type: popup?.type || '', visible: !!popup }));
};

/* ==========================================================================
   GAME MODE 2: RARITY DUEL (which Doodle is rarer?)
   ========================================================================== */

const PriceMode = ({
  seed,
  onFinish,
  onBack
}) => {
  const rng = useRef(mulberry32(seed + 99));
  const triplets = useRef([]);
  if (triplets.current.length === 0 && DOODLES.length > 0) {
    const used = new Set();
    let tries = 0;
    while (triplets.current.length < 10 && tries < 800) {
      tries++;
      const a = DOODLES[Math.floor(rng.current() * DOODLES.length)];
      const b = DOODLES[Math.floor(rng.current() * DOODLES.length)];
      const c = DOODLES[Math.floor(rng.current() * DOODLES.length)];
      if (a.id === b.id || a.id === c.id || b.id === c.id) continue;
      if (used.has(a.id) || used.has(b.id) || used.has(c.id)) continue;
      // All three must have different rarity scores
      if (a.r === b.r || a.r === c.r || b.r === c.r) continue;
      // Min rank spread: rarest vs least-rare must differ by >= 150
      const ranks = [a.rank || 1, b.rank || 1, c.rank || 1];
      if (Math.max(...ranks) - Math.min(...ranks) < 150) continue;
      used.add(a.id);
      used.add(b.id);
      used.add(c.id);
      triplets.current.push({ options: [a, b, c] });
    }
    // Progressive difficulty: sort easiest (largest rank spread) first
    triplets.current.sort((t1, t2) => {
      const r1 = t1.options.map(d => d.rank || 1);
      const r2 = t2.options.map(d => d.rank || 1);
      const spread1 = Math.max(...r1) - Math.min(...r1);
      const spread2 = Math.max(...r2) - Math.min(...r2);
      return spread2 - spread1;
    });
    prefetchDoodleImages(triplets.current.flatMap(t => t.options));
  }
  const [round, setRound] = useState(0);
  const [streak, setStreak] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [icons, setIcons] = useState([]);
  const [pu, setPu] = useState(() => currentPowerups());
  const [hintedIdx, setHintedIdx] = useState(null); // index of eliminated option (0,1,2)
  const [freezeActive, setFreezeActive] = useState(false);
  const [popup, setPopup] = useState(null);
  const [animIdx, setAnimIdx] = useState(null);
  const choosingRef = useRef(false);
  const accPtsRef = useRef(0); // accumulated points per-round (not retroactive)
  const current = triplets.current[round];
  if (!current) {
    return /*#__PURE__*/React.createElement("div", {
      className: "p-10 text-center",
      style: {
        color: 'var(--c-text-sub)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }
    }, "Loading dataset\u2026", onBack && /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      style: {
        background: 'var(--c-accent)',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        padding: '10px 28px',
        fontSize: '15px',
        fontWeight: 600,
        cursor: 'pointer'
      }
    }, "\u2190 Back"));
  }
  const opts = current.options;
  // rarer = higher rarity score = LOWER rank number
  const correctIdx = opts.reduce((best, d, i) => d.r > opts[best].r ? i : best, 0);
  // Pick a wrong option to eliminate with hint (not the correct one)
  const wrongIndices = [0, 1, 2].filter(i => i !== correctIdx);
  const mult = streak >= 10 ? 3 : streak >= 5 ? 2 : 1;

  // Dex hook: record all doodles shown
  useEffect(() => {
    if (current) recordDexGlobal(opts.map(d => d.id));
  }, [round]);
  useEffect(() => {
    setHintedIdx(null);
  }, [round]);
  const doHint = () => {
    if (revealed || hintedIdx !== null) return;
    if (!consumePowerup('hints')) return;
    setPu(currentPowerups());
    // Eliminate the worst wrong option (highest rank = least rare)
    const worstWrong = wrongIndices.reduce((w, i) => (opts[i].rank || 1) > (opts[w].rank || 1) ? i : w, wrongIndices[0]);
    setHintedIdx(worstWrong);
  };
  const doSkip = () => {
    if (revealed) return;
    if (!consumePowerup('skips')) return;
    setPu(currentPowerups());
    setHintedIdx(null);
    const newIcons = [...icons, 'skip'];
    setIcons(newIcons);
    if (round + 1 >= triplets.current.length) {
      finish(streak, newIcons);
    } else {
      setRound(round + 1);
      setRevealed(false);
    }
  };
  const doFreeze = () => {
    if (revealed || freezeActive) return;
    if (!consumePowerup('freezes')) return;
    setFreezeActive(true);
    setPu(currentPowerups());
    Sound.shimmer();
    Haptics.buzz(14);
  };
  const choose = idx => {
    if (revealed || choosingRef.current) return;
    if (idx === hintedIdx) return;
    choosingRef.current = true;
    const correct = idx === correctIdx;
    if (!correct && freezeActive) {
      // Freeze absorbs the wrong answer — streak preserved, try again
      choosingRef.current = false;
      setFreezeActive(false);
      Sound.wrong();
      Haptics.buzz([8, 40, 8, 40, 8]);
      return;
    }
    setRevealed(true);
    setAnimIdx(idx);
    if (correct) {
      const roundPts = 2 * mult;
      accPtsRef.current += roundPts;
      setPopup({ points: roundPts, type: 'up' });
      if (streak >= 2) { Sound.streak(); } else { Sound.correct(); }
      Haptics.buzz(14);
    } else {
      setPopup({ points: 0, type: 'down' });
      Sound.wrong();
      Haptics.buzz([8, 40, 8]);
    }
    setTimeout(() => {
      choosingRef.current = false;
      setFreezeActive(false);
      setPopup(null);
      setAnimIdx(null);
      if (correct) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        setIcons([...icons, 'up']);
        if (round + 1 >= triplets.current.length) {
          finish(newStreak, [...icons, 'up']);
        } else {
          setRound(round + 1);
          setRevealed(false);
        }
      } else {
        const newIcons = [...icons, 'down'];
        setIcons(newIcons);
        setGameOver(true);
        setTimeout(() => finish(streak, newIcons), 1800);
      }
    }, 1500);
  };

  // Keyboard shortcuts: 1/A/Left = first, 2/S/Down = second, 3/D/Right = third
  useEffect(() => {
    const h = e => {
      if (revealed) return;
      if (e.key === '1' || e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') choose(0);
      if (e.key === '2' || e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') choose(1);
      if (e.key === '3' || e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') choose(2);
      if (e.key === 'h' || e.key === 'H') doHint();
      if (e.key === 'k' || e.key === 'K') doSkip();
      if (e.key === 'f' || e.key === 'F') doFreeze();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [revealed, round, streak, icons, freezeActive, hintedIdx]);
  const finish = (finalStreak, finalIcons) => {
    onFinish({
      points: accPtsRef.current, // use accumulated per-round points, not retroactive
      icons: finalIcons,
      mode: 'price',
      streak: finalStreak
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 pt-4 pb-nav max-w-[480px] lg:max-w-[1400px] lg:px-12 mx-auto",
    style: { position: 'relative' }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(ArrowsIcon, {
    size: 28
  }), /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-lg",
    style: {
      color: 'var(--c-text)'
    }
  }, "Rarity Duel")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, streak > 0 && /*#__PURE__*/React.createElement(ShootingStarIcon, {
    size: 22
  }), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-sm",
    style: {
      color: 'var(--c-accent)'
    }
  }, streak, " streak ", mult > 1 && `· x${mult}`))), /*#__PURE__*/React.createElement("p", {
    className: "text-center text-sm mb-4",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "Which Doodle is ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--c-accent)'
    }
  }, "RARER"), "?"), /*#__PURE__*/React.createElement(GamePowerBar, {
    pu: pu,
    onHint: doHint,
    onSkip: doSkip,
    onFreeze: doFreeze,
    hintDisabled: revealed || hintedIdx !== null,
    skipDisabled: revealed,
    freezeDisabled: revealed,
    freezeActive: freezeActive
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2 lg:gap-6 lg:max-w-5xl lg:mx-auto mb-4"
  }, [0, 1, 2].map(idx => {
    const d = opts[idx];
    const isCorrect = revealed && idx === correctIdx;
    const isWrong = revealed && idx !== correctIdx;
    const isHintedOut = hintedIdx === idx;
    return /*#__PURE__*/React.createElement(FrostedCard, {
      key: idx,
      onClick: () => choose(idx),
      className: `p-2 lg:p-4 transition-all ${revealed || isHintedOut ? '' : 'cursor-pointer active:scale-95 lg:hover:-translate-y-1'} ${animIdx === idx && idx === correctIdx ? 'anim-correct-pulse' : ''} ${animIdx === idx && idx !== correctIdx ? 'anim-shake' : ''}`,
      style: {
        outline: isCorrect ? '3px solid #7DD8A0' : isWrong ? '3px solid #FF8A8A' : 'none',
        outlineOffset: '2px',
        opacity: isHintedOut ? 0.35 : 1,
        filter: isHintedOut ? 'grayscale(0.8)' : 'none',
        cursor: isHintedOut ? 'not-allowed' : undefined
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "doodle-card-img"
    }, /*#__PURE__*/React.createElement(DoodleAvatar, {
      doodle: d,
      size: 130,
      eager: true
    })), /*#__PURE__*/React.createElement("div", {
      className: "mt-1 text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[9px] font-bold",
      style: {
        color: 'var(--c-text-sub)'
      }
    }, "#", d.id), revealed ? /*#__PURE__*/React.createElement("div", {
      className: "font-bold text-sm lg:text-xl",
      style: {
        color: isCorrect ? '#7DD8A0' : 'var(--c-text)'
      }
    }, "Rank #", d.rank) : /*#__PURE__*/React.createElement("div", {
      className: "font-bold text-sm lg:text-xl",
      style: {
        color: '#C5B3E6'
      }
    }, "Rank ?")));
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1 justify-center"
  }, icons.map((icn, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "w-7 h-7 flex items-center justify-center rounded-full",
    style: {
      background: 'var(--c-result-bg)'
    }
  }, icn === 'up' ? /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-bold",
    style: {
      color: '#7DD8A0'
    }
  }, "\u25B2") : icn === 'skip' ? /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-bold",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "\u21E5") : /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-bold",
    style: {
      color: '#FF8A8A'
    }
  }, "\u25BC")))), gameOver && /*#__PURE__*/React.createElement(FrostedCard, {
    className: "mt-5 p-4 text-center"
  }, /*#__PURE__*/React.createElement(CloudRainIcon, {
    size: 40
  }), /*#__PURE__*/React.createElement("p", {
    className: "font-bold mt-2",
    style: {
      color: 'var(--c-text)'
    }
  }, "Game over \xB7 streak ", streak)), /*#__PURE__*/React.createElement(ScorePopup, { points: popup?.points || 0, type: popup?.type || '', visible: !!popup }));
};

/* ==========================================================================
   GAME MODE 3: TRAIT ROULETTE (guess the rarity %)
   ========================================================================== */

const TraitExamples = ({
  candidates
}) => {
  const [failed, setFailed] = useState({});
  useEffect(() => {
    setFailed({});
  }, [candidates]);
  const visible = candidates.filter(d => !failed[d.id]).slice(0, 3);
  if (visible.length === 0) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center gap-3"
  }, visible.map(d => /*#__PURE__*/React.createElement("div", {
    key: d.id,
    className: "rounded-2xl overflow-hidden hover-lift",
    style: {
      boxShadow: '0 4px 14px rgba(65,64,255,0.12)'
    }
  }, /*#__PURE__*/React.createElement(DoodleAvatar, {
    doodle: d,
    size: 84,
    eager: true,
    onFail: bad => setFailed(f => ({
      ...f,
      [bad.id]: true
    }))
  }))));
};
const TraitMode = ({
  seed,
  onFinish,
  onBack
}) => {
  const rng = useRef(mulberry32(seed + 33));
  const questions = useRef([]);
  if (questions.current.length === 0) {
    // Flatten all (type, value, pct) into rarity buckets for balanced difficulty
    const buckets = { rare: [], uncommon: [], mid: [], common: [] };
    for (const t of TRAIT_TYPES) {
      const map = RARITY[t] || {};
      for (const [value, pct] of Object.entries(map)) {
        if (value === '__none__') continue;
        if (pct < 0.2) continue;
        const entry = { type: t, value, pct };
        if (pct <= 2) buckets.rare.push(entry);
        else if (pct <= 5) buckets.uncommon.push(entry);
        else if (pct <= 8) buckets.mid.push(entry);
        else buckets.common.push(entry); // 8%+
      }
    }
    // Seeded shuffle each bucket
    const shuf = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng.current() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } };
    Object.values(buckets).forEach(shuf);
    // Pick 5 questions: 1 rare, 2 uncommon, 1 mid, 1 common — fallback if bucket empty
    const pick1 = b => b.length ? b.pop() : null;
    const wanted = [pick1(buckets.rare), pick1(buckets.uncommon), pick1(buckets.uncommon), pick1(buckets.mid), pick1(buckets.common)].filter(Boolean);
    // If we didn't fill 5, top up from any remaining
    const remaining = [...buckets.rare, ...buckets.uncommon, ...buckets.mid, ...buckets.common];
    shuf(remaining);
    while (wanted.length < 5 && remaining.length) {
      const next = remaining.pop();
      if (!wanted.some(w => w.type === next.type && w.value === next.value)) wanted.push(next);
    }
    // Progressive difficulty: sort easiest first (traits furthest from 25% are easier to guess)
    wanted.sort((a, b) => Math.abs(b.pct - 25) - Math.abs(a.pct - 25));
    const picked = wanted;
    // For each picked trait, collect up to 3 example Doodles that have it (deterministic)
    for (const q of picked) {
      const matches = [];
      for (const d of DOODLES) {
        if (hasTrait(d, q.type, q.value)) matches.push(d);
      }
      // seeded shuffle so picks are stable per seed
      for (let i = matches.length - 1; i > 0; i--) {
        const j = Math.floor(rng.current() * (i + 1));
        [matches[i], matches[j]] = [matches[j], matches[i]];
      }
      // keep up to 8 candidates so we can swap in replacements if images fail
      q.exampleCandidates = matches.slice(0, 8);
    }
    questions.current = picked;
    // Prefetch example Doodle images
    prefetchDoodleImages(picked.flatMap(q => q.exampleCandidates || []));
  }
  const choosingRef = useRef(false);
  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState(25);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState([]);
  const [pu, setPu] = useState(() => currentPowerups());
  const [hintRange, setHintRange] = useState(null); // {lo, hi} narrowing the slider after hint
  const [freezeActive, setFreezeActive] = useState(false);
  const [popup, setPopup] = useState(null);
  const current = questions.current[round];
  if (!current) {
    return /*#__PURE__*/React.createElement("div", {
      className: "p-10 text-center",
      style: {
        color: 'var(--c-text-sub)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }
    }, "Loading dataset\u2026", onBack && /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      style: {
        background: 'var(--c-accent)',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        padding: '10px 28px',
        fontSize: '15px',
        fontWeight: 600,
        cursor: 'pointer'
      }
    }, "\u2190 Back"));
  }
  const actual = current.pct;
  useEffect(() => {
    if (current && current.exampleCandidates) {
      recordDexGlobal(current.exampleCandidates.slice(0, 3).map(d => d.id));
    }
  }, [round]);
  useEffect(() => {
    setHintRange(null);
  }, [round]);
  const doHint = () => {
    if (revealed || hintRange) return;
    if (!consumePowerup('hints')) return;
    setPu(currentPowerups());
    // reveal a proportional window around the actual value (±50% of actual, min ±3)
    const hintW = Math.max(3, Math.round(actual * 0.5));
    const lo = Math.max(0, Math.round(actual) - hintW);
    const hi = Math.min(50, Math.round(actual) + hintW);
    setHintRange({
      lo,
      hi
    });
    // nudge the guess into the window if it's outside
    setGuess(g => g < lo ? lo : g > hi ? hi : g);
  };
  const doSkip = () => {
    if (revealed) return;
    if (!consumePowerup('skips')) return;
    setPu(currentPowerups());
    const newResults = [...results, {
      type: 'skip',
      pts: 0
    }];
    setResults(newResults);
    if (round + 1 >= questions.current.length) {
      onFinish({
        points: newResults.reduce((s, r) => s + r.pts, 0),
        icons: newResults.map(r => r.type),
        mode: 'trait'
      });
    } else {
      setRound(round + 1);
      setRevealed(false);
      setGuess(25);
      setHintRange(null);
    }
  };
  const doFreeze = () => {
    if (revealed || freezeActive) return;
    if (!consumePowerup('freezes')) return;
    setFreezeActive(true);
    setPu(currentPowerups());
    Sound.shimmer();
    Haptics.buzz(14);
  };
  const submit = () => {
    if (revealed || choosingRef.current) return;
    choosingRef.current = true;
    const diff = Math.abs(guess - actual);
    // Tight proportional thresholds: ±10% of actual for perfect, ±25% for correct, ±50% for near
    // Minimum floors ensure very small traits (0.5%) still have reachable but tight windows
    const tPerfect = Math.max(0.5, actual * 0.10);
    const tCorrect = Math.max(1.5, actual * 0.25);
    const tNear    = Math.max(3,   actual * 0.50);
    let type, pts;
    if (diff <= tPerfect) {
      type = 'perfect';
      pts = 3;
    } else if (diff <= tCorrect) {
      type = 'correct';
      pts = 2;
    } else if (diff <= tNear) {
      type = 'near';
      pts = 1;
    } else {
      type = 'wrong';
      pts = 0;
    }
    // Freeze: if wrong (0 pts), absorb and let them re-try
    if (pts === 0 && freezeActive) {
      choosingRef.current = false;
      setFreezeActive(false);
      Sound.wrong();
      Haptics.buzz([8, 40, 8, 40, 8]);
      // Don't reveal — let them adjust slider
      return;
    }
    setRevealed(true);
    setPopup({ points: pts, type: type });
    if (pts > 0) {
      Sound.correct();
      Haptics.buzz(pts === 3 ? 20 : 12);
    } else {
      Sound.wrong();
      Haptics.buzz([8, 40, 8]);
    }
    setTimeout(() => {
      choosingRef.current = false;
      setFreezeActive(false);
      setPopup(null);
      const newResults = [...results, {
        type,
        pts
      }];
      setResults(newResults);
      if (round + 1 >= questions.current.length) {
        onFinish({
          points: newResults.reduce((s, r) => s + r.pts, 0),
          icons: newResults.map(r => r.type),
          mode: 'trait'
        });
      } else {
        setRound(round + 1);
        setRevealed(false);
        setGuess(25);
      }
    }, 1800);
  };
  const lastResult = revealed ? (() => {
    const diff = Math.abs(guess - actual);
    const tP = Math.max(0.5, actual * 0.10);
    const tC = Math.max(1.5, actual * 0.25);
    const tN = Math.max(3,   actual * 0.50);
    if (diff <= tP) return {
      type: 'perfect',
      label: 'Bullseye!'
    };
    if (diff <= tC) return {
      type: 'correct',
      label: 'Close!'
    };
    if (diff <= tN) return {
      type: 'near',
      label: 'Near miss'
    };
    return {
      type: 'wrong',
      label: 'Way off'
    };
  })() : null;
  const maxPct = 50;
  const pct2x = v => Math.min(100, v / maxPct * 100);
  useEffect(() => {
    const h = e => {
      if (revealed) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault();
        setGuess(g => Math.min(maxPct, g + (e.shiftKey ? 5 : 1)));
        Sound.tap();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setGuess(g => Math.max(0, g - (e.shiftKey ? 5 : 1)));
        Sound.tap();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      } else if (e.key === 'h' || e.key === 'H') {
        doHint();
      } else if (e.key === 's' || e.key === 'S') {
        doSkip();
      } else if (e.key === 'f' || e.key === 'F') {
        doFreeze();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [revealed, guess, round, submit]);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 pt-4 pb-nav max-w-[480px] lg:max-w-[1400px] lg:px-12 mx-auto",
    style: { position: 'relative' }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(WheelIcon, {
    size: 28
  }), /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-lg",
    style: {
      color: 'var(--c-text)'
    }
  }, "Trait Roulette")), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-sm",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, round + 1, "/", questions.current.length)), /*#__PURE__*/React.createElement(GamePowerBar, {
    pu: pu,
    onHint: doHint,
    onSkip: doSkip,
    onFreeze: doFreeze,
    hintDisabled: revealed || !!hintRange,
    skipDisabled: revealed,
    freezeDisabled: revealed,
    freezeActive: freezeActive
  }), /*#__PURE__*/React.createElement(FrostedCard, {
    className: "p-6 mb-5 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium mb-1",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "What % of Doodles have"), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-2xl",
    style: {
      color: 'var(--c-accent)'
    }
  }, titleCase(current.value)), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] mt-1 mb-4",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "(", current.type, ")"), /*#__PURE__*/React.createElement(TraitExamples, {
    candidates: current.exampleCandidates || []
  })), /*#__PURE__*/React.createElement(FrostedCard, {
    className: "p-5 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-5xl",
    style: {
      color: 'var(--c-text)'
    }
  }, guess, "%")), /*#__PURE__*/React.createElement("div", {
    className: "relative h-12 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full",
    style: {
      background: 'linear-gradient(90deg, #A8E6CF, #FFE082, #FFB7C5)'
    }
  }), hintRange && !revealed && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-1/2 -translate-y-1/2 h-3 rounded-full pointer-events-none",
    style: {
      left: `${pct2x(hintRange.lo)}%`,
      width: `${pct2x(hintRange.hi) - pct2x(hintRange.lo)}%`,
      background: 'rgba(125,216,160,0.35)',
      border: '2px dashed #7DD8A0'
    }
  }), revealed && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all",
    style: {
      left: `${pct2x(actual)}%`
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-1 h-8 rounded",
    style: {
      background: '#7DD8A0'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold whitespace-nowrap",
    style: {
      color: '#7DD8A0'
    }
  }, actual, "%")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "0",
    max: maxPct,
    step: "1",
    value: guess,
    disabled: revealed,
    onChange: e => setGuess(+e.target.value),
    className: "absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none transition-all",
    style: {
      left: `${pct2x(guess)}%`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      filter: 'drop-shadow(0 2px 6px rgba(100,80,160,0.3))'
    }
  }, /*#__PURE__*/React.createElement(FlowerIcon, {
    size: 28,
    petal: "#FFFFFF",
    center: "#FFE082"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-[10px] -mt-2 mb-2",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "0%"), /*#__PURE__*/React.createElement("span", null, maxPct / 2, "%"), /*#__PURE__*/React.createElement("span", null, maxPct, "%+")), !revealed ? /*#__PURE__*/React.createElement(PrimaryButton, {
    onClick: submit,
    className: "w-full"
  }, "Lock in answer") : /*#__PURE__*/React.createElement("div", {
    className: "text-center pt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center gap-2 mb-1"
  }, /*#__PURE__*/React.createElement(ResultIcon, {
    type: lastResult.type,
    size: 28
  }), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-lg",
    style: {
      color: 'var(--c-text)'
    }
  }, lastResult.label)), /*#__PURE__*/React.createElement("p", {
    className: "text-sm",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "You: ", guess, "% \xB7 Real: ", actual, "%"))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1 justify-center"
  }, results.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "w-7 h-7 flex items-center justify-center rounded-full",
    style: {
      background: 'var(--c-result-bg)'
    }
  }, /*#__PURE__*/React.createElement(ResultIcon, {
    type: r.type,
    size: 18
  })))), /*#__PURE__*/React.createElement(ScorePopup, { points: popup?.points || 0, type: popup?.type || '', visible: !!popup }));
};

/* ==========================================================================
   RESULTS / SHARE CARD
   ========================================================================== */

const ResultsScreen = ({
  result,
  profile,
  onBack,
  onShare,
  onChallenge
}) => {
  const {
    mode,
    points,
    icons
  } = result;
  const clutch = !!result.clutch;
  const modeMeta = {
    guess: {
      name: 'Higher Sale',
      icon: /*#__PURE__*/React.createElement(MagnifierIcon, {
        size: 32
      })
    },
    price: {
      name: 'Rarity Duel',
      icon: /*#__PURE__*/React.createElement(ArrowsIcon, {
        size: 32
      })
    },
    trait: {
      name: 'Trait Roulette',
      icon: /*#__PURE__*/React.createElement(WheelIcon, {
        size: 32
      })
    }
  }[mode];
  const [copied, setCopied] = useState(false);
  const shareText = () => {
    const symbols = {
      perfect: '◎',
      correct: '✿',
      close: '★',
      near: '✦',
      wrong: '·',
      up: '▲',
      down: '▼'
    };
    const line = icons.map(i => symbols[i] || '·').join(' ');
    return `Doodle or Not — Day #${dayNumber()}\n\n${modeMeta.name}: ${line} (${points} pts)\n\nPlay free: doodleornot.xyz`;
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Score tier — drives confetti + headline
  const perfectCount = icons.filter(i => i === 'perfect').length;
  const anyCorrect = icons.some(i => ['perfect', 'correct', 'up', 'near'].includes(i));
  const allPerfect = icons.length > 0 && icons.every(i => i === 'perfect');
  const tier = points >= 15 ? 'legendary' : points >= 10 ? 'great' : points >= 5 ? 'solid' : anyCorrect ? 'getting-there' : 'tough-day';
  const headline = allPerfect ? 'Flawless! 🌈' : {
    'legendary': 'Legendary!',
    'great': 'Nicely done.',
    'solid': 'Solid round.',
    'getting-there': 'Getting there.',
    'tough-day': 'Tough day. Tomorrow awaits.'
  }[tier];
  const showConfetti = points >= 10 || perfectCount >= 2 || clutch || allPerfect;
  const confettiCount = allPerfect ? 160 : tier === 'legendary' ? 120 : tier === 'great' ? 72 : tier === 'solid' ? 44 : 20;
  const confettiPalette = allPerfect ? ['#FFE082', '#FFB7C5', '#C5B3E6', '#A8E6CF', '#90CAF9', '#FFAB91', '#4140FF', '#FFF'] : tier === 'legendary' ? ['#FFE082', '#FFB7C5', '#C5B3E6', '#A8E6CF', '#90CAF9', '#FFAB91', '#4140FF'] : tier === 'great' ? ['#FFE082', '#FFB7C5', '#A8E6CF', '#C5B3E6'] : tier === 'solid' ? ['#FFE082', '#A8E6CF', '#90CAF9'] : ['#FFB7C5', '#FFE082'];

  // Play celebration sound for top tiers
  useEffect(() => {
    if (tier === 'legendary' || allPerfect) {
      Sound.shimmer();
      Haptics.buzz([14, 60, 14, 60, 14]);
    } else if (tier === 'great') {
      Sound.levelUp();
    } else if (tier === 'solid') {
      Sound.jingle();
    }
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 pt-6 pb-nav max-w-[480px] lg:max-w-[1400px] lg:px-12 mx-auto relative"
  }, showConfetti && /*#__PURE__*/React.createElement(Confetti, {
    count: confettiCount,
    palette: confettiPalette
  }), clutch && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl p-3 mb-3 text-center anim-pop-in",
    style: {
      background: 'linear-gradient(135deg,#FFE082aa,#A8E6CFaa)',
      border: '1.5px solid #FFE082'
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-display font-semibold text-lg",
    style: {
      color: 'var(--c-text)'
    }
  }, "\u2728 ", t('clutch_bonus')), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px]",
    style: {
      color: 'var(--c-text)'
    }
  }, t('no_petals'), " \xB7 +2 bonus")), /*#__PURE__*/React.createElement(FrostedCard, {
    className: "p-6 text-center relative overflow-hidden anim-pop-in"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 pointer-events-none",
    style: {
      background: 'radial-gradient(circle at 50% 0%, rgba(197,179,230,0.35), transparent 60%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-bold tracking-[0.15em] uppercase",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, modeMeta.name, " \xB7 ", t('day'), " #", dayNumber()), /*#__PURE__*/React.createElement("h2", {
    className: "font-display font-semibold text-3xl mt-1 mb-5",
    style: {
      color: 'var(--c-text)'
    }
  }, headline), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center mb-2 anim-rainbow-spin-slow"
  }, /*#__PURE__*/React.createElement(RainbowIcon, {
    size: 80
  })), /*#__PURE__*/React.createElement("div", {
    className: "font-display font-semibold leading-none tabular-nums anim-score-pop",
    style: {
      fontSize: 96,
      color: 'var(--c-accent)',
      letterSpacing: '-0.04em'
    }
  }, /*#__PURE__*/React.createElement(CountUp, {
    value: points,
    duration: 1200
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold mt-1 mb-6 tracking-wider uppercase",
    style: {
      color: 'var(--c-text)',
      opacity: 0.75
    }
  }, "points earned"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1.5 justify-center mb-6 flex-wrap"
  }, icons.map((icn, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "w-10 h-10 flex items-center justify-center rounded-full anim-pop-in",
    style: {
      background: 'var(--c-card-solid)',
      border: '1.5px solid var(--c-border)',
      animationDelay: `${0.2 + i * 0.08}s`
    }
  }, ['up', 'down'].includes(icn) ? /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-base",
    style: {
      color: icn === 'up' ? '#7DD8A0' : '#FF8A8A'
    }
  }, icn === 'up' ? '▲' : '▼') : /*#__PURE__*/React.createElement(ResultIcon, {
    type: icn,
    size: 22
  })))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement(PrimaryButton, {
    onClick: onShare,
    className: "w-full flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(ShareIcon, {
    size: 18
  }), t('share')), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement(SoftButton, {
    onClick: copy,
    className: "w-full"
  }, copied ? 'Copied!' : 'Copy text'), /*#__PURE__*/React.createElement(SoftButton, {
    onClick: onChallenge,
    className: "w-full"
  }, "\uD83C\uDFAF ", t('challenge_friend'))), /*#__PURE__*/React.createElement(SoftButton, {
    onClick: onBack,
    className: "w-full"
  }, "Back to home")))));
};

/* ==========================================================================
   CONFETTI — lightweight CSS-only celebration burst
   ========================================================================== */

const Confetti = ({
  count = 36,
  palette = ['#FFB7C5', '#FFE082', '#A8E6CF', '#90CAF9', '#C5B3E6', '#FFAB91', '#4140FF']
}) => {
  const pieces = useRef(null);
  if (!pieces.current) {
    const rng = mulberry32(Date.now() & 0xffffffff);
    pieces.current = Array.from({
      length: count
    }, (_, i) => ({
      left: rng() * 100,
      delay: rng() * 0.6,
      duration: 1.6 + rng() * 1.4,
      bg: palette[Math.floor(rng() * palette.length)],
      rot: Math.floor(rng() * 360),
      drift: (rng() - 0.5) * 80,
      size: 6 + rng() * 6
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "pointer-events-none absolute inset-0 overflow-hidden z-0",
    "aria-hidden": "true"
  }, pieces.current.map((c, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "confetti-piece",
    style: {
      left: `${c.left}%`,
      width: c.size,
      height: c.size * 0.4,
      background: c.bg,
      transform: `rotate(${c.rot}deg)`,
      animationDelay: `${c.delay}s`,
      animationDuration: `${c.duration}s`,
      '--drift': `${c.drift}px`
    }
  })));
};

/* ==========================================================================
   LEADERBOARD
   ========================================================================== */

const MOCK_LEADERBOARD = [{
  name: 'burnt_toast',
  color: '#FFAB91',
  pts: 287
}, {
  name: 'rainbow_gwei',
  color: '#C5B3E6',
  pts: 264
}, {
  name: 'noodle_lady',
  color: '#FFB7C5',
  pts: 241
}, {
  name: 'pranksy',
  color: '#FFE082',
  pts: 228
}, {
  name: 'doodle_fan23',
  color: '#A8E6CF',
  pts: 212
}, {
  name: 'pixel_pusher',
  color: '#90CAF9',
  pts: 198
}, {
  name: 'nft_collector',
  color: '#FFB7C5',
  pts: 187
}, {
  name: 'crypto_kid',
  color: '#FFAB91',
  pts: 174
}, {
  name: 'seed_phrase',
  color: '#C5B3E6',
  pts: 162
}, {
  name: 'wagmi_always',
  color: '#FFE082',
  pts: 151
}, {
  name: 'ngmi_sometimes',
  color: '#A8E6CF',
  pts: 144
}, {
  name: 'gm_frens',
  color: '#90CAF9',
  pts: 132
}, {
  name: 'diamond_hands',
  color: '#FFB7C5',
  pts: 120
}, {
  name: 'paper_hands',
  color: '#FFAB91',
  pts: 108
}, {
  name: 'floor_sweeper',
  color: '#C5B3E6',
  pts: 95
}];
const LeaderboardScreen = ({
  profile,
  weekPts
}) => {
  const [tab, setTab] = useState('this');
  const [serverRows, setServerRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchKey, setFetchKey] = useState(0);
  const [weekNum, setWeekNum] = useState(() => getWeekNumber());
  const api = typeof window !== 'undefined' ? window.DON_API : null;

  // Expose refetch so admin reset can trigger it
  const refetchBoard = () => setFetchKey(k => k + 1);
  useEffect(() => { window._refetchLeaderboard = refetchBoard; return () => { delete window._refetchLeaderboard; }; }, []);

  useEffect(() => {
    if (!api) { setLoading(false); return; }
    setLoading(true);
    api.leaderboard(tab === 'last' ? 'lastweekly' : 'weekly', 50)
      .then(data => {
        if (data && Array.isArray(data.rows)) setServerRows(data.rows);
        else setServerRows([]);
        if (data && data.weekNumber) setWeekNum(data.weekNumber);
      })
      .catch(() => setServerRows([]))
      .finally(() => setLoading(false));
  }, [tab, fetchKey]);

  // Build board from server data only (no mock data)
  const baseBoard = (serverRows || []).map(r => ({
    name: r.username,
    color: r.avatarColor || '#C5B3E6',
    avatar: r.avatarData || null,
    pts: r.points,
    me: r.username === profile.name
  }));
  // Always ensure current user is on the board (only for current week)
  const alreadyOnBoard = baseBoard.some(r => r.me);
  if (!alreadyOnBoard && tab === 'this') {
    baseBoard.push({
      name: profile.name,
      color: profile.color,
      pts: weekPts,
      avatar: profile.avatar,
      me: true
    });
  }
  const merged = baseBoard.sort((a, b) => b.pts - a.pts);

  // Empty state: nobody has points this period
  const totalPts = merged.reduce((s, r) => s + r.pts, 0);
  if (!loading && totalPts === 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: "px-4 pt-6 pb-nav max-w-[480px] lg:max-w-[1400px] lg:px-8 mx-auto scroll-momentum"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-center gap-2 mb-1"
    }, /*#__PURE__*/React.createElement(TrophyIcon, {
      size: 28
    }), /*#__PURE__*/React.createElement("h1", {
      className: "font-display font-semibold text-3xl",
      style: { color: 'var(--c-text)' }
    }, "Leaderboard")), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-center mb-5",
      style: { color: 'var(--c-text-sub)' }
    }, "Week ", weekNum, " \xB7 Mon\u2013Sun \xB7 resets Monday 00:00 UTC"), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2 mb-5 justify-center"
    }, /*#__PURE__*/React.createElement(Pill, {
      active: tab === 'this',
      onClick: () => setTab('this')
    }, "This week"), /*#__PURE__*/React.createElement(Pill, {
      active: tab === 'last',
      onClick: () => setTab('last')
    }, "Last week")), /*#__PURE__*/React.createElement(FrostedCard, {
      className: "p-8 text-center anim-pop-in"
    }, /*#__PURE__*/React.createElement(EmptyState, {
      title: tab === 'last' ? "No scores from last week" : "No scores yet this week",
      subtitle: tab === 'last' ? "Check back after this week ends!" : "Play a round to get on the board!"
    })));
  }
  const myRank = merged.findIndex(r => r.me) + 1;
  const top3 = merged.slice(0, 3);
  const rest = merged.slice(3, 20);

  // Podium layout order: [2nd, 1st, 3rd]
  const podium = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const heights = top3.length >= 3 ? ['h-20', 'h-28', 'h-16'] : ['h-24'];
  const medals = top3.length >= 3 ? [2, 1, 3] : [1, 2, 3];
  const medalTint = {
    1: '#FFE082',
    2: '#E0E0E8',
    3: '#FFAB91'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 pt-6 pb-nav max-w-[480px] lg:max-w-[1400px] lg:px-8 mx-auto scroll-momentum"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center gap-2 mb-1"
  }, /*#__PURE__*/React.createElement(TrophyIcon, {
    size: 28
  }), /*#__PURE__*/React.createElement("h1", {
    className: "font-display font-semibold text-3xl",
    style: {
      color: 'var(--c-text)'
    }
  }, "Leaderboard")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-center mb-5",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "Week ", weekNum, " \xB7 Mon\u2013Sun \xB7 resets Monday 00:00 UTC"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mb-5 justify-center"
  }, /*#__PURE__*/React.createElement(Pill, {
    active: tab === 'this',
    onClick: () => setTab('this')
  }, "This week"), /*#__PURE__*/React.createElement(Pill, {
    active: tab === 'last',
    onClick: () => setTab('last')
  }, "Last week")), /*#__PURE__*/React.createElement(FrostedCard, {
    className: "p-5 mb-5 anim-pop-in"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-end justify-center gap-3"
  }, podium.map((row, idx) => {
    if (!row) return null;
    const m = medals[idx];
    const h = heights[idx] || 'h-20';
    const isMe = row.me;
    return /*#__PURE__*/React.createElement("div", {
      key: m,
      className: "flex-1 flex flex-col items-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "mb-2 relative"
    }, m === 1 && /*#__PURE__*/React.createElement("div", {
      className: "absolute -top-5 left-1/2 -translate-x-1/2 anim-crown-bob"
    }, /*#__PURE__*/React.createElement(CrownIcon, {
      size: 26
    })), /*#__PURE__*/React.createElement(ProfileAvatar, {
      profile: row,
      size: m === 1 ? 64 : 52,
      animated: m === 1
    })), /*#__PURE__*/React.createElement("div", {
      className: "font-semibold text-xs truncate max-w-full text-center",
      style: {
        color: 'var(--c-text)'
      }
    }, "@", row.name, isMe ? ' (you)' : ''), /*#__PURE__*/React.createElement("div", {
      className: "font-display font-semibold text-base tabular-nums",
      style: {
        color: 'var(--c-accent)'
      }
    }, /*#__PURE__*/React.createElement(CountUp, {
      value: row.pts,
      duration: 900 + m * 200
    })), /*#__PURE__*/React.createElement("div", {
      className: `w-full mt-2 rounded-t-xl flex items-start justify-center pt-2 ${h} podium-col`,
      style: {
        background: `linear-gradient(180deg, ${medalTint[m]}ee, ${medalTint[m]}66)`,
        border: `2px solid ${STROKE}`,
        borderBottom: 'none',
        animationDelay: `${0.1 + idx * 0.1}s`
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs",
      style: {
        background: 'var(--c-card-solid)',
        border: `2px solid ${STROKE}`,
        color: STROKE
      }
    }, m)));
  }))), /*#__PURE__*/React.createElement(FrostedCard, {
    className: "p-2"
  }, rest.map((row, i) => {
    const rank = i + 4;
    const isMe = row.me;
    return /*#__PURE__*/React.createElement("div", {
      key: row.name + i,
      className: "flex items-center gap-3 p-3 rounded-xl mb-1 transition-all hover-lift anim-fade-in",
      style: {
        background: isMe ? 'rgba(65,64,255,0.08)' : 'transparent',
        animationDelay: `${0.02 * i}s`
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-8 flex items-center justify-center"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-bold text-sm tabular-nums",
      style: {
        color: 'var(--c-text-sub)'
      }
    }, rank)), /*#__PURE__*/React.createElement(ProfileAvatar, {
      profile: row,
      size: 28,
      animated: false
    }), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 font-semibold text-sm",
      style: {
        color: 'var(--c-text)'
      }
    }, isMe ? `@${row.name} (you)` : `@${row.name}`), /*#__PURE__*/React.createElement("div", {
      className: "font-display font-semibold tabular-nums",
      style: {
        color: 'var(--c-accent)'
      }
    }, row.pts));
  }), myRank > 20 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-center py-2 text-xs",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "\xB7 \xB7 \xB7"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 p-3 rounded-xl",
    style: {
      background: 'rgba(65,64,255,0.08)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 text-center font-bold text-sm",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, myRank), /*#__PURE__*/React.createElement(ProfileAvatar, {
    profile: profile,
    size: 28,
    animated: false
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 font-semibold text-sm",
    style: {
      color: 'var(--c-text)'
    }
  }, "@", profile.name, " (you)"), /*#__PURE__*/React.createElement("div", {
    className: "font-bold tabular-nums",
    style: {
      color: 'var(--c-accent)'
    }
  }, weekPts)))));
};

/* ==========================================================================
   PROFILE SCREEN
   ========================================================================== */

const ProfileScreen = ({
  profile,
  stats,
  streak = 0,
  achievements = [],
  onEdit,
  onLogout,
  onDelete,
  onOpenDex,
  onOpenAdmin
}) => {
  const dexIds = getDex(profile.name.toLowerCase());
  const [confirmDelete, setConfirmDelete] = useState(false);
  // 8 weeks of fake history scaled against current performance
  const history = useRef(null);
  if (!history.current) {
    const rng = mulberry32(hashCode(profile.name));
    history.current = Array.from({
      length: 8
    }, (_, i) => ({
      week: `W${i + 1}`,
      pts: Math.floor(20 + rng() * 180)
    }));
    history.current[7].pts = stats.weekPts || 0;
  }
  const maxPts = Math.max(...history.current.map(h => h.pts), 50);
  const statCards = [{
    label: 'Total points',
    value: stats.totalPts,
    icon: /*#__PURE__*/React.createElement(CrownIcon, {
      size: 24
    }),
    tint: '#FFECE0'
  }, {
    label: 'Games played',
    value: stats.gamesPlayed,
    icon: /*#__PURE__*/React.createElement(WheelIcon, {
      size: 24
    }),
    tint: '#E0F5EC'
  }, {
    label: 'Best week',
    value: stats.bestWeek,
    icon: /*#__PURE__*/React.createElement(RainbowIcon, {
      size: 24
    }),
    tint: '#E8D5F5'
  }, {
    label: 'This week',
    value: stats.weekPts,
    icon: /*#__PURE__*/React.createElement(ShootingStarIcon, {
      size: 24
    }),
    tint: '#FFF4E0'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 pt-6 pb-nav max-w-[480px] lg:max-w-[1400px] lg:px-8 mx-auto scroll-momentum"
  }, /*#__PURE__*/React.createElement(FrostedCard, {
    className: "p-6 mb-5 text-center relative overflow-hidden anim-float-in",
    style: {
      background: `${profile.color}40`,
      animationDelay: '0.05s'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center mb-3"
  }, /*#__PURE__*/React.createElement(ProfileAvatar, {
    profile: profile,
    size: 84
  })), /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-2xl",
    style: {
      color: 'var(--c-text)'
    }
  }, "@", profile.name), /*#__PURE__*/React.createElement("p", {
    className: "text-xs mt-1",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "Joined ", new Date(profile.joined).toLocaleDateString()), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex items-center justify-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement(SoftButton, {
    onClick: onEdit
  }, "Edit profile"), onLogout && /*#__PURE__*/React.createElement(SoftButton, {
    onClick: onLogout
  }, "Log out"), onOpenAdmin && /*#__PURE__*/React.createElement("button", {
    onClick: onOpenAdmin,
    className: "rounded-full px-4 py-2 text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-transform",
    style: {
      background: 'linear-gradient(135deg,#4140FF,#C5B3E6)',
      color: '#fff',
      border: '2px solid var(--c-text)',
      boxShadow: '0 4px 14px rgba(65,64,255,0.35)'
    }
  }, /*#__PURE__*/React.createElement(CrownIcon, {
    size: 16
  }), " Admin menu")), (() => {
    const lvl = levelFromXp(xpFromPoints(stats.totalPts || 0));
    const tier = tierFromLevel(lvl.level);
    return /*#__PURE__*/React.createElement("div", {
      className: "mt-5 text-left"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-1.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] font-bold tracking-[0.15em] uppercase",
      style: {
        color: 'var(--c-text-sub)'
      }
    }, t('level')), /*#__PURE__*/React.createElement("span", {
      className: "font-display font-semibold text-xl tabular-nums",
      style: {
        color: 'var(--c-text)'
      }
    }, lvl.level), /*#__PURE__*/React.createElement("span", {
      className: "rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center gap-1",
      style: {
        background: `${tier.color}aa`,
        border: '1px solid var(--c-border)',
        color: 'var(--c-text)'
      }
    }, /*#__PURE__*/React.createElement("span", null, tier.icon), tier.name)), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] font-semibold tabular-nums",
      style: {
        color: 'var(--c-text-sub)'
      }
    }, lvl.into, " / ", lvl.need, " XP")), /*#__PURE__*/React.createElement("div", {
      className: "w-full h-2.5 rounded-full overflow-hidden",
      style: {
        background: 'var(--c-stat-bg)',
        border: '1px solid var(--c-border)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "h-full rounded-full transition-all",
      style: {
        width: `${lvl.pct}%`,
        background: 'linear-gradient(90deg,#FFB7C5,#FFE082,#A8E6CF,#90CAF9,#C5B3E6)',
        backgroundSize: '200% 100%',
        animation: 'degosUnderline 4s linear infinite'
      }
    })));
  })()), /*#__PURE__*/React.createElement(FrostedCard, {
    className: "p-4 mb-5 flex items-center justify-between anim-float-in",
    style: {
      animationDelay: '0.08s'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "\uD83D\uDD25"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-bold tracking-[0.15em] uppercase",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "Current streak"), /*#__PURE__*/React.createElement("p", {
    className: "font-display font-semibold text-xl",
    style: {
      color: 'var(--c-text)'
    }
  }, streak, " day", streak === 1 ? '' : 's'))), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px]",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, streak === 0 ? 'Play today to start one.' : 'Play every day to keep it alive.')), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3 mb-5"
  }, statCards.map((s, i) => /*#__PURE__*/React.createElement(FrostedCard, {
    key: s.label,
    className: "p-4 anim-pop-in hover-lift",
    style: {
      background: `${s.tint}cc`,
      animationDelay: `${0.12 + i * 0.08}s`
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-2"
  }, s.icon), /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-2xl tabular-nums",
    style: {
      color: 'var(--c-text)'
    }
  }, /*#__PURE__*/React.createElement(CountUp, {
    value: s.value || 0
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-xs",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, s.label)))), /*#__PURE__*/React.createElement(FrostedCard, {
    className: "p-5 mb-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-4"
  }, /*#__PURE__*/React.createElement(SparkleIcon, {
    size: 20,
    fill: "#FFE082"
  }), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold",
    style: {
      color: 'var(--c-text)'
    }
  }, "Weekly points")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-end justify-between gap-2 h-32"
  }, history.current.map((h, i) => /*#__PURE__*/React.createElement("div", {
    key: h.week,
    className: "flex-1 flex flex-col items-center gap-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full rounded-t-lg transition-all",
    style: {
      background: ['#FFB7C5', '#FFAB91', '#FFE082', '#A8E6CF', '#90CAF9', '#C5B3E6', '#FFB7C5', '#FFE082'][i],
      height: `${Math.max(6, h.pts / maxPts * 100)}%`,
      border: `2px solid ${STROKE}`,
      borderBottom: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] font-semibold",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, h.week))))), /*#__PURE__*/React.createElement(FrostedCard, {
    className: "p-5 mb-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(CrownIcon, {
    size: 20
  }), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold",
    style: {
      color: 'var(--c-text)'
    }
  }, "Achievements")), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-semibold tabular-nums",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, achievements.length, " / ", ACHIEVEMENTS.length)), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, ACHIEVEMENTS.map(a => {
    const unlocked = achievements.includes(a.id);
    const prog = unlocked ? 1 : achievementProgress(a.id, {
      stats,
      streak: {
        count: streak
      },
      progress: {},
      dexCount: dexIds.length
    });
    return /*#__PURE__*/React.createElement("div", {
      key: a.id,
      className: "rounded-xl p-2.5 transition-all",
      style: {
        background: unlocked ? `${a.tint}cc` : 'var(--c-stat-bg)',
        border: `1.5px solid ${unlocked ? STROKE : 'var(--c-border)'}`,
        opacity: unlocked ? 1 : 0.8,
        filter: unlocked ? 'none' : 'grayscale(0.45)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2.5 mb-1.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-9 h-9 rounded-lg shrink-0 flex items-center justify-center",
      style: {
        background: unlocked ? 'var(--c-result-bg)' : 'var(--c-pill-inactive)',
        border: `1px solid ${unlocked ? STROKE : 'var(--c-border)'}`
      }
    }, /*#__PURE__*/React.createElement(CrownIcon, {
      size: 18
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-xs font-bold truncate",
      style: {
        color: 'var(--c-text)'
      }
    }, a.name), /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] truncate",
      style: {
        color: 'var(--c-text-sub)'
      }
    }, a.desc))), !unlocked && /*#__PURE__*/React.createElement("div", {
      className: "w-full h-1 rounded-full overflow-hidden",
      style: {
        background: 'var(--c-stat-bg)',
        border: '1px solid var(--c-border)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "h-full",
      style: {
        width: `${Math.round(prog * 100)}%`,
        background: a.tint
      }
    })));
  }))), /*#__PURE__*/React.createElement(FrostedCard, {
    className: "p-5 mb-5 cursor-pointer hover-lift",
    onClick: onOpenDex
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(SparkleIcon, {
    size: 20,
    fill: "#C5B3E6"
  }), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold",
    style: {
      color: 'var(--c-text)'
    }
  }, "Doodle Dex")), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-semibold tabular-nums",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, dexIds.length, " / ", DOODLES.length)), /*#__PURE__*/React.createElement("div", {
    className: "w-full h-2 rounded-full overflow-hidden mb-3",
    style: {
      background: 'var(--c-stat-bg)',
      border: '1px solid var(--c-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full",
    style: {
      width: `${Math.min(100, dexIds.length / DOODLES.length * 100)}%`,
      background: 'linear-gradient(90deg,#C5B3E6,#90CAF9,#A8E6CF)'
    }
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px]",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, dexIds.length === 0 ? 'No Doodles seen yet. Play a round to start collecting.' : 'Tap to open your codex and browse every Doodle you\'ve met.')), /*#__PURE__*/React.createElement(WeeklyReading, {
    username: profile.name,
    stats: stats,
    streak: streak,
    achievements: achievements,
    dexCount: dexIds.length
  }), /*#__PURE__*/React.createElement(FrostedCard, {
    className: "p-5 mb-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement(MagnifierIcon, {
    size: 20
  }), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold",
    style: {
      color: 'var(--c-text)'
    }
  }, "How to play")), /*#__PURE__*/React.createElement("ul", {
    className: "text-sm space-y-2",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, /*#__PURE__*/React.createElement("li", null, "\xB7 Three game modes unlock every day at midnight UTC."), /*#__PURE__*/React.createElement("li", null, "\xB7 Everyone plays the same daily challenges \u2014 same seed, fair leaderboard."), /*#__PURE__*/React.createElement("li", null, "\xB7 Weekly leaderboard resets every Monday 00:00 UTC."), /*#__PURE__*/React.createElement("li", null, "\xB7 Keep a daily streak \u2014 skipping a day resets it."))), onDelete && /*#__PURE__*/React.createElement(FrostedCard, {
    className: "p-5 mb-2",
    style: {
      background: 'rgba(229,115,115,0.08)',
      borderColor: 'rgba(229,115,115,0.25)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold mb-1",
    style: {
      color: '#B94A4A'
    }
  }, "Danger zone"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs mb-3",
    style: {
      color: 'var(--c-text-sub)'
    }
  }, "Deletes this account and all local progress. Can't be undone."), confirmDelete ? /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onDelete,
    className: "rounded-xl px-4 py-2 font-bold text-sm",
    style: {
      background: '#E57373',
      color: '#fff'
    }
  }, "Yes, delete my account"), /*#__PURE__*/React.createElement(SoftButton, {
    onClick: () => setConfirmDelete(false)
  }, "Cancel")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setConfirmDelete(true),
    className: "rounded-xl px-4 py-2 font-bold text-sm",
    style: {
      background: 'rgba(229,115,115,0.14)',
      color: '#B94A4A',
      border: '1px solid rgba(229,115,115,0.3)'
    }
  }, "Delete account")));
};

/* ==========================================================================
   BOTTOM NAV
   ========================================================================== */

const BottomNav = ({
  tab,
  onTab
}) => {
  const items = [{
    id: 'home',
    label: t('play'),
    icon: a => /*#__PURE__*/React.createElement(StarNavIcon, {
      size: 24,
      fill: a ? '#A8E6CF' : 'var(--c-stat-bg)'
    })
  }, {
    id: 'run',
    label: 'RUN',
    icon: a => /*#__PURE__*/React.createElement(window.RunShoeIcon || 'span', {
      size: 24,
      active: a
    })
  }, {
    id: 'board',
    label: t('ranks'),
    icon: a => /*#__PURE__*/React.createElement(TrophyIcon, {
      size: 24
    })
  }, {
    id: 'profile',
    label: t('profile'),
    icon: a => /*#__PURE__*/React.createElement(FaceIcon, {
      size: 24,
      fill: a ? '#FFAB91' : 'var(--c-stat-bg)'
    })
  }];
  const idx = Math.max(0, items.findIndex(it => it.id === tab));
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed bottom-0 inset-x-0 pt-2 px-4 z-20 flex justify-center gpu",
    style: {
      paddingBottom: 'max(16px, calc(env(safe-area-inset-bottom) + 8px))'
    }
  }, /*#__PURE__*/React.createElement(FrostedCard, {
    className: "relative flex gap-1 p-1.5 w-full max-w-sm lg:max-w-md"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nav-indicator",
    style: {
      left: `calc(${idx * 25}% + 6px)`
    }
  }), items.map(it => {
    const active = tab === it.id;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      onClick: () => onTab(it.id),
      className: "relative z-[1] flex-1 flex flex-col items-center gap-0.5 py-2 lg:py-2.5 rounded-xl transition-transform active:scale-95"
    }, /*#__PURE__*/React.createElement("div", {
      className: "transition-transform",
      style: {
        transform: active ? 'translateY(-1px) scale(1.05)' : 'none'
      }
    }, it.icon(active)), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] lg:text-xs font-bold tracking-wider uppercase",
      style: {
        color: active ? 'var(--c-accent)' : 'var(--c-text-sub)'
      }
    }, it.label));
  })));
};

/* ==========================================================================
   MAIN APP
   ========================================================================== */

function DoodleOrNot() {
  // ---- SESSION ----
  const [session, setSessionState] = useState(() => getSession());
  const username = session?.username || null;

  // ---- CURRENT USER (profile) ----
  const [profile, setProfile] = useState(() => {
    if (!username) return null;
    const users = getUsers();
    const p = users[username] || null;
    // Sanitize: avatar must be a valid data URL or http URL, otherwise null
    if (p && p.avatar && typeof p.avatar === 'string'
        && !p.avatar.startsWith('data:') && !p.avatar.startsWith('http')) {
      p.avatar = null;
      users[username] = p;
      saveUsers(users);
    }
    return p;
  });
  const [adminMode, setAdminMode] = useState(() => !!(profile && profile.isAdmin));
  const [tab, setTab] = useState('home');
  const [mode, setMode] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  // ---- PER-USER DATA ----
  const today = todayStr();
  const [progress, setProgress] = useState(() => username ? storage.get(userProgressKey(username, today), {
    guess: false,
    price: false,
    trait: false
  }) : {
    guess: false,
    price: false,
    trait: false
  });
  const [stats, setStats] = useState(() => username ? storage.get(userStatsKey(username), {
    totalPts: 0,
    gamesPlayed: 0,
    bestWeek: 0,
    weekPts: 0,
    weekKey: getWeekKey()
  }) : {
    totalPts: 0,
    gamesPlayed: 0,
    bestWeek: 0,
    weekPts: 0,
    weekKey: getWeekKey()
  });
  const [streak, setStreakState] = useState(() => username ? storage.get(userStreakKey(username), {
    count: 0,
    lastDate: null
  }) : {
    count: 0,
    lastDate: null
  });
  const [achievements, setAchievements] = useState(() => username ? storage.get(userAchvKey(username), []) : []);
  const [toasts, setToasts] = useState([]);
  const [editing, setEditing] = useState(false);

  // ---- Preferences + modal state ----
  const [prefs, setPrefsState] = useState(() => getPrefs());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dexOpen, setDexOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [leaguesOpen, setLeaguesOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePayload, setSharePayload] = useState(null);
  const [detailDoodle, setDetailDoodle] = useState(null);
  const [recapOpen, setRecapOpen] = useState(false);
  const [recapData, setRecapData] = useState(null);
  const [installable, setInstallable] = useState(false);
  const [challengeSeed, setChallengeSeed] = useState(() => readChallengeSeed());
  const [wipeTrigger, setWipeTrigger] = useState(0);
  const [prevLevel, setPrevLevel] = useState(() => levelFromXp(xpFromPoints(username ? storage.get(userStatsKey(username), {
    totalPts: 0
  }).totalPts || 0 : 0)).level);

  // Apply prefs: propagate to Sound/Haptics + CSS root + dark mode
  useEffect(() => {
    Sound.setEnabled && Sound.setEnabled(prefs.sound);
    Haptics.setEnabled && Haptics.setEnabled(prefs.haptics);
    setPrefs(prefs);
    // Sync preferences to server DB
    const api = typeof window !== 'undefined' ? window.DON_API : null;
    if (api && username) {
      api.updatePreferences({
        darkMode: prefs.darkMode || 'auto',
        sound: !!prefs.sound,
        haptics: !!prefs.haptics,
        lang: prefs.lang || 'en'
      }).catch(() => {});
    }
    if (typeof document !== 'undefined') {
      document.documentElement.style.fontSize = `${16 * (prefs.fontScale || 1)}px`;
      document.documentElement.dataset.reducedMotion = prefs.reducedMotion ? '1' : '0';
      const mode = prefs.darkMode || 'auto';
      if (mode === 'dark') document.documentElement.dataset.theme = 'dark';else if (mode === 'light') document.documentElement.dataset.theme = 'light';else document.documentElement.dataset.theme = '';
    }
  }, [prefs]);

  // PWA install prompt availability
  useEffect(() => {
    const h = () => setInstallable(true);
    window.addEventListener('don:installable', h);
    return () => window.removeEventListener('don:installable', h);
  }, []);

  // ---- Server session auto-hydration (httpOnly cookie → state) ----
  useEffect(() => {
    if (session) return;
    const api = typeof window !== 'undefined' ? window.DON_API : null;
    if (!api) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.me();
        if (cancelled || !data || !data.username) return;
        const u = data;
        const uname = u.username.toLowerCase();
        // Mirror profile locally so the rest of the app sees it.
        const users = getUsers();
        const existing = users[uname] || {};
        const existingAvatar = existing.avatar && typeof existing.avatar === 'string'
          && existing.avatar.startsWith('data:') ? existing.avatar : null;
        const hydrated = {
          ...existing,
          name: uname,
          color: u.avatarColor || existing.color || '#C5B3E6',
          avatar: u.avatarData || existingAvatar,
          faceShape: u.faceShape || existing.faceShape || 'round',
          joined: existing.joined || Date.now(),
          isAdmin: !!existing.isAdmin,
          serverId: u.id
        };
        users[uname] = hydrated;
        storage.set('don:users', users);
        if (data.stats) storage.set(userStatsKey(uname), {
          totalPts: data.stats.totalPoints || 0,
          gamesPlayed: data.stats.totalGames || 0,
          bestWeek: data.stats.bestWeek || 0,
          weekPts: data.stats.weekPoints || 0,
          weekKey: getWeekKey()
        });
        if (data.streak) storage.set(userStreakKey(uname), {
          count: data.streak.currentStreak || 0,
          lastDate: data.streak.lastPlayedDay || null
        });
        if (Array.isArray(data.achievements)) storage.set(userAchvKey(uname), data.achievements);
        if (Array.isArray(data.dex)) storage.set(userDexKey(uname), data.dex);
        const sess = {
          username: uname,
          remember: true
        };
        setSession(sess);
        setSessionState(sess);
        setProfile(hydrated);
        // Sync React state from hydrated localStorage so UI reflects server data
        setStats(storage.get(userStatsKey(uname), { totalPts: 0, gamesPlayed: 0, bestWeek: 0, weekPts: 0, weekKey: getWeekKey() }));
        setStreakState(storage.get(userStreakKey(uname), { count: 0, lastDate: null }));
        setAchievements(storage.get(userAchvKey(uname), []));
        setProgress(storage.get(userProgressKey(uname, todayStr()), { guess: false, price: false, trait: false }));
      } catch (_) {/* not logged in or offline — stay on auth screen */}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Daily recap — show once per day on first visit
  useEffect(() => {
    if (!username) return;
    const rec = getLastRecap(username);
    if (rec.lastShown === today) return;
    // Was there activity yesterday?
    const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const yProgress = storage.get(userProgressKey(username, yest), null);
    if (!yProgress) {
      setLastRecap(username, {
        lastShown: today,
        snapshot: null
      });
      return;
    }
    const doneCount = Object.values(yProgress).filter(Boolean).length;
    if (doneCount === 0) {
      setLastRecap(username, {
        lastShown: today,
        snapshot: null
      });
      return;
    }
    setRecapData({
      pts: stats.weekPts || 0,
      weekPts: stats.weekPts || 0,
      streak: streak.count || 0
    });
    setRecapOpen(true);
    setLastRecap(username, {
      lastShown: today,
      snapshot: {
        doneCount
      }
    });
  }, [username]);

  // Keyboard: '?' overlay + Esc close + 'M' mute
  useEffect(() => {
    const onKey = e => {
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen(v => !v);
      } else if (e.key === 'Escape') {
        setShortcutsOpen(false);
        setSettingsOpen(false);
        setDexOpen(false);
        setLeaguesOpen(false);
        setShareOpen(false);
        setDetailDoodle(null);
        setRecapOpen(false);
      } else if (e.key === 'm' || e.key === 'M') {
        setPrefsState(p => ({
          ...p,
          sound: !p.sound
        }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Water-wipe on tab/mode change
  useEffect(() => {
    setWipeTrigger(x => x + 1);
  }, [tab, mode, lastResult, adminMode, editing]);

  // Notifications toggle handler
  const onNotifToggle = async v => {
    if (!v) {
      setPrefsState(p => ({
        ...p,
        notifications: false
      }));
      return;
    }
    const res = await requestNotifPermission();
    if (res === 'granted') {
      setPrefsState(p => ({
        ...p,
        notifications: true
      }));
      scheduleDailyReminder();
    } else {
      setPrefsState(p => ({
        ...p,
        notifications: false
      }));
    }
  };

  // Onboarding gate after login
  useEffect(() => {
    if (!username || profile && profile.isAdmin) {
      setShowOnboarding(false);
      return;
    }
    const done = storage.get(userOnboardedKey(username), false);
    setShowOnboarding(!done);
  }, [username, !!(profile && profile.isAdmin)]);
  const completeOnboarding = () => {
    if (username) storage.set(userOnboardedKey(username), true);
    setShowOnboarding(false);
  };
  const wipeLocalData = () => {
    try {
      const keepKeys = ['don:users', 'don:session'];
      const toDel = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('don:') && !keepKeys.includes(k)) toDel.push(k);
      }
      toDel.forEach(k => localStorage.removeItem(k));
    } catch {}
    setPrefsState({
      ...DEFAULT_PREFS
    });
    setSettingsOpen(false);
    window.location.reload();
  };

  // Reset week if new week (per user)
  useEffect(() => {
    if (!username) return;
    const wk = getWeekKey();
    if (stats.weekKey !== wk) {
      const newStats = {
        ...stats,
        weekKey: wk,
        weekPts: 0,
        bestWeek: Math.max(stats.bestWeek, stats.weekPts)
      };
      setStats(newStats);
      storage.set(userStatsKey(username), newStats);
    }
  }, [username]);
  const handleAuth = user => {
    const users = getUsers();
    const key = user.name.toLowerCase();
    const u = users[key] || user;
    setProfile(u);
    setSessionState(getSession());
    setAdminMode(!!u.isAdmin);
    // Hydrate per-user state
    setProgress(storage.get(userProgressKey(key, today), {
      guess: false,
      price: false,
      trait: false
    }));
    setStats(storage.get(userStatsKey(key), {
      totalPts: 0,
      gamesPlayed: 0,
      bestWeek: 0,
      weekPts: 0,
      weekKey: getWeekKey()
    }));
    setStreakState(storage.get(userStreakKey(key), {
      count: 0,
      lastDate: null
    }));
    setAchievements(storage.get(userAchvKey(key), []));
    setTab('home');
    setMode(null);
    setLastResult(null);
  };
  const handleLogout = () => {
    // Clear server httpOnly cookie first
    if (window.DON_API && window.DON_API.logout) {
      window.DON_API.logout().catch(() => {});
    }
    setSession(null);
    setSessionState(null);
    setProfile(null);
    setAdminMode(false);
    setTab('home');
    setMode(null);
    setLastResult(null);
  };
  const handleDeleteAccount = () => {
    if (!username || !profile || profile.isAdmin) return;
    wipeUserData(username);
    handleLogout();
  };
  const updateProfile = patch => {
    if (!username) return;
    const users = getUsers();
    const u = {
      ...(users[username] || {}),
      ...patch
    };
    users[username] = u;
    saveUsers(users);
    setProfile(u);
    // Persist avatar + color to server DB
    const api = window.DON_API;
    if (api) {
      const serverPatch = {};
      if (patch.color) serverPatch.avatarColor = patch.color;
      if (patch.avatar !== undefined) serverPatch.avatarData = patch.avatar; // data URL or null
      if (Object.keys(serverPatch).length > 0) {
        api.updateMe(serverPatch).catch(() => {}); // fire-and-forget
      }
    }
  };
  const finishMode = result => {
    if (!username) return;
    // Clutch bonus: no "wrong" or "down" icons, and at least 3 rounds played.
    const badIcons = new Set(['wrong', 'down', 'skip']);
    const clean = Array.isArray(result.icons) && result.icons.length >= 3 && !result.icons.some(i => badIcons.has(i));
    if (clean) {
      result = {
        ...result,
        points: (result.points || 0) + 2,
        clutch: true
      };
    }
    const prevProgress = progress;
    const newProgress = {
      ...prevProgress,
      [result.mode]: true
    };
    setProgress(newProgress);
    storage.set(userProgressKey(username, today), newProgress);
    const prevWeek = stats.weekPts;
    const newStats = {
      ...stats,
      totalPts: stats.totalPts + result.points,
      gamesPlayed: stats.gamesPlayed + 1,
      weekPts: stats.weekPts + result.points,
      bestWeek: Math.max(stats.bestWeek, stats.weekPts + result.points)
    };
    setStats(newStats);
    storage.set(userStatsKey(username), newStats);

    // ---- Streak update: bump on first completion of the day ----
    let newStreak = streak;
    const wasAnyDoneBefore = Object.values(prevProgress).some(Boolean);
    if (!wasAnyDoneBefore) {
      const last = streak.lastDate;
      if (last === today) {
        // already counted today
      } else {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const nextCount = last === yesterday ? streak.count + 1 : 1;
        newStreak = {
          count: nextCount,
          lastDate: today
        };
        setStreakState(newStreak);
        storage.set(userStreakKey(username), newStreak);
      }
    }

    // ---- Achievements ----
    const {
      all,
      newly
    } = checkAchievements({
      prev: achievements,
      mode: result.mode,
      points: result.points,
      icons: result.icons,
      clutch: result.clutch,
      newStats,
      newProgress,
      newStreak
    });
    if (newly.length > 0) {
      setAchievements(all);
      storage.set(userAchvKey(username), all);
      const stamped = newly.map(id => ({
        id,
        key: id + ':' + Date.now() + Math.random()
      }));
      setToasts(prev => [...prev, ...stamped]);
      Sound.shimmer && Sound.shimmer();
      // Server sync — fire-and-forget
      try {
        window.DON_API && window.DON_API.achievementsUnlock(newly);
      } catch (_) {}
    }

    // ---- Server sync: save progress, dex entries, streak updates ----
    try {
      if (window.DON_API) {
        const apiMode = result.mode === 'guess' ? 'higher' : result.mode === 'price' ? 'rarity' : 'trait';
        window.DON_API.saveProgress({
          mode: apiMode,
          points: result.points,
          icons: result.icons || [],
          clutch: !!result.clutch,
          day: today
        }).catch(() => {});
        if (Array.isArray(result.doodleIds) && result.doodleIds.length) {
          window.DON_API.dexAdd(result.doodleIds).catch(() => {});
        }
      }
    } catch (_) {}

    // Level-up detection
    const newLevel = levelFromXp(xpFromPoints(newStats.totalPts)).level;
    if (newLevel > prevLevel) {
      Sound.levelUp && Sound.levelUp();
      Haptics.buzz && Haptics.buzz([14, 60, 14]);
      setPrevLevel(newLevel);
    }
    setLastResult(result);
  };
  const dismissToast = key => setToasts(prev => prev.filter(t => t.key !== key));
  const seedBase = challengeSeed != null ? challengeSeed : hashCode(today + 'doodleornot');

  // ---- NOT LOGGED IN ----
  if (!profile) {
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-app font-sans",
      style: {
        fontFamily: "'Fredoka', sans-serif"
      }
    }, /*#__PURE__*/React.createElement(FontLoader, null), /*#__PURE__*/React.createElement(SkyBackground, null), /*#__PURE__*/React.createElement(AuthScreen, {
      onAuth: handleAuth
    }), /*#__PURE__*/React.createElement(FooterSignature, null));
  }

  // ---- ONBOARDING (first login, non-admin) ----
  if (showOnboarding && !profile.isAdmin) {
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-app font-sans",
      style: {
        fontFamily: "'Fredoka', sans-serif"
      }
    }, /*#__PURE__*/React.createElement(FontLoader, null), /*#__PURE__*/React.createElement(SkyBackground, null), /*#__PURE__*/React.createElement(OnboardingFlow, {
      onDone: completeOnboarding
    }), /*#__PURE__*/React.createElement(FooterSignature, null));
  }

  // Shared overlays for all logged-in screens
  const overlays = /*#__PURE__*/React.createElement(React.Fragment, null, !prefs.reducedMotion && /*#__PURE__*/React.createElement(ParticleOverlay, null), /*#__PURE__*/React.createElement(WipeTransition, {
    trigger: wipeTrigger
  }), /*#__PURE__*/React.createElement(TopActions, {
    sound: prefs.sound,
    onToggleSound: () => setPrefsState(p => ({
      ...p,
      sound: !p.sound
    })),
    onSettings: () => setSettingsOpen(true)
  }), /*#__PURE__*/React.createElement(SettingsModal, {
    open: settingsOpen,
    onClose: () => setSettingsOpen(false),
    prefs: prefs,
    onChange: patch => setPrefsState(p => ({
      ...p,
      ...patch
    })),
    onWipe: wipeLocalData,
    installable: installable,
    onInstall: async () => {
      await promptInstall();
      setInstallable(false);
    },
    onNotifToggle: onNotifToggle
  }), /*#__PURE__*/React.createElement(DexModal, {
    open: dexOpen,
    onClose: () => setDexOpen(false),
    onOpenDoodle: setDetailDoodle,
    ids: username ? getDex(username) : []
  }), /*#__PURE__*/React.createElement(DoodleDetailModal, {
    doodle: detailDoodle,
    onClose: () => setDetailDoodle(null)
  }), /*#__PURE__*/React.createElement(ShortcutsOverlay, {
    open: shortcutsOpen,
    onClose: () => setShortcutsOpen(false)
  }), /*#__PURE__*/React.createElement(LeaguesModal, {
    open: leaguesOpen,
    onClose: () => setLeaguesOpen(false),
    username: username,
    weekPts: stats.weekPts
  }), /*#__PURE__*/React.createElement(ShareCardModal, {
    open: shareOpen,
    onClose: () => setShareOpen(false),
    payload: sharePayload
  }), /*#__PURE__*/React.createElement(DailyRecapModal, {
    open: recapOpen,
    onClose: () => setRecapOpen(false),
    recap: recapData
  }));

  // ---- ADMIN PANEL ----
  if (adminMode && profile.isAdmin) {
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-app font-sans",
      style: {
        fontFamily: "'Fredoka', sans-serif"
      }
    }, /*#__PURE__*/React.createElement(FontLoader, null), /*#__PURE__*/React.createElement(SkyBackground, null), /*#__PURE__*/React.createElement(AppHeader, null), /*#__PURE__*/React.createElement(AdminPanel, {
      profile: profile,
      onExit: () => setAdminMode(false),
      onLogout: handleLogout,
      onEnterApp: () => setAdminMode(false),
      onWeeklyReset: () => setStats(prev => ({ ...prev, weekPts: 0 }))
    }), overlays, /*#__PURE__*/React.createElement(FooterSignature, null));
  }

  // ---- IN-GAME ----
  if (mode && !lastResult) {
    const commonHeader = /*#__PURE__*/React.createElement("div", {
      className: "pt-4 px-4 lg:px-12 max-w-[480px] lg:max-w-[1400px] mx-auto"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setMode(null),
      className: "flex items-center gap-1 text-sm font-semibold active:scale-95",
      style: {
        color: 'var(--c-text)'
      }
    }, /*#__PURE__*/React.createElement(ChevronLeftIcon, {
      size: 18
    }), " Back"));
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-app font-sans",
      style: {
        fontFamily: "'Fredoka', sans-serif"
      }
    }, /*#__PURE__*/React.createElement(FontLoader, null), /*#__PURE__*/React.createElement(SkyBackground, null), /*#__PURE__*/React.createElement(AppHeader, {
      compact: true
    }), commonHeader, /*#__PURE__*/React.createElement("div", {
      key: mode,
      className: "anim-page-in"
    }, mode === 'guess' && /*#__PURE__*/React.createElement(GuessMode, {
      seed: seedBase,
      onFinish: r => finishMode(r),
      onBack: () => setMode(null)
    }), mode === 'price' && /*#__PURE__*/React.createElement(PriceMode, {
      seed: seedBase,
      onFinish: r => finishMode(r),
      onBack: () => setMode(null)
    }), mode === 'trait' && /*#__PURE__*/React.createElement(TraitMode, {
      seed: seedBase,
      onFinish: r => finishMode(r),
      onBack: () => setMode(null)
    })), /*#__PURE__*/React.createElement(AchievementToast, {
      toasts: toasts,
      onDone: dismissToast
    }), overlays, /*#__PURE__*/React.createElement(FooterSignature, null));
  }

  // ---- RESULTS ----
  if (lastResult) {
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-app font-sans",
      style: {
        fontFamily: "'Fredoka', sans-serif"
      }
    }, /*#__PURE__*/React.createElement(FontLoader, null), /*#__PURE__*/React.createElement(SkyBackground, null), /*#__PURE__*/React.createElement(AppHeader, {
      compact: true
    }), /*#__PURE__*/React.createElement("div", {
      className: "pt-4 px-4 lg:px-12 max-w-[480px] lg:max-w-[1400px] mx-auto"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setMode(null);
        setLastResult(null);
      },
      className: "flex items-center gap-1 text-sm font-semibold active:scale-95",
      style: {
        color: 'var(--c-text)'
      }
    }, /*#__PURE__*/React.createElement(ChevronLeftIcon, {
      size: 18
    }), " Home")), /*#__PURE__*/React.createElement("div", {
      className: "anim-page-in"
    }, /*#__PURE__*/React.createElement(ResultsScreen, {
      result: lastResult,
      profile: profile,
      onShare: () => {
        const modeNames = {
          guess: 'Higher Sale',
          price: 'Rarity Duel',
          trait: 'Trait Roulette'
        };
        setSharePayload({
          modeName: modeNames[lastResult.mode] || 'Doodle',
          points: lastResult.points,
          icons: lastResult.icons,
          profileName: profile.name,
          avatarColor: profile.color || '#C5B3E6',
          streak: streak.count || 0,
          day: dayNumber(),
          url: 'doodleornot.xyz'
        });
        setShareOpen(true);
      },
      onChallenge: async () => {
        const link = writeChallengeLink(seedBase);
        try {
          await navigator.clipboard.writeText(link);
        } catch {}
        alert(t('play_my_game') + ' — link copied.');
      },
      onBack: () => {
        setMode(null);
        setLastResult(null);
        setTab('home');
      }
    })), /*#__PURE__*/React.createElement(AchievementToast, {
      toasts: toasts,
      onDone: dismissToast
    }), overlays, /*#__PURE__*/React.createElement(FooterSignature, null));
  }

  // ---- EDIT PROFILE (cosmetics only now) ----
  if (editing) {
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-app font-sans",
      style: {
        fontFamily: "'Fredoka', sans-serif"
      }
    }, /*#__PURE__*/React.createElement(FontLoader, null), /*#__PURE__*/React.createElement(SkyBackground, null), /*#__PURE__*/React.createElement(SplashScreen, {
      initial: profile,
      editMode: true,
      onCreate: p => {
        updateProfile({
          color: p.color,
          avatar: p.avatar
        });
        setEditing(false);
      }
    }), /*#__PURE__*/React.createElement(FooterSignature, null));
  }

  // ---- MAIN APP ----
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-app font-sans",
    style: {
      fontFamily: "'Fredoka', sans-serif"
    }
  }, /*#__PURE__*/React.createElement(FontLoader, null), /*#__PURE__*/React.createElement(SkyBackground, null), /*#__PURE__*/React.createElement(AppHeader, null), /*#__PURE__*/React.createElement("div", {
    key: tab,
    className: "anim-page-in"
  }, tab === 'home' && /*#__PURE__*/React.createElement(HomeScreen, {
    profile: profile,
    progress: progress,
    weekPts: stats.weekPts,
    streak: streak.count,
    powerups: username ? getPowerups(username) : {
      hints: 1,
      skips: 1
    },
    challengeSeed: challengeSeed,
    onDismissChallenge: () => setChallengeSeed(null),
    onOpenLeagues: () => setLeaguesOpen(true),
    onPlay: m => setMode(m)
  }), tab === 'run' && (window.RunClubScreen ? /*#__PURE__*/React.createElement(window.RunClubScreen, {
    profile: profile,
    onBack: () => setTab('home')
  }) : /*#__PURE__*/React.createElement("div", {
    style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, background: "var(--c-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, fontFamily: "'Fredoka', sans-serif" }
  }, /*#__PURE__*/React.createElement("div", { style: { fontSize: 48 } }, "🏃"), /*#__PURE__*/React.createElement("div", { style: { fontSize: 16, color: "var(--c-sub)" } }, "Loading Run Club..."), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.location.reload(),
    style: { marginTop: 8, padding: "8px 20px", borderRadius: 12, border: "none", background: "var(--c-accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }
  }, "Reload"))), tab === 'board' && /*#__PURE__*/React.createElement(LeaderboardScreen, {
    profile: profile,
    weekPts: stats.weekPts
  }), tab === 'profile' && /*#__PURE__*/React.createElement(ProfileScreen, {
    profile: profile,
    stats: stats,
    streak: streak.count,
    achievements: achievements,
    onEdit: () => setEditing(true),
    onLogout: handleLogout,
    onOpenDex: () => setDexOpen(true),
    onOpenAdmin: profile.isAdmin ? () => setAdminMode(true) : null,
    onDelete: profile.isAdmin ? null : handleDeleteAccount
  })), /*#__PURE__*/React.createElement(AchievementToast, {
    toasts: toasts,
    onDone: dismissToast
  }), overlays, /*#__PURE__*/React.createElement(FooterSignature, null), /*#__PURE__*/React.createElement(BottomNav, {
    tab: tab,
    onTab: setTab
  }));
}

/* ---------- Load fonts ---------- */
const FontLoader = () => /*#__PURE__*/React.createElement("style", null, `
    /* Fonts loaded via <link> in index.html — no duplicate @import needed */

    /* ============================================================
       MOBILE-FIRST GLOBAL OPTIMIZATIONS
       ============================================================ */
    :root {
      --safe-top: env(safe-area-inset-top, 0px);
      --safe-bottom: env(safe-area-inset-bottom, 0px);
      --safe-left: env(safe-area-inset-left, 0px);
      --safe-right: env(safe-area-inset-right, 0px);
      --vh: 1vh;
      --app-max-w: 440px;
      /* Theme colors — light mode defaults */
      --c-text: #2D2D3F;
      --c-text-sub: #7B7B9A;
      --c-accent: #4140FF;
      --c-bg: #FFFFFF;
      --c-card: rgba(255,255,255,0.72);
      --c-card-solid: rgba(255,255,255,0.96);
      --c-border: #E8E0F0;
      --c-input-bg: #F5F0FF;
      --c-overlay: rgba(45,45,63,0.35);
      --c-soft-btn: rgba(255,255,255,0.8);
      --c-pill-inactive: rgba(255,255,255,0.6);
      --c-correct: #7DD8A0;
      --c-wrong: #FF8A8A;
      --c-toggle-off: #D9D4E4;
      --c-result-bg: rgba(255,255,255,0.7);
      --c-stat-bg: rgba(255,255,255,0.55);
    }
    html[data-theme="dark"] {
      --c-text: #E8E0F0;
      --c-text-sub: #9B95B0;
      --c-accent: #7B7BFF;
      --c-bg: #15131E;
      --c-card: rgba(30,28,40,0.82);
      --c-card-solid: rgba(28,26,38,0.96);
      --c-border: #3A3550;
      --c-input-bg: #24213A;
      --c-overlay: rgba(10,8,18,0.55);
      --c-soft-btn: rgba(40,36,60,0.8);
      --c-pill-inactive: rgba(40,36,60,0.6);
      --c-correct: #5CBF82;
      --c-wrong: #E06060;
      --c-toggle-off: #3A3550;
      --c-result-bg: rgba(30,28,40,0.7);
      --c-stat-bg: rgba(30,28,40,0.55);
    }
    @media (prefers-color-scheme: dark) {
      html:not([data-theme="light"]):not([data-theme="dark"]) {
        --c-text: #E8E0F0;
        --c-text-sub: #9B95B0;
        --c-accent: #7B7BFF;
        --c-bg: #15131E;
        --c-card: rgba(30,28,40,0.82);
        --c-card-solid: rgba(28,26,38,0.96);
        --c-border: #3A3550;
        --c-input-bg: #24213A;
        --c-overlay: rgba(10,8,18,0.55);
        --c-soft-btn: rgba(40,36,60,0.8);
        --c-pill-inactive: rgba(40,36,60,0.6);
        --c-correct: #5CBF82;
        --c-wrong: #E06060;
        --c-toggle-off: #3A3550;
        --c-result-bg: rgba(30,28,40,0.7);
        --c-stat-bg: rgba(30,28,40,0.55);
      }
    }
    html {
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
      -webkit-tap-highlight-color: transparent;
      tap-highlight-color: transparent;
      touch-action: manipulation;      /* no 300ms delay, no double-tap zoom */
      overscroll-behavior-y: contain;  /* no pull-to-refresh page reload */
      scroll-behavior: smooth;
    }
    body, html, #root {
      font-family: 'Fredoka', system-ui, sans-serif !important;
      letter-spacing: 0.01em;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      font-smooth: always;
      text-rendering: optimizeLegibility;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }
    html, body { min-height: 100vh; min-height: 100svh; }
    #root {
      min-height: 100vh;
      min-height: 100dvh;        /* dynamic viewport — accounts for iOS bar */
      padding-top: var(--safe-top);
      padding-left: var(--safe-left);
      padding-right: var(--safe-right);
      /* NOTE: bottom padding handled per-screen to leave room for fixed nav */
      position: relative;
    }
    /* kill iOS Safari rubber-band glow & selection on tap */
    body {
      -webkit-user-select: none;
      user-select: none;
      -webkit-touch-callout: none;
      overscroll-behavior: none;
    }
    /* but allow selection inside inputs / editable */
    input, textarea, [contenteditable], .select-text, .select-text * {
      -webkit-user-select: text;
      user-select: text;
    }
    /* buttons: instant press feedback + no outline */
    button {
      -webkit-appearance: none;
      appearance: none;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      cursor: pointer;
      transition: transform 0.08s cubic-bezier(.2,.9,.3,1.2), opacity 0.15s ease;
    }
    button:active:not(:disabled) { transform: scale(0.965); }
    button:focus-visible {
      outline: 2px solid #C5B3E6;
      outline-offset: 2px;
      border-radius: 10px;
    }
    button:focus:not(:focus-visible) { outline: none; }

    /* inputs on iOS: prevent auto-zoom by using 16px+ font */
    input, textarea, select { font-size: 16px; }

    /* prevent accidental long-press context menus on images (but keep clickable via parent) */
    img { -webkit-touch-callout: none; -webkit-user-drag: none; user-drag: none; }

    /* smoother momentum scroll for lists / dex grid */
    .scroll-momentum {
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      scrollbar-width: none;
    }
    .scroll-momentum::-webkit-scrollbar { display: none; }

    /* horizontal scroll snap containers (carousels) */
    .snap-x-mandatory {
      scroll-snap-type: x mandatory;
      scroll-padding-left: 16px;
    }
    .snap-x-mandatory > * { scroll-snap-align: start; }

    /* safe-area helpers */
    .safe-bottom { padding-bottom: max(16px, calc(env(safe-area-inset-bottom) + 12px)); }
    .safe-top    { padding-top: max(12px, calc(env(safe-area-inset-top) + 8px)); }

    /* fluid typography — shrinks gracefully on small phones, grows on tablets */
    .fluid-display-xl { font-size: clamp(28px, 8vw, 44px); line-height: 1.05; }
    .fluid-display-l  { font-size: clamp(22px, 6.2vw, 32px); line-height: 1.1; }
    .fluid-display-m  { font-size: clamp(18px, 4.8vw, 24px); line-height: 1.2; }

    /* improve image smoothness on retina */
    svg, img { image-rendering: -webkit-optimize-contrast; }

    /* GPU hint for animated layers */
    .gpu { transform: translateZ(0); will-change: transform, opacity; backface-visibility: hidden; }

    /* Modal backdrop: lock body scroll & disable pull-to-refresh */
    .modal-open { overflow: hidden; overscroll-behavior: none; touch-action: none; }

    /* Nicer pressed state for icon buttons */
    .tap-soft:active { transform: scale(0.92); opacity: 0.85; }

    /* Bottom-nav aware padding — use on any screen that sits above the nav */
    .pb-nav { padding-bottom: calc(110px + env(safe-area-inset-bottom)); }
    .pt-safe { padding-top: max(12px, calc(env(safe-area-inset-top) + 8px)); }

    /* Fullscreen modals / sheets: respect notch + home-bar */
    .sheet-fullscreen {
      position: fixed; inset: 0;
      padding-top: env(safe-area-inset-top);
      padding-bottom: env(safe-area-inset-bottom);
      height: 100vh; height: 100dvh;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }

    /* min-h-app that plays nice with iOS dynamic toolbar */
    .min-h-app { min-height: 100vh; min-height: 100dvh; }

    /* respect prefers-color-scheme if prefs.darkMode=auto handled in JS */
    @media (hover: none) and (pointer: coarse) {
      /* touch-only device tweaks */
      button, [role="button"] { min-height: 44px; min-width: 44px; }
    }

    .font-display { font-family: 'Paytone One', 'Fredoka', system-ui, sans-serif; letter-spacing: -0.01em; font-weight: 400; }
    input[type=range]::-webkit-slider-thumb { appearance: none; width: 28px; height: 28px; }
    @keyframes waterBob {
      0%,100% { transform: translateY(0) rotate(-1deg); }
      25%     { transform: translateY(-4px) rotate(0.5deg); }
      50%     { transform: translateY(-2px) rotate(1deg); }
      75%     { transform: translateY(-5px) rotate(-0.5deg); }
    }
    /* ===== Section headers with rainbow underline ===== */
    .section-header { position: relative; margin-bottom: 12px; }
    .section-header-icon {
      display: inline-flex;
      animation: sectionIconPulse 3s ease-in-out infinite;
    }
    @keyframes sectionIconPulse {
      0%,100% { transform: scale(1) rotate(0deg); }
      50%     { transform: scale(1.1) rotate(4deg); }
    }
    .section-header-bar {
      margin-top: 6px;
      height: 3px;
      border-radius: 3px;
      background: linear-gradient(90deg, #FFB7C5, #FFE082, #A8E6CF, #90CAF9, #C5B3E6, #FFB7C5);
      background-size: 200% 100%;
      animation: sectionBarSlide 4s linear infinite;
      opacity: 0.7;
    }
    @keyframes sectionBarSlide {
      0%   { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }

    .water-title-glow {
      animation: titleGlow 4s ease-in-out infinite;
    }
    @keyframes titleGlow {
      0%,100% { filter: drop-shadow(0 3px 12px rgba(65,64,255,0.18)); }
      50%     { filter: drop-shadow(0 5px 20px rgba(65,64,255,0.32)) drop-shadow(0 0 30px rgba(197,179,230,0.2)); }
    }
    @keyframes waterSheen {
      0%,100% { background-position: 0% 50%; }
      50%     { background-position: 100% 50%; }
    }
    @keyframes rainbowDrift {
      0%,100% { transform: translateX(0); }
      50%     { transform: translateX(2px); }
    }
    .doodle-letter {
      display: inline-block;
      font-weight: 600;
      color: var(--c-text);
      animation: waterBob 4.2s ease-in-out infinite;
      will-change: transform;
    }

    /* ===== Entrance animations ===== */
    @keyframes fadeIn      { from { opacity: 0; } to { opacity: 1; } }
    @keyframes floatIn     { from { opacity: 0; transform: translateY(14px); }
                             to   { opacity: 1; transform: translateY(0); } }
    @keyframes popIn       { 0%  { opacity: 0; transform: scale(0.86); }
                             60% { opacity: 1; transform: scale(1.03); }
                             100%{ opacity: 1; transform: scale(1); } }
    @keyframes pageIn      { from { opacity: 0; transform: translateY(10px) scale(0.99); }
                             to   { opacity: 1; transform: translateY(0) scale(1); } }

    .anim-fade-in    { animation: fadeIn  0.45s ease-out both; }
    .anim-float-in   { animation: floatIn 0.55s cubic-bezier(.2,.9,.2,1) both; }
    .anim-pop-in     { animation: popIn   0.55s cubic-bezier(.2,.9,.3,1.2) both; }
    .anim-page-in    { animation: pageIn  0.4s  cubic-bezier(.2,.8,.2,1) both; }

    /* ===== Score popup float-up ===== */
    @keyframes scorePop {
      0%   { opacity: 0; transform: translateY(0) scale(0.5); }
      20%  { opacity: 1; transform: translateY(-10px) scale(1.2); }
      100% { opacity: 0; transform: translateY(-50px) scale(1); }
    }
    .score-popup { animation: scorePop 1.1s cubic-bezier(.2,.8,.2,1) forwards; pointer-events: none; }

    /* ===== Wrong shake ===== */
    @keyframes wrongShake {
      0%, 100% { transform: translateX(0); }
      15% { transform: translateX(-6px) rotate(-1deg); }
      30% { transform: translateX(5px) rotate(0.5deg); }
      45% { transform: translateX(-4px); }
      60% { transform: translateX(3px); }
      75% { transform: translateX(-2px); }
    }
    .anim-shake { animation: wrongShake 0.5s ease-out; }

    /* ===== Correct pulse glow ===== */
    @keyframes correctPulse {
      0%   { box-shadow: 0 0 0 0 rgba(125,216,160,0.5); }
      50%  { box-shadow: 0 0 0 12px rgba(125,216,160,0); }
      100% { box-shadow: 0 0 0 0 rgba(125,216,160,0); }
    }
    .anim-correct-pulse { animation: correctPulse 0.6s ease-out; }

    /* ===== Round slide transition ===== */
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(30px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .anim-slide-in { animation: slideInRight 0.35s cubic-bezier(.2,.8,.2,1) both; }

    /* ===== Hover lift ===== */
    .hover-lift { transition: transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .25s ease; }
    .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(65,64,255,0.14); }

    /* ===== Shimmer skeleton for loading images ===== */
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ===== Profile avatar glow ===== */
    @keyframes avatarPulse {
      0%,100% { box-shadow: 0 6px 18px rgba(65,64,255,0.18), 0 0 0 0 rgba(65,64,255,0.22); }
      50%     { box-shadow: 0 8px 26px rgba(65,64,255,0.28), 0 0 0 6px rgba(65,64,255,0); }
    }
    .avatar-glow { animation: avatarPulse 3.2s ease-in-out infinite; }

    /* ===== Doodle card image — scales up on desktop to fill 2-col layout ===== */
    .doodle-card-img { width: 100%; display: flex; justify-content: center; align-items: center; }
    .doodle-card-img > div { width: 100% !important; height: auto !important; aspect-ratio: 1 / 1; max-width: 260px; margin: 0 auto; }
    .doodle-card-img > div > img { width: 100% !important; height: 100% !important; object-fit: cover; }
    @media (min-width: 1024px) {
      .doodle-card-img > div { max-width: 380px; }
    }

    /* ===== Rainbow slow spin ===== */
    @keyframes rainbowSway { 0%,100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
    .anim-rainbow-spin-slow { animation: rainbowSway 6s ease-in-out infinite; transform-origin: 50% 70%; }

    /* ===== Degos Doodle — portrait embedded under signature ===== */
    @keyframes doodleFloat { 0%,100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-6px) rotate(1deg); } }
    @keyframes doodleHalo  { 0%,100% { opacity:.55; transform: scale(1); } 50% { opacity:.9; transform: scale(1.08); } }
    .degos-doodle-wrap {
      position: relative;
      width: 132px; height: 132px;
      display: inline-flex; align-items: center; justify-content: center;
      animation: doodleFloat 5.2s ease-in-out infinite;
      will-change: transform;
    }
    .degos-doodle-halo {
      position: absolute; inset: -10px;
      border-radius: 50%;
      background:
        conic-gradient(from 0deg,
          #FFB7C5, #FFE082, #A8E6CF, #90CAF9, #C5B3E6, #FFB7C5);
      filter: blur(16px);
      opacity: .7;
      animation: doodleHalo 4s ease-in-out infinite, rainbowSway 8s ease-in-out infinite;
      pointer-events: none;
    }
    .degos-doodle-img {
      position: relative;
      display: block;
      width: 120px; height: 120px;
      object-fit: cover;
      border-radius: 50%;
      border: 3px solid var(--c-card-solid);
      box-shadow:
        0 8px 24px rgba(15,13,46,0.35),
        0 0 0 1px rgba(255,255,255,0.2) inset;
    }
    @media (min-width: 1024px) {
      .degos-doodle-wrap { width: 160px; height: 160px; }
      .degos-doodle-img  { width: 148px; height: 148px; }
    }

    /* ===== Degos signature — legible solid ink + animated rainbow underline ===== */
    @keyframes degosBob       { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
    @keyframes degosUnderline { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
    @keyframes degosGlowSoft  { 0%,100% { box-shadow: 0 0 10px rgba(65,64,255,0.15); }
                                 50%    { box-shadow: 0 0 18px rgba(65,64,255,0.32); } }
    .degos-wrap {
      position: relative;
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      padding: 6px 14px;
      border-radius: 999px;
      background: var(--c-stat-bg);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      border: 1px solid var(--c-border);
      animation: degosGlowSoft 3.6s ease-in-out infinite;
    }
    .degos-sig {
      font-family: 'Fredoka', sans-serif;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--c-text);
      display: inline-flex;
      white-space: nowrap;
    }
    .degos-letter {
      display: inline-block;
      animation: degosBob 2.8s ease-in-out infinite;
      will-change: transform;
    }
    .degos-underline {
      display: block;
      margin-top: 4px;
      width: 60%;
      height: 2px;
      border-radius: 2px;
      background: linear-gradient(90deg, #FFB7C5, #FFE082, #A8E6CF, #90CAF9, #C5B3E6, #FFB7C5);
      background-size: 200% 100%;
      animation: degosUnderline 4s linear infinite;
    }

    /* ===== Utility: range slider thumb ===== */
    input[type=range]::-webkit-slider-thumb { background: var(--c-card-solid); border: 2px solid var(--c-text); border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.12); }

    /* Crown bob (podium) */
    @keyframes crownBob { 0%,100% { transform: translateY(0) rotate(-6deg); } 50% { transform: translateY(-3px) rotate(6deg); } }
    .anim-crown-bob { animation: crownBob 2.4s ease-in-out infinite; transform-origin: 50% 80%; }

    /* Score pop */
    @keyframes scorePop {
      0%   { transform: scale(0.6); opacity: 0; filter: blur(4px); }
      60%  { transform: scale(1.08); opacity: 1; filter: blur(0); }
      100% { transform: scale(1); }
    }
    .anim-score-pop { animation: scorePop 1s cubic-bezier(.2,.9,.3,1.3) both; }

    /* Podium column rise */
    @keyframes podiumRise {
      from { transform: scaleY(0); opacity: 0; }
      to   { transform: scaleY(1); opacity: 1; }
    }
    .podium-col { transform-origin: bottom center; animation: podiumRise 0.7s cubic-bezier(.2,.9,.3,1.1) both; }

    /* Confetti */
    @keyframes confettiFall {
      0%   { transform: translate3d(0, -20px, 0) rotate(0deg); opacity: 0; }
      10%  { opacity: 1; }
      100% { transform: translate3d(var(--drift, 0), 100vh, 0) rotate(720deg); opacity: 0; }
    }
    .confetti-piece {
      position: absolute;
      top: -10px;
      border-radius: 2px;
      animation: confettiFall linear forwards;
      will-change: transform;
    }

    /* BottomNav sliding pill */
    .nav-indicator {
      position: absolute;
      top: 6px; bottom: 6px;
      width: calc(25% - 6px);
      background: linear-gradient(135deg, rgba(65,64,255,0.12), rgba(197,179,230,0.18));
      border: 1px solid rgba(65,64,255,0.15);
      border-radius: 14px;
      transition: left 0.35s cubic-bezier(.2,.9,.3,1.1);
      pointer-events: none;
    }

    /* Dark mode body — uses CSS variable */
    html[data-theme="dark"] body,
    html[data-theme="dark"] #root {
      background: var(--c-bg) !important;
    }
    @media (prefers-color-scheme: dark) {
      html:not([data-theme="light"]):not([data-theme="dark"]) body,
      html:not([data-theme="light"]):not([data-theme="dark"]) #root {
        background: var(--c-bg) !important;
      }
    }

    /* ==========================================================
       PREMIUM POLISH LAYER — spring buttons, shimmer, sparkles,
       input glow, card tilt, stagger, morph blobs
       ========================================================== */

    /* Spring-eased global button press — applied to every <button> */
    button, [role="button"] {
      transition:
        transform .18s cubic-bezier(.2,.9,.3,1.4),
        box-shadow .22s ease,
        filter .22s ease;
      will-change: transform;
    }
    button:active:not(:disabled), [role="button"]:active {
      transform: scale(0.955);
      filter: brightness(0.97);
    }
    button:disabled { cursor: not-allowed; opacity: 0.55; }

    /* Elastic primary CTA — use class .btn-elastic on primary actions */
    @keyframes btnElasticTap {
      0%   { transform: scale(1); }
      40%  { transform: scale(0.94); }
      70%  { transform: scale(1.02); }
      100% { transform: scale(1); }
    }
    .btn-elastic { transition: box-shadow .25s ease; }
    .btn-elastic:active:not(:disabled) {
      animation: btnElasticTap .35s cubic-bezier(.2,.9,.3,1.4);
    }

    /* Shimmer bar (progress + skeletons) */
    @keyframes shimmerSweep {
      0%   { background-position: -200% 0; }
      100% { background-position:  200% 0; }
    }
    .shimmer {
      background: linear-gradient(
        90deg,
        rgba(255,255,255,0) 0%,
        rgba(255,255,255,0.35) 50%,
        rgba(255,255,255,0) 100%
      );
      background-size: 200% 100%;
      animation: shimmerSweep 2.2s linear infinite;
    }
    .skel {
      background: linear-gradient(
        90deg,
        rgba(45,45,63,0.06) 0%,
        rgba(45,45,63,0.12) 50%,
        rgba(45,45,63,0.06) 100%
      );
      background-size: 200% 100%;
      animation: shimmerSweep 1.6s linear infinite;
      border-radius: 8px;
    }

    /* Floating sparkles behind hero titles */
    @keyframes sparkleFloat {
      0%   { transform: translate(0, 0) scale(0.6); opacity: 0; }
      25%  { opacity: 1; }
      50%  { transform: translate(var(--sx, 8px), var(--sy, -10px)) scale(1); opacity: 0.9; }
      75%  { opacity: 0.6; }
      100% { transform: translate(calc(var(--sx, 8px) * 2), calc(var(--sy, -10px) * 2)) scale(0.6); opacity: 0; }
    }
    .sparkle {
      position: absolute;
      width: 10px;
      height: 10px;
      pointer-events: none;
      border-radius: 50%;
      animation: sparkleFloat 3.6s ease-in-out infinite;
      will-change: transform, opacity;
      background: radial-gradient(circle, #FFF 0%, rgba(255,255,255,0.6) 40%, transparent 70%);
      box-shadow: 0 0 8px rgba(255,255,255,0.9), 0 0 18px rgba(255,231,170,0.7);
    }

    /* Input focus glow — applied to all inputs/textareas */
    input:not([type="range"]):not([type="checkbox"]):not([type="radio"]),
    textarea {
      transition: box-shadow .2s ease, border-color .2s ease, background .2s ease;
    }
    input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):focus,
    textarea:focus {
      outline: none;
      box-shadow:
        0 0 0 3px rgba(65,64,255,0.14),
        0 6px 18px rgba(65,64,255,0.10);
    }

    /* Card press — wraps .pressable elements for tactile feel */
    .pressable {
      transition:
        transform .22s cubic-bezier(.2,.9,.3,1.3),
        box-shadow .22s ease,
        background .2s ease;
      will-change: transform;
    }
    .pressable:active {
      transform: scale(0.98) translateY(1px);
    }
    .pressable.hover-lift:hover {
      transform: translateY(-3px) scale(1.01);
    }

    /* List stagger — automatic fade+slide for first 8 children */
    @keyframes staggerIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .stagger > * {
      animation: staggerIn 0.5s cubic-bezier(.2,.9,.2,1) both;
    }
    .stagger > *:nth-child(1) { animation-delay: 0.04s; }
    .stagger > *:nth-child(2) { animation-delay: 0.09s; }
    .stagger > *:nth-child(3) { animation-delay: 0.14s; }
    .stagger > *:nth-child(4) { animation-delay: 0.19s; }
    .stagger > *:nth-child(5) { animation-delay: 0.24s; }
    .stagger > *:nth-child(6) { animation-delay: 0.29s; }
    .stagger > *:nth-child(7) { animation-delay: 0.34s; }
    .stagger > *:nth-child(8) { animation-delay: 0.39s; }

    /* Morphing background blob — decorative, for hero/empty states */
    @keyframes blobMorph {
      0%,100% { border-radius: 42% 58% 63% 37% / 42% 44% 56% 58%; transform: rotate(0deg) scale(1); }
      33%     { border-radius: 58% 42% 37% 63% / 56% 65% 35% 44%; transform: rotate(60deg) scale(1.04); }
      66%     { border-radius: 63% 37% 58% 42% / 38% 53% 47% 62%; transform: rotate(-40deg) scale(0.97); }
    }
    .blob {
      position: absolute;
      pointer-events: none;
      filter: blur(28px);
      opacity: 0.45;
      animation: blobMorph 14s ease-in-out infinite;
      will-change: transform, border-radius;
    }
    .blob-a { background: radial-gradient(circle at 30% 30%, #FFB7C5 0%, transparent 70%); }
    .blob-b { background: radial-gradient(circle at 70% 50%, #C5B3E6 0%, transparent 70%); }
    .blob-c { background: radial-gradient(circle at 50% 70%, #A8E6CF 0%, transparent 70%); }

    /* Glow ring — for featured elements */
    @keyframes glowRing {
      0%,100% { box-shadow: 0 0 0 0 rgba(65,64,255,0.20), 0 6px 20px rgba(65,64,255,0.15); }
      50%     { box-shadow: 0 0 0 8px rgba(65,64,255,0), 0 8px 28px rgba(65,64,255,0.28); }
    }
    .glow-ring { animation: glowRing 2.6s ease-in-out infinite; }

    /* Icon wiggle on hover/tap */
    @keyframes iconWiggle {
      0%,100% { transform: rotate(0deg); }
      25%     { transform: rotate(-6deg); }
      75%     { transform: rotate(6deg); }
    }
    .wiggle-on-hover:hover svg,
    .wiggle-on-hover:active svg { animation: iconWiggle 0.5s ease-in-out; }

    /* Gradient text — shimmering rainbow for special values */
    @keyframes gradientShift {
      0%,100% { background-position: 0% 50%; }
      50%     { background-position: 100% 50%; }
    }
    .gradient-text {
      background: linear-gradient(90deg, #FFB7C5, #FFE082, #A8E6CF, #90CAF9, #C5B3E6, #FFB7C5);
      background-size: 250% 100%;
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      animation: gradientShift 5s ease-in-out infinite;
    }

    /* Breathing — subtle scale pulse for featured CTA / hero icon */
    @keyframes breathe {
      0%,100% { transform: scale(1); }
      50%     { transform: scale(1.035); }
    }
    .breathe { animation: breathe 3.8s ease-in-out infinite; will-change: transform; }

    /* Floating arrow nudge */
    @keyframes nudgeRight {
      0%,100% { transform: translateX(0); }
      50%     { transform: translateX(3px); }
    }
    .nudge-right { animation: nudgeRight 1.6s ease-in-out infinite; }

    /* Ripple on tap (requires .ripple-target wrapper) */
    @keyframes rippleOut {
      from { transform: scale(0); opacity: 0.45; }
      to   { transform: scale(3.2); opacity: 0; }
    }
    .ripple-target { position: relative; overflow: hidden; }
    .ripple-target::after {
      content: '';
      position: absolute;
      inset: 50% auto auto 50%;
      width: 20px; height: 20px;
      margin-left: -10px; margin-top: -10px;
      border-radius: 50%;
      background: var(--c-pill-inactive);
      opacity: 0;
      pointer-events: none;
    }
    .ripple-target:active::after {
      animation: rippleOut 0.6s ease-out;
    }

    /* ==========================================================
       UX LAYER — transitions, tilts, flames, toasts, skeletons
       ========================================================== */

    /* Richer page transition: slide + fade + subtle blur clear */
    @keyframes pageSlideIn {
      0%   { opacity: 0; transform: translateY(14px) scale(0.985); filter: blur(6px); }
      60%  { opacity: 1; filter: blur(0); }
      100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
    }
    .anim-page-in { animation: pageSlideIn 0.5s cubic-bezier(.2,.85,.25,1) both; }

    /* Tilt on press (touch-friendly 3D depth) — wrap cards with .tilt-card */
    .tilt-card {
      transform-style: preserve-3d;
      transform: perspective(900px) rotateX(0deg) rotateY(0deg) scale(1);
      transition:
        transform .35s cubic-bezier(.2,.9,.3,1.2),
        box-shadow .3s ease;
      will-change: transform;
    }
    .tilt-card:active {
      transform: perspective(900px) rotateX(4deg) rotateY(-2deg) scale(0.98);
    }
    @media (hover: hover) {
      .tilt-card:hover {
        transform: perspective(900px) rotateX(-2deg) rotateY(2deg) scale(1.012);
        box-shadow: 0 14px 40px rgba(65,64,255,0.14);
      }
    }

    /* Streak flame — animated gradient flame for streak >= 1 */
    @keyframes flameFlicker {
      0%,100% { transform: translateY(0) scale(1) rotate(-1deg); filter: brightness(1); }
      30%     { transform: translateY(-1px) scale(1.04) rotate(2deg); filter: brightness(1.15); }
      60%     { transform: translateY(0.5px) scale(0.97) rotate(-2deg); filter: brightness(0.95); }
      80%     { transform: translateY(-0.5px) scale(1.02) rotate(1deg); filter: brightness(1.1); }
    }
    .flame { display: inline-block; animation: flameFlicker 0.9s ease-in-out infinite; transform-origin: 50% 90%; }
    .flame-big { animation-duration: 1.1s; filter: drop-shadow(0 0 10px rgba(255,120,60,0.5)); }

    /* Toast — slide-from-top with progress bar */
    @keyframes toastSlideIn {
      from { opacity: 0; transform: translate3d(0, -18px, 0) scale(0.96); }
      to   { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
    }
    @keyframes toastSlideOut {
      from { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
      to   { opacity: 0; transform: translate3d(0, -18px, 0) scale(0.96); }
    }
    @keyframes toastProgress {
      from { transform: scaleX(1); }
      to   { transform: scaleX(0); }
    }
    .toast-in  { animation: toastSlideIn  0.4s cubic-bezier(.2,.9,.3,1.2) both; }
    .toast-out { animation: toastSlideOut 0.3s ease-in forwards; }
    .toast-progress {
      height: 3px;
      background: linear-gradient(90deg, #4140FF, #C5B3E6);
      transform-origin: left;
      animation: toastProgress 3.6s linear forwards;
      border-radius: 0 0 14px 14px;
    }

    /* Skeleton variants */
    .skel-line  { height: 10px; }
    .skel-title { height: 16px; width: 60%; }
    .skel-avatar { width: 40px; height: 40px; border-radius: 50%; }

    /* Smooth tab-bar indicator (already exists) — enhance with spring */
    .nav-indicator { transition: left 0.38s cubic-bezier(.22,1.1,.36,1); }

    /* Focus-visible keyboard ring (accessibility) */
    :focus-visible {
      outline: 2px solid rgba(65,64,255,0.5);
      outline-offset: 2px;
      border-radius: 6px;
    }

    /* Scrollbar polish (webkit) */
    ::-webkit-scrollbar { width: 10px; height: 10px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb {
      background: rgba(65,64,255,0.18);
      border-radius: 10px;
      border: 2px solid transparent;
      background-clip: padding-box;
    }
    ::-webkit-scrollbar-thumb:hover { background: rgba(65,64,255,0.32); background-clip: padding-box; }

    /* Tap burst — quick radial flash on tap (.tap-burst) */
    @keyframes tapBurst {
      0%   { box-shadow: 0 0 0 0 rgba(65,64,255,0.35); }
      100% { box-shadow: 0 0 0 18px rgba(65,64,255,0); }
    }
    .tap-burst:active { animation: tapBurst 0.45s ease-out; }

    /* Bounce-in for badges/small icons */
    @keyframes bounceIn {
      0%   { transform: scale(0); opacity: 0; }
      60%  { transform: scale(1.15); opacity: 1; }
      100% { transform: scale(1); }
    }
    .anim-bounce-in { animation: bounceIn 0.5s cubic-bezier(.3,1.5,.3,1.1) both; }

    /* Gentle glow underline — for nav links on active */
    @keyframes linkGlow {
      0%,100% { text-shadow: 0 0 0 rgba(65,64,255,0); }
      50%     { text-shadow: 0 0 8px rgba(65,64,255,0.45); }
    }
    .link-glow-active { animation: linkGlow 2.4s ease-in-out infinite; }

    /* Respect reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .doodle-letter, .degos-letter, .avatar-glow, .anim-rainbow-spin-slow,
      .anim-fade-in, .anim-float-in, .anim-pop-in, .anim-page-in,
      .anim-crown-bob, .anim-score-pop, .podium-col, .confetti-piece,
      .nav-indicator, .sparkle, .blob, .glow-ring, .breathe, .nudge-right,
      .gradient-text, .shimmer, .skel, .stagger > *, .wiggle-on-hover svg,
      .btn-elastic, .pressable, .ripple-target::after,
      .tilt-card, .flame, .toast-in, .toast-out, .toast-progress,
      .anim-bounce-in, .link-glow-active, .tap-burst
        { animation: none !important; transition: none !important; }
    }
  `);

/* ---------- Mount with Error Boundary ---------- */
function __showFatal(title, err, extra) {
  try {
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;inset:12px;z-index:99999;background:#fff;border:2px solid #E57373;border-radius:14px;padding:16px;font:13px/1.5 ui-monospace,Menlo,monospace;color:#2D2D3F;overflow:auto;box-shadow:0 12px 40px rgba(0,0,0,.2);';
    var msg = (err && (err.stack || err.message)) || String(err);
    box.innerHTML = '<div style="font-weight:700;color:#B94A4A;margin-bottom:6px;">' + String(title).replace(/</g,'&lt;') + '</div><div style="white-space:pre-wrap;">' + String(msg).replace(/</g,'&lt;') + '</div>' + (extra ? '<div style="margin-top:8px;white-space:pre-wrap;color:#7B7B9A;">'+String(extra).replace(/</g,'&lt;')+'</div>' : '');
    document.body.appendChild(box);
    var s = document.getElementById('boot-splash'); if (s) s.style.display='none';
  } catch(e){}
}
class __RootErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err){ return { err: err }; }
  componentDidCatch(err, info){ __showFatal('Render error', err, 'Component stack:' + (info && info.componentStack || '')); }
  render(){
    if (this.state.err) return React.createElement('div', {
      style: { padding: '2rem', textAlign: 'center', fontFamily: 'Fredoka, system-ui, sans-serif', color: '#2D2D3F' }
    },
      React.createElement('div', { style: { fontSize: '3rem', marginBottom: '1rem' } }, '\uD83D\uDEE0'),
      React.createElement('h2', { style: { marginBottom: '.5rem' } }, 'Something went wrong'),
      React.createElement('p', { style: { color: '#7B7B9A', marginBottom: '1.5rem', fontSize: '14px' } }, String(this.state.err.message || this.state.err).slice(0, 200)),
      React.createElement('button', {
        onClick: function(){ location.reload(); },
        style: { background: '#4140FF', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 32px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }
      }, 'Reload')
    );
    return this.props.children;
  }
}
try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    React.createElement(__RootErrorBoundary, null, React.createElement(DoodleOrNot))
  );
} catch (e) { __showFatal('Mount error', e); }
