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

---

# 🔘 PHASE 18 — GAME SUB-MODES & MODAL SYSTEM

## Task 18.1 — Modal Infrastructure Expansion
- Expand `useModalStore` to support a `sub-mode` type.
- Implement `SubModeModal.tsx` using `BaseModal` and integrate it into `src/modals.tsx`.

## Task 18.2 — Sub-Mode Selection Logic
- Implement options for: **Entire World**, **Set Number of Countries**, and **Timer**.
- Trigger selection modal when a game mode is clicked in the menu.

---

# 🚀 PHASE 19 — GAMEPLAY MODE INTEGRATION

## Task 19.1 — Identify Mode Sub-modes
- Integrate "Set Number" and "Timer" sub-modes into the Identification (Guess) mode.

## Task 19.2 — Reverse Mode Sub-modes
- Integrate "Set Number" and "Timer" sub-modes into the Reverse Identification mode.

---

# 📊 PHASE 20 — 6-STAGE DIFFICULTY PROGRESSION

## Task 20.1 — Stage-Based Country Ranking
- Define and categorize countries into 6 distinct difficulty stages:
  1. *Explorer*, 2. *Navigator*, 3. *Voyager*, 4. *Cartographer*, 5. *Globalist*, 6. *Conqueror*.
- Create a data layer filter to select countries by assigned stage.

## Task 20.2 — Across-Game Progression Logic
- Implement persistent state tracking to remember the `currentStage` per sub-mode.
- Automatically increment the stage (e.g., Stage 1 → Stage 2) upon the completion of a game session.
- Add HUD elements to show the current Stage Name and level progress.

---

# 🗺️ PHASE 21 — INTELLIGENT DISTRACTORS (REVERSE MODE)

## Task 21.1 — Contextual Distractor Generation
- Refine multiple-choice options to be from the same **area or continent** as the correct answer.

## Task 21.2 — Focused Island Logic
- Implement specialized filtering: if the target is an island, all distractors must be islands to increase challenge.

---

# 🏆 PHASE 22 — POST-GAME EXPERIENCE

## Task 22.1 — Global Result Modal
- Implement a final results screen showing session performance and stats.

## Task 22.2 — Loop Completion
- Add "Play Again" (restart with current config) and "Back to Menu" actions to the result screen.

---

# 🌏 PHASE 23 — GLOBAL MARATHON MODE & SESSION INTEGRITY

## Task 23.1 — Global Session Deduplication
- Implement a session-wide tracking system to ensure no country is repeated across any mode during a single session.

## Task 23.2 — "Entire World" Marathon Logic
- Create a specific marathon mode that traverses all countries in the dataset.
- Sequence countries from **easiest to hardest** using the ranking from Phase 20.
- Apply randomization within each difficulty tier to keep the experience fresh.

## Task 23.3 — Completion & Victory Condition
- Trigger the result modal only when the final country of the entire world map is completed.
- Ensure the game state correctly identifies the "Victory" condition for finishing the entire world.
