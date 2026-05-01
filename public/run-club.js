/* Doodles Run Club — standalone module loaded before app.js
   Exposes: window.RunClubScreen, window.RunShoeIcon */
(function() {
  "use strict";
  var React = window.React;
  var ReactDOM = window.ReactDOM;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;
  var useMemo = React.useMemo;
  var useCallback = React.useCallback;

  // Leaflet dynamic loader
  var leafletReady = null;
  var loadLeaflet = function() {
    if (leafletReady) return leafletReady;
    if (window.L) { leafletReady = Promise.resolve(); return leafletReady; }
    leafletReady = new Promise(function(resolve) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      var script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = function() { resolve(); };
      script.onerror = function() { resolve(); };
      document.head.appendChild(script);
    });
    return leafletReady;
  };

  /* Local Pill component (no dependency on app.js) */
  var RCPill = function(props) {
    var active = props.active;
    var onClick = props.onClick;
    var color = props.color || 'var(--c-accent)';
    return React.createElement("button", {
      onClick: onClick,
      className: "rc-nav-pill",
      style: {
        padding: '8px 18px', borderRadius: 22, fontSize: 13, fontWeight: 700,
        cursor: 'pointer', transition: 'all 0.3s cubic-bezier(.22,1,.36,1)',
        border: active ? 'none' : '1px solid var(--c-border)',
        background: active ? color : 'rgba(255,255,255,0.5)',
        color: active ? '#FFFFFF' : 'var(--c-text, #2D2D3F)',
        boxShadow: active ? '0 4px 14px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.1)' : 'none',
        letterSpacing: '0.02em',
        transform: active ? 'scale(1.05)' : 'scale(1)'
      }
    }, props.children);
  };

/* ==========================================================================
   DOODLES RUN CLUB — v5 Complete Rewrite
   Solid backgrounds, mobile+PC optimized, access gate, admin inbox,
   custom achievement medals, all in English, no emojis
   ========================================================================== */

/* ---------- SVG Icons ---------- */

const RunShoeIcon = ({ size = 24, active }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: active ? '#A8E6CF' : "var(--c-text)", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 18h18l-1.5-4c-.4-1.1-1.5-1.8-2.7-1.8H14l-1-2.5c-.3-.8-1.1-1.2-1.9-1L7.5 10 6 8.5 4.5 10l-1 2.5L3 18z"
}), /*#__PURE__*/React.createElement("path", { d: "M7 15h2M11 15h2M15 15h2" }));

const GpsIcon = ({ size = 20, color }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: color || "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("circle", { cx: 12, cy: 12, r: 3 }),
  /*#__PURE__*/React.createElement("path", { d: "M12 2v4M12 18v4M2 12h4M18 12h4" }));

const RouteIcon = ({ size = 20, color }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: color || "var(--c-text)", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", { d: "M3 17l4-4 4 4 4-8 6 6" }));

const FireIcon = ({ size = 20 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "M12 2c0 4-4 6-4 10a6 6 0 0012 0c0-4-4-6-4-10"
}), /*#__PURE__*/React.createElement("circle", { cx: 12, cy: 16, r: 2 }));

const PauseIcon = ({ size = 24 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "currentColor"
}, /*#__PURE__*/React.createElement("rect", { x: 6, y: 4, width: 4, height: 16, rx: 1 }),
  /*#__PURE__*/React.createElement("rect", { x: 14, y: 4, width: 4, height: 16, rx: 1 }));

const PlayIcon = ({ size = 24 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "currentColor"
}, /*#__PURE__*/React.createElement("polygon", { points: "6,4 20,12 6,20" }));

const StopSquareIcon = ({ size = 24 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "currentColor"
}, /*#__PURE__*/React.createElement("rect", { x: 5, y: 5, width: 14, height: 14, rx: 2 }));

