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

World map topology is loaded and converted through a shared typed loader. It
shares in-flight and successful results between map and country-data consumers,
and allows failed loads to be retried. The store-connected map entry point
owns the map-resource hook and passes map data, loading/error status, and
gameplay, game-feedback, and map-UI state groups into a separate view through
typed props. This keeps map rendering independent of local Zustand
subscriptions and resource loading. The view
delegates SVG and overlay rendering to a presentational canvas component.
Pin-mode map clicks convert pointer positions to geographic coordinates on the
client; those coordinates are input data, not an authoritative result.

The game store can export and restore a versioned, JSON-serializable gameplay
snapshot with `createSessionSnapshot()` and `restoreSessionSnapshot(snapshot)`.
Target selection and answer-choice generation share a seeded random stream; its
state is included so the same session can continue with the same sequence after
a restore. An in-progress game is saved locally and can be resumed from the
mode-selection menu. Pending round advances resume with their remaining delay,
and timer challenges use a persisted deadline to account for time spent away
without accumulating interval drift. Session start accepts an explicit seed
and clock in addition to production defaults, so gameplay sequences can be
reproduced in tests or by a future host. Snapshots include mission progress and
the active target, but intentionally omit transient feedback and locally
unlocked progression. Unsupported or malformed snapshots are rejected. This
provides a deterministic client-side simulation boundary; it does not implement
networking or server authority, and client state is not trusted.

Mission start, target selection, choice generation, round advancement, and
mission completion are evaluated by framework-independent game-engine
transitions. They take the session and game data as input and return an updated
session, selected target/choices, or a completion result. Seeded randomness is
advanced as part of the transition, so the same session state produces the same
next mission. React commits the resulting session and handles presentation and
timed effects.

Round actions are evaluated by a pure transition function that returns updated
round state and declarative effects. The client applies the state and handles
audio and advance timers; multiplayer transport and server authority remain
separate work.

Gameplay inputs use typed commands with session, mission, and increasing
command IDs. A local handler validates these identities and delegates accepted
actions to the same pure transition; its serializable events form an integration
seam only and are not a network protocol or security boundary.

The client also defines a transport-independent multiplayer room contract in
`multiplayerRoomProtocol.ts` and an observable room-client lifecycle in
`multiplayerRoomClient.ts`. It validates incoming room messages, tracks room
snapshots by revision, submits commands against the latest known revision, and
tracks acknowledgements and reconnect status. Tests exercise this boundary
through a fake transport. This is client-side integration groundwork only:
there is no server, live transport, authoritative validation, or playable
multiplayer mode, and these client message checks are not a security boundary.

The client store groups match-owned values under `session`, keeps local unlock
progression outside that session, and stores feedback/notification details in a
separate UI store. Session IDs persist through local save/resume; they are local
identifiers, not multiplayer room or player identities.

Saved sessions are accessed through a `GameSessionRepository` boundary. Solo
play currently uses a localStorage adapter; a future remote adapter can replace
it without making gameplay hooks depend on browser storage. The repository
boundary does not itself provide networking or synchronization.

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