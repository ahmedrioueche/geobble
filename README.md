# 🌍 Geobble: Tactical Global Intelligence

[![Live on Vercel](https://img.shields.io/badge/Live-Vercel-black?style=flat-square&logo=vercel)](https://geobble.vercel.app/)
[![React](https://img.shields.io/badge/Stack-React-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![D3.js](https://img.shields.io/badge/Mapping-D3.js-F9A03C?style=flat-square&logo=d3.js)](https://d3js.org)

**Geobble** is an elite, high-performance tactical interface designed for spatial intelligence and global geographic training. Mission commanders (players) are tasked with identifying sovereign territories across a high-fidelity 50m resolution world map using real-time RestCountries data.

🔗 **Mission Control (Live)**: [https://geobble.vercel.app/](https://geobble.vercel.app/)

---

## 🛰️ Operational Modes

### 🚩 Reverse Ops (Strategic)
Identify the correct territory from a set of high-priority choices (Flags, Capitals, or Names). Test your rapid-response recognition of global sovereign data.

### 🎯 Identifying Territory (Tactical)
Pinpoint a specific country on the interactive world map. Utilize the **Tactical Sonar Pulse** (Ping) to verify intelligence for unknown locations.

### 🗺️ Training Ground (Ambient)
Explore the global theatre at your own pace. Hover and click any territory to retrieve immediate strategic intelligence (Region, Capital, Population, Flag) without active mission constraints.

---

## 🛠️ Tactical Stack

- **Core**: [React](https://reactjs.org) (Modern UI Orchestration)
- **Mapping**: [D3.js](https://d3js.org) & [TopoJSON](https://github.com/topojson/topojson) (1:50m Precision)
- **Animations**: [Framer Motion](https://www.framer.com/motion/) (Fluid UI Transitions)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) (Synchronized Mission Logic)
- **Visuals**: [Vanilla CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) (Tailored High-Density Aesthetics)

## Game Session Snapshots

The game store can export and restore a versioned, JSON-serializable gameplay
snapshot with `createSessionSnapshot()` and `restoreSessionSnapshot(snapshot)`.
Target selection and answer-choice generation share a seeded random stream; its
state is included so the same session can continue with the same sequence after
a restore. An in-progress game is saved locally and can be resumed from the
mode-selection menu. Pending round advances resume with their remaining delay,
and timer challenges account for time spent away. Snapshots include mission
progress and the active target, but intentionally omit transient feedback and
locally unlocked progression. Unsupported or malformed snapshots are rejected.
This provides a client-side state boundary; it does not implement networking or
server-authoritative multiplayer.

---

## 🚀 Deployment

Geobble is optimized for instantaneous deployment via **Vercel**. 

```bash
# Initialize local theatre
npm install
npm run dev
```

---

*Designed for high-speed spatial training. Use it for tactical readiness and global awareness.*