const LockIcon = ({ size = 20 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("rect", { x: 5, y: 11, width: 14, height: 10, rx: 2 }),
  /*#__PURE__*/React.createElement("path", { d: "M8 11V7a4 4 0 018 0v4" }));

const BrainIcon = ({ size = 20 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", { d: "M12 2a5 5 0 015 5c0 1.5-.5 2.5-1.5 3.5L12 14l-3.5-3.5C7.5 9.5 7 8.5 7 7a5 5 0 015-5z" }),
  /*#__PURE__*/React.createElement("path", { d: "M12 14v8M8 18h8" }));

const TargetIcon = ({ size = 20 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("circle", { cx: 12, cy: 12, r: 10 }),
  /*#__PURE__*/React.createElement("circle", { cx: 12, cy: 12, r: 6 }),
  /*#__PURE__*/React.createElement("circle", { cx: 12, cy: 12, r: 2 }));

const InfinityIcon = ({ size = 20 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", { d: "M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" }));

const CheckCircleIcon = ({ size = 20 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("circle", { cx: 12, cy: 12, r: 10 }),
  /*#__PURE__*/React.createElement("path", { d: "M9 12l2 2 4-4" }));

const ClockIcon = ({ size = 20 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("circle", { cx: 12, cy: 12, r: 10 }),
  /*#__PURE__*/React.createElement("path", { d: "M12 6v6l4 2" }));

const InboxIcon = ({ size = 20 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", { d: "M22 12h-6l-2 3H10l-2-3H2" }),
  /*#__PURE__*/React.createElement("path", { d: "M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" }));

/* ---------- NEW SVG Icons (replacing emojis) ---------- */

const HouseIcon = ({ size = 16 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", { d: "M3 12l9-9 9 9" }),
  /*#__PURE__*/React.createElement("path", { d: "M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10" }));

const ListIcon = ({ size = 16 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", { d: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" }));

const TrophyIcon = ({ size = 16 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", { d: "M6 9H4a2 2 0 01-2-2V5a1 1 0 011-1h3" }),
  /*#__PURE__*/React.createElement("path", { d: "M18 9h2a2 2 0 002-2V5a1 1 0 00-1-1h-3" }),
  /*#__PURE__*/React.createElement("path", { d: "M6 4h12v6a6 6 0 01-12 0V4z" }),
  /*#__PURE__*/React.createElement("path", { d: "M9 20h6M12 16v4" }));

const MedalIcon = ({ size = 16 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("circle", { cx: 12, cy: 14, r: 6 }),
  /*#__PURE__*/React.createElement("path", { d: "M8 8L6 2h4l2 3 2-3h4l-2 6" }));

const GearIcon = ({ size = 16 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("circle", { cx: 12, cy: 12, r: 3 }),
  /*#__PURE__*/React.createElement("path", { d: "M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" }));

const RunnerIcon = ({ size = 20 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("circle", { cx: 14, cy: 4, r: 2 }),
  /*#__PURE__*/React.createElement("path", { d: "M7 22l3-7 3 2v5" }),
  /*#__PURE__*/React.createElement("path", { d: "M10 15l-2-3 5-3 3 4h3" }));

const BoltIcon = ({ size = 16 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" }));

const ChartBarIcon = ({ size = 16 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", { d: "M12 20V10M18 20V4M6 20v-4" }));

const CelebrationIcon = ({ size = 20 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", { d: "M4 20l4-16 6 6-6 6 8 4" }),
  /*#__PURE__*/React.createElement("path", { d: "M15 4l1 1M18 7l1 1M20 3l1 1" }),
  /*#__PURE__*/React.createElement("circle", { cx: 17, cy: 3, r: 1, fill: "currentColor", stroke: "none" }),
  /*#__PURE__*/React.createElement("circle", { cx: 21, cy: 7, r: 1, fill: "currentColor", stroke: "none" }));

const FlexIcon = ({ size = 16 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", { d: "M7 10c0-3 2-5 5-5s5 2 5 5c0 2-1 3-3 4" }),
  /*#__PURE__*/React.createElement("path", { d: "M12 14v4M9 18h6" }),
  /*#__PURE__*/React.createElement("path", { d: "M4 14c0-2 1-3 3-4M20 14c0-2-1-3-3-4" }));

const SparkleIcon = ({ size = 16 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", { d: "M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z" }));

const ArrowLeftIcon = ({ size = 20 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", { d: "M19 12H5M12 19l-7-7 7-7" }));

const MapPinIcon = ({ size = 16 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", { d: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" }),
  /*#__PURE__*/React.createElement("circle", { cx: 12, cy: 10, r: 3 }));

const MoonIcon = ({ size = 16 }) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24", width: size, height: size, fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", { d: "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" }));

/* ---------- Small Fire SVG path for medal usage ---------- */
const FireMedalPath = ({ x, y, sc, fill }) => /*#__PURE__*/React.createElement("g", { transform: "translate(" + x + "," + y + ") scale(" + sc + ")" },
  /*#__PURE__*/React.createElement("path", { d: "M6 1c0 2-2 3-2 5a3 3 0 006 0c0-2-2-3-2-5", fill: "none", stroke: fill || "#FFF", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }),
  /*#__PURE__*/React.createElement("circle", { cx: 6, cy: 8, r: 1, fill: fill || "#FFF" }));

const MoonMedalPath = ({ x, y, sc, fill }) => /*#__PURE__*/React.createElement("g", { transform: "translate(" + x + "," + y + ") scale(" + sc + ")" },
  /*#__PURE__*/React.createElement("path", { d: "M10.5 6.4A4.5 4.5 0 115.6 1.5 3.5 3.5 0 0010.5 6.4z", fill: "none", stroke: fill || "#FFF", strokeWidth: 1.2, strokeLinecap: "round", strokeLinejoin: "round" }));

/* ---------- Custom Achievement Medal SVGs ---------- */
const ACHIEVEMENT_MEDALS = {
  first_run: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: unlocked ? '#FFE082' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 12, fill: unlocked ? '#FFD54F' : '#2A2740', opacity: unlocked ? 1 : 0.5 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 24, textAnchor: "middle", fontSize: 14, fill: unlocked ? '#5D4037' : '#666' }, "1"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#4140FF' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  ran_5k: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: unlocked ? '#A8E6CF' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 12, fill: unlocked ? '#81C784' : '#2A2740', opacity: unlocked ? 1 : 0.5 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 17, textAnchor: "middle", fontSize: 10, fontWeight: "bold", fill: unlocked ? '#1B5E20' : '#666' }, "5"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 27, textAnchor: "middle", fontSize: 7, fill: unlocked ? '#2E7D32' : '#666' }, "KM"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#A8E6CF' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  ran_10k: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: unlocked ? '#90CAF9' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 12, fill: unlocked ? '#64B5F6' : '#2A2740', opacity: unlocked ? 1 : 0.5 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 17, textAnchor: "middle", fontSize: 9, fontWeight: "bold", fill: unlocked ? '#0D47A1' : '#666' }, "10"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 27, textAnchor: "middle", fontSize: 7, fill: unlocked ? '#1565C0' : '#666' }, "KM"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#90CAF9' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  half_marathon: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: unlocked ? '#CE93D8' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 12, fill: unlocked ? '#AB47BC' : '#2A2740', opacity: unlocked ? 1 : 0.5 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 17, textAnchor: "middle", fontSize: 7, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "HALF"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 26, textAnchor: "middle", fontSize: 6, fill: unlocked ? '#E1BEE7' : '#666' }, "21.1K"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#CE93D8' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  marathon: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("defs", null,
      /*#__PURE__*/React.createElement("linearGradient", { id: "marathonGrad", x1: "0", y1: "0", x2: "1", y2: "1" },
        /*#__PURE__*/React.createElement("stop", { offset: "0%", stopColor: unlocked ? '#FFD700' : '#3A3550' }),
        /*#__PURE__*/React.createElement("stop", { offset: "100%", stopColor: unlocked ? '#FF6B35' : '#2A2740' }))),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: "url(#marathonGrad)", opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 12, fill: unlocked ? '#FF8F00' : '#2A2740', opacity: unlocked ? 0.8 : 0.5 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 17, textAnchor: "middle", fontSize: 6, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "FULL"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 26, textAnchor: "middle", fontSize: 6, fill: unlocked ? '#FFF8E1' : '#666' }, "42.2K"),
    /*#__PURE__*/React.createElement("polygon", { points: "16,36 24,44 32,36 29,36 24,41 19,36", fill: unlocked ? '#FFD700' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  total_50mi: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("rect", { x: 6, y: 6, width: 36, height: 28, rx: 6, fill: unlocked ? '#FFAB91' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 18, textAnchor: "middle", fontSize: 11, fontWeight: "bold", fill: unlocked ? '#BF360C' : '#666' }, "50"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 28, textAnchor: "middle", fontSize: 7, fill: unlocked ? '#D84315' : '#666' }, "MILES"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#FF8A65' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  total_100mi: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("rect", { x: 6, y: 6, width: 36, height: 28, rx: 6, fill: unlocked ? '#EF5350' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 18, textAnchor: "middle", fontSize: 10, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "100"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 28, textAnchor: "middle", fontSize: 7, fill: unlocked ? '#FFCDD2' : '#666' }, "MILES"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#EF5350' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  total_500mi: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("defs", null,
      /*#__PURE__*/React.createElement("linearGradient", { id: "g500", x1: "0", y1: "0", x2: "1", y2: "1" },
        /*#__PURE__*/React.createElement("stop", { offset: "0%", stopColor: unlocked ? '#E040FB' : '#3A3550' }),
        /*#__PURE__*/React.createElement("stop", { offset: "100%", stopColor: unlocked ? '#7C4DFF' : '#2A2740' }))),
    /*#__PURE__*/React.createElement("rect", { x: 6, y: 6, width: 36, height: 28, rx: 6, fill: "url(#g500)", opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 18, textAnchor: "middle", fontSize: 10, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "500"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 28, textAnchor: "middle", fontSize: 7, fill: unlocked ? '#E1BEE7' : '#666' }, "MILES"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#E040FB' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  streak_7: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: unlocked ? '#FF7043' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement(FireMedalPath, { x: 18, y: 8, sc: 1, fill: unlocked ? '#FFF' : '#666' }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 28, textAnchor: "middle", fontSize: 7, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "7 DAYS"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#FF7043' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  streak_30: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("defs", null,
      /*#__PURE__*/React.createElement("linearGradient", { id: "g30", x1: "0", y1: "0", x2: "1", y2: "1" },
        /*#__PURE__*/React.createElement("stop", { offset: "0%", stopColor: unlocked ? '#FF5722' : '#3A3550' }),
        /*#__PURE__*/React.createElement("stop", { offset: "100%", stopColor: unlocked ? '#FF9800' : '#2A2740' }))),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: "url(#g30)", opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement(FireMedalPath, { x: 18, y: 8, sc: 1, fill: unlocked ? '#FFF' : '#666' }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 27, textAnchor: "middle", fontSize: 6, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "30 DAYS"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#FF5722' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  speed_demon: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: unlocked ? '#40C4FF' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement(BoltIcon, { size: 14 }),
    /*#__PURE__*/React.createElement("g", { transform: "translate(17,10) scale(0.6)" },
      /*#__PURE__*/React.createElement("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2", fill: "none", stroke: unlocked ? '#FFF' : '#666', strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" })),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 28, textAnchor: "middle", fontSize: 5, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "SPEED"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#40C4FF' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  ten_runs: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: unlocked ? '#66BB6A' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 18, textAnchor: "middle", fontSize: 11, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "10"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 28, textAnchor: "middle", fontSize: 6, fill: unlocked ? '#C8E6C9' : '#666' }, "RUNS"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#66BB6A' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  fifty_runs: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("defs", null,
      /*#__PURE__*/React.createElement("linearGradient", { id: "g50r", x1: "0", y1: "0", x2: "1", y2: "1" },
        /*#__PURE__*/React.createElement("stop", { offset: "0%", stopColor: unlocked ? '#7B7BFF' : '#3A3550' }),
        /*#__PURE__*/React.createElement("stop", { offset: "100%", stopColor: unlocked ? '#A8E6CF' : '#2A2740' }))),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: "url(#g50r)", opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 18, textAnchor: "middle", fontSize: 11, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "50"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 28, textAnchor: "middle", fontSize: 6, fill: unlocked ? '#E8E0F0' : '#666' }, "RUNS"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#7B7BFF' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  early_bird: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: unlocked ? '#FFF9C4' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("g", { transform: "translate(16,10) scale(0.7)" },
      /*#__PURE__*/React.createElement("circle", { cx: 12, cy: 7, r: 5, fill: "none", stroke: unlocked ? '#F57F17' : '#666', strokeWidth: 2 }),
      /*#__PURE__*/React.createElement("path", { d: "M12 2v-2M17 7h2M7 7H5M15.5 3.5l1.5-1.5M8.5 3.5L7 2", fill: "none", stroke: unlocked ? '#F57F17' : '#666', strokeWidth: 1.5, strokeLinecap: "round" })),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 29, textAnchor: "middle", fontSize: 5, fontWeight: "bold", fill: unlocked ? '#F57F17' : '#666' }, "EARLY"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#FFF176' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  night_owl: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: unlocked ? '#1A237E' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement(MoonMedalPath, { x: 18, y: 9, sc: 1.1, fill: unlocked ? '#FFF' : '#666' }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 29, textAnchor: "middle", fontSize: 5, fontWeight: "bold", fill: unlocked ? '#9FA8DA' : '#666' }, "NIGHT"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#3F51B5' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  ran_1mi: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: unlocked ? '#4DD0C8' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 12, fill: unlocked ? '#26A69A' : '#2A2740', opacity: unlocked ? 1 : 0.5 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 18, textAnchor: "middle", fontSize: 12, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "1"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 27, textAnchor: "middle", fontSize: 7, fill: unlocked ? '#B2DFDB' : '#666' }, "MILE"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#4DD0C8' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  three_runs: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: unlocked ? '#FF7043' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 12, fill: unlocked ? '#E64A19' : '#2A2740', opacity: unlocked ? 1 : 0.5 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 20, textAnchor: "middle", fontSize: 14, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "3"),
    /*#__PURE__*/React.createElement("circle", { cx: 18, cy: 27, r: 1.5, fill: unlocked ? '#FFCCBC' : '#666' }),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 27, r: 1.5, fill: unlocked ? '#FFCCBC' : '#666' }),
    /*#__PURE__*/React.createElement("circle", { cx: 30, cy: 27, r: 1.5, fill: unlocked ? '#FFCCBC' : '#666' }),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#FF7043' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  five_runs: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: unlocked ? '#EC407A' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 12, fill: unlocked ? '#C2185B' : '#2A2740', opacity: unlocked ? 1 : 0.5 }),
    /*#__PURE__*/React.createElement("line", { x1: 24, y1: 12, x2: 24, y2: 8, stroke: unlocked ? '#FFF' : '#666', strokeWidth: 1.5, strokeLinecap: "round" }),
    /*#__PURE__*/React.createElement("line", { x1: 24, y1: 12, x2: 28, y2: 9, stroke: unlocked ? '#FFF' : '#666', strokeWidth: 1.5, strokeLinecap: "round" }),
    /*#__PURE__*/React.createElement("line", { x1: 24, y1: 12, x2: 20, y2: 9, stroke: unlocked ? '#FFF' : '#666', strokeWidth: 1.5, strokeLinecap: "round" }),
    /*#__PURE__*/React.createElement("line", { x1: 24, y1: 12, x2: 29, y2: 12, stroke: unlocked ? '#FFF' : '#666', strokeWidth: 1.5, strokeLinecap: "round" }),
    /*#__PURE__*/React.createElement("line", { x1: 24, y1: 12, x2: 19, y2: 12, stroke: unlocked ? '#FFF' : '#666', strokeWidth: 1.5, strokeLinecap: "round" }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 24, textAnchor: "middle", fontSize: 10, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "5"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#EC407A' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  twenty_five_runs: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: unlocked ? '#B0BEC5' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 12, fill: unlocked ? '#90A4AE' : '#2A2740', opacity: unlocked ? 1 : 0.5 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 18, textAnchor: "middle", fontSize: 11, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "25"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 27, textAnchor: "middle", fontSize: 6, fill: unlocked ? '#ECEFF1' : '#666' }, "RUNS"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#B0BEC5' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  hundred_runs: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("defs", null,
      /*#__PURE__*/React.createElement("linearGradient", { id: "g_hundred_runs", x1: "0", y1: "0", x2: "1", y2: "1" },
        /*#__PURE__*/React.createElement("stop", { offset: "0%", stopColor: unlocked ? '#FFD54F' : '#3A3550' }),
        /*#__PURE__*/React.createElement("stop", { offset: "100%", stopColor: unlocked ? '#FF8F00' : '#2A2740' }))),
    /*#__PURE__*/React.createElement("rect", { x: 6, y: 4, width: 36, height: 30, rx: 6, fill: "url(#g_hundred_runs)", opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 17, textAnchor: "middle", fontSize: 10, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "100"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 27, textAnchor: "middle", fontSize: 7, fill: unlocked ? '#FFF8E1' : '#666' }, "RUNS"),
    /*#__PURE__*/React.createElement("polygon", { points: "16,36 24,44 32,36 29,36 24,41 19,36", fill: unlocked ? '#FFD54F' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  total_10mi: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("polygon", { points: "24,4 36,10 36,26 24,32 12,26 12,10", fill: unlocked ? '#A8E6CF' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("polygon", { points: "24,8 33,13 33,24 24,29 15,24 15,13", fill: unlocked ? '#66BB6A' : '#2A2740', opacity: unlocked ? 1 : 0.5 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 17, textAnchor: "middle", fontSize: 10, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "10"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 25, textAnchor: "middle", fontSize: 7, fill: unlocked ? '#E8F5E9' : '#666' }, "MI"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#A8E6CF' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  total_25mi: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("rect", { x: 10, y: 6, width: 28, height: 28, rx: 2, fill: unlocked ? '#CFD8DC' : '#3A3550', opacity: unlocked ? 1 : 0.4, transform: "rotate(45 24 20)" }),
    /*#__PURE__*/React.createElement("rect", { x: 14, y: 10, width: 20, height: 20, rx: 1, fill: unlocked ? '#90A4AE' : '#2A2740', opacity: unlocked ? 1 : 0.5, transform: "rotate(45 24 20)" }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 18, textAnchor: "middle", fontSize: 9, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "25"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 26, textAnchor: "middle", fontSize: 6, fill: unlocked ? '#ECEFF1' : '#666' }, "MI"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,38 24,44 30,38 28,38 24,42 20,38", fill: unlocked ? '#CFD8DC' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  total_250mi: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("polygon", { points: "24,2 27,10 36,10 29,16 31,24 24,19 17,24 19,16 12,10 21,10", fill: unlocked ? '#FFD54F' : '#3A3550', opacity: unlocked ? 0.6 : 0.2 }),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 18, r: 12, fill: unlocked ? '#FFC107' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 18, r: 9, fill: unlocked ? '#FFB300' : '#2A2740', opacity: unlocked ? 1 : 0.5 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 17, textAnchor: "middle", fontSize: 8, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "250"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 25, textAnchor: "middle", fontSize: 5, fill: unlocked ? '#FFF8E1' : '#666' }, "MI"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,34 24,40 30,34 28,34 24,38 20,34", fill: unlocked ? '#FFC107' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  total_1000mi: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("defs", null,
      /*#__PURE__*/React.createElement("linearGradient", { id: "g_total_1000mi", x1: "0", y1: "0", x2: "1", y2: "1" },
        /*#__PURE__*/React.createElement("stop", { offset: "0%", stopColor: unlocked ? '#FF6B6B' : '#3A3550' }),
        /*#__PURE__*/React.createElement("stop", { offset: "50%", stopColor: unlocked ? '#FF96C8' : '#3A3550' }),
        /*#__PURE__*/React.createElement("stop", { offset: "100%", stopColor: unlocked ? '#7DD8A0' : '#2A2740' }))),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: "url(#g_total_1000mi)", opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 12, fill: unlocked ? 'rgba(255,255,255,0.2)' : '#2A2740', opacity: unlocked ? 1 : 0.5 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 22, textAnchor: "middle", fontSize: 12, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "1K"),
    /*#__PURE__*/React.createElement("polygon", { points: "14,36 24,44 34,36 31,36 24,42 17,36", fill: unlocked ? '#FF6B6B' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  streak_3: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: unlocked ? '#A5D6A7' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("g", { transform: "translate(19,6) scale(0.5)" },
      /*#__PURE__*/React.createElement("path", { d: "M6 1c0 2-2 3-2 5a3 3 0 006 0c0-2-2-3-2-5", fill: "none", stroke: unlocked ? '#2E7D32' : '#666', strokeWidth: 2, strokeLinecap: "round" })),
    /*#__PURE__*/React.createElement("g", { transform: "translate(22,8) scale(0.5)" },
      /*#__PURE__*/React.createElement("path", { d: "M6 1c0 2-2 3-2 5a3 3 0 006 0c0-2-2-3-2-5", fill: "none", stroke: unlocked ? '#388E3C' : '#666', strokeWidth: 2, strokeLinecap: "round" })),
    /*#__PURE__*/React.createElement("g", { transform: "translate(25,6) scale(0.5)" },
      /*#__PURE__*/React.createElement("path", { d: "M6 1c0 2-2 3-2 5a3 3 0 006 0c0-2-2-3-2-5", fill: "none", stroke: unlocked ? '#2E7D32' : '#666', strokeWidth: 2, strokeLinecap: "round" })),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 24, textAnchor: "middle", fontSize: 10, fontWeight: "bold", fill: unlocked ? '#1B5E20' : '#666' }, "3"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#A5D6A7' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  streak_14: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: unlocked ? '#7E57C2' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("rect", { x: 17, y: 8, width: 6, height: 6, rx: 1, fill: "none", stroke: unlocked ? '#FFF' : '#666', strokeWidth: 1 }),
    /*#__PURE__*/React.createElement("rect", { x: 25, y: 8, width: 6, height: 6, rx: 1, fill: "none", stroke: unlocked ? '#FFF' : '#666', strokeWidth: 1 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 22, textAnchor: "middle", fontSize: 9, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "14"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 29, textAnchor: "middle", fontSize: 5, fill: unlocked ? '#D1C4E9' : '#666' }, "DAYS"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#7E57C2' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  streak_100: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("defs", null,
      /*#__PURE__*/React.createElement("linearGradient", { id: "g_streak_100", x1: "0", y1: "0", x2: "1", y2: "1" },
        /*#__PURE__*/React.createElement("stop", { offset: "0%", stopColor: unlocked ? '#EF5350' : '#3A3550' }),
        /*#__PURE__*/React.createElement("stop", { offset: "100%", stopColor: unlocked ? '#FFD54F' : '#2A2740' }))),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: "url(#g_streak_100)", opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("polygon", { points: "18,8 20,4 24,7 28,4 30,8", fill: unlocked ? '#FFD54F' : '#666', opacity: unlocked ? 0.9 : 0.4 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 22, textAnchor: "middle", fontSize: 10, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "100"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#EF5350' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  long_run_15k: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: unlocked ? '#00897B' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("path", { d: "M14 24 Q18 12 24 20 Q30 28 34 16", fill: "none", stroke: unlocked ? '#B2DFDB' : '#666', strokeWidth: 2, strokeLinecap: "round" }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 15, textAnchor: "middle", fontSize: 8, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "15K"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#00897B' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  sub_5_pace: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: unlocked ? '#2979FF' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("polygon", { points: "26,6 22,16 28,16 22,28", fill: "none", stroke: unlocked ? '#FFF' : '#666', strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 17, textAnchor: "middle", fontSize: 5, fontWeight: "bold", fill: unlocked ? '#BBDEFB' : '#666' }, "SUB"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 27, textAnchor: "middle", fontSize: 7, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "5:00"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#2979FF' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  weekend_warrior: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("defs", null,
      /*#__PURE__*/React.createElement("linearGradient", { id: "g_weekend_warrior", x1: "0", y1: "0", x2: "0", y2: "1" },
        /*#__PURE__*/React.createElement("stop", { offset: "0%", stopColor: unlocked ? '#FF7043' : '#3A3550' }),
        /*#__PURE__*/React.createElement("stop", { offset: "100%", stopColor: unlocked ? '#EC407A' : '#2A2740' }))),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: "url(#g_weekend_warrior)", opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 16, textAnchor: "middle", fontSize: 6, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "SAT"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 26, textAnchor: "middle", fontSize: 6, fontWeight: "bold", fill: unlocked ? '#FFCCBC' : '#666' }, "SUN"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#FF7043' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  lunch_run: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: unlocked ? '#FFEE58' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 18, r: 9, fill: unlocked ? '#FDD835' : '#2A2740', opacity: unlocked ? 1 : 0.5 }),
    /*#__PURE__*/React.createElement("line", { x1: 24, y1: 18, x2: 24, y2: 12, stroke: unlocked ? '#5D4037' : '#666', strokeWidth: 1.5, strokeLinecap: "round" }),
    /*#__PURE__*/React.createElement("line", { x1: 24, y1: 18, x2: 28, y2: 18, stroke: unlocked ? '#5D4037' : '#666', strokeWidth: 1.5, strokeLinecap: "round" }),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 18, r: 1, fill: unlocked ? '#5D4037' : '#666' }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 33, textAnchor: "middle", fontSize: 5, fontWeight: "bold", fill: unlocked ? '#5D4037' : '#666' }, "NOON"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#FFEE58' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 }))
};

const getAchievementMedal = (id, unlocked) => {
  const renderer = ACHIEVEMENT_MEDALS[id];
  return renderer ? renderer(unlocked) : /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: unlocked ? '#B0BEC5' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 24, textAnchor: "middle", fontSize: 10, fill: unlocked ? '#37474F' : '#666' }, "?"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#B0BEC5' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 }));
};

/* ---------- CSS injected once ---------- */

const RunClubStyles = () => /*#__PURE__*/React.createElement("style", null, `
  /* === RESET & STACKING FIX === */
  .anim-page-in { transform: none !important; filter: none !important; }
  .fixed.bottom-0.z-20 { z-index: 200 !important; }

  /* === RAINBOW DOODLES BACKGROUND === */
  .rc-pastel-bg {
    background: #FFFDF7;
    background-image:
      radial-gradient(ellipse at 10% 0%, rgba(255,107,107,0.12) 0%, transparent 50%),
      radial-gradient(ellipse at 40% 5%, rgba(255,179,71,0.10) 0%, transparent 45%),
      radial-gradient(ellipse at 70% 0%, rgba(255,230,109,0.10) 0%, transparent 45%),
      radial-gradient(ellipse at 90% 15%, rgba(119,221,119,0.10) 0%, transparent 45%),
      radial-gradient(ellipse at 20% 90%, rgba(100,181,246,0.10) 0%, transparent 50%),
      radial-gradient(ellipse at 60% 95%, rgba(186,147,255,0.12) 0%, transparent 50%),
      radial-gradient(ellipse at 85% 80%, rgba(119,221,119,0.08) 0%, transparent 45%);
    position: relative;
    overflow: hidden;
  }
  .rc-pastel-bg::before {
    content: '✏️ ⭐ ✨ 🎨 ⚡ 🏃 💨 🔥 🌈';
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    font-size: 22px; line-height: 80px; letter-spacing: 40px;
    word-spacing: 60px; padding: 30px 20px;
    opacity: 0.07; pointer-events: none;
    overflow: hidden; word-break: break-all;
    animation: rcDoodleScroll 60s linear infinite;
  }
  .rc-pastel-bg::after {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 4px;
    background: linear-gradient(90deg, #FF6B6B, #FFB347, #FFE66D, #77DD77, #64B5F6, #BA93FF, #FF96C8);
    z-index: 2; pointer-events: none;
  }
  @keyframes rcDoodleScroll {
    0% { transform: translateY(0); }
    100% { transform: translateY(-50%); }
  }
  @media (prefers-color-scheme: dark) {
    .rc-pastel-bg {
      background: #0D0B14;
      background-image:
        radial-gradient(ellipse at 10% 0%, rgba(255,107,107,0.06) 0%, transparent 50%),
        radial-gradient(ellipse at 40% 5%, rgba(255,179,71,0.05) 0%, transparent 45%),
        radial-gradient(ellipse at 70% 0%, rgba(255,230,109,0.04) 0%, transparent 45%),
        radial-gradient(ellipse at 90% 15%, rgba(119,221,119,0.05) 0%, transparent 45%),
        radial-gradient(ellipse at 20% 90%, rgba(100,181,246,0.05) 0%, transparent 50%),
        radial-gradient(ellipse at 60% 95%, rgba(186,147,255,0.06) 0%, transparent 50%);
    }
    .rc-pastel-bg::before { opacity: 0.04; }
    .rc-pastel-bg::after {
      background: linear-gradient(90deg, #FF6B6B, #FFB347, #FFE66D, #77DD77, #64B5F6, #BA93FF, #FF96C8);
      opacity: 0.7;
    }
  }

  /* === GLASS CARDS === */
  .rc-glass {
    background: rgba(255,255,255,0.65);
    backdrop-filter: blur(20px) saturate(1.4);
    -webkit-backdrop-filter: blur(20px) saturate(1.4);
    border: 1px solid rgba(255,255,255,0.5);
    border-radius: 24px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.6);
    transition: transform 0.25s cubic-bezier(.22,1,.36,1), box-shadow 0.25s ease;
  }
  .rc-glass:active { transform: scale(0.98); box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
  @media (prefers-color-scheme: dark) {
    .rc-glass {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      box-shadow: 0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03);
    }
  }

  /* === LAYOUT === */
  .rc-inner {
    width: 100%; max-width: 480px; margin: 0 auto;
    padding: 16px 20px calc(100px + env(safe-area-inset-bottom)) 20px;
    min-height: 100%;
    position: relative; z-index: 1;
  }

  /* === ANIMATIONS — Smooth & Purposeful === */
  @keyframes rcSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes rcPopIn { 0% { opacity: 0; transform: scale(0.92); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes rcFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes rcFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
  @keyframes rcPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.8; } }
  @keyframes rcDotPing { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
  @keyframes rcSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes rcShine { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.2); } }
  @keyframes rcShimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
  @keyframes rcOrbDrift { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(-40px, 60px) scale(1.15); } }
  @keyframes rcOrbDrift2 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(50px, -40px) scale(0.9); } }
  @keyframes rcProgressGlow { 0%,100% { filter: drop-shadow(0 0 6px rgba(100,181,246,0.3)); } 50% { filter: drop-shadow(0 0 16px rgba(255,107,107,0.5)); } }
  @keyframes rcBreathe { 0%,100% { box-shadow: 0 4px 24px rgba(255,107,107,0.3), 0 0 0 0 rgba(100,181,246,0.15); } 50% { box-shadow: 0 8px 40px rgba(119,221,119,0.35), 0 0 0 6px rgba(186,147,255,0.1); } }
  @keyframes rcStartGlow { 0%,100% { box-shadow: 0 6px 28px rgba(255,107,107,0.3); transform: translateY(0); } 50% { box-shadow: 0 10px 40px rgba(100,181,246,0.45); transform: translateY(-2px); } }
  @keyframes rcConfetti { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(-120px) rotate(720deg); opacity: 0; } }
  @keyframes rcCountIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
  @keyframes rcCountRing { 0% { stroke-dashoffset: 283; } 100% { stroke-dashoffset: 0; } }
  @keyframes rcGoExplode { 0% { transform: scale(0.2); opacity: 0; } 40% { transform: scale(1.25); opacity: 1; } 65% { transform: scale(0.95); } 100% { transform: scale(1); opacity: 1; } }
  @keyframes rcGoRays { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(1.8); opacity: 0; } }
  @keyframes rcToastIn { 0% { transform: translateY(60px) scale(0.9); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
  @keyframes rcMedalBounce { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 75% { transform: scale(0.95); } 100% { transform: scale(1); } }
  @keyframes rcAutoPulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
  @keyframes rcBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
  @keyframes rcCountOut { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
  @keyframes rcGradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }

  /* === UTILITY CLASSES === */
  .rc-slide-up { animation: rcSlideUp 0.55s cubic-bezier(.16,1,.3,1) both; }
  .rc-pop-in { animation: rcPopIn 0.45s cubic-bezier(.16,1,.3,1) both; }
  .rc-fade-in { animation: rcFadeIn 0.4s ease-out both; }
  .rc-shine { animation: rcShine 3s ease-in-out infinite; }
  .rc-shimmer { background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%); background-size: 200% 100%; animation: rcShimmer 2.5s ease-in-out infinite; }
  .rc-float { animation: rcFloat 5s ease-in-out infinite; }

  .rc-stagger > *:nth-child(1) { animation-delay: 0s; }
  .rc-stagger > *:nth-child(2) { animation-delay: 0.06s; }
  .rc-stagger > *:nth-child(3) { animation-delay: 0.12s; }
  .rc-stagger > *:nth-child(4) { animation-delay: 0.18s; }
  .rc-stagger > *:nth-child(5) { animation-delay: 0.24s; }
  .rc-stagger > *:nth-child(6) { animation-delay: 0.30s; }
  .rc-stagger > *:nth-child(7) { animation-delay: 0.36s; }
  .rc-stagger > *:nth-child(8) { animation-delay: 0.42s; }

  /* === NAVIGATION PILLS === */
  .rc-nav-pill {
    transition: all 0.3s cubic-bezier(.16,1,.3,1);
    position: relative; overflow: hidden;
    -webkit-tap-highlight-color: transparent;
  }
  .rc-nav-pill:active { transform: scale(0.93); }

  /* === MAP === */
  .rc-current-pos { animation: rcPulse 2s ease-in-out infinite; }
  .leaflet-container { background: #0D0B14 !important; }
  .leaflet-control-attribution { display: none !important; }

  /* === RAINBOW GRADIENT TEXT === */
  .rc-gradient-text {
    background: linear-gradient(135deg, #FF6B6B 0%, #FFB347 20%, #FFE66D 40%, #77DD77 60%, #64B5F6 80%, #BA93FF 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* === STAT PILL === */
  .rc-stat-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 14px; border-radius: 100px;
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.04em;
  }

  /* === REDUCED MOTION === */
  @media (prefers-reduced-motion: reduce) {
    .rc-slide-up, .rc-pop-in, .rc-shine, .rc-fade-in, .rc-float, .rc-shimmer,
    .rc-pastel-bg::before, .rc-pastel-bg::after { animation: none !important; }
  }
`);

/* ---------- Progress Ring ---------- */

const RCProgressRing = ({ progress, size = 200, stroke = 8, label, sublabel }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - Math.min(1, Math.max(0, progress)) * circumference;
  return /*#__PURE__*/React.createElement("div", { style: { position: 'relative', width: size, height: size } },
    /*#__PURE__*/React.createElement("svg", {
      width: size, height: size,
      style: { transform: 'rotate(-90deg)', animation: 'rcProgressGlow 3s ease-in-out infinite' }
    },
      /*#__PURE__*/React.createElement("circle", { cx: size/2, cy: size/2, r: radius, fill: "none", stroke: "rgba(123,123,255,0.12)", strokeWidth: stroke }),
      /*#__PURE__*/React.createElement("circle", { cx: size/2, cy: size/2, r: radius, fill: "none", stroke: "url(#rcGradV4)", strokeWidth: stroke,
        strokeDasharray: circumference, strokeDashoffset: offset, strokeLinecap: "round",
        style: { transition: 'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)' } }),
      /*#__PURE__*/React.createElement("defs", null,
        /*#__PURE__*/React.createElement("linearGradient", { id: "rcGradV4", x1: "0", y1: "0", x2: "1", y2: "1" },
          /*#__PURE__*/React.createElement("stop", { offset: "0%", stopColor: "#FF6B6B" }),
          /*#__PURE__*/React.createElement("stop", { offset: "50%", stopColor: "#FF96C8" }),
          /*#__PURE__*/React.createElement("stop", { offset: "100%", stopColor: "#7DD8A0" })))
    ),
    /*#__PURE__*/React.createElement("div", {
      style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }
    },
      /*#__PURE__*/React.createElement("div", {
        className: "font-display",
        style: { fontSize: Math.round(size * 0.18), lineHeight: 1, color: '#E8E0F0' }
      }, label),
      sublabel && /*#__PURE__*/React.createElement("div", {
        style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: 4, color: '#9B95B0' }
      }, sublabel)
    )
  );
};

/* ---------- Helpers ---------- */

const formatDistance = (meters) => { if (meters < 1000) return meters + 'm'; return (meters / 1000).toFixed(2) + ' km'; };
const formatDistanceMiles = (meters) => { const mi = meters / 1609.344; return mi < 0.01 ? '0.00' : mi.toFixed(2); };
const formatPace = (secPerKm) => { if (!secPerKm || secPerKm <= 0) return '--:--'; const m = Math.floor(secPerKm / 60); const s = Math.floor(secPerKm % 60); return m + ':' + s.toString().padStart(2, '0'); };
const formatDuration = (totalSec) => {
  const h = Math.floor(totalSec / 3600); const m = Math.floor((totalSec % 3600) / 60); const s = Math.floor(totalSec % 60);
  if (h > 0) return h + ':' + m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
  return m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
};
const formatDateShort = (iso) => { const d = new Date(iso); const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return mo[d.getMonth()] + ' ' + d.getDate(); };
const formatDateFull = (iso) => {
  var d = new Date(iso);
  var mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var h = d.getHours(); var m = d.getMinutes();
  var ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return mo[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() + ' at ' + h + ':' + m.toString().padStart(2, '0') + ' ' + ampm;
};
const estimateCalories = (distanceM) => Math.round((distanceM / 1000) * 60);
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/* ---------- Reverse Geocode Helper ---------- */
var reverseGeocode = function(lat, lng) {
  return fetch('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lng + '&format=json&zoom=14')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && data.address) {
        var a = data.address;
        var parts = [];
        if (a.neighbourhood || a.suburb || a.quarter) parts.push(a.neighbourhood || a.suburb || a.quarter);
        if (a.city || a.town || a.village) parts.push(a.city || a.town || a.village);
        return parts.join(', ') || data.display_name || null;
      }
      return null;
    })
    .catch(function() { return null; });
};

/* ---------- LeafletMap Component (replaces RouteMapPreview) ---------- */
var LeafletMap = function(props) {
  var route = props.route;
  var live = props.live;
  var mapH = props.height || 220;
  var containerRef = useRef(null);
  var mapRef = useRef(null);
  var polylineRef = useRef(null);
  var startMarkerRef = useRef(null);
  var endMarkerRef = useRef(null);

  // Initialize map
  useEffect(function() {
    if (!containerRef.current) return;
    var cancelled = false;
    loadLeaflet().then(function() {
      if (cancelled || !containerRef.current || !window.L) return;
      var L = window.L;
      var map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: true,
        tap: true
      });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      if (route && route.length >= 2) {
        var latlngs = route.map(function(p) { return [p.lat, p.lng]; });
        polylineRef.current = L.polyline(latlngs, {
          color: '#FF6B6B', weight: 4, opacity: 0.9,
          lineCap: 'round', lineJoin: 'round'
        }).addTo(map);
        startMarkerRef.current = L.circleMarker(latlngs[0], {
          radius: 7, fillColor: '#7DD8A0', fillOpacity: 1, color: '#FFF', weight: 2
        }).addTo(map);
        endMarkerRef.current = L.circleMarker(latlngs[latlngs.length - 1], {
          radius: 7, fillColor: '#FF6B6B', fillOpacity: 1, color: '#FFF', weight: 2
        }).addTo(map);
        map.fitBounds(polylineRef.current.getBounds(), { padding: [30, 30] });
      } else if (route && route.length === 1) {
        map.setView([route[0].lat, route[0].lng], 16);
        startMarkerRef.current = L.circleMarker([route[0].lat, route[0].lng], {
          radius: 7, fillColor: '#7DD8A0', fillOpacity: 1, color: '#FFF', weight: 2
        }).addTo(map);
      } else {
        map.setView([40.4168, -3.7038], 14);
      }
      mapRef.current = map;
      setTimeout(function() { map.invalidateSize(); }, 100);
    });
    return function() {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      polylineRef.current = null;
      startMarkerRef.current = null;
      endMarkerRef.current = null;
    };
  }, []);

  // Update route when live
  useEffect(function() {
    if (!mapRef.current || !window.L || !route || route.length < 1) return;
    var L = window.L;
    var latlngs = route.map(function(p) { return [p.lat, p.lng]; });

    if (polylineRef.current) {
      polylineRef.current.setLatLngs(latlngs);
    } else if (latlngs.length >= 2) {
      polylineRef.current = L.polyline(latlngs, {
        color: '#FF6B6B', weight: 4, opacity: 0.9,
        lineCap: 'round', lineJoin: 'round'
      }).addTo(mapRef.current);
    }

    if (!startMarkerRef.current && latlngs.length >= 1) {
      startMarkerRef.current = L.circleMarker(latlngs[0], {
        radius: 7, fillColor: '#7DD8A0', fillOpacity: 1, color: '#FFF', weight: 2
      }).addTo(mapRef.current);
    }

    var last = latlngs[latlngs.length - 1];
    if (endMarkerRef.current) {
      endMarkerRef.current.setLatLng(last);
    } else if (latlngs.length >= 2) {
      endMarkerRef.current = L.circleMarker(last, {
        radius: 7, fillColor: '#FF6B6B', fillOpacity: 1, color: '#FFF', weight: 2
      }).addTo(mapRef.current);
    }

    if (live && latlngs.length > 0) {
      mapRef.current.panTo(last, { animate: true, duration: 0.5 });
    }
  }, [route, live]);

  return /*#__PURE__*/React.createElement("div", {
    ref: containerRef,
    className: "rc-pop-in",
    style: {
      width: '100%', height: mapH, borderRadius: 16, overflow: 'hidden',
      marginBottom: 16, border: '1px solid rgba(255,107,107,0.15)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
    }
  });
};

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

const RunClubScreen = ({ profile }) => {
  const [view, setView] = useState('dashboard');
  const [runStats, setRunStats] = useState(null);
  const [runs, setRuns] = useState([]);
  const [lbRows, setLbRows] = useState([]);
  const [lbScope, setLbScope] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const api = typeof window !== 'undefined' ? window.DON_API : null;

  // Access control
  const [accessStatus, setAccessStatus] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessLoading, setAccessLoading] = useState(true);
  const [requestSocial, setRequestSocial] = useState('');
  const [requestMsg, setRequestMsg] = useState('');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [reviewNote, setReviewNote] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState(null);

  // Achievements + community + coach
  const [achievements, setAchievements] = useState([]);
  const [community, setCommunity] = useState(null);
  const [coachTips, setCoachTips] = useState([]);
  const [showPostRun, setShowPostRun] = useState(false);

  // Run mode
  const [runMode, setRunMode] = useState(null);
  const [goalUnit, setGoalUnit] = useState('mi');
  const [goalTarget, setGoalTarget] = useState('3');
  const [goalReached, setGoalReached] = useState(false);

  // Countdown
  const [countdown, setCountdown] = useState(null);
  const countdownRef = useRef(null);

  // GPS state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [gpsRoute, setGpsRoute] = useState([]);
  const [gpsError, setGpsError] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [currentSpeed, setCurrentSpeed] = useState(0); // m/s
  const [splits, setSplits] = useState([]);
  const watchIdRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedAtRef = useRef(0);
  const timerRef = useRef(null);
  const lastPosRef = useRef(null);
  const lastSplitTimeRef = useRef(0);
  // GPS smoothing buffer for Kalman-like filtering
  const gpsBufRef = useRef([]);

  // Screen Wake Lock — keeps phone awake during run
  const wakeLockRef = useRef(null);
  const acquireWakeLock = async function() {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', function() { wakeLockRef.current = null; });
      }
    } catch (e) { /* wake lock not supported or failed */ }
  };
  const releaseWakeLock = function() {
    if (wakeLockRef.current) { wakeLockRef.current.release().catch(function() {}); wakeLockRef.current = null; }
  };

  // Post-run zone
  const [runZone, setRunZone] = useState(null);

  // Auto-pause
  const [autoPaused, setAutoPaused] = useState(false);
  const lastMovementRef = useRef(null);
  const autoPauseTimerRef = useRef(null);

  // Achievement unlock toasts
  const [unlockToasts, setUnlockToasts] = useState([]);

  // Run detail view
  const [selectedRun, setSelectedRun] = useState(null);
  const [selectedRunData, setSelectedRunData] = useState(null);
  const [selectedRunZone, setSelectedRunZone] = useState(null);

  // Check access
  useEffect(() => {
    if (!api) return;
    setAccessLoading(true);
    api.runAccessStatus().then(data => {
      setAccessStatus(data.status); setIsAdmin(!!data.isAdmin); setAccessLoading(false);
    }).catch(() => { setAccessStatus('none'); setAccessLoading(false); });
  }, []);

  // Load data
  useEffect(() => {
    if (!api || accessStatus !== 'approved') return;
    setLoading(true);
    Promise.all([
      api.getRunStats().catch(() => null),
      api.getRuns(10).catch(() => ({ runs: [] })),
      api.runLeaderboard('weekly', 20).catch(() => ({ rows: [] })),
      api.runAchievements().catch(() => ({ achievements: [] })),
      api.communityStats().catch(() => null)
    ]).then(([stats, history, lb, achv, comm]) => {
      if (stats) setRunStats(stats);
      if (history && history.runs) setRuns(history.runs);
      if (lb && lb.rows) setLbRows(lb.rows);
      if (achv && achv.achievements) setAchievements(achv.achievements);
      if (comm) setCommunity(comm);
      setLoading(false);
    });
  }, [view, accessStatus]);

  useEffect(() => {
    if (!api || view !== 'leaderboard') return;
    api.runLeaderboard(lbScope, 20).then(lb => { if (lb && lb.rows) setLbRows(lb.rows); }).catch(() => {});
  }, [lbScope]);

  // Admin: load ALL requests (pending + reviewed)
  useEffect(() => {
    if (!api || !isAdmin || view !== 'admin') return;
    Promise.all([
      api.pendingAccess().catch(() => ({ requests: [] })),
      api.allAccess().catch(() => ({ requests: [] }))
    ]).then(([pending, all]) => {
      if (pending && pending.requests) setPendingRequests(pending.requests);
      if (all && all.requests) setAllRequests(all.requests);
    });
  }, [view, isAdmin]);

  const handleRequestAccess = async () => {
    if (!api || requestLoading) return;
    if (!requestSocial.trim()) { setRequestError('Please enter your social handle'); return; }
    setRequestLoading(true);
    setRequestError(null);
    try {
      const res = await api.requestRunAccess({ socialProof: requestSocial, message: requestMsg });
      setAccessStatus(res.status || 'pending');
      setRequestLoading(false);
    } catch (e) {
      console.warn('Request access failed:', e);
      setRequestError('Could not submit request. Check your connection and try again.');
      setRequestLoading(false);
    }
  };

  const handleReview = async (id, decision) => {
    if (!api) return;
    try {
      await api.reviewAccess(id, decision, reviewNote);
      setPendingRequests(prev => prev.filter(r => r.id !== id));
      setAllRequests(prev => prev.map(r => r.id === id ? { ...r, status: decision } : r));
      setReviewNote('');
    } catch (e) {}
  };

  // Timer
  useEffect(() => {
    if (isRunning && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000) + pausedAtRef.current);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, isPaused]);

  // Auto-pause: if no GPS movement for 20s, show auto-pause indicator
  useEffect(() => {
    if (!isRunning || isPaused) return;
    lastMovementRef.current = Date.now();
    autoPauseTimerRef.current = setInterval(function() {
      if (lastMovementRef.current && Date.now() - lastMovementRef.current > 20000) {
        setAutoPaused(true);
      }
    }, 5000);
    return function() { if (autoPauseTimerRef.current) clearInterval(autoPauseTimerRef.current); };
  }, [isRunning, isPaused]);

  // Goal reached
  useEffect(() => {
    if (!runMode || runMode === 'free' || goalReached) return;
    const targetM = runMode.unit === 'mi' ? runMode.target * 1609.344 : runMode.target * 1000;
    if (distance >= targetM) { setGoalReached(true); if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 300]); }
  }, [distance, runMode, goalReached]);

  const startGpsWatch = () => {
    gpsBufRef.current = [];
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed: nativeSpeed } = pos.coords;
        var now = Date.now();
        setGpsAccuracy(Math.round(accuracy));

        // Adaptive accuracy threshold: tighter when moving, looser when starting
        var accThreshold = lastPosRef.current ? 35 : 60;
        if (accuracy > accThreshold) return;

        // GPS smoothing: weighted average of last 3 readings (more recent = higher weight)
        var buf = gpsBufRef.current;
        buf.push({ lat: latitude, lng: longitude, ts: now, acc: accuracy });
        if (buf.length > 4) buf.shift();

        var smoothLat = latitude, smoothLng = longitude;
        if (buf.length >= 3) {
          var totalW = 0;
          var wLat = 0, wLng = 0;
          for (var bi = 0; bi < buf.length; bi++) {
            // Weight: more recent + more accurate = higher weight
            var recency = 1 + bi * 0.5;
            var accWeight = 1 / Math.max(1, buf[bi].acc);
            var w = recency * accWeight;
            wLat += buf[bi].lat * w;
            wLng += buf[bi].lng * w;
            totalW += w;
          }
          smoothLat = wLat / totalW;
          smoothLng = wLng / totalW;
        }

        setGpsRoute(prev => [...prev, { lat: smoothLat, lng: smoothLng, ts: now }]);
        lastMovementRef.current = now;
        if (autoPaused) setAutoPaused(false);

        if (lastPosRef.current) {
          var d = haversineDistance(lastPosRef.current.lat, lastPosRef.current.lng, smoothLat, smoothLng);
          var dt = (now - lastPosRef.current.ts) / 1000; // seconds since last point

          // Calculate speed: prefer native GPS speed if available, otherwise derive
          var spd = 0;
          if (nativeSpeed != null && nativeSpeed >= 0) {
            spd = nativeSpeed;
          } else if (dt > 0) {
            spd = d / dt;
          }
          setCurrentSpeed(Math.round(spd * 10) / 10);

          // Drift elimination: ignore tiny movements that are GPS noise
          // Use accuracy-adaptive min distance: at least max(2, accuracy * 0.3)
          var minDist = Math.max(2, accuracy * 0.3);
          // Speed sanity check: >15 m/s (54 km/h) is likely GPS teleport for a runner
          if (d > minDist && d < 300 && spd < 15) {
            setDistance(prev => {
              const newDist = prev + d;
              const currentKm = Math.floor(newDist / 1000);
              const lastKm = Math.floor(prev / 1000);
              if (currentKm > lastKm && currentKm > 0) {
                const splitTime = Math.floor((Date.now() - startTimeRef.current) / 1000) + pausedAtRef.current;
                setSplits(s => [...s, { km: currentKm, timeSec: splitTime - lastSplitTimeRef.current }]);
                lastSplitTimeRef.current = splitTime;
                playSplitChime();
              }
              return newDist;
            });
            lastPosRef.current = { lat: smoothLat, lng: smoothLng, ts: now };
          }
        } else {
          lastPosRef.current = { lat: smoothLat, lng: smoothLng, ts: now };
        }
      },
      (err) => {
        var msg = err.code === 1 ? 'Location permission denied — enable in Settings'
          : err.code === 2 ? 'GPS signal unavailable — try outdoors'
          : 'GPS timeout — trying again...';
        setGpsError(msg);
        // Auto-retry on timeout
        if (err.code === 3 && watchIdRef.current === null) {
          setTimeout(function() { startGpsWatch(); }, 3000);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
    );
  };

  // Tone.js beep helper
  var playCountBeep = function(isGo) {
    try {
      var Tone = window.Tone;
      if (!Tone) return;
      if (Tone.context.state !== 'running') Tone.start();
      var synth = new Tone.Synth({
        oscillator: { type: isGo ? 'triangle' : 'sine' },
        envelope: { attack: 0.01, decay: isGo ? 0.4 : 0.15, sustain: 0, release: isGo ? 0.3 : 0.1 }
      }).toDestination();
      synth.triggerAttackRelease(isGo ? 'C5' : 'G4', isGo ? '8n' : '16n');
      setTimeout(function() { synth.dispose(); }, 1000);
    } catch (e) {}
  };

  // Km split chime — ascending two-note jingle
  var playSplitChime = function() {
    try {
      var Tone = window.Tone;
      if (!Tone) return;
      if (Tone.context.state !== 'running') Tone.start();
      var synth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 } }).toDestination();
      synth.triggerAttackRelease('E5', '16n');
      setTimeout(function() {
        var s2 = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.4 } }).toDestination();
        s2.triggerAttackRelease('A5', '8n');
        setTimeout(function() { s2.dispose(); }, 1000);
      }, 150);
      setTimeout(function() { synth.dispose(); }, 1000);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } catch (e) {}
  };

  var launchRun = function(mode) {
    setRunMode(mode); setGoalReached(false); setGpsError(null); setDistance(0); setElapsed(0); setGpsRoute([]); setSplits([]);
    lastPosRef.current = null; pausedAtRef.current = 0; lastSplitTimeRef.current = 0;
    setRunZone(null);
    startTimeRef.current = Date.now();
    setIsRunning(true); setIsPaused(false); setCountdown(null); setView('active');
    acquireWakeLock();
    startGpsWatch();
  };

  const startRun = (mode) => {
    if (!navigator.geolocation) { setGpsError('GPS not available'); return; }
    // Start countdown
    setRunMode(mode);
    setView('countdown');
    setCountdown(3);
    playCountBeep(false);
    if (countdownRef.current) clearTimeout(countdownRef.current);
    countdownRef.current = setTimeout(function() {
      setCountdown(2); playCountBeep(false);
      countdownRef.current = setTimeout(function() {
        setCountdown(1); playCountBeep(false);
        countdownRef.current = setTimeout(function() {
          setCountdown('GO'); playCountBeep(true);
          if (navigator.vibrate) navigator.vibrate(300);
          countdownRef.current = setTimeout(function() {
            launchRun(mode);
          }, 800);
        }, 1000);
      }, 1000);
    }, 1000);
  };

  const pauseRun = () => { if (navigator.vibrate) navigator.vibrate(80); setIsPaused(true); pausedAtRef.current = elapsed; if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; } releaseWakeLock(); };
  const resumeRun = () => { if (navigator.vibrate) navigator.vibrate([50, 30, 50]); setIsPaused(false); startTimeRef.current = Date.now(); acquireWakeLock(); startGpsWatch(); };

  const finishRun = async () => {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (timerRef.current) clearInterval(timerRef.current);
    const dist = Math.round(distance); const dur = elapsed;
    const pace = dist > 0 ? Math.round((dur / (dist / 1000))) : 0;
    const cal = estimateCalories(dist);

    // Reverse geocode start position
    if (gpsRoute.length > 0) {
      var firstPt = gpsRoute[0];
      reverseGeocode(firstPt.lat, firstPt.lng).then(function(zone) {
        if (zone) setRunZone(zone);
      });
    }

    if (api && dist > 10) {
      try {
        const result = await api.saveRun({
          startedAt: new Date(startTimeRef.current).toISOString(), endedAt: new Date().toISOString(),
          distanceM: dist, durationSec: dur, avgPaceSec: pace, calories: cal,
          route: gpsRoute.length > 0 ? gpsRoute : null, status: 'completed'
        });
        if (result && result.coachTips) setCoachTips(result.coachTips);
        setShowPostRun(true);
        const [newStats, newRuns, achv] = await Promise.all([
          api.getRunStats().catch(() => null), api.getRuns(10).catch(() => ({ runs: [] })), api.runAchievements().catch(() => null)
        ]);
        if (newStats) setRunStats(newStats);
        if (newRuns && newRuns.runs) setRuns(newRuns.runs);
        if (achv && achv.achievements) {
          // Detect newly unlocked achievements
          var oldUnlocked = achievements.filter(function(a) { return a.unlocked; }).map(function(a) { return a.id; });
          var newlyUnlocked = achv.achievements.filter(function(a) { return a.unlocked && oldUnlocked.indexOf(a.id) === -1; });
          if (newlyUnlocked.length > 0) {
            setUnlockToasts(newlyUnlocked.map(function(a) { return { id: a.id, name: a.name, desc: a.desc }; }));
            // Auto-dismiss toasts after 5 seconds
            setTimeout(function() { setUnlockToasts([]); }, 5000);
          }
          setAchievements(achv.achievements);
        }
      } catch (e) { console.warn('Failed to save run:', e); }
    }
    setIsRunning(false); setIsPaused(false);
    releaseWakeLock();
  };

  const discardRun = () => {
    if (navigator.vibrate) navigator.vibrate(150);
    if (countdownRef.current) { clearTimeout(countdownRef.current); countdownRef.current = null; }
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false); setIsPaused(false); setDistance(0); setElapsed(0);
    setGpsRoute([]); setSplits([]); setRunMode(null); setCountdown(null); setView('dashboard');
    releaseWakeLock();
  };

  // Open run detail
  var openRunDetail = function(run) {
    setSelectedRun(run);
    setSelectedRunData(null);
    setSelectedRunZone(null);
    if (api && api.getRun) {
      api.getRun(run.id).then(function(data) {
        setSelectedRunData(data);
        if (data && data.route && data.route.length > 0) {
          reverseGeocode(data.route[0].lat, data.route[0].lng).then(function(zone) {
            if (zone) setSelectedRunZone(zone);
          });
        }
      }).catch(function() { setSelectedRunData(run); });
    } else {
      setSelectedRunData(run);
    }
  };

  const currentPace = distance > 100 && elapsed > 0 ? Math.round(elapsed / (distance / 1000)) : 0;
  const goalProgress = runMode && runMode !== 'free' ? Math.min(1, distance / (runMode.unit === 'mi' ? runMode.target * 1609.344 : runMode.target * 1000)) : 0;

  // Pace zone: color + label based on min/km
  var paceZone = { color: 'var(--c-text)', label: '' };
  if (currentPace > 0) {
    if (currentPace < 300) { paceZone = { color: '#7DD8A0', label: 'Sprint' }; }
    else if (currentPace < 360) { paceZone = { color: '#7DD8A0', label: 'Fast' }; }
    else if (currentPace < 420) { paceZone = { color: '#64B5F6', label: 'Tempo' }; }
    else if (currentPace < 480) { paceZone = { color: '#FFB74D', label: 'Easy' }; }
    else if (currentPace < 540) { paceZone = { color: '#FF96C8', label: 'Jog' }; }
    else { paceZone = { color: '#FF8A8A', label: 'Walk' }; }
  }

  /* ========== ACCESS LOADING ========== */
  if (accessLoading) {
    return /*#__PURE__*/React.createElement("div", { className: "rc-pastel-bg", style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, height: "100vh", width: "100vw", zIndex: 100, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" } },
      /*#__PURE__*/React.createElement(RunClubStyles, null),
      /*#__PURE__*/React.createElement("div", { style: { width: '100%', maxWidth: 480, margin: '0 auto', padding: '16px 20px calc(100px + env(safe-area-inset-bottom)) 20px', minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 } },
        /*#__PURE__*/React.createElement("div", { style: { width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,107,107,0.12)', borderTopColor: '#FF6B6B', animation: 'rcSpin 0.8s linear infinite' } }),
        /*#__PURE__*/React.createElement("div", { style: { fontSize: 14, fontWeight: 600, color: 'var(--c-text-sub)' } }, "Loading Doodles Run Club...")));
  }

  /* ========== ACCESS GATE — Apply to Join ========== */
  if (accessStatus !== 'approved') {
    return /*#__PURE__*/React.createElement("div", { className: "rc-pastel-bg", style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, height: "100vh", width: "100vw", zIndex: 100, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" } },
      /*#__PURE__*/React.createElement(RunClubStyles, null),
      /*#__PURE__*/React.createElement("div", { style: { width: '100%', maxWidth: 480, margin: '0 auto', padding: '16px 20px calc(100px + env(safe-area-inset-bottom)) 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },

        // Logo + Title
        /*#__PURE__*/React.createElement("div", { className: "rc-slide-up", style: { textAlign: 'center', marginBottom: 32 } },
          /*#__PURE__*/React.createElement("div", {
            className: "rc-float",
            style: { width: 88, height: 88, borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                     background: 'linear-gradient(135deg, rgba(255,107,107,0.15), rgba(255,179,71,0.15))', border: '2px solid rgba(255,107,107,0.18)', boxShadow: '0 8px 32px rgba(255,107,107,0.12)' }
          }, /*#__PURE__*/React.createElement(RunShoeIcon, { size: 40 })),
          /*#__PURE__*/React.createElement("h1", { className: "font-display", style: { fontSize: 32, marginBottom: 8, background: 'linear-gradient(135deg, #FF6B6B 0%, #FFB347 25%, #77DD77 50%, #64B5F6 75%, #BA93FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' } }, "Doodles Run Club"),
          /*#__PURE__*/React.createElement("p", { style: { fontSize: 14, lineHeight: 1.7, color: 'var(--c-text-sub)', maxWidth: 320, margin: '0 auto' } },
            "An exclusive running community for Doodles holders. Track your runs, compete on leaderboards, and earn achievements.")
        ),

        // STATUS: none — show application form
        accessStatus === 'none' && /*#__PURE__*/React.createElement("div", { style: { background: "rgba(255,255,255,0.8)", backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: "1px solid rgba(255,107,107,0.12)", borderRadius: 24, padding: 20, width: '100%', maxWidth: 360, boxShadow: '0 8px 32px rgba(255,107,107,0.06)' }, className: "rc-pop-in" },
          /*#__PURE__*/React.createElement("h2", { style: { fontSize: 16, fontWeight: 600, color: 'var(--c-text)', marginBottom: 16 } }, "Apply to Join"),
          /*#__PURE__*/React.createElement("label", { style: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--c-text-sub)', marginBottom: 6 } }, "Your OpenSea / Twitter / Discord"),
          /*#__PURE__*/React.createElement("input", {
            type: "text", value: requestSocial, onChange: e => setRequestSocial(e.target.value),
            placeholder: "e.g. @yourhandle or opensea.io/...",
            style: { width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 14, border: '1px solid var(--c-border)',
                     background: 'var(--c-input-bg)', color: 'var(--c-text)', marginBottom: 12, boxSizing: 'border-box', outline: 'none' }
          }),
          /*#__PURE__*/React.createElement("label", { style: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--c-text-sub)', marginBottom: 6 } }, "Message (optional)"),
          /*#__PURE__*/React.createElement("input", {
            type: "text", value: requestMsg, onChange: e => setRequestMsg(e.target.value),
            placeholder: "I hold Doodle #1234...",
            style: { width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 14, border: '1px solid var(--c-border)',
                     background: 'var(--c-input-bg)', color: 'var(--c-text)', marginBottom: 16, boxSizing: 'border-box', outline: 'none' }
          }),
          requestError && /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, fontWeight: 600, color: '#FF8A8A', marginBottom: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,138,138,0.1)' } }, requestError),
          /*#__PURE__*/React.createElement("button", {
            onClick: handleRequestAccess, disabled: !requestSocial.trim() || requestLoading,
            style: { width: '100%', padding: '14px', borderRadius: 16, fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer',
                     background: requestSocial.trim() && !requestLoading ? 'linear-gradient(135deg, #FF6B6B, #FFB347, #77DD77, #64B5F6)' : 'var(--c-border)', color: '#FFF', transition: 'all 0.3s',
                     boxShadow: requestSocial.trim() && !requestLoading ? '0 4px 20px rgba(255,107,107,0.2)' : 'none',
                     opacity: requestLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }
          },
            requestLoading && /*#__PURE__*/React.createElement("div", { style: { width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#FFF', animation: 'rcSpin 0.8s linear infinite' } }),
            requestLoading ? "Sending..." : "Submit Request")
        ),

        // STATUS: pending — waiting screen
        accessStatus === 'pending' && /*#__PURE__*/React.createElement("div", { style: { background: "rgba(255,255,255,0.8)", backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: "1px solid rgba(255,183,77,0.2)", borderRadius: 24, padding: 20, width: '100%', maxWidth: 360, textAlign: 'center', boxShadow: '0 8px 32px rgba(255,183,77,0.08)' }, className: "rc-pop-in" },
          /*#__PURE__*/React.createElement("div", { style: { width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                     background: 'rgba(255,224,130,0.15)' } },
            /*#__PURE__*/React.createElement(ClockIcon, { size: 28 })),
          /*#__PURE__*/React.createElement("h2", { style: { fontSize: 18, fontWeight: 600, color: 'var(--c-text)', marginBottom: 8 } }, "Request Submitted"),
          /*#__PURE__*/React.createElement("p", { style: { fontSize: 14, color: 'var(--c-text-sub)', lineHeight: 1.6, marginBottom: 4 } },
            "Your request has been received and is being reviewed by an admin."),
          /*#__PURE__*/React.createElement("p", { style: { fontSize: 13, color: 'var(--c-text-sub)', marginTop: 8 } },
            "You'll get access as soon as it's approved. Check back soon!")
        ),

        // STATUS: denied — with re-apply option
        accessStatus === 'denied' && /*#__PURE__*/React.createElement("div", { style: { background: "rgba(255,255,255,0.8)", backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: "1px solid rgba(255,138,138,0.2)", borderRadius: 24, padding: 20, width: '100%', maxWidth: 360, textAlign: 'center', boxShadow: '0 8px 32px rgba(255,138,138,0.08)' }, className: "rc-pop-in" },
          /*#__PURE__*/React.createElement("div", { style: { width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                     background: 'rgba(255,138,138,0.12)' } },
            /*#__PURE__*/React.createElement(LockIcon, { size: 28 })),
          /*#__PURE__*/React.createElement("h2", { style: { fontSize: 18, fontWeight: 600, color: '#FF8A8A', marginBottom: 8 } }, "Access Denied"),
          /*#__PURE__*/React.createElement("p", { style: { fontSize: 14, color: 'var(--c-text-sub)', lineHeight: 1.6, marginBottom: 16 } },
            "Your request was not approved. You can try applying again with more details."),
          /*#__PURE__*/React.createElement("button", {
            onClick: function() { setAccessStatus('none'); setRequestSocial(''); setRequestMsg(''); setRequestError(null); },
            style: { padding: '12px 28px', borderRadius: 16, fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer',
                     background: 'linear-gradient(135deg, #FF6B6B, #FFB347, #77DD77, #64B5F6)', color: '#FFF',
                     boxShadow: '0 4px 20px rgba(255,107,107,0.2)', transition: 'all 0.3s' }
          }, "Re-Apply")
        ),

        // Admin shortcut (even on access gate screen)
        isAdmin && /*#__PURE__*/React.createElement("button", {
          onClick: () => { setAccessStatus('approved'); setView('admin'); },
          style: { marginTop: 20, padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600, border: '1px solid rgba(168,230,207,0.3)',
                   background: 'rgba(168,230,207,0.1)', color: 'var(--c-correct)', cursor: 'pointer' }
        }, "Admin Panel")
      )
    );
  }

  /* ========== RUN DETAIL VIEW ========== */
  if (selectedRun) {
    var rd = selectedRunData || selectedRun;
    var rdDist = rd.distanceM || 0;
    var rdDur = rd.durationSec || 0;
    var rdPace = rd.avgPaceSec || 0;
    var rdCal = rd.calories || estimateCalories(rdDist);
    var rdRoute = rd.route || null;
    var rdSplits = rd.splits || [];

    return /*#__PURE__*/React.createElement("div", { className: "rc-pastel-bg", style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, height: "100vh", width: "100vw", zIndex: 100, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" } },
      /*#__PURE__*/React.createElement(RunClubStyles, null),
      /*#__PURE__*/React.createElement("div", { style: { width: "100%", maxWidth: 480, margin: "0 auto", padding: "16px 20px calc(100px + env(safe-area-inset-bottom)) 20px", minHeight: "100%" } },
        // Back button
        /*#__PURE__*/React.createElement("button", { onClick: function() { setSelectedRun(null); setSelectedRunData(null); setSelectedRunZone(null); },
          style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: '#FF6B6B', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20 }
        }, /*#__PURE__*/React.createElement(ArrowLeftIcon, { size: 18 }), "Back"),

        // Date & time
        /*#__PURE__*/React.createElement("div", { className: "rc-slide-up", style: { textAlign: 'center', marginBottom: 20 } },
          /*#__PURE__*/React.createElement("h1", { className: "font-display", style: { fontSize: 36, background: 'linear-gradient(135deg, #FF6B6B, #FFB347, #77DD77, #64B5F6, #BA93FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' } },
            formatDistanceMiles(rdDist) + ' mi'),
          /*#__PURE__*/React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: 'var(--c-text-sub)', marginTop: 6 } }, rd.startedAt ? formatDateFull(rd.startedAt) : ''),
          selectedRunZone && /*#__PURE__*/React.createElement("div", { style: { display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '4px 14px', borderRadius: 20, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.12)' } },
            /*#__PURE__*/React.createElement(MapPinIcon, { size: 12 }),
            /*#__PURE__*/React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: '#FF6B6B' } }, selectedRunZone))
        ),

        // Route map
        rdRoute && rdRoute.length >= 2 && /*#__PURE__*/React.createElement(LeafletMap, { route: rdRoute, live: false, height: 200 }),

        // Stat cards
        /*#__PURE__*/React.createElement("div", { className: "rc-stagger", style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 } },
          [['Duration', formatDuration(rdDur), '#7DD8A0'], ['Pace/km', formatPace(rdPace), '#FF6B6B'], ['Calories', rdCal, '#FFB74D'], ['Distance', formatDistance(rdDist), '#64B5F6']].map(function(pair, i) {
            return /*#__PURE__*/React.createElement("div", { key: i, style: { background: "rgba(255,255,255,0.8)", backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 20, textAlign: 'center', padding: 16, borderTop: '3px solid ' + pair[2], boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }, className: "rc-pop-in" },
              /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 22, color: 'var(--c-text)' } }, pair[1]),
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 6, color: pair[2] } }, pair[0]));
          })
        ),

        // Splits
        rdSplits.length > 0 && /*#__PURE__*/React.createElement("div", { style: { background: "rgba(255,255,255,0.8)", backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 20, padding: 18, marginBottom: 16, boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }, className: "rc-slide-up" },
          /*#__PURE__*/React.createElement("h3", { style: { fontSize: 14, fontWeight: 600, color: 'var(--c-text)', marginBottom: 12 } }, "Km Splits"),
          rdSplits.map(function(s, i) {
            return /*#__PURE__*/React.createElement("div", { key: i, style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < rdSplits.length - 1 ? '1px solid var(--c-border)' : 'none' } },
              /*#__PURE__*/React.createElement("span", { style: { fontSize: 13, color: 'var(--c-text-sub)' } }, "Km " + s.km),
              /*#__PURE__*/React.createElement("span", { style: { fontSize: 13, fontWeight: 600, color: 'var(--c-text)' } }, formatPace(s.timeSec)));
          })
        )
      )
    );
  }

  /* ========== POST-RUN SUMMARY ========== */
  if (showPostRun) {
    const dist = Math.round(distance); const dur = elapsed;
    const pace = dist > 0 ? Math.round((dur / (dist / 1000))) : 0;
    const hitGoal = runMode && runMode !== 'free' && goalReached;
    return /*#__PURE__*/React.createElement("div", { className: "rc-pastel-bg", style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, height: "100vh", width: "100vw", zIndex: 100, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" } },
      /*#__PURE__*/React.createElement(RunClubStyles, null),

      // Confetti particles
      /*#__PURE__*/React.createElement("div", { style: { position: 'fixed', top: 0, left: 0, right: 0, height: '100vh', pointerEvents: 'none', zIndex: 101, overflow: 'hidden' } },
        ['#FF6B6B', '#FFB347', '#FFE66D', '#77DD77', '#64B5F6', '#BA93FF', '#FF96C8', '#4DD0C8'].map(function(color, i) {
          var left = 10 + Math.random() * 80;
          var delay = Math.random() * 2;
          var size = 4 + Math.random() * 6;
          return /*#__PURE__*/React.createElement("div", { key: i, style: {
            position: 'absolute', top: '100%', left: left + '%',
            width: size, height: size * (0.6 + Math.random() * 0.8), borderRadius: Math.random() > 0.5 ? '50%' : 2,
            background: color, opacity: 0.8,
            animation: 'rcConfetti ' + (2 + Math.random() * 2) + 's ease-out ' + delay + 's forwards'
          } });
        })
      ),

      /*#__PURE__*/React.createElement("div", { style: { width: "100%", maxWidth: 480, margin: "0 auto", padding: "16px 20px calc(100px + env(safe-area-inset-bottom)) 20px", minHeight: "100%", position: 'relative', zIndex: 102 } },
        /*#__PURE__*/React.createElement("div", { className: "rc-slide-up", style: { textAlign: 'center', marginBottom: 32, paddingTop: 24 } },
          /*#__PURE__*/React.createElement("div", { className: "rc-float", style: { marginBottom: 12, display: 'flex', justifyContent: 'center' } },
            /*#__PURE__*/React.createElement("div", { style: { width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(255,107,107,0.12), rgba(255,179,71,0.12))', border: '2px solid rgba(255,107,107,0.15)',
              boxShadow: '0 8px 32px rgba(255,107,107,0.12)' } },
              /*#__PURE__*/React.createElement(CelebrationIcon, { size: 36 }))),
          hitGoal && /*#__PURE__*/React.createElement("div", {
            className: "rc-pop-in",
            style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, padding: '8px 20px', borderRadius: 24,
                     background: 'linear-gradient(135deg, rgba(125,216,160,0.15), rgba(255,107,107,0.08))', color: '#7DD8A0', marginBottom: 16,
                     border: '1px solid rgba(125,216,160,0.2)', boxShadow: '0 4px 16px rgba(125,216,160,0.1)' }
          }, /*#__PURE__*/React.createElement(TargetIcon, { size: 16 }), " Goal Reached!"),
          /*#__PURE__*/React.createElement("h1", { className: "font-display rc-gradient-text", style: { fontSize: 56, lineHeight: 1 } },
            formatDistanceMiles(dist) + ' mi'),
          /*#__PURE__*/React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: 'var(--c-text-sub)', marginTop: 10, letterSpacing: '0.02em' } }, "Amazing effort!"),
          runZone && /*#__PURE__*/React.createElement("div", { className: "rc-stat-pill", style: { marginTop: 12, background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.10)' } },
            /*#__PURE__*/React.createElement(MapPinIcon, { size: 12 }),
            /*#__PURE__*/React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: '#FF6B6B' } }, runZone))
        ),

        // Route map
        gpsRoute.length >= 2 && /*#__PURE__*/React.createElement(LeafletMap, { route: gpsRoute, live: false, height: 200 }),

        /*#__PURE__*/React.createElement("div", { className: "rc-stagger", style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 } },
          [['Time', formatDuration(dur), '#7DD8A0'], ['Pace/km', formatPace(pace), '#FF6B6B'], ['Cal', estimateCalories(dist), '#FFB74D']].map(function(pair, i) {
            return /*#__PURE__*/React.createElement("div", { key: i, className: "rc-glass rc-pop-in",
              style: { textAlign: 'center', padding: '16px 12px', position: 'relative', overflow: 'hidden' } },
              /*#__PURE__*/React.createElement("div", { style: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: pair[2] } }),
              /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 24, color: 'var(--c-text)', lineHeight: 1 } }, pair[1]),
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 8, color: pair[2] } }, pair[0]));
          })
        ),
        splits.length > 0 && /*#__PURE__*/React.createElement("div", { className: "rc-glass rc-slide-up", style: { padding: 20, marginBottom: 20 } },
          /*#__PURE__*/React.createElement("h3", { style: { fontSize: 14, fontWeight: 700, color: 'var(--c-text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 } },
            /*#__PURE__*/React.createElement(BoltIcon, { size: 14 }), "Km Splits"),
          splits.map(function(s, i) {
            return /*#__PURE__*/React.createElement("div", { key: i, style: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < splits.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' } },
              /*#__PURE__*/React.createElement("span", { style: { fontSize: 13, color: 'var(--c-text-sub)', fontWeight: 500 } }, "Km " + s.km),
              /*#__PURE__*/React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: 'var(--c-text)', fontFamily: "'Paytone One', sans-serif" } }, formatPace(s.timeSec)));
          })
        ),
        coachTips.length > 0 && /*#__PURE__*/React.createElement("div", { style: { background: "rgba(255,255,255,0.8)", backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 20, padding: 18, marginBottom: 16, borderLeft: '4px solid #A882FF', boxShadow: '0 4px 14px rgba(255,107,107,0.06)' }, className: "rc-slide-up" },
          /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 } },
            /*#__PURE__*/React.createElement(BrainIcon, { size: 18 }),
            /*#__PURE__*/React.createElement("h3", { style: { fontSize: 14, fontWeight: 600, color: 'var(--c-text)' } }, "AI Coach")),
          coachTips.map(function(tip, i) {
            return /*#__PURE__*/React.createElement("p", { key: i, style: { fontSize: 13, lineHeight: 1.6, color: 'var(--c-text-sub)', padding: '6px 0',
                     borderBottom: i < coachTips.length - 1 ? '1px solid var(--c-border)' : 'none' } }, tip.text);
          })
        ),
        /*#__PURE__*/React.createElement("button", {
          onClick: () => { setShowPostRun(false); setDistance(0); setElapsed(0); setSplits([]); setCoachTips([]); setRunMode(null); setGoalReached(false); setRunZone(null); setView('dashboard'); },
          style: { width: '100%', padding: 16, borderRadius: 20, fontSize: 17, fontWeight: 700, border: 'none', cursor: 'pointer',
                   background: 'linear-gradient(135deg, #FF6B6B, #FFB347, #77DD77, #64B5F6)', color: '#FFF',
                   boxShadow: '0 4px 20px rgba(255,107,107,0.2)', transition: 'transform 0.2s ease' }
        }, "Done")
      )
    );
  }

  /* ========== RUN MODE PICKER ========== */
  if (view === 'start') {
    return /*#__PURE__*/React.createElement("div", { className: "rc-pastel-bg", style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' } },
      /*#__PURE__*/React.createElement(RunClubStyles, null),
      /*#__PURE__*/React.createElement("div", { style: { width: '100%', maxWidth: 480, margin: '0 auto', padding: '16px 20px calc(100px + env(safe-area-inset-bottom)) 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
        /*#__PURE__*/React.createElement("button", { onClick: () => setView('dashboard'),
          style: { position: 'absolute', top: 20, left: 20, fontSize: 14, fontWeight: 600, color: '#FF6B6B', background: 'none', border: 'none', cursor: 'pointer' }
        }, "← Cancel"),

        /*#__PURE__*/React.createElement("div", { className: "rc-float", style: { marginBottom: 12, display: 'flex', justifyContent: 'center' } }, /*#__PURE__*/React.createElement(RunnerIcon, { size: 40 })),
        /*#__PURE__*/React.createElement("h1", { className: "font-display rc-slide-up", style: { fontSize: 26, background: 'linear-gradient(135deg, #FF6B6B, #FFB347, #77DD77, #64B5F6, #BA93FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 32 } }, "Choose Your Run"),

        // Free Run
        /*#__PURE__*/React.createElement("button", {
          onClick: () => startRun('free'),
          className: "rc-pop-in",
          style: { width: '100%', maxWidth: 320, padding: 20, borderRadius: 20, textAlign: 'left', cursor: 'pointer', marginBottom: 16,
                   background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,107,107,0.15)', transition: 'all 0.3s', boxShadow: '0 4px 20px rgba(255,107,107,0.06)' }
        },
          /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 14 } },
            /*#__PURE__*/React.createElement("div", { style: { width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                     background: 'linear-gradient(135deg, rgba(255,107,107,0.15), rgba(255,179,71,0.12))' } }, /*#__PURE__*/React.createElement(RunnerIcon, { size: 24 })),
            /*#__PURE__*/React.createElement("div", null,
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 17, fontWeight: 700, color: 'var(--c-text)' } }, "Free Run"),
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: 'var(--c-text-sub)', marginTop: 3 } }, "Run as far as you want"))
          )
        ),

        // Goal Run
        /*#__PURE__*/React.createElement("div", { className: "rc-pop-in",
          style: { width: '100%', maxWidth: 320, padding: 20, borderRadius: 20, animationDelay: '0.1s',
                   background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(125,216,160,0.2)', boxShadow: '0 4px 20px rgba(125,216,160,0.06)' } },
          /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 } },
            /*#__PURE__*/React.createElement("div", { style: { width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                     background: 'linear-gradient(135deg, rgba(125,216,160,0.2), rgba(100,181,246,0.15))' } }, /*#__PURE__*/React.createElement(TargetIcon, { size: 24 })),
            /*#__PURE__*/React.createElement("div", null,
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 17, fontWeight: 700, color: 'var(--c-text)' } }, "Goal Run"),
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: 'var(--c-text-sub)', marginTop: 3 } }, "Set a distance target"))
          ),
          // Unit toggle
          /*#__PURE__*/React.createElement("div", { style: { display: 'flex', gap: 8, marginBottom: 12 } },
            ['mi', 'km'].map(function(u) {
              return /*#__PURE__*/React.createElement("button", { key: u, onClick: () => setGoalUnit(u),
                style: { flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                         background: goalUnit === u ? 'rgba(123,123,255,0.15)' : 'rgba(255,255,255,0.5)',
                         color: goalUnit === u ? '#7B7BFF' : 'var(--c-text-sub)', border: '1px solid ' + (goalUnit === u ? 'rgba(123,123,255,0.3)' : 'rgba(0,0,0,0.08)') }
              }, u.toUpperCase());
            })
          ),
          // Presets
          /*#__PURE__*/React.createElement("div", { style: { display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' } },
            (goalUnit === 'mi' ? ['1','2','3','5','10'] : ['1','3','5','10','21']).map(function(v) {
              return /*#__PURE__*/React.createElement("button", { key: v, onClick: () => setGoalTarget(v),
                style: { padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                         background: goalTarget === v ? 'rgba(168,230,207,0.2)' : 'rgba(255,255,255,0.5)',
                         color: goalTarget === v ? '#2E7D32' : 'var(--c-text-sub)', border: '1px solid ' + (goalTarget === v ? 'rgba(168,230,207,0.4)' : 'rgba(0,0,0,0.06)') }
              }, v);
            })
          ),
          // Custom input
          /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 } },
            /*#__PURE__*/React.createElement("input", {
              type: "number", inputMode: "decimal", value: goalTarget, onChange: e => setGoalTarget(e.target.value),
              style: { flex: 1, padding: '8px 12px', borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: 'center',
                       background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.08)', color: 'var(--c-text)', outline: 'none' }
            }),
            /*#__PURE__*/React.createElement("span", { style: { fontSize: 13, fontWeight: 600, color: 'var(--c-text-sub)' } }, goalUnit)
          ),
          /*#__PURE__*/React.createElement("button", {
            onClick: () => { var t = parseFloat(goalTarget); if (t > 0) startRun({ unit: goalUnit, target: t }); },
            style: { width: '100%', padding: 14, borderRadius: 16, fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer',
                     background: 'linear-gradient(135deg, #7DD8A0 0%, #A882FF 100%)', color: '#FFF',
                     boxShadow: '0 4px 20px rgba(125,216,160,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }
          }, "Start Goal Run ", /*#__PURE__*/React.createElement(TargetIcon, { size: 16 }))
        )
      )
    );
  }

  /* ========== COUNTDOWN ========== */
  if (view === 'countdown') {
    var cdLabel = countdown === 'GO' ? 'GO!' : String(countdown);
    var isGo = countdown === 'GO';
    var cdAnim = isGo ? 'rcGoExplode 0.6s cubic-bezier(0.22,1,0.36,1) forwards' : 'rcCountIn 0.35s cubic-bezier(0.22,1,0.36,1) forwards';
    var cdColor = isGo ? '#7DD8A0' : (countdown === 1 ? '#FF6B95' : countdown === 2 ? '#FFB74D' : '#FF6B6B');

    return /*#__PURE__*/React.createElement("div", { style: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', zIndex: 100,
      background: 'linear-gradient(180deg, #F0E8FF 0%, #FFE8EC 40%, #D6F0FF 70%, #FFF5D6 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    } },
      /*#__PURE__*/React.createElement(RunClubStyles, null),

      // Cancel button
      /*#__PURE__*/React.createElement("button", { onClick: discardRun,
        style: { position: 'absolute', top: 'max(16px, env(safe-area-inset-top))', left: 20,
                 fontSize: 12, fontWeight: 700, borderRadius: 20, padding: '6px 14px',
                 background: 'rgba(255,138,138,0.15)', color: '#FF8A8A', border: 'none', cursor: 'pointer', zIndex: 10 }
      }, "Cancel"),

      // Rays behind GO
      isGo && /*#__PURE__*/React.createElement("div", { style: {
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(125,216,160,0.3) 0%, rgba(125,216,160,0) 70%)',
        animation: 'rcGoRays 0.8s ease-out forwards', pointerEvents: 'none'
      } }),

      // Ring timer
      /*#__PURE__*/React.createElement("div", { key: 'ring-' + countdown, style: { position: 'absolute', width: 180, height: 180 } },
        /*#__PURE__*/React.createElement("svg", { viewBox: '0 0 100 100', style: { width: '100%', height: '100%', transform: 'rotate(-90deg)' } },
          /*#__PURE__*/React.createElement("circle", { cx: 50, cy: 50, r: 45, fill: 'none', stroke: 'rgba(255,107,107,0.08)', strokeWidth: 3 }),
          /*#__PURE__*/React.createElement("circle", { cx: 50, cy: 50, r: 45, fill: 'none', stroke: cdColor, strokeWidth: 3,
            strokeDasharray: 283, strokeDashoffset: 283, strokeLinecap: 'round',
            style: { animation: 'rcCountRing ' + (isGo ? '0.6s' : '0.9s') + ' ease-out forwards' } }))),

      // Number / GO
      /*#__PURE__*/React.createElement("div", { key: 'cd-' + countdown, style: {
        fontSize: isGo ? 72 : 96, fontWeight: 900, lineHeight: 1,
        fontFamily: "'Paytone One', 'Fredoka', sans-serif",
        color: cdColor,
        textShadow: '0 4px 24px rgba(0,0,0,0.08)',
        animation: cdAnim,
        zIndex: 2
      } }, cdLabel),

      // "get ready" label
      !isGo && /*#__PURE__*/React.createElement("div", { style: {
        marginTop: 20, fontSize: 14, fontWeight: 600, color: 'var(--c-text-sub)',
        letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.7
      } }, "get ready"),

      isGo && /*#__PURE__*/React.createElement("div", { style: {
        marginTop: 20, fontSize: 16, fontWeight: 700, color: '#7DD8A0',
        letterSpacing: '0.1em', textTransform: 'uppercase'
      } }, "let's go!")
    );
  }

  /* ========== ACTIVE RUN ========== */
  if (view === 'active') {
    var isGoalMode = runMode && runMode !== 'free';
    var targetLabel = isGoalMode ? runMode.target + ' ' + runMode.unit : null;

    return /*#__PURE__*/React.createElement("div", { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch',
      background: 'linear-gradient(180deg, #0D0B14 0%, #1A1030 40%, #0D0B14 100%)' } },
      /*#__PURE__*/React.createElement(RunClubStyles, null),
      // Background orbs
      /*#__PURE__*/React.createElement("div", { style: { position: 'absolute', top: '10%', left: '-20%', width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,107,107,0.10) 0%, transparent 70%)', animation: 'rcOrbDrift 20s ease-in-out infinite alternate', pointerEvents: 'none' } }),
      /*#__PURE__*/React.createElement("div", { style: { position: 'absolute', bottom: '15%', right: '-15%', width: 250, height: 250, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(119,221,119,0.08) 0%, transparent 70%)', animation: 'rcOrbDrift2 16s ease-in-out infinite alternate', pointerEvents: 'none' } }),
      // Top bar — glass
      /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 8px',
                   paddingTop: 'max(16px, env(safe-area-inset-top))', position: 'relative', zIndex: 2 } },
        /*#__PURE__*/React.createElement("button", { onClick: discardRun,
          style: { fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '7px 14px', background: 'rgba(255,138,138,0.12)', color: '#FF8A8A', border: '1px solid rgba(255,138,138,0.15)', cursor: 'pointer',
                   backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }
        }, "Discard"),
        /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
                     color: gpsAccuracy && gpsAccuracy < 20 ? '#7DD8A0' : 'rgba(255,255,255,0.4)' } },
          /*#__PURE__*/React.createElement("div", { style: { position: 'relative' } },
            /*#__PURE__*/React.createElement("div", { style: { width: 8, height: 8, borderRadius: '50%',
                       background: gpsAccuracy && gpsAccuracy < 20 ? '#7DD8A0' : 'rgba(255,255,255,0.25)', animation: 'rcPulse 2s ease-in-out infinite' } }),
            gpsAccuracy && gpsAccuracy < 20 && /*#__PURE__*/React.createElement("div", { style: { position: 'absolute', inset: 0, width: 8, height: 8, borderRadius: '50%',
                       background: '#7DD8A0', animation: 'rcDotPing 2s ease-out infinite' } })
          ),
          gpsAccuracy ? gpsAccuracy + 'm' : '...'
        ),
        /*#__PURE__*/React.createElement("div", {
          style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', padding: '5px 12px', borderRadius: 20,
                   background: isPaused ? 'rgba(255,171,145,0.12)' : 'rgba(125,216,160,0.12)',
                   color: isPaused ? '#FF8A8A' : '#7DD8A0', border: '1px solid ' + (isPaused ? 'rgba(255,171,145,0.15)' : 'rgba(125,216,160,0.15)'),
                   backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }
        }, isPaused ? 'PAUSED' : isGoalMode ? targetLabel : 'FREE RUN')
      ),

      // Live route map
      /*#__PURE__*/React.createElement("div", { style: { padding: '0 16px', marginBottom: 12, position: 'relative', zIndex: 2 } },
        /*#__PURE__*/React.createElement(LeafletMap, { route: gpsRoute, live: true, height: 160 })
      ),

      // Main metrics — centered (dark mode)
      /*#__PURE__*/React.createElement("div", { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', position: 'relative', zIndex: 2 } },
        isGoalMode
          ? /*#__PURE__*/React.createElement(React.Fragment, null,
              /*#__PURE__*/React.createElement("div", { style: { marginBottom: 16 } },
                /*#__PURE__*/React.createElement(RCProgressRing, { progress: goalProgress, size: 200, stroke: 10,
                  label: formatDistanceMiles(Math.round(distance)), sublabel: "miles" })),
              goalReached && /*#__PURE__*/React.createElement("div", { className: "rc-pop-in",
                style: { fontSize: 13, fontWeight: 700, padding: '6px 16px', borderRadius: 20, marginBottom: 12,
                         background: 'rgba(168,230,207,0.2)', color: '#2E7D32' }
              }, "Goal reached! Keep going or finish"),
              /*#__PURE__*/React.createElement("div", { className: "font-display",
                style: { fontSize: 'clamp(36px, 10vw, 48px)', lineHeight: 1, color: 'rgba(255,255,255,0.95)' }
              }, formatDuration(elapsed)),
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: 4, color: 'rgba(255,255,255,0.35)' } }, "Duration"),
              // ETA: estimated time to goal
              !goalReached && distance > 50 && elapsed > 10 && (function() {
                var targetM = runMode.unit === 'mi' ? runMode.target * 1609.344 : runMode.target * 1000;
                var remainingM = targetM - distance;
                var speed = distance / elapsed; // m/s average
                var etaSec = Math.round(remainingM / speed);
                return /*#__PURE__*/React.createElement("div", { style: { marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '5px 14px', borderRadius: 14,
                  background: 'rgba(100,181,246,0.12)', border: '1px solid rgba(100,181,246,0.2)' } },
                  /*#__PURE__*/React.createElement(ClockIcon, { size: 12 }),
                  /*#__PURE__*/React.createElement("span", { style: { fontSize: 11, fontWeight: 700, color: '#64B5F6' } }, formatDuration(etaSec) + ' remaining'));
              })()
            )
          : /*#__PURE__*/React.createElement(React.Fragment, null,
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', marginBottom: 6 } }, "Duration"),
              /*#__PURE__*/React.createElement("div", { className: "font-display",
                style: { fontSize: 'clamp(56px, 16vw, 80px)', lineHeight: 1, color: '#FFF', textShadow: '0 0 40px rgba(255,107,107,0.18)' }
              }, formatDuration(elapsed)),
              /*#__PURE__*/React.createElement("div", { style: { marginTop: 28, textAlign: 'center' } },
                /*#__PURE__*/React.createElement("div", { className: "font-display rc-gradient-text",
                  style: { fontSize: 'clamp(40px, 12vw, 56px)', lineHeight: 1 }
                }, formatDistanceMiles(Math.round(distance))),
                /*#__PURE__*/React.createElement("div", { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', marginTop: 6, color: 'rgba(255,255,255,0.3)' } }, "Miles"))
            ),

        // Pace + Speed + Cal — glass pill bar
        /*#__PURE__*/React.createElement("div", { style: { display: 'flex', gap: 6, marginTop: 28, justifyContent: 'center', flexWrap: 'wrap' } },
          /*#__PURE__*/React.createElement("div", { style: { textAlign: 'center', padding: '10px 16px', borderRadius: 20,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } },
            /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 20, color: paceZone.color, transition: 'color 0.5s ease' } }, formatPace(currentPace)),
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 3, color: paceZone.color, opacity: 0.7, transition: 'color 0.5s ease' } },
              paceZone.label ? paceZone.label + ' /km' : 'Pace /km')),
          /*#__PURE__*/React.createElement("div", { style: { textAlign: 'center', padding: '10px 16px', borderRadius: 20,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' } },
            /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 20, color: 'rgba(255,255,255,0.9)' } }, (currentSpeed * 3.6).toFixed(1)),
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 3, color: 'rgba(255,255,255,0.3)' } }, "km/h")),
          /*#__PURE__*/React.createElement("div", { style: { textAlign: 'center', padding: '10px 16px', borderRadius: 20,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' } },
            /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 20, color: '#FFB74D' } }, estimateCalories(Math.round(distance))),
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 3, color: 'rgba(255,255,255,0.3)' } }, "Cal")),
          splits.length > 0 && /*#__PURE__*/React.createElement("div", { style: { textAlign: 'center', padding: '10px 16px', borderRadius: 20,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' } },
            /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 20, color: '#7DD8A0' } }, formatPace(splits[splits.length - 1].timeSec)),
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 3, color: 'rgba(255,255,255,0.3)' } }, "Last km"))
        ),

        // Progress bar
        /*#__PURE__*/React.createElement("div", { style: { width: '100%', maxWidth: 280, marginTop: 28 } },
          /*#__PURE__*/React.createElement("div", { style: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' } },
            /*#__PURE__*/React.createElement("div", { style: {
              height: '100%', borderRadius: 3, transition: 'width 1s ease-out',
              width: (isGoalMode ? goalProgress * 100 : Math.min(100, (distance / 10000) * 100)) + '%',
              background: 'linear-gradient(90deg, #FF6B6B, #FFB347, #FFE66D, #77DD77, #64B5F6, #BA93FF)', boxShadow: '0 0 12px rgba(255,107,107,0.35)'
            } })),
          isGoalMode && /*#__PURE__*/React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.3)' } },
            /*#__PURE__*/React.createElement("span", null, "0"), /*#__PURE__*/React.createElement("span", null, targetLabel))
        ),

        gpsError && /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, fontWeight: 600, marginTop: 16, padding: '8px 16px', borderRadius: 14,
                   color: '#FF8A8A', background: 'rgba(255,138,138,0.08)', border: '1px solid rgba(255,138,138,0.12)' } }, gpsError),

        // Auto-pause indicator
        autoPaused && !isPaused && /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16,
                   padding: '10px 20px', borderRadius: 20, background: 'rgba(255,183,77,0.08)', border: '1px solid rgba(255,183,77,0.12)',
                   animation: 'rcAutoPulse 2s ease-in-out infinite' } },
          /*#__PURE__*/React.createElement(PauseIcon, { size: 14 }),
          /*#__PURE__*/React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: '#FFB74D' } }, "Waiting for movement..."))
      ),

      // Controls — floating glass bar
      /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '16px 0 28px',
                   paddingBottom: 'max(28px, env(safe-area-inset-bottom))', position: 'relative', zIndex: 2 } },
        isPaused
          ? /*#__PURE__*/React.createElement(React.Fragment, null,
              /*#__PURE__*/React.createElement("button", { onClick: finishRun,
                style: { width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                         background: 'rgba(255,138,138,0.1)', color: '#FF8A8A', border: '1px solid rgba(255,138,138,0.15)', cursor: 'pointer',
                         backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', transition: 'transform 0.2s ease' }
              }, /*#__PURE__*/React.createElement(StopSquareIcon, { size: 24 })),
              /*#__PURE__*/React.createElement("button", { onClick: resumeRun,
                style: { width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                         background: 'linear-gradient(135deg, #FF6B6B, #FFB347, #77DD77, #64B5F6)', color: '#FFF', border: 'none', cursor: 'pointer',
                         boxShadow: '0 0 40px rgba(255,107,107,0.3), 0 0 80px rgba(255,179,71,0.12)',
                         animation: 'rcBreathe 3s ease-in-out infinite', transition: 'transform 0.2s ease' }
              }, /*#__PURE__*/React.createElement(PlayIcon, { size: 32 })))
          : /*#__PURE__*/React.createElement("button", { onClick: pauseRun,
              style: { width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                       background: 'linear-gradient(135deg, #FF6B6B, #FFB347, #77DD77, #64B5F6)', color: '#FFF', border: 'none', cursor: 'pointer',
                       boxShadow: '0 0 40px rgba(255,107,107,0.3), 0 0 80px rgba(255,179,71,0.12)',
                       animation: 'rcBreathe 3s ease-in-out infinite', transition: 'transform 0.2s ease' }
            }, /*#__PURE__*/React.createElement(PauseIcon, { size: 32 }))
      )
    );
  }

  /* ========== ADMIN PANEL ========== */
  if (view === 'admin' && isAdmin) {
    var pendingCount = pendingRequests.length;
    var reviewedList = allRequests.filter(function(r) { return r.status !== 'pending'; });
    var approvedCount = allRequests.filter(function(r) { return r.status === 'approved'; }).length;
    var deniedCount = allRequests.filter(function(r) { return r.status === 'denied'; }).length;
    var totalMembers = approvedCount + 1; // +1 for admin

    return /*#__PURE__*/React.createElement("div", { className: "rc-pastel-bg", style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, height: "100vh", width: "100vw", zIndex: 100, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" } },
      /*#__PURE__*/React.createElement(RunClubStyles, null),
      /*#__PURE__*/React.createElement("div", { style: { width: "100%", maxWidth: 480, margin: "0 auto", padding: "16px 20px calc(100px + env(safe-area-inset-bottom)) 20px", minHeight: "100%" } },

        // Header with back button
        /*#__PURE__*/React.createElement("div", { className: "rc-slide-up", style: { marginBottom: 20 } },
          /*#__PURE__*/React.createElement("button", { onClick: () => setView('dashboard'),
            style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: '#FF6B6B', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16 }
          }, /*#__PURE__*/React.createElement(ArrowLeftIcon, { size: 16 }), "Dashboard"),

          /*#__PURE__*/React.createElement("div", { style: { textAlign: 'center' } },
            /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 } },
              /*#__PURE__*/React.createElement(GearIcon, { size: 22 }),
              /*#__PURE__*/React.createElement("h1", { className: "font-display", style: { fontSize: 26, background: 'linear-gradient(135deg, #FF6B6B, #FFB347, #77DD77, #64B5F6, #BA93FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' } }, "Run Club Admin")),
            /*#__PURE__*/React.createElement("p", { style: { fontSize: 13, color: 'var(--c-text-sub)', marginTop: 4 } }, "Pre-reveal access management"))
        ),

        // Stats row
        /*#__PURE__*/React.createElement("div", { className: "rc-stagger", style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 } },
          /*#__PURE__*/React.createElement("div", { className: "rc-pop-in", style: { background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 16, padding: '14px 10px', textAlign: 'center', borderTop: '3px solid #7DD8A0' } },
            /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 24, color: '#7DD8A0' } }, totalMembers),
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 9, fontWeight: 700, color: 'var(--c-text-sub)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 } }, "Members")),
          /*#__PURE__*/React.createElement("div", { className: "rc-pop-in", style: { background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 16, padding: '14px 10px', textAlign: 'center', borderTop: '3px solid #FFB74D' } },
            /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 24, color: '#FFB74D' } }, pendingCount),
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 9, fontWeight: 700, color: 'var(--c-text-sub)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 } }, "Pending")),
          /*#__PURE__*/React.createElement("div", { className: "rc-pop-in", style: { background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 16, padding: '14px 10px', textAlign: 'center', borderTop: '3px solid #FF8A8A' } },
            /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 24, color: '#FF8A8A' } }, deniedCount),
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 9, fontWeight: 700, color: 'var(--c-text-sub)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 } }, "Denied"))
        ),

        // Pending requests section
        /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 } },
          /*#__PURE__*/React.createElement("h2", { style: { fontSize: 15, fontWeight: 700, color: 'var(--c-text)', display: 'flex', alignItems: 'center', gap: 8 } },
            /*#__PURE__*/React.createElement(InboxIcon, { size: 18 }), "Pending Requests"),
          pendingCount > 0 && /*#__PURE__*/React.createElement("span", {
            style: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12, background: 'linear-gradient(135deg, #FF6B6B, #FFB347, #77DD77, #64B5F6)', color: '#FFF', animation: 'rcBreathe 3s ease-in-out infinite' }
          }, pendingCount + ' waiting')
        ),

        pendingCount > 0 && pendingRequests.map(function(r) {
          return /*#__PURE__*/React.createElement("div", { key: r.id, className: "rc-pop-in",
            style: { background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                     borderRadius: 20, padding: 20, marginBottom: 14, boxShadow: '0 4px 20px rgba(255,107,107,0.06)',
                     border: '1px solid rgba(255,107,107,0.10)', borderLeft: '4px solid #FFB74D' } },
            // User info row
            /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 } },
              /*#__PURE__*/React.createElement("div", { style: { width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                       fontSize: 16, fontWeight: 700, background: r.user.avatarColor || '#C5B3E6', color: '#FFF', boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
                       border: '2px solid rgba(255,255,255,0.6)' } },
                (r.user.username || '?')[0].toUpperCase()),
              /*#__PURE__*/React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                /*#__PURE__*/React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, r.user.username),
                r.socialProof && /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: '#FF6B6B', fontWeight: 500, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, r.socialProof),
                /*#__PURE__*/React.createElement("div", { style: { fontSize: 10, color: 'var(--c-text-sub)', marginTop: 2 } }, r.user.createdAt ? 'Joined ' + formatDateShort(r.user.createdAt) : ''))
            ),
            // Message
            r.message && /*#__PURE__*/React.createElement("div", { style: { fontSize: 13, color: 'var(--c-text-sub)', padding: '10px 14px', borderRadius: 12,
                       background: 'rgba(255,107,107,0.05)', marginBottom: 14, fontStyle: 'italic', lineHeight: 1.5, borderLeft: '2px solid rgba(255,107,107,0.15)' } }, '"' + r.message + '"'),
            // Action buttons
            /*#__PURE__*/React.createElement("div", { style: { display: 'flex', gap: 10 } },
              /*#__PURE__*/React.createElement("button", { onClick: function() { handleReview(r.id, 'approved'); },
                style: { flex: 1, padding: '12px', borderRadius: 14, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
                         background: 'linear-gradient(135deg, #7DD8A0, #66BB6A)', color: '#FFF',
                         boxShadow: '0 3px 12px rgba(125,216,160,0.25)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }
              }, /*#__PURE__*/React.createElement(CheckCircleIcon, { size: 16 }), "Approve"),
              /*#__PURE__*/React.createElement("button", { onClick: function() { handleReview(r.id, 'denied'); },
                style: { flex: 1, padding: '12px', borderRadius: 14, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
                         background: 'rgba(255,138,138,0.12)', color: '#FF8A8A', transition: 'all 0.2s' }
              }, "Deny"))
          );
        }),

        pendingCount === 0 && /*#__PURE__*/React.createElement("div", { className: "rc-pop-in",
          style: { background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                   borderRadius: 24, textAlign: 'center', padding: '36px 24px', marginBottom: 24, border: '1px dashed rgba(125,216,160,0.3)' } },
          /*#__PURE__*/React.createElement("div", { className: "rc-float", style: { marginBottom: 12, display: 'flex', justifyContent: 'center' } },
            /*#__PURE__*/React.createElement(CheckCircleIcon, { size: 36 })),
          /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 18, color: 'var(--c-text)', marginBottom: 6 } }, "All Clear"),
          /*#__PURE__*/React.createElement("p", { style: { fontSize: 13, color: 'var(--c-text-sub)', lineHeight: 1.6 } },
            "No pending requests. When someone applies to join Run Club, they'll appear here for your review.")),

        // Members list (approved)
        reviewedList.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null,
          /*#__PURE__*/React.createElement("h2", { style: { fontSize: 15, fontWeight: 700, color: 'var(--c-text)', marginBottom: 14, marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 } },
            /*#__PURE__*/React.createElement(RunnerIcon, { size: 18 }), "All Reviewed (" + reviewedList.length + ")"),
          /*#__PURE__*/React.createElement("div", { className: "rc-stagger" },
          reviewedList.slice(0, 30).map(function(r) {
            var isApproved = r.status === 'approved';
            return /*#__PURE__*/React.createElement("div", { key: r.id,
              style: { background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                       borderRadius: 16, marginBottom: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                       border: '1px solid rgba(0,0,0,0.04)',
                       borderLeft: '3px solid ' + (isApproved ? '#7DD8A0' : '#FF8A8A') }, className: "rc-pop-in" },
              /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                /*#__PURE__*/React.createElement("div", { style: { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                         fontSize: 12, fontWeight: 700, background: r.user ? (r.user.avatarColor || '#C5B3E6') : '#888', color: '#FFF' } },
                  r.user ? (r.user.username || '?')[0].toUpperCase() : '?'),
                /*#__PURE__*/React.createElement("div", null,
                  /*#__PURE__*/React.createElement("div", { style: { fontSize: 14, fontWeight: 600, color: 'var(--c-text)' } }, r.user ? r.user.username : 'Unknown'),
                  r.socialProof && /*#__PURE__*/React.createElement("div", { style: { fontSize: 10, color: 'var(--c-text-sub)', marginTop: 1 } }, r.socialProof))),
              /*#__PURE__*/React.createElement("span", { style: { fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 10,
                       background: isApproved ? 'rgba(125,216,160,0.15)' : 'rgba(255,138,138,0.1)',
                       color: isApproved ? '#7DD8A0' : '#FF8A8A', textTransform: 'uppercase', letterSpacing: '0.05em' } }, isApproved ? 'Member' : 'Denied'));
          }))
        ),

        // Footer
        /*#__PURE__*/React.createElement("div", { style: { textAlign: 'center', padding: '24px 0 8px', opacity: 0.4, fontSize: 11, fontWeight: 500, color: 'var(--c-text-sub)', letterSpacing: '0.05em' } }, "coded by Degos")
      )
    );
  }

  /* ========== MAIN DASHBOARD ========== */
  var s = runStats || {};
  var unlockedCount = achievements.filter(function(a) { return a.unlocked; }).length;

  return /*#__PURE__*/React.createElement("div", { className: "rc-pastel-bg", style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, height: "100vh", width: "100vw", zIndex: 100, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" } },
    /*#__PURE__*/React.createElement(RunClubStyles, null),
    /*#__PURE__*/React.createElement("div", { className: "rc-inner", style: { width: "100%", maxWidth: 480, margin: "0 auto", padding: "16px 20px calc(100px + env(safe-area-inset-bottom)) 20px", minHeight: "100%" } },

      // Header — time-based greeting
      /*#__PURE__*/React.createElement("div", { className: "rc-slide-up", style: { marginBottom: 24, paddingTop: 16 } },
        /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 14 } },
          /*#__PURE__*/React.createElement("div", { className: "rc-float", style: { width: 52, height: 52, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                     background: 'linear-gradient(135deg, #FF6B6B, #FFB347, #77DD77, #64B5F6, #BA93FF)', boxShadow: '0 6px 24px rgba(255,107,107,0.2)' } },
            /*#__PURE__*/React.createElement(RunShoeIcon, { size: 26, active: true })),
          /*#__PURE__*/React.createElement("div", null,
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: 'var(--c-text-sub)', marginBottom: 2 } },
              (function() { var h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; })() + (profile && profile.username ? ', ' + profile.username : '')),
            /*#__PURE__*/React.createElement("h1", { className: "font-display rc-gradient-text", style: { fontSize: 24, lineHeight: 1.1 } }, "Doodles Run Club")))),

      // Sub-nav
      /*#__PURE__*/React.createElement("div", { style: { display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center', flexWrap: 'wrap' } },
        /*#__PURE__*/React.createElement(RCPill, { active: view === 'dashboard', onClick: () => setView('dashboard'), color: '#FF6B6B' },
          /*#__PURE__*/React.createElement("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 5 } }, /*#__PURE__*/React.createElement(HouseIcon, { size: 14 }), " Home")),
        /*#__PURE__*/React.createElement(RCPill, { active: view === 'history', onClick: () => setView('history'), color: '#FF96C8' },
          /*#__PURE__*/React.createElement("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 5 } }, /*#__PURE__*/React.createElement(ListIcon, { size: 14 }), " History")),
        /*#__PURE__*/React.createElement(RCPill, { active: view === 'leaderboard', onClick: () => setView('leaderboard'), color: '#64B5F6' },
          /*#__PURE__*/React.createElement("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 5 } }, /*#__PURE__*/React.createElement(TrophyIcon, { size: 14 }), " Board")),
        /*#__PURE__*/React.createElement(RCPill, { active: view === 'achievements', onClick: () => setView('achievements'), color: '#FFB74D' },
          /*#__PURE__*/React.createElement("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 5 } }, /*#__PURE__*/React.createElement(MedalIcon, { size: 14 }), " Badges")),
        isAdmin && /*#__PURE__*/React.createElement(RCPill, { active: view === 'admin', onClick: () => setView('admin'), color: '#7DD8A0' },
          /*#__PURE__*/React.createElement("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 5 } }, /*#__PURE__*/React.createElement(GearIcon, { size: 14 }), " Admin"))),

      // Start Run — premium button
      view === 'dashboard' && /*#__PURE__*/React.createElement("div", { className: "rc-pop-in", style: { marginBottom: 28, position: 'relative' } },
        /*#__PURE__*/React.createElement("button", {
          onClick: () => setView('start'),
          style: { width: '100%', padding: '20px 24px', borderRadius: 24, fontSize: 18, fontWeight: 800, border: 'none', cursor: 'pointer',
                   background: 'linear-gradient(135deg, #FF6B6B 0%, #FFB347 25%, #FFE66D 45%, #77DD77 65%, #64B5F6 85%, #BA93FF 100%)',
                   backgroundSize: '200% 100%', animation: 'rcGradientShift 4s ease-in-out infinite, rcStartGlow 3s ease-in-out infinite',
                   color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
                   fontFamily: "'Paytone One', 'Fredoka', sans-serif",
                   letterSpacing: '0.02em',
                   transition: 'transform 0.2s cubic-bezier(.16,1,.3,1)', position: 'relative', overflow: 'hidden' }
        },
          /*#__PURE__*/React.createElement("div", { style: { position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                     backgroundSize: '200% 100%', animation: 'rcShimmer 3s ease-in-out infinite', pointerEvents: 'none' } }),
          /*#__PURE__*/React.createElement(RunShoeIcon, { size: 22, active: true }), "Start Run")),

      // === DASHBOARD ===
      view === 'dashboard' && !loading && /*#__PURE__*/React.createElement(React.Fragment, null,
        /*#__PURE__*/React.createElement("div", { className: "rc-stagger", style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 } },
          [
            { icon: RunnerIcon, label: 'This Week', value: formatDistanceMiles(s.weekDistanceM || 0) + ' mi', sub: (s.weekRuns || 0) + ' runs', gradient: 'linear-gradient(135deg, rgba(125,216,160,0.15), rgba(125,216,160,0.04))', accent: '#5CAA7F', dot: '#7DD8A0' },
            { icon: RunShoeIcon, label: 'Total', value: formatDistanceMiles(s.totalDistanceM || 0) + ' mi', sub: (s.totalRuns || 0) + ' runs', gradient: 'linear-gradient(135deg, rgba(255,107,107,0.12), rgba(255,107,107,0.03))', accent: '#E85D5D', dot: '#FF6B6B' },
            { icon: FireIcon, label: 'Streak', value: (s.streakDays || 0) + 'd', sub: 'days running', gradient: 'linear-gradient(135deg, rgba(255,183,77,0.15), rgba(255,183,77,0.04))', accent: '#E09530', dot: '#FFB74D' },
            { icon: BoltIcon, label: 'Best Pace', value: formatPace(s.bestPaceSec || 0), sub: '/km', gradient: 'linear-gradient(135deg, rgba(100,181,246,0.15), rgba(100,181,246,0.04))', accent: '#4A9ADB', dot: '#64B5F6' }
          ].map(function(item, idx) {
            return /*#__PURE__*/React.createElement("div", { key: idx, className: "rc-glass rc-pop-in",
              style: { padding: '18px 16px', position: 'relative', overflow: 'hidden' } },
              // Colored accent orb
              /*#__PURE__*/React.createElement("div", { style: { position: 'absolute', top: -20, right: -20, width: 60, height: 60, borderRadius: '50%',
                background: item.gradient, pointerEvents: 'none' } }),
              /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, position: 'relative' } },
                /*#__PURE__*/React.createElement("div", { style: { width: 6, height: 6, borderRadius: '50%', background: item.dot } }),
                /*#__PURE__*/React.createElement("span", { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: item.accent } }, item.label)),
              /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 26, color: 'var(--c-text)', lineHeight: 1, marginBottom: 4, position: 'relative' } }, item.value),
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, color: 'var(--c-text-sub)', fontWeight: 500, position: 'relative' } }, item.sub));
          })
        ),

        // Personal Records
        runs.length > 0 && (function() {
          var longestRun = runs.reduce(function(best, r) { return (r.distanceM || 0) > (best.distanceM || 0) ? r : best; }, runs[0]);
          var fastestPace = runs.filter(function(r) { return r.distanceM > 500; }).reduce(function(best, r) {
            return (r.avgPaceSec || 9999) < (best.avgPaceSec || 9999) ? r : best;
          }, { avgPaceSec: 0 });
          var longestTime = runs.reduce(function(best, r) { return (r.durationSec || 0) > (best.durationSec || 0) ? r : best; }, runs[0]);
          var totalCal = runs.reduce(function(sum, r) { return sum + (r.calories || estimateCalories(r.distanceM || 0)); }, 0);
          return /*#__PURE__*/React.createElement("div", { className: "rc-pop-in",
            style: { background: 'linear-gradient(135deg, rgba(255,107,107,0.06), rgba(119,221,119,0.08))',
                     backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                     borderRadius: 20, padding: '16px 18px', marginBottom: 20,
                     border: '1px solid rgba(255,107,107,0.10)' } },
            /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 } },
              /*#__PURE__*/React.createElement(TrophyIcon, { size: 16 }),
              /*#__PURE__*/React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: 'var(--c-text)' } }, "Personal Records")),
            /*#__PURE__*/React.createElement("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 } },
              /*#__PURE__*/React.createElement("div", { style: { textAlign: 'center', padding: '10px 4px', borderRadius: 14, background: 'rgba(255,255,255,0.6)' } },
                /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 16, color: '#FF6B6B' } }, formatDistanceMiles(longestRun.distanceM || 0)),
                /*#__PURE__*/React.createElement("div", { style: { fontSize: 8, fontWeight: 700, color: 'var(--c-text-sub)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 } }, "Longest mi")),
              /*#__PURE__*/React.createElement("div", { style: { textAlign: 'center', padding: '10px 4px', borderRadius: 14, background: 'rgba(255,255,255,0.6)' } },
                /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 16, color: '#7DD8A0' } }, formatPace(fastestPace.avgPaceSec || 0)),
                /*#__PURE__*/React.createElement("div", { style: { fontSize: 8, fontWeight: 700, color: 'var(--c-text-sub)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 } }, "Best pace")),
              /*#__PURE__*/React.createElement("div", { style: { textAlign: 'center', padding: '10px 4px', borderRadius: 14, background: 'rgba(255,255,255,0.6)' } },
                /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 16, color: '#FFB74D' } }, formatDuration(longestTime.durationSec || 0)),
                /*#__PURE__*/React.createElement("div", { style: { fontSize: 8, fontWeight: 700, color: 'var(--c-text-sub)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 } }, "Longest run"))),
            /*#__PURE__*/React.createElement("div", { style: { textAlign: 'center', marginTop: 10, fontSize: 11, fontWeight: 600, color: 'var(--c-text-sub)' } },
              totalCal.toLocaleString() + ' total calories burned'));
        })(),

        // Weekly activity chart
        runs.length > 0 && /*#__PURE__*/React.createElement("div", { className: "rc-pop-in",
          style: { background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                   borderRadius: 20, padding: '16px 18px', marginBottom: 20, boxShadow: '0 4px 16px rgba(255,107,107,0.06)' } },
          /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 } },
            /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              /*#__PURE__*/React.createElement(ChartBarIcon, { size: 16 }),
              /*#__PURE__*/React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: 'var(--c-text)' } }, "This Week")),
            /*#__PURE__*/React.createElement("span", { style: { fontSize: 11, fontWeight: 600, color: 'var(--c-text-sub)' } },
              formatDistanceMiles(s.weekDistanceM || 0) + ' mi total')),
          /*#__PURE__*/React.createElement(React.Fragment, null, (function() {
            var dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
            var now = new Date();
            var dayOfWeek = now.getDay(); // 0=Sun
            var mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            var monday = new Date(now); monday.setDate(now.getDate() - mondayOffset); monday.setHours(0,0,0,0);
            var dailyDist = [0,0,0,0,0,0,0];
            runs.forEach(function(r) {
              var rd = new Date(r.startedAt);
              var diff = Math.floor((rd - monday) / 86400000);
              if (diff >= 0 && diff < 7) dailyDist[diff] += (r.distanceM || 0);
            });
            var maxD = Math.max.apply(null, dailyDist.concat([1000])); // min 1km scale
            var barW = 100 / 7;
            var todayIdx = mondayOffset;
            return /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 } },
              dailyDist.map(function(d, i) {
                var pct = Math.max(4, (d / maxD) * 100);
                var isToday = i === todayIdx;
                var hasRun = d > 0;
                return /*#__PURE__*/React.createElement("div", { key: i, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 } },
                  /*#__PURE__*/React.createElement("div", { style: { fontSize: 8, fontWeight: 700, color: hasRun ? '#FF6B6B' : 'transparent', marginBottom: 2 } },
                    d > 0 ? (d / 1609.344).toFixed(1) : ''),
                  /*#__PURE__*/React.createElement("div", { style: { width: '100%', maxWidth: 28, height: pct + '%', minHeight: 3, borderRadius: 6,
                    background: hasRun ? 'linear-gradient(180deg, #FF6B6B, #FFB347)' : 'rgba(0,0,0,0.06)',
                    boxShadow: hasRun ? '0 2px 8px rgba(255,107,107,0.18)' : 'none',
                    transition: 'height 0.6s cubic-bezier(.22,1,.36,1)' } }),
                  /*#__PURE__*/React.createElement("div", { style: { fontSize: 9, fontWeight: isToday ? 800 : 600,
                    color: isToday ? '#FF6B6B' : 'var(--c-text-sub)', marginTop: 2 } }, dayLabels[i]));
              }));
          })())),

        // Badges preview
        achievements.length > 0 && /*#__PURE__*/React.createElement("div", { className: "rc-glass rc-pop-in", onClick: () => setView('achievements'),
          style: { marginBottom: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                   padding: '16px 20px', position: 'relative', overflow: 'hidden' } },
          /*#__PURE__*/React.createElement("div", { style: { position: 'absolute', top: -10, left: -10, width: 50, height: 50, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,183,77,0.2), transparent)', pointerEvents: 'none' } }),
          /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 10 } },
            /*#__PURE__*/React.createElement(MedalIcon, { size: 20 }),
            /*#__PURE__*/React.createElement("span", { style: { fontSize: 14, fontWeight: 700, color: 'var(--c-text)' } }, unlockedCount + '/' + achievements.length + ' Badges')),
          /*#__PURE__*/React.createElement("span", { style: { fontSize: 13, fontWeight: 600, color: '#FF6B6B' } }, "View all →")),

        // Recent runs
        runs.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null,
          /*#__PURE__*/React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: 'var(--c-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 } },
            /*#__PURE__*/React.createElement(ChartBarIcon, { size: 16 }), "Recent Runs"),
          /*#__PURE__*/React.createElement("div", { className: "rc-stagger" },
          runs.slice(0, 4).map(function(r, i) {
            var runColors = ['#FF6B6B', '#FFB347', '#77DD77', '#64B5F6'];
            var accent = runColors[i % 4];
            return /*#__PURE__*/React.createElement("div", { key: r.id, onClick: function() { openRunDetail(r); },
              className: "rc-glass rc-pop-in",
              style: { padding: '16px 18px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                       cursor: 'pointer', position: 'relative', overflow: 'hidden' } },
              // Accent line
              /*#__PURE__*/React.createElement("div", { style: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2, background: accent } }),
              /*#__PURE__*/React.createElement("div", { style: { paddingLeft: 8 } },
                /*#__PURE__*/React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: 'var(--c-text)' } }, formatDistanceMiles(r.distanceM) + ' mi'),
                /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: 'var(--c-text-sub)', marginTop: 3, fontWeight: 500 } }, formatDateShort(r.startedAt) + ' \xB7 ' + formatDuration(r.durationSec))),
              /*#__PURE__*/React.createElement("div", { style: { textAlign: 'right' } },
                /*#__PURE__*/React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: accent } }, formatPace(r.avgPaceSec) + ' /km'),
                /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, color: 'var(--c-text-sub)', marginTop: 2 } }, (r.calories || estimateCalories(r.distanceM)) + ' cal')));
          }))
        ),

        runs.length === 0 && /*#__PURE__*/React.createElement("div", { style: { background: 'linear-gradient(135deg, rgba(255,107,107,0.06), rgba(119,221,119,0.08))', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 24, textAlign: 'center', padding: '40px 24px', border: '1px dashed rgba(255,107,107,0.2)' }, className: "rc-pop-in" },
          /*#__PURE__*/React.createElement("div", { className: "rc-float", style: { marginBottom: 12, display: 'flex', justifyContent: 'center' } }, /*#__PURE__*/React.createElement(RunnerIcon, { size: 56 })),
          /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 18, color: 'var(--c-text)', marginBottom: 8 } }, "Ready to run?"),
          /*#__PURE__*/React.createElement("p", { style: { fontSize: 14, color: 'var(--c-text-sub)', lineHeight: 1.6, maxWidth: 260, margin: '0 auto' } }, "Your journey starts with a single step. Tap Start Run above and let's go!"))
      ),

      // === HISTORY ===
      view === 'history' && /*#__PURE__*/React.createElement(React.Fragment, null,
        /*#__PURE__*/React.createElement("div", { className: "rc-stagger" },
        runs.map(function(r, i) {
          var histColors = ['#FF6B6B', '#FFB347', '#FFE66D', '#77DD77', '#64B5F6'];
          return /*#__PURE__*/React.createElement("div", { key: r.id, onClick: function() { openRunDetail(r); }, style: { background: "rgba(255,255,255,0.75)", backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 18, padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '3px solid ' + histColors[i % 5], boxShadow: '0 2px 10px rgba(0,0,0,0.04)', cursor: 'pointer' }, className: "rc-pop-in" },
            /*#__PURE__*/React.createElement("div", null,
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: 'var(--c-text)' } }, formatDistanceMiles(r.distanceM) + ' mi'),
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: 'var(--c-text-sub)', marginTop: 2 } }, formatDateShort(r.startedAt) + ' \xB7 ' + formatDuration(r.durationSec))),
            /*#__PURE__*/React.createElement("div", { style: { textAlign: 'right' } },
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 14, fontWeight: 600, color: '#FF6B6B' } }, formatPace(r.avgPaceSec) + ' /km'),
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: 'var(--c-text-sub)' } }, (r.calories || estimateCalories(r.distanceM)) + ' cal')));
        })),
        runs.length === 0 && !loading && /*#__PURE__*/React.createElement("div", { style: { background: 'linear-gradient(135deg, rgba(119,221,119,0.08), rgba(100,181,246,0.08))', borderRadius: 24, textAlign: 'center', padding: '40px 24px', border: '1px dashed rgba(100,181,246,0.3)' } },
          /*#__PURE__*/React.createElement("div", { className: "rc-float", style: { marginBottom: 12, display: 'flex', justifyContent: 'center' } }, /*#__PURE__*/React.createElement(ListIcon, { size: 48 })),
          /*#__PURE__*/React.createElement("p", { style: { fontSize: 15, fontWeight: 600, color: 'var(--c-text)', marginBottom: 4 } }, "No runs yet"),
          /*#__PURE__*/React.createElement("p", { style: { fontSize: 13, color: 'var(--c-text-sub)' } }, "Complete a run to see it here!"))
      ),

      // === LEADERBOARD ===
      view === 'leaderboard' && /*#__PURE__*/React.createElement(React.Fragment, null,
        /*#__PURE__*/React.createElement("div", { style: { display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center' } },
          /*#__PURE__*/React.createElement(RCPill, { active: lbScope === 'weekly', onClick: () => setLbScope('weekly'), color: '#64B5F6' }, "This Week"),
          /*#__PURE__*/React.createElement(RCPill, { active: lbScope === 'alltime', onClick: () => setLbScope('alltime'), color: '#FF6B6B' }, "All Time")),

        // Podium for top 3
        lbRows.length >= 3 && /*#__PURE__*/React.createElement("div", { className: "rc-slide-up", style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginBottom: 28, padding: '0 10px' } },
          // 2nd place
          /*#__PURE__*/React.createElement("div", { style: { flex: 1, textAlign: 'center' } },
            /*#__PURE__*/React.createElement("div", { style: { width: 44, height: 44, borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, background: lbRows[1].avatarColor || '#C5B3E6', color: '#FFF',
              border: '3px solid #C0C0C0', boxShadow: '0 4px 16px rgba(192,192,192,0.3)' } }, (lbRows[1].username || '?')[0].toUpperCase()),
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: 'var(--c-text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, lbRows[1].username),
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, fontWeight: 600, color: '#FF6B6B', marginBottom: 8 } }, formatDistanceMiles(lbRows[1].distanceM) + ' mi'),
            /*#__PURE__*/React.createElement("div", { className: "rc-glass", style: { height: 60, borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(180deg, rgba(192,192,192,0.15), rgba(192,192,192,0.05))', borderBottom: '3px solid #C0C0C0' } },
              /*#__PURE__*/React.createElement("span", { className: "font-display", style: { fontSize: 20, color: '#C0C0C0' } }, "2"))),
          // 1st place
          /*#__PURE__*/React.createElement("div", { style: { flex: 1, textAlign: 'center' } },
            /*#__PURE__*/React.createElement("div", { className: "rc-float", style: { marginBottom: 8, display: 'flex', justifyContent: 'center' } },
              /*#__PURE__*/React.createElement(TrophyIcon, { size: 20 })),
            /*#__PURE__*/React.createElement("div", { style: { width: 52, height: 52, borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, background: lbRows[0].avatarColor || '#C5B3E6', color: '#FFF',
              border: '3px solid #FFD700', boxShadow: '0 4px 20px rgba(255,215,0,0.35)' } }, (lbRows[0].username || '?')[0].toUpperCase()),
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: 'var(--c-text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, lbRows[0].username),
            /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 14, color: '#FF6B6B', marginBottom: 8 } }, formatDistanceMiles(lbRows[0].distanceM) + ' mi'),
            /*#__PURE__*/React.createElement("div", { className: "rc-glass", style: { height: 80, borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(180deg, rgba(255,215,0,0.12), rgba(255,215,0,0.04))', borderBottom: '3px solid #FFD700' } },
              /*#__PURE__*/React.createElement("span", { className: "font-display", style: { fontSize: 24, color: '#FFD700' } }, "1"))),
          // 3rd place
          /*#__PURE__*/React.createElement("div", { style: { flex: 1, textAlign: 'center' } },
            /*#__PURE__*/React.createElement("div", { style: { width: 40, height: 40, borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, background: lbRows[2].avatarColor || '#C5B3E6', color: '#FFF',
              border: '3px solid #CD7F32', boxShadow: '0 4px 14px rgba(205,127,50,0.25)' } }, (lbRows[2].username || '?')[0].toUpperCase()),
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: 'var(--c-text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, lbRows[2].username),
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, fontWeight: 600, color: '#FF6B6B', marginBottom: 8 } }, formatDistanceMiles(lbRows[2].distanceM) + ' mi'),
            /*#__PURE__*/React.createElement("div", { className: "rc-glass", style: { height: 44, borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(180deg, rgba(205,127,50,0.12), rgba(205,127,50,0.04))', borderBottom: '3px solid #CD7F32' } },
              /*#__PURE__*/React.createElement("span", { className: "font-display", style: { fontSize: 18, color: '#CD7F32' } }, "3")))
        ),

        // Remaining runners (4th+)
        /*#__PURE__*/React.createElement("div", { className: "rc-stagger" },
        lbRows.slice(lbRows.length >= 3 ? 3 : 0).map(function(r, i) {
          var idx = lbRows.length >= 3 ? i + 3 : i;
          return /*#__PURE__*/React.createElement("div", { key: idx, className: "rc-glass rc-pop-in",
            style: { padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 } },
            /*#__PURE__*/React.createElement("div", { style: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                     fontSize: 12, fontWeight: 700, background: 'rgba(255,107,107,0.06)', color: 'var(--c-text-sub)' } }, r.rank),
            /*#__PURE__*/React.createElement("div", { style: { width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                     fontSize: 13, fontWeight: 700, background: r.avatarColor || '#C5B3E6', color: '#FFF', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } }, (r.username || '?')[0].toUpperCase()),
            /*#__PURE__*/React.createElement("div", { style: { flex: 1, minWidth: 0 } },
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, r.username)),
            /*#__PURE__*/React.createElement("div", { style: { textAlign: 'right' } },
              /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 14, color: '#FF6B6B' } }, formatDistanceMiles(r.distanceM) + ' mi'),
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 10, color: 'var(--c-text-sub)', fontWeight: 500 } }, r.runs + ' runs')));
        })),
        lbRows.length === 0 && !loading && /*#__PURE__*/React.createElement("div", { className: "rc-glass rc-pop-in",
          style: { textAlign: 'center', padding: '44px 24px' } },
          /*#__PURE__*/React.createElement("div", { className: "rc-float", style: { marginBottom: 14, display: 'flex', justifyContent: 'center' } }, /*#__PURE__*/React.createElement(TrophyIcon, { size: 48 })),
          /*#__PURE__*/React.createElement("p", { style: { fontSize: 16, fontWeight: 700, color: 'var(--c-text)', marginBottom: 6 } }, "No runners yet"),
          /*#__PURE__*/React.createElement("p", { style: { fontSize: 13, color: 'var(--c-text-sub)', lineHeight: 1.6 } }, "Be the first to hit the leaderboard!"))
      ),

      // === ACHIEVEMENTS ===
      view === 'achievements' && /*#__PURE__*/React.createElement(React.Fragment, null,
        /*#__PURE__*/React.createElement("div", { className: "rc-slide-up", style: { textAlign: 'center', marginBottom: 24, padding: '16px 0' } },
          /*#__PURE__*/React.createElement("div", { className: "rc-float", style: { marginBottom: 8, display: 'flex', justifyContent: 'center' } }, /*#__PURE__*/React.createElement(MedalIcon, { size: 40 })),
          /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 32, background: 'linear-gradient(135deg, #FF6B6B, #FFB347, #77DD77, #64B5F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' } }, unlockedCount + ' / ' + achievements.length),
          /*#__PURE__*/React.createElement("div", { style: { fontSize: 13, color: 'var(--c-text-sub)', fontWeight: 600, marginTop: 4 } }, "badges earned"),
          // Progress bar
          /*#__PURE__*/React.createElement("div", { style: { width: '100%', maxWidth: 200, margin: '12px auto 0', height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' } },
            /*#__PURE__*/React.createElement("div", { style: { height: '100%', borderRadius: 3, transition: 'width 0.6s ease-out',
              width: (achievements.length > 0 ? (unlockedCount / achievements.length) * 100 : 0) + '%',
              background: 'linear-gradient(90deg, #FF6B6B, #FFB347, #FFE66D, #77DD77, #64B5F6, #BA93FF)' } }))),

        // Unlocked badges first, then locked
        /*#__PURE__*/React.createElement("div", { className: "rc-stagger", style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 } },
          // Sort: unlocked first
          [].concat(achievements).sort(function(a, b) { return (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0); }).map(function(a, i) {
            return /*#__PURE__*/React.createElement("div", { key: a.id, className: "rc-pop-in",
              style: { textAlign: 'center', padding: '18px 12px', position: 'relative', overflow: 'hidden',
                       background: a.unlocked ? 'rgba(255,255,255,0.85)' : 'rgba(240,238,245,0.5)',
                       backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                       borderRadius: 20,
                       border: a.unlocked ? '2px solid rgba(255,107,107,0.18)' : '1px dashed rgba(0,0,0,0.1)',
                       boxShadow: a.unlocked ? '0 6px 20px rgba(255,107,107,0.12)' : 'inset 0 2px 8px rgba(0,0,0,0.03)',
                       transition: 'transform 0.2s ease, box-shadow 0.2s ease' } },

              // Medal with lock overlay for locked
              /*#__PURE__*/React.createElement("div", { className: a.unlocked ? 'rc-shine' : '',
                style: { marginBottom: 10, display: 'flex', justifyContent: 'center', position: 'relative',
                         filter: a.unlocked ? 'none' : 'grayscale(1) opacity(0.35)' } },
                getAchievementMedal(a.id, a.unlocked),
                // Lock icon overlay on locked badges
                !a.unlocked && /*#__PURE__*/React.createElement("div", { style: { position: 'absolute', bottom: -2, right: 'calc(50% - 20px)',
                  width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' } },
                  /*#__PURE__*/React.createElement(LockIcon, { size: 10 }))),

              // Shimmer on unlocked only
              a.unlocked && /*#__PURE__*/React.createElement("div", { className: "rc-shimmer", style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 20, pointerEvents: 'none' } }),

              // Name — dimmed for locked
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: a.unlocked ? 'var(--c-text)' : 'rgba(0,0,0,0.3)', marginBottom: 4 } }, a.name),

              // Description — hidden for locked, replaced with "???"
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 10, color: a.unlocked ? 'var(--c-text-sub)' : 'rgba(0,0,0,0.2)', lineHeight: 1.5, fontStyle: a.unlocked ? 'normal' : 'italic' } },
                a.unlocked ? a.desc : '???'),

              // Unlocked date or LOCKED label
              a.unlocked
                ? /*#__PURE__*/React.createElement("div", { style: { fontSize: 9, fontWeight: 700, color: '#7DD8A0', marginTop: 8, padding: '3px 10px', borderRadius: 10, background: 'rgba(125,216,160,0.12)', display: 'inline-block' } }, formatDateShort(a.unlockedAt))
                : /*#__PURE__*/React.createElement("div", { style: { fontSize: 8, fontWeight: 700, color: 'rgba(0,0,0,0.2)', marginTop: 8, padding: '3px 10px', borderRadius: 10, background: 'rgba(0,0,0,0.04)', display: 'inline-block', letterSpacing: '0.15em', textTransform: 'uppercase' } }, "locked"));
          })
        )
      ),

      // Loading
      loading && accessStatus === 'approved' && /*#__PURE__*/React.createElement("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 12 } },
        /*#__PURE__*/React.createElement("div", { style: { width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,107,107,0.12)', borderTopColor: '#FF6B6B',
                   animation: 'rcSpin 0.8s linear infinite' } }),
        /*#__PURE__*/React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: 'var(--c-text-sub)' } }, "Loading...")),

      // Footer
      /*#__PURE__*/React.createElement("div", { style: { textAlign: 'center', padding: '24px 0 8px', opacity: 0.4, fontSize: 11, fontWeight: 500, color: 'var(--c-text-sub)', letterSpacing: '0.05em' } }, "coded by Degos"),

      // Achievement unlock toasts (floating overlay)
      unlockToasts.length > 0 && /*#__PURE__*/React.createElement("div", { style: { position: 'fixed', bottom: 100, left: 0, right: 0, zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, pointerEvents: 'none' } },
        unlockToasts.map(function(toast, i) {
          return /*#__PURE__*/React.createElement("div", { key: toast.id,
            style: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderRadius: 20,
                     background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                     border: '1px solid rgba(255,107,107,0.18)', boxShadow: '0 8px 32px rgba(255,107,107,0.15), 0 0 0 1px rgba(255,255,255,0.5)',
                     animation: 'rcToastIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards',
                     animationDelay: (i * 0.15) + 's', opacity: 0, pointerEvents: 'auto' } },
            /*#__PURE__*/React.createElement("div", { style: { animation: 'rcMedalBounce 0.6s cubic-bezier(0.22,1,0.36,1) forwards', animationDelay: (i * 0.15 + 0.3) + 's', transform: 'scale(0)' } },
              getAchievementMedal(toast.id, true)),
            /*#__PURE__*/React.createElement("div", null,
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#FF6B6B', marginBottom: 2 } }, "Badge Unlocked!"),
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: 'var(--c-text)' } }, toast.name),
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, color: 'var(--c-text-sub)', marginTop: 1 } }, toast.desc)));
        })
      )
    )
  );
};


  // Portal wrapper: renders RunClub directly into document.body to escape
  // the anim-page-in stacking context (transform/filter trap position:fixed).
  var RunClubPortal = function(props) {
    var portalEl = useRef(null);
    if (!portalEl.current) {
      portalEl.current = document.createElement('div');
      portalEl.current.id = 'run-club-portal';
    }
    useEffect(function() {
      document.body.appendChild(portalEl.current);
      return function() {
        if (portalEl.current && portalEl.current.parentNode) {
          portalEl.current.parentNode.removeChild(portalEl.current);
        }
      };
    }, []);
    return ReactDOM.createPortal(
      React.createElement(RunClubScreen, props),
      portalEl.current
    );
  };

  // Expose to global scope so app.js can use them
  window.RunClubScreen = RunClubPortal;
  window.RunShoeIcon = RunShoeIcon;
})();
