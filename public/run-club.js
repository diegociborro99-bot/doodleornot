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

  /* Local Pill component (no dependency on app.js) */
  var RCPill = function(props) {
    var active = props.active;
    var onClick = props.onClick;
    var color = props.color || 'var(--c-accent)';
    return React.createElement("button", {
      onClick: onClick,
      style: {
        padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.2s', border: '1px solid ' + (active ? color : 'var(--c-border)'),
        background: active ? color : 'var(--c-pill-inactive, rgba(255,255,255,0.6))',
        color: active ? '#FFFFFF' : 'var(--c-text, #2D2D3F)'
      }
    }, props.children);
  };

/* ==========================================================================
   DOODLES RUN CLUB — v4 Complete Rewrite
   Solid backgrounds, mobile+PC optimized, access gate, admin inbox,
   custom achievement medals, all in English
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
    /*#__PURE__*/React.createElement("text", { x: 24, y: 16, textAnchor: "middle", fontSize: 12, fill: unlocked ? '#FFF' : '#666' }, "🔥"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 28, textAnchor: "middle", fontSize: 7, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "7 DAYS"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#FF7043' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  streak_30: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("defs", null,
      /*#__PURE__*/React.createElement("linearGradient", { id: "g30", x1: "0", y1: "0", x2: "1", y2: "1" },
        /*#__PURE__*/React.createElement("stop", { offset: "0%", stopColor: unlocked ? '#FF5722' : '#3A3550' }),
        /*#__PURE__*/React.createElement("stop", { offset: "100%", stopColor: unlocked ? '#FF9800' : '#2A2740' }))),
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: "url(#g30)", opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 16, textAnchor: "middle", fontSize: 11, fill: unlocked ? '#FFF' : '#666' }, "🔥"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 27, textAnchor: "middle", fontSize: 6, fontWeight: "bold", fill: unlocked ? '#FFF' : '#666' }, "30 DAYS"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#FF5722' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  speed_demon: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: unlocked ? '#40C4FF' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 16, textAnchor: "middle", fontSize: 13, fill: unlocked ? '#FFF' : '#666' }, "⚡"),
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
    /*#__PURE__*/React.createElement("text", { x: 24, y: 18, textAnchor: "middle", fontSize: 14, fill: unlocked ? '#F57F17' : '#666' }, "☀"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 29, textAnchor: "middle", fontSize: 5, fontWeight: "bold", fill: unlocked ? '#F57F17' : '#666' }, "EARLY"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#FFF176' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 })),

  night_owl: (unlocked) => /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 48 48", width: 40, height: 40 },
    /*#__PURE__*/React.createElement("circle", { cx: 24, cy: 20, r: 16, fill: unlocked ? '#1A237E' : '#3A3550', opacity: unlocked ? 1 : 0.4 }),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 18, textAnchor: "middle", fontSize: 14, fill: unlocked ? '#FFF' : '#666' }, "🌙"),
    /*#__PURE__*/React.createElement("text", { x: 24, y: 29, textAnchor: "middle", fontSize: 5, fontWeight: "bold", fill: unlocked ? '#9FA8DA' : '#666' }, "NIGHT"),
    /*#__PURE__*/React.createElement("polygon", { points: "18,36 24,42 30,36 28,36 24,40 20,36", fill: unlocked ? '#3F51B5' : '#3A3550', opacity: unlocked ? 0.8 : 0.3 }))
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
  /* Neutralize anim-page-in stacking context so the bottom nav's z-index works globally.
     Then raise the bottom nav above the Run Club portal overlay. */
  .anim-page-in { transform: none !important; filter: none !important; }
  .fixed.bottom-0.z-20 { z-index: 200 !important; }
  @keyframes rcPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.15); opacity: 0.7; } }
  @keyframes rcBreathe { 0%,100% { box-shadow: 0 0 20px rgba(123,123,255,0.3); } 50% { box-shadow: 0 0 40px rgba(123,123,255,0.6); } }
  @keyframes rcSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes rcPopIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
  @keyframes rcShine { 0% { filter: brightness(1); } 50% { filter: brightness(1.3); } 100% { filter: brightness(1); } }
  @keyframes rcDotPing { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
  @keyframes rcProgressGlow { 0%,100% { filter: drop-shadow(0 0 4px rgba(123,123,255,0.3)); } 50% { filter: drop-shadow(0 0 12px rgba(123,123,255,0.7)); } }
  .rc-slide-up { animation: rcSlideUp 0.45s cubic-bezier(.22,1,.36,1) both; }
  .rc-pop-in { animation: rcPopIn 0.35s cubic-bezier(.22,1.2,.36,1) both; }
  .rc-shine { animation: rcShine 2s ease-in-out infinite; }
  .rc-stagger > *:nth-child(1) { animation-delay: 0s; }
  .rc-stagger > *:nth-child(2) { animation-delay: 0.06s; }
  .rc-stagger > *:nth-child(3) { animation-delay: 0.08s; }
  .rc-stagger > *:nth-child(4) { animation-delay: 0.12s; }
  .rc-wrap {
    position: fixed; inset: 0; z-index: 40;
    background: var(--c-bg);
    overflow-y: auto; overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  }
  .rc-inner {
    width: 100%; max-width: 480px; margin: 0 auto;
    padding: 16px 20px calc(100px + env(safe-area-inset-bottom)) 20px;
    min-height: 100%;
  }
  .rc-card {
    background: var(--c-card-solid);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 16px;
  }
  @media (prefers-reduced-motion: reduce) {
    .rc-slide-up, .rc-pop-in, .rc-shine { animation: none !important; }
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
          /*#__PURE__*/React.createElement("stop", { offset: "0%", stopColor: "#7B7BFF" }),
          /*#__PURE__*/React.createElement("stop", { offset: "100%", stopColor: "#A8E6CF" })))
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
const estimateCalories = (distanceM) => Math.round((distanceM / 1000) * 60);
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

  // GPS state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [gpsRoute, setGpsRoute] = useState([]);
  const [gpsError, setGpsError] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [splits, setSplits] = useState([]);
  const watchIdRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedAtRef = useRef(0);
  const timerRef = useRef(null);
  const lastPosRef = useRef(null);
  const lastSplitTimeRef = useRef(0);

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
    if (!api) return;
    try {
      const res = await api.requestRunAccess({ socialProof: requestSocial, message: requestMsg });
      setAccessStatus(res.status || 'pending');
    } catch (e) { console.warn('Request access failed:', e); }
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

  // Goal reached
  useEffect(() => {
    if (!runMode || runMode === 'free' || goalReached) return;
    const targetM = runMode.unit === 'mi' ? runMode.target * 1609.344 : runMode.target * 1000;
    if (distance >= targetM) { setGoalReached(true); if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 300]); }
  }, [distance, runMode, goalReached]);

  const startGpsWatch = () => {
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsAccuracy(Math.round(accuracy));
        if (accuracy > 50) return;
        setGpsRoute(prev => [...prev, { lat: latitude, lng: longitude, ts: Date.now() }]);
        if (lastPosRef.current) {
          const d = haversineDistance(lastPosRef.current.lat, lastPosRef.current.lng, latitude, longitude);
          if (d > 3 && d < 500) {
            setDistance(prev => {
              const newDist = prev + d;
              const currentKm = Math.floor(newDist / 1000);
              const lastKm = Math.floor(prev / 1000);
              if (currentKm > lastKm && currentKm > 0) {
                const splitTime = Math.floor((Date.now() - startTimeRef.current) / 1000) + pausedAtRef.current;
                setSplits(s => [...s, { km: currentKm, timeSec: splitTime - lastSplitTimeRef.current }]);
                lastSplitTimeRef.current = splitTime;
              }
              return newDist;
            });
            lastPosRef.current = { lat: latitude, lng: longitude };
          }
        } else { lastPosRef.current = { lat: latitude, lng: longitude }; }
      },
      (err) => { setGpsError(err.code === 1 ? 'Location permission denied' : err.code === 2 ? 'GPS unavailable' : 'GPS timeout'); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );
  };

  const startRun = (mode) => {
    if (!navigator.geolocation) { setGpsError('GPS not available'); return; }
    setRunMode(mode); setGoalReached(false); setGpsError(null); setDistance(0); setElapsed(0); setGpsRoute([]); setSplits([]);
    lastPosRef.current = null; pausedAtRef.current = 0; lastSplitTimeRef.current = 0;
    startTimeRef.current = Date.now();
    setIsRunning(true); setIsPaused(false); setView('active');
    startGpsWatch();
  };

  const pauseRun = () => { setIsPaused(true); pausedAtRef.current = elapsed; if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; } };
  const resumeRun = () => { setIsPaused(false); startTimeRef.current = Date.now(); startGpsWatch(); };

  const finishRun = async () => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (timerRef.current) clearInterval(timerRef.current);
    const dist = Math.round(distance); const dur = elapsed;
    const pace = dist > 0 ? Math.round((dur / (dist / 1000))) : 0;
    const cal = estimateCalories(dist);
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
        if (achv && achv.achievements) setAchievements(achv.achievements);
      } catch (e) { console.warn('Failed to save run:', e); }
    }
    setIsRunning(false); setIsPaused(false);
  };

  const discardRun = () => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false); setIsPaused(false); setDistance(0); setElapsed(0);
    setGpsRoute([]); setSplits([]); setRunMode(null); setView('dashboard');
  };

  const currentPace = distance > 100 && elapsed > 0 ? Math.round(elapsed / (distance / 1000)) : 0;
  const goalProgress = runMode && runMode !== 'free' ? Math.min(1, distance / (runMode.unit === 'mi' ? runMode.target * 1609.344 : runMode.target * 1000)) : 0;

  /* ========== ACCESS LOADING ========== */
  if (accessLoading) {
    return /*#__PURE__*/React.createElement("div", { style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, height: "100vh", width: "100vw", zIndex: 100, background: "var(--c-bg)", overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" } },
      /*#__PURE__*/React.createElement(RunClubStyles, null),
      /*#__PURE__*/React.createElement("div", { style: { width: '100%', maxWidth: 480, margin: '0 auto', padding: '16px 20px calc(100px + env(safe-area-inset-bottom)) 20px', minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        /*#__PURE__*/React.createElement("div", { style: { width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--c-border)', borderTopColor: 'var(--c-accent)', animation: 'rcPulse 1s linear infinite' } })));
  }

  /* ========== ACCESS GATE — Apply to Join ========== */
  if (accessStatus !== 'approved') {
    return /*#__PURE__*/React.createElement("div", { style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, height: "100vh", width: "100vw", zIndex: 100, background: "var(--c-bg)", overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" } },
      /*#__PURE__*/React.createElement(RunClubStyles, null),
      /*#__PURE__*/React.createElement("div", { style: { width: '100%', maxWidth: 480, margin: '0 auto', padding: '16px 20px calc(100px + env(safe-area-inset-bottom)) 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },

        // Logo + Title
        /*#__PURE__*/React.createElement("div", { className: "rc-slide-up", style: { textAlign: 'center', marginBottom: 32 } },
          /*#__PURE__*/React.createElement("div", {
            style: { width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                     background: 'linear-gradient(135deg, rgba(168,230,207,0.25), rgba(123,123,255,0.25))', border: '2px solid var(--c-border)' }
          }, /*#__PURE__*/React.createElement(RunShoeIcon, { size: 36 })),
          /*#__PURE__*/React.createElement("h1", { className: "font-display", style: { fontSize: 28, color: 'var(--c-text)', marginBottom: 8 } }, "Doodles Run Club"),
          /*#__PURE__*/React.createElement("p", { style: { fontSize: 14, lineHeight: 1.6, color: 'var(--c-text-sub)', maxWidth: 320, margin: '0 auto' } },
            "An exclusive running community for Doodles holders. Track your runs, compete on leaderboards, and earn achievements.")
        ),

        // STATUS: none — show application form
        accessStatus === 'none' && /*#__PURE__*/React.createElement("div", { style: { background: "var(--c-card-solid)", border: "1px solid var(--c-border)", borderRadius: 16, padding: 16, width: '100%', maxWidth: 360 }, className: "rc-pop-in" },
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
          /*#__PURE__*/React.createElement("button", {
            onClick: handleRequestAccess, disabled: !requestSocial.trim(),
            style: { width: '100%', padding: '12px', borderRadius: 14, fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer',
                     background: requestSocial.trim() ? 'var(--c-accent)' : 'var(--c-border)', color: '#FFF', transition: 'all 0.2s' }
          }, "Submit Request")
        ),

        // STATUS: pending — waiting screen
        accessStatus === 'pending' && /*#__PURE__*/React.createElement("div", { style: { background: "var(--c-card-solid)", border: "1px solid var(--c-border)", borderRadius: 16, padding: 16, width: '100%', maxWidth: 360, textAlign: 'center' }, className: "rc-pop-in" },
          /*#__PURE__*/React.createElement("div", { style: { width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                     background: 'rgba(255,224,130,0.15)' } },
            /*#__PURE__*/React.createElement(ClockIcon, { size: 28 })),
          /*#__PURE__*/React.createElement("h2", { style: { fontSize: 18, fontWeight: 600, color: 'var(--c-text)', marginBottom: 8 } }, "Request Submitted"),
          /*#__PURE__*/React.createElement("p", { style: { fontSize: 14, color: 'var(--c-text-sub)', lineHeight: 1.6, marginBottom: 4 } },
            "Your request has been received and is being reviewed by an admin."),
          /*#__PURE__*/React.createElement("p", { style: { fontSize: 13, color: 'var(--c-text-sub)', marginTop: 8 } },
            "You'll get access as soon as it's approved. Check back soon!")
        ),

        // STATUS: denied
        accessStatus === 'denied' && /*#__PURE__*/React.createElement("div", { style: { background: "var(--c-card-solid)", border: "1px solid var(--c-border)", borderRadius: 16, padding: 16, width: '100%', maxWidth: 360, textAlign: 'center' }, className: "rc-pop-in" },
          /*#__PURE__*/React.createElement("div", { style: { width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                     background: 'rgba(255,138,138,0.12)' } },
            /*#__PURE__*/React.createElement(LockIcon, { size: 28 })),
          /*#__PURE__*/React.createElement("h2", { style: { fontSize: 18, fontWeight: 600, color: 'var(--c-wrong)', marginBottom: 8 } }, "Access Denied"),
          /*#__PURE__*/React.createElement("p", { style: { fontSize: 14, color: 'var(--c-text-sub)', lineHeight: 1.6 } },
            "Your request was not approved. Contact an admin if you believe this is an error.")
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

  /* ========== POST-RUN SUMMARY ========== */
  if (showPostRun) {
    const dist = Math.round(distance); const dur = elapsed;
    const pace = dist > 0 ? Math.round((dur / (dist / 1000))) : 0;
    const hitGoal = runMode && runMode !== 'free' && goalReached;
    return /*#__PURE__*/React.createElement("div", { style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, height: "100vh", width: "100vw", zIndex: 100, background: "var(--c-bg)", overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" } },
      /*#__PURE__*/React.createElement(RunClubStyles, null),
      /*#__PURE__*/React.createElement("div", { style: { width: "100%", maxWidth: 480, margin: "0 auto", padding: "16px 20px calc(100px + env(safe-area-inset-bottom)) 20px", minHeight: "100%" } },
        /*#__PURE__*/React.createElement("div", { className: "rc-slide-up", style: { textAlign: 'center', marginBottom: 24 } },
          hitGoal && /*#__PURE__*/React.createElement("div", {
            style: { display: 'inline-block', fontSize: 13, fontWeight: 700, padding: '6px 16px', borderRadius: 20,
                     background: 'rgba(168,230,207,0.15)', color: '#7DD8A0', marginBottom: 8 }
          }, "Goal Reached!"),
          /*#__PURE__*/React.createElement("h1", { className: "font-display", style: { fontSize: 42, color: 'var(--c-accent)' } },
            formatDistanceMiles(dist) + ' mi')
        ),
        /*#__PURE__*/React.createElement("div", { className: "rc-stagger", style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 } },
          [['Time', formatDuration(dur)], ['Pace/km', formatPace(pace)], ['Cal', estimateCalories(dist)]].map(function(pair, i) {
            return /*#__PURE__*/React.createElement("div", { key: i, style: { background: "var(--c-card-solid)", border: "1px solid var(--c-border)", borderRadius: 16, padding: 16, textAlign: 'center', padding: 12 }, className: "rc-pop-in" },
              /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 20, color: 'var(--c-text)' } }, pair[1]),
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4, color: 'var(--c-text-sub)' } }, pair[0]));
          })
        ),
        splits.length > 0 && /*#__PURE__*/React.createElement("div", { style: { background: "var(--c-card-solid)", border: "1px solid var(--c-border)", borderRadius: 16, padding: 16, marginBottom: 16 }, className: "rc-slide-up" },
          /*#__PURE__*/React.createElement("h3", { style: { fontSize: 14, fontWeight: 600, color: 'var(--c-text)', marginBottom: 12 } }, "Km Splits"),
          splits.map(function(s, i) {
            return /*#__PURE__*/React.createElement("div", { key: i, style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < splits.length - 1 ? '1px solid var(--c-border)' : 'none' } },
              /*#__PURE__*/React.createElement("span", { style: { fontSize: 13, color: 'var(--c-text-sub)' } }, "Km " + s.km),
              /*#__PURE__*/React.createElement("span", { style: { fontSize: 13, fontWeight: 600, color: 'var(--c-text)' } }, formatPace(s.timeSec)));
          })
        ),
        coachTips.length > 0 && /*#__PURE__*/React.createElement("div", { style: { background: "var(--c-card-solid)", border: "1px solid var(--c-border)", borderRadius: 16, padding: 16, marginBottom: 16 }, className: "rc-slide-up" },
          /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 } },
            /*#__PURE__*/React.createElement(BrainIcon, { size: 18 }),
            /*#__PURE__*/React.createElement("h3", { style: { fontSize: 14, fontWeight: 600, color: 'var(--c-text)' } }, "AI Coach")),
          coachTips.map(function(tip, i) {
            return /*#__PURE__*/React.createElement("p", { key: i, style: { fontSize: 13, lineHeight: 1.6, color: 'var(--c-text-sub)', padding: '6px 0',
                     borderBottom: i < coachTips.length - 1 ? '1px solid var(--c-border)' : 'none' } }, tip.text);
          })
        ),
        /*#__PURE__*/React.createElement("button", {
          onClick: () => { setShowPostRun(false); setDistance(0); setElapsed(0); setSplits([]); setCoachTips([]); setRunMode(null); setGoalReached(false); setView('dashboard'); },
          style: { width: '100%', padding: 14, borderRadius: 16, fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer',
                   background: 'var(--c-accent)', color: '#FFF' }
        }, "Done")
      )
    );
  }

  /* ========== RUN MODE PICKER ========== */
  if (view === 'start') {
    return /*#__PURE__*/React.createElement("div", { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 100%)' } },
      /*#__PURE__*/React.createElement(RunClubStyles, null),
      /*#__PURE__*/React.createElement("div", { style: { width: '100%', maxWidth: 480, margin: '0 auto', padding: '16px 20px calc(100px + env(safe-area-inset-bottom)) 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
        /*#__PURE__*/React.createElement("button", { onClick: () => setView('dashboard'),
          style: { position: 'absolute', top: 20, left: 20, fontSize: 14, fontWeight: 600, color: '#9B95B0', background: 'none', border: 'none', cursor: 'pointer' }
        }, "← Cancel"),

        /*#__PURE__*/React.createElement("h1", { className: "font-display rc-slide-up", style: { fontSize: 24, color: '#E8E0F0', marginBottom: 32 } }, "Choose Your Run"),

        // Free Run
        /*#__PURE__*/React.createElement("button", {
          onClick: () => startRun('free'),
          className: "rc-pop-in",
          style: { width: '100%', maxWidth: 320, padding: 20, borderRadius: 16, textAlign: 'left', cursor: 'pointer', marginBottom: 16,
                   background: 'rgba(123,123,255,0.08)', border: '1px solid rgba(123,123,255,0.2)', transition: 'all 0.2s' }
        },
          /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 12 } },
            /*#__PURE__*/React.createElement("div", { style: { width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                     background: 'rgba(123,123,255,0.12)' } }, /*#__PURE__*/React.createElement(InfinityIcon, { size: 22 })),
            /*#__PURE__*/React.createElement("div", null,
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 16, fontWeight: 600, color: '#E8E0F0' } }, "Free Run"),
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: '#9B95B0', marginTop: 2 } }, "Run as far as you want"))
          )
        ),

        // Goal Run
        /*#__PURE__*/React.createElement("div", { className: "rc-pop-in",
          style: { width: '100%', maxWidth: 320, padding: 20, borderRadius: 16, animationDelay: '0.1s',
                   background: 'rgba(168,230,207,0.06)', border: '1px solid rgba(168,230,207,0.2)' } },
          /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 } },
            /*#__PURE__*/React.createElement("div", { style: { width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                     background: 'rgba(168,230,207,0.12)' } }, /*#__PURE__*/React.createElement(TargetIcon, { size: 22 })),
            /*#__PURE__*/React.createElement("div", null,
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 16, fontWeight: 600, color: '#E8E0F0' } }, "Goal Run"),
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: '#9B95B0', marginTop: 2 } }, "Set a distance target"))
          ),
          // Unit toggle
          /*#__PURE__*/React.createElement("div", { style: { display: 'flex', gap: 8, marginBottom: 12 } },
            ['mi', 'km'].map(function(u) {
              return /*#__PURE__*/React.createElement("button", { key: u, onClick: () => setGoalUnit(u),
                style: { flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                         background: goalUnit === u ? 'rgba(123,123,255,0.15)' : 'transparent',
                         color: goalUnit === u ? '#7B7BFF' : '#9B95B0', border: '1px solid ' + (goalUnit === u ? 'rgba(123,123,255,0.3)' : 'rgba(155,149,176,0.15)') }
              }, u.toUpperCase());
            })
          ),
          // Presets
          /*#__PURE__*/React.createElement("div", { style: { display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' } },
            (goalUnit === 'mi' ? ['1','2','3','5','10'] : ['1','3','5','10','21']).map(function(v) {
              return /*#__PURE__*/React.createElement("button", { key: v, onClick: () => setGoalTarget(v),
                style: { padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                         background: goalTarget === v ? 'rgba(168,230,207,0.15)' : 'transparent',
                         color: goalTarget === v ? '#A8E6CF' : '#9B95B0', border: '1px solid ' + (goalTarget === v ? 'rgba(168,230,207,0.3)' : 'transparent') }
              }, v);
            })
          ),
          // Custom input
          /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 } },
            /*#__PURE__*/React.createElement("input", {
              type: "number", inputMode: "decimal", value: goalTarget, onChange: e => setGoalTarget(e.target.value),
              style: { flex: 1, padding: '8px 12px', borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: 'center',
                       background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(155,149,176,0.15)', color: '#E8E0F0', outline: 'none' }
            }),
            /*#__PURE__*/React.createElement("span", { style: { fontSize: 13, fontWeight: 600, color: '#9B95B0' } }, goalUnit)
          ),
          /*#__PURE__*/React.createElement("button", {
            onClick: () => { var t = parseFloat(goalTarget); if (t > 0) startRun({ unit: goalUnit, target: t }); },
            style: { width: '100%', padding: 12, borderRadius: 12, fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer',
                     background: 'linear-gradient(135deg, #A8E6CF 0%, #7B7BFF 100%)', color: '#FFF' }
          }, "Start Goal Run")
        )
      )
    );
  }

  /* ========== ACTIVE RUN ========== */
  if (view === 'active') {
    var isGoalMode = runMode && runMode !== 'free';
    var targetLabel = isGoalMode ? runMode.target + ' ' + runMode.unit : null;

    return /*#__PURE__*/React.createElement("div", { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%)' } },
      /*#__PURE__*/React.createElement(RunClubStyles, null),
      // Top bar
      /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 8px',
                   paddingTop: 'max(16px, env(safe-area-inset-top))' } },
        /*#__PURE__*/React.createElement("button", { onClick: discardRun,
          style: { fontSize: 12, fontWeight: 700, borderRadius: 20, padding: '6px 12px', background: 'rgba(255,138,138,0.1)', color: '#FF8A8A', border: 'none', cursor: 'pointer' }
        }, "Discard"),
        /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
                     color: gpsAccuracy && gpsAccuracy < 20 ? '#7DD8A0' : '#9B95B0' } },
          /*#__PURE__*/React.createElement("div", { style: { position: 'relative' } },
            /*#__PURE__*/React.createElement("div", { style: { width: 8, height: 8, borderRadius: '50%',
                       background: gpsAccuracy && gpsAccuracy < 20 ? '#7DD8A0' : '#9B95B0', animation: 'rcPulse 2s ease-in-out infinite' } }),
            gpsAccuracy && gpsAccuracy < 20 && /*#__PURE__*/React.createElement("div", { style: { position: 'absolute', inset: 0, width: 8, height: 8, borderRadius: '50%',
                       background: '#7DD8A0', animation: 'rcDotPing 2s ease-out infinite' } })
          ),
          gpsAccuracy ? gpsAccuracy + 'm' : '...'
        ),
        /*#__PURE__*/React.createElement("div", {
          style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', padding: '4px 10px', borderRadius: 20,
                   background: isPaused ? 'rgba(255,171,145,0.12)' : 'rgba(168,230,207,0.12)',
                   color: isPaused ? '#FFAB91' : '#7DD8A0' }
        }, isPaused ? 'PAUSED' : isGoalMode ? targetLabel : 'FREE RUN')
      ),

      // Main metrics — centered
      /*#__PURE__*/React.createElement("div", { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' } },
        isGoalMode
          ? /*#__PURE__*/React.createElement(React.Fragment, null,
              /*#__PURE__*/React.createElement("div", { style: { marginBottom: 16 } },
                /*#__PURE__*/React.createElement(RCProgressRing, { progress: goalProgress, size: 200, stroke: 10,
                  label: formatDistanceMiles(Math.round(distance)), sublabel: "miles" })),
              goalReached && /*#__PURE__*/React.createElement("div", { className: "rc-pop-in",
                style: { fontSize: 13, fontWeight: 700, padding: '6px 16px', borderRadius: 20, marginBottom: 12,
                         background: 'rgba(168,230,207,0.12)', color: '#A8E6CF' }
              }, "Goal reached! Keep going or finish"),
              /*#__PURE__*/React.createElement("div", { className: "font-display",
                style: { fontSize: 'clamp(36px, 10vw, 48px)', lineHeight: 1, color: '#E8E0F0' }
              }, formatDuration(elapsed)),
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: 4, color: '#9B95B0' } }, "Duration")
            )
          : /*#__PURE__*/React.createElement(React.Fragment, null,
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9B95B0', marginBottom: 4 } }, "Duration"),
              /*#__PURE__*/React.createElement("div", { className: "font-display",
                style: { fontSize: 'clamp(52px, 14vw, 72px)', lineHeight: 1, color: '#E8E0F0' }
              }, formatDuration(elapsed)),
              /*#__PURE__*/React.createElement("div", { style: { marginTop: 24, textAlign: 'center' } },
                /*#__PURE__*/React.createElement("div", { className: "font-display",
                  style: { fontSize: 'clamp(36px, 10vw, 52px)', lineHeight: 1, color: '#7B7BFF' }
                }, formatDistanceMiles(Math.round(distance))),
                /*#__PURE__*/React.createElement("div", { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: 6, color: '#9B95B0' } }, "Miles"))
            ),

        // Pace + Cal
        /*#__PURE__*/React.createElement("div", { style: { display: 'flex', gap: 32, marginTop: 24 } },
          /*#__PURE__*/React.createElement("div", { style: { textAlign: 'center' } },
            /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 20, color: '#E8E0F0' } }, formatPace(currentPace)),
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2, color: '#9B95B0' } }, "Pace /km")),
          /*#__PURE__*/React.createElement("div", { style: { textAlign: 'center' } },
            /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 20, color: '#E8E0F0' } }, estimateCalories(Math.round(distance))),
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2, color: '#9B95B0' } }, "Cal")),
          splits.length > 0 && /*#__PURE__*/React.createElement("div", { style: { textAlign: 'center' } },
            /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 20, color: '#A8E6CF' } }, formatPace(splits[splits.length - 1].timeSec)),
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2, color: '#9B95B0' } }, "Last km"))
        ),

        // Progress bar
        /*#__PURE__*/React.createElement("div", { style: { width: '100%', maxWidth: 280, marginTop: 24 } },
          /*#__PURE__*/React.createElement("div", { style: { width: '100%', height: 5, borderRadius: 3, overflow: 'hidden', background: 'rgba(123,123,255,0.08)' } },
            /*#__PURE__*/React.createElement("div", { style: {
              height: '100%', borderRadius: 3, transition: 'width 1s ease-out',
              width: (isGoalMode ? goalProgress * 100 : Math.min(100, (distance / 10000) * 100)) + '%',
              background: 'linear-gradient(90deg, #7B7BFF, #A8E6CF)', boxShadow: '0 0 8px rgba(123,123,255,0.4)'
            } })),
          isGoalMode && /*#__PURE__*/React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, fontWeight: 600, color: '#9B95B0' } },
            /*#__PURE__*/React.createElement("span", null, "0"), /*#__PURE__*/React.createElement("span", null, targetLabel))
        ),

        gpsError && /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, fontWeight: 600, marginTop: 16, padding: '8px 16px', borderRadius: 12,
                   color: '#FF8A8A', background: 'rgba(255,138,138,0.06)' } }, gpsError)
      ),

      // Controls
      /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '8px 0 24px',
                   paddingBottom: 'max(24px, env(safe-area-inset-bottom))' } },
        isPaused
          ? /*#__PURE__*/React.createElement(React.Fragment, null,
              /*#__PURE__*/React.createElement("button", { onClick: finishRun,
                style: { width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                         background: 'rgba(255,138,138,0.1)', color: '#FF8A8A', border: 'none', cursor: 'pointer' }
              }, /*#__PURE__*/React.createElement(StopSquareIcon, { size: 26 })),
              /*#__PURE__*/React.createElement("button", { onClick: resumeRun,
                style: { width: 76, height: 76, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                         background: '#7B7BFF', color: '#FFF', border: 'none', cursor: 'pointer', animation: 'rcBreathe 3s ease-in-out infinite' }
              }, /*#__PURE__*/React.createElement(PlayIcon, { size: 30 })))
          : /*#__PURE__*/React.createElement("button", { onClick: pauseRun,
              style: { width: 76, height: 76, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                       background: '#7B7BFF', color: '#FFF', border: 'none', cursor: 'pointer', animation: 'rcBreathe 3s ease-in-out infinite' }
            }, /*#__PURE__*/React.createElement(PauseIcon, { size: 30 }))
      )
    );
  }

  /* ========== ADMIN PANEL ========== */
  if (view === 'admin' && isAdmin) {
    var pendingCount = pendingRequests.length;
    var reviewedList = allRequests.filter(function(r) { return r.status !== 'pending'; });

    return /*#__PURE__*/React.createElement("div", { style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, height: "100vh", width: "100vw", zIndex: 100, background: "var(--c-bg)", overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" } },
      /*#__PURE__*/React.createElement(RunClubStyles, null),
      /*#__PURE__*/React.createElement("div", { style: { width: "100%", maxWidth: 480, margin: "0 auto", padding: "16px 20px calc(100px + env(safe-area-inset-bottom)) 20px", minHeight: "100%" } },
        // Header
        /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 } },
          /*#__PURE__*/React.createElement("button", { onClick: () => setView('dashboard'),
            style: { fontSize: 14, fontWeight: 600, color: 'var(--c-accent)', background: 'none', border: 'none', cursor: 'pointer' }
          }, "← Back"),
          /*#__PURE__*/React.createElement("h1", { className: "font-display", style: { fontSize: 22, color: 'var(--c-text)' } }, "Admin Inbox"),
          pendingCount > 0 && /*#__PURE__*/React.createElement("span", {
            style: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,138,138,0.15)', color: '#FF8A8A' }
          }, pendingCount)
        ),

        // Pending requests section
        pendingCount > 0 && /*#__PURE__*/React.createElement(React.Fragment, null,
          /*#__PURE__*/React.createElement("h2", { style: { fontSize: 14, fontWeight: 600, color: 'var(--c-text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 } },
            /*#__PURE__*/React.createElement(InboxIcon, { size: 16 }), "Pending Requests"),
          pendingRequests.map(function(r) {
            return /*#__PURE__*/React.createElement("div", { key: r.id, style: { background: "var(--c-card-solid)", border: "1px solid var(--c-border)", borderRadius: 16, padding: 16, marginBottom: 12 }, className: "rc-pop-in" },
              /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
                /*#__PURE__*/React.createElement("div", { style: { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                         fontSize: 14, fontWeight: 700, background: r.user.avatarColor || '#C5B3E6', color: '#FFF' } },
                  (r.user.username || '?')[0].toUpperCase()),
                /*#__PURE__*/React.createElement("div", null,
                  /*#__PURE__*/React.createElement("div", { style: { fontSize: 15, fontWeight: 600, color: 'var(--c-text)' } }, r.user.username),
                  r.socialProof && /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: 'var(--c-text-sub)' } }, r.socialProof))
              ),
              r.message && /*#__PURE__*/React.createElement("div", { style: { fontSize: 13, color: 'var(--c-text-sub)', padding: '8px 12px', borderRadius: 10,
                         background: 'var(--c-input-bg)', marginBottom: 12, fontStyle: 'italic' } }, '"' + r.message + '"'),
              /*#__PURE__*/React.createElement("div", { style: { display: 'flex', gap: 8 } },
                /*#__PURE__*/React.createElement("button", { onClick: function() { handleReview(r.id, 'approved'); },
                  style: { flex: 1, padding: '10px', borderRadius: 12, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
                           background: 'rgba(168,230,207,0.15)', color: '#7DD8A0' }
                }, "Approve"),
                /*#__PURE__*/React.createElement("button", { onClick: function() { handleReview(r.id, 'denied'); },
                  style: { flex: 1, padding: '10px', borderRadius: 12, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
                           background: 'rgba(255,138,138,0.1)', color: '#FF8A8A' }
                }, "Deny"))
            );
          })
        ),

        pendingCount === 0 && /*#__PURE__*/React.createElement("div", { style: { background: "var(--c-card-solid)", border: "1px solid var(--c-border)", borderRadius: 16, padding: 16, textAlign: 'center', padding: 24, marginBottom: 20 } },
          /*#__PURE__*/React.createElement(CheckCircleIcon, { size: 28 }),
          /*#__PURE__*/React.createElement("p", { style: { fontSize: 14, color: 'var(--c-text-sub)', marginTop: 8 } }, "No pending requests. All caught up!")),

        // Previously reviewed
        reviewedList.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null,
          /*#__PURE__*/React.createElement("h2", { style: { fontSize: 14, fontWeight: 600, color: 'var(--c-text)', marginBottom: 12, marginTop: 8 } }, "Previously Reviewed"),
          reviewedList.slice(0, 20).map(function(r) {
            return /*#__PURE__*/React.createElement("div", { key: r.id, style: { background: "var(--c-card-solid)", border: "1px solid var(--c-border)", borderRadius: 16, padding: 16, marginBottom: 8, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
              /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                /*#__PURE__*/React.createElement("div", { style: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                         fontSize: 11, fontWeight: 700, background: r.user ? (r.user.avatarColor || '#C5B3E6') : '#888', color: '#FFF' } },
                  r.user ? (r.user.username || '?')[0].toUpperCase() : '?'),
                /*#__PURE__*/React.createElement("span", { style: { fontSize: 13, fontWeight: 500, color: 'var(--c-text)' } }, r.user ? r.user.username : 'Unknown')),
              /*#__PURE__*/React.createElement("span", { style: { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 8,
                       background: r.status === 'approved' ? 'rgba(168,230,207,0.15)' : 'rgba(255,138,138,0.1)',
                       color: r.status === 'approved' ? '#7DD8A0' : '#FF8A8A' } }, r.status === 'approved' ? 'Approved' : 'Denied'));
          })
        )
      )
    );
  }

  /* ========== MAIN DASHBOARD ========== */
  var s = runStats || {};
  var unlockedCount = achievements.filter(function(a) { return a.unlocked; }).length;

  return /*#__PURE__*/React.createElement("div", { style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, height: "100vh", width: "100vw", zIndex: 100, background: "var(--c-bg)", overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" } },
    /*#__PURE__*/React.createElement(RunClubStyles, null),
    /*#__PURE__*/React.createElement("div", { style: { width: "100%", maxWidth: 480, margin: "0 auto", padding: "16px 20px calc(100px + env(safe-area-inset-bottom)) 20px", minHeight: "100%" } },

      // Header
      /*#__PURE__*/React.createElement("div", { className: "rc-slide-up", style: { textAlign: 'center', marginBottom: 16, paddingTop: 8 } },
        /*#__PURE__*/React.createElement("h1", { className: "font-display", style: { fontSize: 22, color: 'var(--c-text)' } }, "Run Club"),
        /*#__PURE__*/React.createElement("p", { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--c-text-sub)' } }, "Doodles Runners")),

      // Sub-nav
      /*#__PURE__*/React.createElement("div", { style: { display: 'flex', gap: 6, marginBottom: 16, justifyContent: 'center', flexWrap: 'wrap' } },
        /*#__PURE__*/React.createElement(RCPill, { active: view === 'dashboard', onClick: () => setView('dashboard') }, "Home"),
        /*#__PURE__*/React.createElement(RCPill, { active: view === 'history', onClick: () => setView('history') }, "History"),
        /*#__PURE__*/React.createElement(RCPill, { active: view === 'leaderboard', onClick: () => setView('leaderboard') }, "Board"),
        /*#__PURE__*/React.createElement(RCPill, { active: view === 'achievements', onClick: () => setView('achievements') }, "Badges"),
        isAdmin && /*#__PURE__*/React.createElement(RCPill, { active: view === 'admin', onClick: () => setView('admin'), color: '#7DD8A0' }, "Admin")),

      // Start Run
      view === 'dashboard' && /*#__PURE__*/React.createElement("button", {
        onClick: () => setView('start'),
        className: "rc-pop-in",
        style: { width: '100%', padding: 16, borderRadius: 16, fontSize: 17, fontWeight: 700, border: 'none', cursor: 'pointer', marginBottom: 20,
                 background: 'linear-gradient(135deg, var(--c-accent) 0%, #7B7BFF 100%)', color: '#FFF',
                 boxShadow: '0 6px 24px rgba(65,64,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                 fontFamily: "'Paytone One', 'Fredoka', sans-serif" }
      }, /*#__PURE__*/React.createElement(GpsIcon, { size: 20, color: '#FFF' }), "Start Run"),

      // === DASHBOARD ===
      view === 'dashboard' && !loading && /*#__PURE__*/React.createElement(React.Fragment, null,
        /*#__PURE__*/React.createElement("div", { className: "rc-stagger", style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 } },
          /*#__PURE__*/React.createElement("div", { style: { background: "var(--c-card-solid)", border: "1px solid var(--c-border)", borderRadius: 16, padding: 16, padding: 14 }, className: "rc-pop-in" },
            /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
              /*#__PURE__*/React.createElement(RouteIcon, { size: 14, color: '#A8E6CF' }),
              /*#__PURE__*/React.createElement("span", { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-text-sub)' } }, "This Week")),
            /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 22, color: 'var(--c-text)' } }, formatDistanceMiles(s.weekDistanceM || 0) + ' mi'),
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, color: 'var(--c-text-sub)', marginTop: 2 } }, (s.weekRuns || 0) + ' runs')),

          /*#__PURE__*/React.createElement("div", { style: { background: "var(--c-card-solid)", border: "1px solid var(--c-border)", borderRadius: 16, padding: 16, padding: 14 }, className: "rc-pop-in" },
            /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
              /*#__PURE__*/React.createElement(RunShoeIcon, { size: 14 }),
              /*#__PURE__*/React.createElement("span", { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-text-sub)' } }, "Total")),
            /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 22, color: 'var(--c-text)' } }, formatDistanceMiles(s.totalDistanceM || 0) + ' mi'),
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, color: 'var(--c-text-sub)', marginTop: 2 } }, (s.totalRuns || 0) + ' runs')),

          /*#__PURE__*/React.createElement("div", { style: { background: "var(--c-card-solid)", border: "1px solid var(--c-border)", borderRadius: 16, padding: 16, padding: 14 }, className: "rc-pop-in" },
            /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
              /*#__PURE__*/React.createElement(FireIcon, { size: 14 }),
              /*#__PURE__*/React.createElement("span", { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-text-sub)' } }, "Streak")),
            /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 22, color: 'var(--c-text)' } }, (s.streakDays || 0) + 'd'),
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, color: 'var(--c-text-sub)', marginTop: 2 } }, "days running")),

          /*#__PURE__*/React.createElement("div", { style: { background: "var(--c-card-solid)", border: "1px solid var(--c-border)", borderRadius: 16, padding: 16, padding: 14 }, className: "rc-pop-in" },
            /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
              /*#__PURE__*/React.createElement(GpsIcon, { size: 14 }),
              /*#__PURE__*/React.createElement("span", { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-text-sub)' } }, "Best Pace")),
            /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 22, color: 'var(--c-text)' } }, formatPace(s.bestPaceSec || 0)),
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, color: 'var(--c-text-sub)', marginTop: 2 } }, "/km"))
        ),

        // Badges preview
        achievements.length > 0 && /*#__PURE__*/React.createElement("div", { className: "rc-pop-in", style: { background: "var(--c-card-solid)", border: "1px solid var(--c-border)", borderRadius: 16, padding: 16 }, onClick: () => setView('achievements'),
          style: { marginBottom: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
          /*#__PURE__*/React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            /*#__PURE__*/React.createElement("span", { style: { fontSize: 13, fontWeight: 600, color: 'var(--c-text)' } }, unlockedCount + '/' + achievements.length + ' Badges')),
          /*#__PURE__*/React.createElement("span", { style: { fontSize: 12, color: 'var(--c-accent)' } }, "View all →")),

        // Recent runs
        runs.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null,
          /*#__PURE__*/React.createElement("div", { style: { fontSize: 14, fontWeight: 600, color: 'var(--c-text)', marginBottom: 8 } }, "Recent Runs"),
          runs.slice(0, 4).map(function(r, i) {
            return /*#__PURE__*/React.createElement("div", { key: r.id, style: { background: "var(--c-card-solid)", border: "1px solid var(--c-border)", borderRadius: 16, padding: 16, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, className: "rc-pop-in" },
              /*#__PURE__*/React.createElement("div", null,
                /*#__PURE__*/React.createElement("div", { style: { fontSize: 14, fontWeight: 600, color: 'var(--c-text)' } }, formatDistanceMiles(r.distanceM) + ' mi'),
                /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: 'var(--c-text-sub)' } }, formatDateShort(r.startedAt) + ' \xB7 ' + formatDuration(r.durationSec))),
              /*#__PURE__*/React.createElement("div", { style: { textAlign: 'right' } },
                /*#__PURE__*/React.createElement("div", { style: { fontSize: 14, fontWeight: 600, color: 'var(--c-accent)' } }, formatPace(r.avgPaceSec) + ' /km'),
                /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: 'var(--c-text-sub)' } }, (r.calories || estimateCalories(r.distanceM)) + ' cal')));
          })
        ),

        runs.length === 0 && /*#__PURE__*/React.createElement("div", { style: { background: "var(--c-card-solid)", border: "1px solid var(--c-border)", borderRadius: 16, padding: 16, textAlign: 'center', padding: 32 }, className: "rc-pop-in" },
          /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 16, color: 'var(--c-text)', marginBottom: 4 } }, "No runs yet"),
          /*#__PURE__*/React.createElement("p", { style: { fontSize: 13, color: 'var(--c-text-sub)' } }, "Tap Start Run to begin!"))
      ),

      // === HISTORY ===
      view === 'history' && /*#__PURE__*/React.createElement(React.Fragment, null,
        runs.map(function(r, i) {
          return /*#__PURE__*/React.createElement("div", { key: r.id, style: { background: "var(--c-card-solid)", border: "1px solid var(--c-border)", borderRadius: 16, padding: 16, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, className: "rc-pop-in" },
            /*#__PURE__*/React.createElement("div", null,
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 14, fontWeight: 600, color: 'var(--c-text)' } }, formatDistanceMiles(r.distanceM) + ' mi'),
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: 'var(--c-text-sub)' } }, formatDateShort(r.startedAt) + ' \xB7 ' + formatDuration(r.durationSec))),
            /*#__PURE__*/React.createElement("div", { style: { textAlign: 'right' } },
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 14, fontWeight: 600, color: 'var(--c-accent)' } }, formatPace(r.avgPaceSec) + ' /km'),
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: 'var(--c-text-sub)' } }, (r.calories || estimateCalories(r.distanceM)) + ' cal')));
        }),
        runs.length === 0 && !loading && /*#__PURE__*/React.createElement("div", { style: { background: "var(--c-card-solid)", border: "1px solid var(--c-border)", borderRadius: 16, padding: 16, textAlign: 'center', padding: 32 } },
          /*#__PURE__*/React.createElement("p", { style: { fontSize: 14, color: 'var(--c-text-sub)' } }, "No runs yet. Complete a run to see it here!"))
      ),

      // === LEADERBOARD ===
      view === 'leaderboard' && /*#__PURE__*/React.createElement(React.Fragment, null,
        /*#__PURE__*/React.createElement("div", { style: { display: 'flex', gap: 8, marginBottom: 12, justifyContent: 'center' } },
          /*#__PURE__*/React.createElement(RCPill, { active: lbScope === 'weekly', onClick: () => setLbScope('weekly') }, "This Week"),
          /*#__PURE__*/React.createElement(RCPill, { active: lbScope === 'alltime', onClick: () => setLbScope('alltime') }, "All Time")),
        lbRows.map(function(r, i) {
          return /*#__PURE__*/React.createElement("div", { key: i, style: { background: "var(--c-card-solid)", border: "1px solid var(--c-border)", borderRadius: 16, padding: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }, className: "rc-pop-in" },
            /*#__PURE__*/React.createElement("div", { style: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                     fontSize: 12, fontWeight: 700, fontFamily: "'Paytone One', sans-serif",
                     background: i === 0 ? 'rgba(255,224,130,0.25)' : i === 1 ? 'rgba(224,224,232,0.25)' : i === 2 ? 'rgba(255,171,145,0.25)' : 'var(--c-stat-bg)',
                     color: 'var(--c-text)' } }, r.rank),
            /*#__PURE__*/React.createElement("div", { style: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                     fontSize: 11, fontWeight: 700, background: r.avatarColor || '#C5B3E6', color: '#FFF' } }, (r.username || '?')[0].toUpperCase()),
            /*#__PURE__*/React.createElement("div", { style: { flex: 1, minWidth: 0 } },
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 14, fontWeight: 600, color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, r.username)),
            /*#__PURE__*/React.createElement("div", { style: { textAlign: 'right' } },
              /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 14, color: 'var(--c-accent)' } }, formatDistanceMiles(r.distanceM) + ' mi'),
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 10, color: 'var(--c-text-sub)' } }, r.runs + ' runs')));
        }),
        lbRows.length === 0 && !loading && /*#__PURE__*/React.createElement("div", { style: { background: "var(--c-card-solid)", border: "1px solid var(--c-border)", borderRadius: 16, padding: 16, textAlign: 'center', padding: 32 } },
          /*#__PURE__*/React.createElement("p", { style: { fontSize: 14, color: 'var(--c-text-sub)' } }, "No runners yet. Be the first!"))
      ),

      // === ACHIEVEMENTS ===
      view === 'achievements' && /*#__PURE__*/React.createElement(React.Fragment, null,
        /*#__PURE__*/React.createElement("div", { className: "rc-slide-up", style: { textAlign: 'center', marginBottom: 16 } },
          /*#__PURE__*/React.createElement("div", { className: "font-display", style: { fontSize: 20, color: 'var(--c-text)' } }, unlockedCount + ' / ' + achievements.length),
          /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: 'var(--c-text-sub)' } }, "badges earned")),
        /*#__PURE__*/React.createElement("div", { className: "rc-stagger", style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 } },
          achievements.map(function(a, i) {
            return /*#__PURE__*/React.createElement("div", { key: a.id, className: "rc-pop-in", style: { background: "var(--c-card-solid)", border: "1px solid var(--c-border)", borderRadius: 16, padding: 16 },
              style: { textAlign: 'center', padding: '16px 10px', opacity: a.unlocked ? 1 : 0.5, position: 'relative' } },
              /*#__PURE__*/React.createElement("div", { className: a.unlocked ? 'rc-shine' : '', style: { marginBottom: 8, display: 'flex', justifyContent: 'center' } },
                getAchievementMedal(a.id, a.unlocked)),
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, fontWeight: 600, color: 'var(--c-text)', marginBottom: 2 } }, a.name),
              /*#__PURE__*/React.createElement("div", { style: { fontSize: 10, color: 'var(--c-text-sub)', lineHeight: 1.4 } }, a.desc),
              a.unlocked && /*#__PURE__*/React.createElement("div", { style: { fontSize: 9, fontWeight: 600, color: 'var(--c-correct)', marginTop: 6 } }, formatDateShort(a.unlockedAt)));
          })
        )
      ),

      // Loading
      loading && accessStatus === 'approved' && /*#__PURE__*/React.createElement("div", { style: { display: 'flex', justifyContent: 'center', padding: '48px 0' } },
        /*#__PURE__*/React.createElement("div", { style: { width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--c-border)', borderTopColor: 'var(--c-accent)',
                   animation: 'rcPulse 1s linear infinite' } }))
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
