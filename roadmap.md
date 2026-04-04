# 🌍 Geobble — World Map Game

---

# 🚨 GLOBAL RULES (MANDATORY — NO EXCEPTIONS)

You are building a **production-grade React application**.

## Architecture Rules

- Use **feature-based architecture** (NOT file-type based)
- Separate strictly:
  - map-engine
  - game-engine
  - ui
  - data-layer

- NO mixing logic inside UI components

---

## Code Quality Rules

- Use **functional components only**
- Use **custom hooks for logic**
- Use **Zustand for global state**
- Use **TypeScript (strict mode)**
- Use **modular files (max 200–300 lines per file)**

---

## Reusability Rules

- Split UI into reusable components
- Follow Atomic Design:
  - Atoms
  - Molecules
  - Organisms

- NEVER duplicate logic

---

## Styling Rules

- Use **Tailwind + CSS variables**
- Define colors in a single file:
  - `/src/styles/theme.css`

- NO hardcoded colors in components

---

## Data Rules

- NO hardcoded country data
- Fetch from API or static normalized dataset
- All data must pass through a **data normalization layer**

---

## i18n Rules

- Use **i18next**
- NO hardcoded strings
- All UI text must use translation keys

---

## Performance Rules

- Use memoization where needed
- Avoid unnecessary re-renders
- Lazy load heavy components

---

## Naming Conventions

- Components: PascalCase
- Hooks: useCamelCase
- Files: kebab-case

---

# 🧱 PHASE 0 — PROJECT SETUP

## Task 0.1 — Initialize Project

### Subtasks

- Create project using Vite + React + TypeScript
- Enable strict mode in tsconfig

---

## Task 0.2 — Install Dependencies

### Subtasks

Install:

- d3
- topojson-client
- zustand
- axios
- i18next
- react-i18next
- tailwindcss

---

## Task 0.3 — Folder Structure

### Subtasks

Create:

src/
├── features/
│ ├── map/
│ ├── game/
├── components/
├── hooks/
├── store/
├── data/
├── styles/
├── utils/
├── pages/

---

# 🗺️ PHASE 1 — MAP ENGINE (D3 ONLY)

## Task 1.1 — Load Geo Data

### Subtasks

- Download TopoJSON world map
- Store in /public

---

## Task 1.2 — Build Map Renderer

### Subtasks

- Use D3 geoPath
- Use geoNaturalEarth1 projection

### Sub-subtasks

- Convert topojson to geojson
- Render SVG paths

---

## Task 1.3 — Interaction Layer

### Subtasks

- Add hover events
- Add click events

### Sub-subtasks

- Return country name on click

---

## Task 1.4 — Optimization

### Subtasks

- Memoize path generation
- Prevent re-renders

---

# 🌍 PHASE 2 — DATA LAYER

## Task 2.1 — Fetch Country Data

### Subtasks

- Use REST Countries API
- Fetch all countries

---

## Task 2.2 — Normalize Data

### Subtasks

Create unified structure:

- name
- code
- capital
- flag

---

## Task 2.3 — Map Matching

### Subtasks

- Match geo names with API names
- Create mapping dictionary

---

## Task 2.4 — Translation Support

### Subtasks

- Add translation keys for country names

---

# 🎮 PHASE 3 — GAME ENGINE

## Task 3.1 — Game State Hook

### Subtasks

Create useGameLogic

### Sub-subtasks

State:

- currentCountry
- score
- streak
- mode

---

## Task 3.2 — Answer Validation

### Subtasks

- Compare selected vs current
- Update score

---

## Task 3.3 — Mode System

### Subtasks

Implement modes:

- flag
- name
- capital
- blend

---

# 🧩 PHASE 4 — UI SYSTEM

## Task 4.1 — Component System

### Subtasks

- Create reusable components

---

## Task 4.2 — Game UI

### Subtasks

- Display data based on mode

---

## Task 4.3 — Scoreboard

### Subtasks

- Show score and streak

---

# 🔄 PHASE 5 — STATE MANAGEMENT

## Task 5.1 — Zustand Store

### Subtasks

- Store global state

---

# 🌐 PHASE 6 — INTERNATIONALIZATION

## Task 6.1 — Setup i18next

### Subtasks

- Configure provider
- Load languages

---

## Task 6.2 — Translate UI

### Subtasks

- Replace all text with keys

---

# 🔁 PHASE 7 — GAME FLOW

