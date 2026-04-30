# Doodle or Not — Auditoría y mejoras (2026-04-30)

Resumen de la pasada de bugs y mejoras aplicada autónomamente sobre `main` y sobre los patches `run-club-patch/` (la rama no fusionada del Run Club).

---

## 1. Por qué el ranking "no funcionaba" — y cómo se arregló

El leaderboard semanal arrastraba **dos defectos compuestos** que daban lugar a entradas duplicadas, podios inestables y cohortes enteras desaparecidas del ranking. La causa raíz se diagnosticó leyendo `src/routes/leaderboard.js`, `public/app.js (LeaderboardScreen)` y `src/routes/progress.js`.

### 1.1 La pestaña "Last week" perdía a quien no jugaba en la nueva semana
La consulta `lastweekly` solo miraba `Stats.lastWeekStart` / `Stats.lastWeekPoints`. Pero el snapshot a esos campos solo se ejecuta dentro de `POST /api/progress` cuando un usuario juega de nuevo en una semana nueva. Resultado: si terminaba la semana y un jugador no volvía a abrir la app, sus puntos de la semana pasada **no aparecían en ningún ranking** — ni en "this week" (porque su `weekStart` ya no coincide con el actual) ni en "last week" (porque nunca se había snapshoteado).

**Fix (`src/routes/leaderboard.js`)** — el endpoint ahora hace dos consultas en paralelo y deduplica por `userId`:
1. usuarios con snapshot (`lastWeekStart === lws`),
2. usuarios sin snapshot todavía (`weekStart === lws`).

Cuando un usuario aparece en las dos, gana el snapshot (es la cifra congelada y autoritativa). El resto se ordena `points DESC, username ASC`.

### 1.2 El "you" se duplicaba al final de la lista
`LeaderboardScreen` comparaba `r.username === profile.name`. El servidor devuelve `username` con la capitalización original; `profile.name` se almacena siempre en minúscula. La comparación `===` fallaba silenciosamente, por lo que el flag `me` nunca se marcaba en la fila ya presente y el código de "ensure current user is on the board" añadía una **segunda fila duplicada** al final, además de mostrar la línea fantasma "@usuario (you)" debajo del top 20 incluso cuando ya estabas dentro.

**Fix (`public/app.js`)** — comparación case-insensitive vía `toLowerCase()` y captura defensiva contra `profile` nulo.

### 1.3 Otras tres mejoras de robustez en el mismo endpoint
- **Filtro `weekPoints > 0` en weekly y `totalPoints > 0` en alltime**: antes salían con 0 puntos usuarios que solo tenían su `weekStart` igual al actual sin haber sumado nada.
- **Sort secundario estable** (`username ASC` o `localeCompare`): los empates ya no reordenan podio en cada refresco. Postgres no garantiza orden sin `ORDER BY` explícito.
- **`reset-weekly` ahora envuelve los snapshots en una transacción** (`$transaction`) en lugar de un loop con N+1 updates sin atomicidad. El número total snapshoteado se devuelve en la respuesta para verificación.

### 1.4 Cliente: race-condition al cambiar de pestaña rápido
El `useEffect` del leaderboard no cancelaba la promesa pendiente al cambiar `tab`/`fetchKey`. Si un usuario alternaba "this week" / "last week" rápido, la respuesta más antigua podía llegar después y sobrescribir la más nueva. Añadido un flag `cancelled` con cleanup. Además, el chequeo `if (data.weekNumber)` ahora usa `!= null` para no descartar `weekNumber === 0`.

---

## 2. Jugabilidad — los tres modos siguen intactos

Revisé los tres game loops (`GuessMode` / `PriceMode` / `TraitMode` en `public/app.js`) y la salida puntual al servidor (`POST /api/progress`). **Sin regresiones.** Notas concretas:

