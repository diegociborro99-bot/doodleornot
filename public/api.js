/* Doodle or Not — client-side API wrapper.
   Exposes window.DON_API with typed methods that talk to the backend.
   Cookie-based auth (httpOnly) — no tokens touch JS. */
(function () {
  const base = (typeof window !== 'undefined' && window.__API_BASE__) || '';

  async function req(path, { method = 'GET', body = null, headers = {} } = {}) {
    const opts = {
      method,
      headers: { 'Accept': 'application/json', ...headers },
      credentials: 'same-origin'
    };
    if (body !== null) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    let resp;
    try { resp = await fetch(base + path, opts); }
    catch (e) { throw new Error('network_error'); }
    let data = null;
    try { data = await resp.json(); } catch (_) { /* non-JSON */ }
    if (!resp.ok) {
      const err = new Error((data && data.error) || `http_${resp.status}`);
      err.status = resp.status;
      throw err;
    }
    return data;
  }

  window.DON_API = {
    // ----- auth -----
    signup:  ({ username, password, avatarColor, faceShape }) =>
              req('/api/auth/signup', { method: 'POST', body: { username, password, avatarColor, faceShape } }),
    login:   ({ username, password }) =>
              req('/api/auth/login',  { method: 'POST', body: { username, password } }),
    logout:  () => req('/api/auth/logout', { method: 'POST' }),
    me:      () => req('/api/auth/me'),
    updateMe: ({ avatarColor, faceShape }) =>
              req('/api/auth/me', { method: 'PATCH', body: { avatarColor, faceShape } }),

    // ----- progress -----
    saveProgress: ({ mode, points, icons, clutch, day }) =>
              req('/api/progress', { method: 'POST', body: { mode, points, icons, clutch, day } }),
    getProgress: (day) => req('/api/progress/' + encodeURIComponent(day)),

    // ----- leaderboard -----
    leaderboard: (scope = 'weekly', limit = 50) =>
              req(`/api/leaderboard?scope=${scope}&limit=${limit}`),

    // ----- dex -----
    dexAdd:  (ids) => req('/api/dex', { method: 'POST', body: { ids } }),
    dexGet:  () => req('/api/dex'),

    // ----- achievements -----
    achievementsUnlock: (ids) => req('/api/achievements', { method: 'POST', body: { ids } }),

    // ----- leagues -----
    createLeague: (name) => req('/api/leagues', { method: 'POST', body: { name } }),
    joinLeague:   (code) => req('/api/leagues/' + encodeURIComponent(code) + '/join', { method: 'POST' }),
    getLeague:    (code) => req('/api/leagues/' + encodeURIComponent(code)),
    myLeagues:    () => req('/api/leagues'),

    // ----- preferences -----
    updatePreferences: (patch) => req('/api/preferences', { method: 'PATCH', body: patch }),

    // ----- powerups -----
    usePowerup: (kind) => req('/api/powerups/use', { method: 'POST', body: { kind } }),
    todayPowerups: () => req('/api/powerups/today'),

    // ----- connectivity -----
    health: () => req('/healthz'),
  };

  // Small event bus so the app can react to login state changes
  const listeners = {};
  window.DON_API.on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
  window.DON_API.emit = (ev, payload) => { (listeners[ev] || []).forEach(fn => { try { fn(payload); } catch(e){} }); };
})();