## Task 7.1 — Game Loop

### Subtasks

- Start → Question → Answer → Feedback → Next

---

## Task 7.2 — Feedback System

### Subtasks

- Show correct/wrong
- Highlight country

---

# ⚡ PHASE 8 — ADVANCED FEATURES

## Task 8.1 — Timer

### Subtasks

- Add countdown

---

## Task 8.2 — Difficulty

### Subtasks

- Filter countries by region

---

# 🎨 PHASE 9 — POLISH

## Task 9.1 — Animations

### Subtasks

- Add transitions

---

## Task 9.2 — Responsive Design

### Subtasks

- Support mobile

---

# 🚀 PHASE 10 — DEPLOYMENT

## Task 10.1 — Build

### Subtasks

- Optimize bundle

---

# 🎨 PHASE 11 — UI/UX MASTER POLISH

## Task 11.1 — Animated Loading Screen
- Animated logo (rotating globe)
- Smooth page entry transitions

## Task 11.2 — Game Mode Selection
- Dedicated overlay for mode choice
- Detailed tips/explanations for each mode (Name, Flag, Capital)

## Task 11.3 — Visual Refinement
- Enhanced accessibility
- Premium micro-interactions

---

# 🕹️ PHASE 12 — ADVANCED INTERACTIONS

## Task 12.1 — Map-Click Info Reveal
- On-click overlay showing name/flag/capital
- 2-second auto-dismiss with manual close option

# 🏛️ PHASE 13 — EXPLORATION MODE

## Task 13.1 — Training Ground
- Blank map without game objectives
- Clicking any territory reveals its full data (name, capital, flag)
- Reset/Exit logic in HUD

---

# 🎯 PHASE 14 — REVERSE OPERATIONAL MODE

## Task 14.1 — Identification Selection
- Game highlights territory on map
- Player chooses from 4 multiple-choice names
- Score/Streak integrated with choice selection

## Task 14.2 — Mobile-First UI Refinement
- Subtle HUD prompting (non-obstructive)
- Responsive layout for small screens
- Thumb-accessible controls

---

# 🧠 AI EXECUTION PROMPT TEMPLATE

You are a senior frontend engineer.

Follow ALL rules strictly.

Task: [INSERT TASK]

Requirements:

- Use D3 for map
- Use TypeScript
- Use modular architecture
- No hardcoding
- Use i18n

Output:

- Production-ready code
- No explanations

---

# 🏁 FINAL RULE

DO NOT skip phases.
DO NOT combine tasks.
EXECUTE sequentially.

---

# 🕹️ PHASE 15 — MODES CONSOLIDATION & REVERSE MODE (AUDIO PHASE 1)

## Task 15.1 — Core Game Mode Integration
- Create a single "Guess the Country" mode that allows switching between Name, Flag, and Capital inputs within the same session.
- Group Name/Flag/Capital into a "General Identification" mode.

## Task 15.2 — Reverse Mode Logic
- Implement "Reverse Identification": Highlight a country on the map first.
- User must identify the name from multiple choices.

## Task 15.3 — Training Ground Prioritization
- Ensure "Training Ground" (Exploration) is the default/first option in the selection screen.

---

# 🗺️ PHASE 16 — VISUALS & DATA INTEGRITY (AUDIO PHASE 2)

## Task 16.1 — Premium Map Styling
- Implement real colorful maps using D3 choropleth or region-based styling.
- Move away from simple monochrome/code-based fills.

## Task 16.2 — Data Completion
- Fix missing data for major territories (USA, etc.) in the normalization layer.
- Ensure all map IDs match API metadata.

## Task 16.3 — UI Layout Optimization
- Reposition the "Country Info/Prompt" overlay to the top of the screen.
- Ensure it never obstructs the map view during gameplay.

---

# 🔍 PHASE 17 — INTERACTIVE ZOOM ENGINE (AUDIO PHASE 3)

## Task 17.1 — D3 Zoom Implementation
- Add `d3.zoom` to the SVG container.
- Constrain zoom to the map area only (viewport management).

## Task 17.2 — Multi-Input Support
- Support mouse wheel scrolling for desktop.
- Support pinch-to-zoom gestures for mobile.

## Task 17.3 — Precision Clicking
- Ensure hit testing (clicking) works accurately even at high zoom levels.
- Allow users to easily select tiny island nations or small European countries.