- **Higher Sale (`GuessMode`)**: la dificultad progresiva por ratio de precio sigue ordenando correctamente. El `freezeActive` absorbe el primer fallo y permite reintentar; `choosingRef` evita el doble-tap. Atajos de teclado (`A`/`L`, `H`, `S`, `F`) intactos.
- **Rarity Duel (`PriceMode`)**: el multiplicador (`x1` / `x2` / `x3` a partir de racha 5/10) usa el streak previo a la respuesta, lo cual es lo deseado (no retroactivo). El sumatorio se acumula en `accPtsRef.current`, evitando bugs de stale closure que tenía la versión anterior.
- **Trait Roulette (`TraitMode`)**: thresholds proporcionales (`actual * 0.10/0.25/0.50`) con suelos mínimos para que un trait del 0.5 % siga siendo alcanzable pero no trivial. Buckets balanceados: 1 rare + 2 uncommon + 1 mid + 1 common.

El servidor de `progress.js` mantiene la transacción `Serializable` que protege contra envíos simultáneos de la misma ronda y trunca puntos a `MAX_POINTS_PER_MODE = 25`. La validación de `icons` con `VALID_ICONS` cubre los 8 tipos esperados.

---

## 3. Ligas — bug sutil de ordenación + endpoint nuevo

`src/routes/leagues.js`:

- **Sort estable** en `GET /:code`: antes ordenaba solo por `weekPoints DESC`. Lunes por la mañana todos los miembros estaban a 0 y el orden se reshufleaba en cada refresco. Ahora: `weekPoints DESC, totalPoints DESC, username ASC`.
- **`avatarData` incluido** en la respuesta para que el cliente pueda mostrar fotos de perfil reales en la liga (antes solo le llegaba `avatarColor`).
- **Nuevo endpoint `POST /api/leagues/:code/leave`**: hasta ahora solo se podía entrar, no salir. Expuesto en `public/api.js` y `run-club-patch/api.js` como `leaveLeague(code)`.

---

## 4. Run Club (`run-club-patch/`)

Esta rama todavía no está fusionada en `main`, pero contiene una serie de bugs reales que arreglé in-situ para que la fusión sea limpia.

### 4.1 Visual — `style` duplicado en JSX
Tres componentes (`AchievementCard`, summary tile post-run y "Previously Reviewed" en admin) declaraban el atributo `style` dos veces en el mismo objeto `props`. JavaScript evalúa el segundo y silenciosamente descarta el primero, lo que vaciaba `background`, `border` y `borderRadius` de las tarjetas. Tres cards dejaron de parecer cards. Fixes en `run-club-patch/app.js` líneas ~8857, ~9129 y ~9278.

### 4.2 Achievements `early_bird` / `night_owl` no eran deterministas
`new Date(r.startedAt).getHours()` devuelve la hora **local del servidor**. Misma carrera, distintas horas según donde corra el contenedor — desbloqueable o no según la región de Railway. Cambiado a `getUTCHours()` y descripción actualizada para que el usuario sepa la regla.

### 4.3 `POST /community/challenge` aceptaba basura
Antes: `Math.round(goalKm * 1000)` con `goalKm = "lol"` insertaba `NaN` en `goalM`. Ahora se valida `Number.isFinite(goalNum) && 0 < goalNum <= 10000`, `title` no vacío y `description` cap a 500 chars.

### 4.4 `POST /access/request` bloqueaba a usuarios denegados para siempre
Una vez denegada, la fila `RunClubAccess` se quedaba con `status === 'denied'` y el `findUnique → existing` provocaba que cualquier reintento devolviera `Already requested`. Ahora si el estado anterior era `denied`, se vuelve a poner en `pending`, se refrescan `socialProof`/`message`/`requestedAt` y se anula `reviewNote`/`reviewedAt`. Se incluye `reapplied: true` en la respuesta para que el cliente pueda mostrar feedback.

### 4.5 `POST /api/runs` validaba poco
Añadidas dos comprobaciones que faltaban:
- `end < start` → `400 end_before_start` (antes pasaba sin avisar y producía durations negativas pre-clamp).
- `start > now + 5min` → `400 future_start` (mitiga clock-skew abuse).

### 4.6 Leaderboard del Run Club
Mismos arreglos de orden estable y ordenado secundario por username. `weekStart` se devuelve en la respuesta `weekly` para que el cliente pueda mostrarla.

---

## 5. PWA — service worker bumpado

Se cambió `VERSION = 'don-v6-2026-04-17'` → `'don-v7-2026-04-30'` en `public/sw.js`. Por la lógica de `activate`, esto fuerza purga de caches viejas y `tab.navigate(tab.url)` en pestañas abiertas, garantizando que los usuarios actuales reciben el nuevo `app.js` con el fix de leaderboard sin tener que cerrar manualmente la PWA.

---

## 6. Verificación

Sintaxis de los 8 archivos modificados validada con `node --check`:

```
OK src/routes/leaderboard.js
OK src/routes/leagues.js
OK public/api.js
OK public/app.js
OK public/sw.js
OK run-club-patch/api.js
OK run-club-patch/app.js
OK run-club-patch/src/routes/runs.js
```

`git diff --stat` (sólo `main`, sin contar `run-club-patch/` que es untracked):

```
public/api.js             |  1 +
public/app.js             | 18 +++++++---
public/sw.js              |  2 +-
src/routes/leaderboard.js | 88 ++++++++++++++++++++++++++++++++++-------------
src/routes/leagues.js     | 28 +++++++++++++--
5 files changed, 106 insertions(+), 31 deletions(-)
```

---

## 7. Lo que NO se tocó (y por qué)

- **`isoforma-patch/`**: parche separado con su propio engine y suite de tests (`snapshot.test.js.snap`). Sin instrucciones explícitas en el task scheduler y al no compartir el patrón de bugs detectados, se dejó intacto. Si quieres una pasada equivalente avísame.
- **No se ejecutó la migración Prisma** del Run Club. Sigue siendo trabajo de fusión cuando integres `run-club-patch/` en `main`.
- **No se hizo `git commit`**: te dejo los cambios en working tree para que los revises antes de subirlos. `git diff` muestra todo lo aplicado.

---

## 8. Resumen ejecutivo de bugs eliminados

| # | Componente | Severidad | Antes | Después |
|---|---|---|---|---|
| 1 | Leaderboard server lastweekly | **Alta** | Cohortes invisibles cada lunes | Unión de ambos sets, dedup por userId |
| 2 | Leaderboard client `me` | **Alta** | Fila duplicada "you" al final | Comparación case-insensitive |
| 3 | Leaderboard sort | Media | Podio reshuffle en empates | Sort secundario estable |
| 4 | Leaderboard refresh race | Media | Respuesta vieja sobreescribe nueva | Cleanup con flag `cancelled` |
| 5 | reset-weekly atomicidad | Media | Loop N+1 sin transacción | `$transaction` único |
| 6 | League sort | Media | Reshuffle lunes por mañana | Sort triple estable |
| 7 | League leave endpoint | Baja | Imposible salirse | Nuevo `POST /:code/leave` |
| 8 | Run-club achievement card style | Media | Sin background/borde | Style merged a un solo objeto |
| 9 | Run-club summary tile style | Baja | Padding raro | Style merged |
| 10 | Run-club admin reviewed style | Baja | Padding raro | Style merged |
| 11 | Run-club achievements UTC | Media | No determinista por timezone | `getUTCHours()` |
| 12 | Run-club challenge validation | Media | `NaN` en DB | Validación numérica estricta |
| 13 | Run-club access re-request | Alta | Denied = ban permanente | Resetea a pending |
| 14 | Run-club POST /runs validation | Media | `end < start`, future starts | Rechazo explícito |
| 15 | Run-club leaderboard sort | Baja | Reshuffle empates | Sort secundario |
| 16 | SW cache version | Baja | Usuarios podían quedarse en JS viejo | Bump a v7 fuerza refresh |
