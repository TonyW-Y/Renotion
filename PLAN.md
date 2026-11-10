# Renotion — 3D Home Renovation Planner

> Build plan for Claude Code. Work through the phases **in order**. Finish one phase, run all checks, commit, and **stop for review** before starting the next.

---

## 1. Product summary

Renotion is a web app where a homeowner:

1. **Draws a floor plan in 2D**: walls, doors, windows.
2. **Sees it in 3D right away**, and can orbit around or walk through it.
3. **Plans changes**: new flooring, wall paint, furniture layout.
4. **Gets automatic estimates**: material quantities, cost, and a task timeline generated from those changes.
5. **Tracks the budget**: estimated vs. actual spending.
6. *(Stretch)* **Collaborates in real time** with a partner or contractor.

**Goal:** a polished, deployed portfolio project for software engineering internship applications. Code quality, architecture, tests, and the README matter as much as features.

**Constraint:** everything must be **$0**: open-source libraries, CC0 assets, free hosting tiers. No paid APIs.

---

## 2. Tech stack

| Concern | Choice |
|---|---|
| Language | TypeScript (strict mode) everywhere |
| Build | Vite |
| UI | React 19, Tailwind CSS *(changed from React 18 so Phase 2 can use R3F v9 + drei v10)* |
| 3D | three.js via `@react-three/fiber` + `@react-three/drei` |
| 2D editor | `react-konva` (Konva.js) |
| State | Zustand (+ `immer` middleware) |
| Routing | React Router |
| Backend / DB / Auth | Supabase (Postgres, Auth, Row Level Security, Realtime) — free tier |
| Unit tests | Vitest |
| E2E tests | Playwright |
| Lint / format | ESLint + Prettier |
| CI | GitHub Actions |
| Hosting | Vercel (free Hobby plan) |
| Asset compression | `@gltf-transform/cli` (dev-time only) |

---

## 3. Architecture principles

1. **The 2D plan is the single source of truth.** The 3D scene, quantities, costs, and tasks are all *derived* from the plan data. Never store derived data as authoritative.
2. **Pure core, thin UI.** All geometry, estimation, and scheduling logic lives in `src/core/` as **pure TypeScript functions with no React, three.js, or browser imports**. Most unit tests cover this layer.
3. **Command pattern for edits.** Every user edit is a command (`AddWall`, `MoveWallEndpoint`, `AddOpening`, `SetRoomFloorMaterial`, …) with `apply` and `invert`. This powers undo/redo and, later, collaboration.
4. **Local-first, then sync.** Phases 1–5 work fully offline, saving to IndexedDB. Supabase persistence comes in Phase 6.
5. **Units:** store all lengths internally in **metres** (floats). Convert only at the display layer, with a user toggle between metric and imperial (ft/in).

---

## 4. Folder structure

```
renotion/
├─ public/
│  └─ assets/
│     ├─ textures/        # CC0 PBR textures (1K–2K, compressed)
│     └─ models/          # CC0 furniture .glb (Draco/meshopt compressed)
├─ src/
│  ├─ core/               # PURE logic — no React/three imports
│  │  ├─ types.ts         # Plan, Wall, Opening, Room, Furniture, etc.
│  │  ├─ geometry/
│  │  │  ├─ vec2.ts
│  │  │  ├─ snapping.ts
│  │  │  ├─ wallGraph.ts      # build planar graph from walls
│  │  │  ├─ roomDetection.ts  # find enclosed faces = rooms
│  │  │  ├─ wallSegments.ts   # split walls around openings
│  │  │  └─ polygon.ts        # area, perimeter, point-in-polygon
│  │  ├─ estimate/
│  │  │  ├─ quantities.ts     # paint, flooring, baseboard, drywall
│  │  │  ├─ costs.ts          # quantities × cost table
│  │  │  └─ defaultCosts.ts   # seed cost table (user-editable)
│  │  ├─ tasks/
│  │  │  ├─ templates.ts      # task templates per change type
│  │  │  ├─ generate.ts       # plan diff → tasks
│  │  │  └─ schedule.ts       # topological sort + dates
│  │  ├─ commands/            # command pattern for undo/redo
│  │  └─ units.ts
│  ├─ state/
│  │  ├─ planStore.ts     # Zustand: plan + history
│  │  ├─ uiStore.ts       # tool mode, selection, view mode
│  │  └─ persistence.ts   # IndexedDB now, Supabase later
│  ├─ features/
│  │  ├─ editor2d/        # Konva canvas, tools, measurements
│  │  ├─ viewer3d/        # R3F scene, walls, floors, furniture
│  │  ├─ materials/       # material picker panel
│  │  ├─ furniture/       # catalog + placement
│  │  ├─ estimate/        # cost & quantities panel
│  │  ├─ tasks/           # task list + timeline view
│  │  ├─ budget/          # expenses, estimated vs actual
│  │  └─ projects/        # project list, create, open
│  ├─ lib/
│  │  └─ supabase.ts
│  ├─ pages/
│  ├─ App.tsx
│  └─ main.tsx
├─ supabase/
│  └─ migrations/         # SQL migrations
├─ tests/
│  └─ e2e/                # Playwright specs
├─ .github/workflows/ci.yml
├─ ASSETS.md              # every asset + source + license
├─ README.md
└─ PLAN.md                # this file
```

---

## 5. Core data model (`src/core/types.ts`)

```ts
type ID = string; // nanoid

interface Vec2 { x: number; y: number }          // metres, plan space (y = "north")

interface Wall {
  id: ID;
  start: Vec2;
  end: Vec2;
  thickness: number;   // default 0.15
  height: number;      // default 2.44 (8 ft)
  finishA?: ID;        // material id, side A (left of start→end)
  finishB?: ID;        // material id, side B
}

interface Opening {
  id: ID;
  wallId: ID;
  type: 'door' | 'window';
  offset: number;      // distance from wall.start along wall, to opening centre
  width: number;
  height: number;
  sillHeight: number;  // 0 for doors
}

interface RoomMeta {           // rooms are DERIVED from walls; this stores user data keyed by a stable room key
  key: string;                 // stable key = sorted ids of bounding walls
  name: string;
  floorMaterial?: ID;
  ceilingMaterial?: ID;
}

interface FurnitureItem {
  id: ID;
  modelId: string;             // key into furniture catalog
  position: Vec2;
  rotation: number;            // radians around vertical axis
  elevation?: number;
}

interface Plan {
  version: 1;
  units: 'metric' | 'imperial';   // display preference only
  walls: Wall[];
  openings: Opening[];
  rooms: RoomMeta[];
  furniture: FurnitureItem[];
}

interface Material {
  id: ID;
  name: string;
  category: 'paint' | 'flooring' | 'tile' | 'ceiling';
  colorHex?: string;           // for paint
  textureSet?: string;         // folder under /assets/textures
  costPerUnit: number;         // CAD
  unit: 'gallon' | 'sqft' | 'sqm' | 'box';
  coverage?: number;           // e.g. sq m per gallon, sq ft per box
  wasteFactor: number;         // e.g. 0.10 for flooring, 0.15 for tile
}
```

A **project** stores two plans: `baseline` (the house as it is now) and `planned` (after renovation). The estimate and the task list come from **diffing baseline → planned**.

---

## 6. Phases

### Phase 0 — Project setup
- Vite + React + TS (strict), Tailwind, ESLint, Prettier, Vitest, Playwright.
- Path alias `@/` → `src/`.
- Scripts: `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `test:e2e`.
- GitHub Actions `ci.yml`: install → lint → typecheck → unit tests → build, on push and PR.
- Basic app shell: top bar, left tool panel, main canvas area, right properties panel.
- Placeholder README.

**Done when:** `npm run lint && npm run typecheck && npm test && npm run build` all pass locally and in CI.

---

### Phase 1 — 2D floor plan editor
**Core (with unit tests first):**
- `vec2.ts`: add, sub, length, normalize, dot, distance, point-to-segment distance, projection.
- `snapping.ts`: snap to grid (default 0.1 m), snap to existing endpoints (within 0.2 m), snap angle to 15° increments while drawing (hold Shift to disable).
- `wallGraph.ts`: merge coincident endpoints into nodes, split walls where one endpoint lands on another wall's interior.
- `roomDetection.ts`: find enclosed faces of the planar wall graph (half-edge traversal: at each node, take the next edge clockwise). Drop the outer unbounded face. Return each room as a polygon + its bounding wall ids.
- `polygon.ts`: signed area (shoelace), perimeter, centroid, point-in-polygon.
- `commands/`: `AddWall`, `DeleteWall`, `MoveWallEndpoint`, `SetWallProps`, `AddOpening`, `MoveOpening`, `DeleteOpening`, each with `apply(plan)` and `invert()`.

**UI (`features/editor2d`):**
- Konva stage with pan (middle-drag / space+drag) and zoom (wheel), and a grid.
- Tools: **Select**, **Wall** (click-click to chain walls; Esc to finish), **Door**, **Window** (click on a wall to place; drag along the wall to move), **Delete**.
- Live length labels on walls while drawing and when selected.
- Room fill + room name + area label at the centroid.
- Properties panel: edit wall thickness/height, opening width/height/sill, room name.
- Undo/redo (Ctrl+Z / Ctrl+Shift+Z) via the command history in `planStore`.
- Metric/imperial toggle.
- Auto-save to IndexedDB (debounced).

**Tests:** snapping, room detection (single rectangle; two rooms sharing a wall; L-shape; open, non-enclosed walls → no room), polygon area, command apply/invert round-trips.

**Done when:** a user can draw a 2-room apartment with doors and windows, see room areas, undo/redo every action, and reload the page without losing work.

---

### Phase 2 — 3D view
- Split view (2D | 3D) and full-screen 3D toggle.
- `wallSegments.ts` (core, tested): given a wall and its openings, return the solid **box segments**: full-height pieces between openings, a lintel piece above each opening, and a sill piece below each window. **Do not use CSG**; splitting into boxes is simpler and faster.
- Wall corners: extend each wall by `thickness/2` at endpoints that join another wall so corners close cleanly.
- Floors: `ShapeGeometry` from each room polygon. Optional ceilings (toggle; hidden in orbit view so you can see inside).
- Simple door and window placeholder meshes (frame + glass plane).
- Camera modes (drei): **Orbit** (default), **Top-down** (orthographic), **Walk** (PointerLockControls at eye height 1.6 m, WASD).
- Lighting: hemisphere + directional light with soft shadows; one CC0 HDRI from Poly Haven for environment lighting.
- Clicking a wall face or a floor in 3D selects it, and the selection syncs with the 2D view.
- Performance: memoize geometry per wall by a hash of its props, and dispose geometries on change.

**Done when:** every change in 2D shows up in 3D immediately, all three camera modes work, and selection syncs both ways.

---

### Phase 3 — Materials & estimates
**Assets:**
- Download ~12 CC0 texture sets from **Poly Haven** and **ambientCG** (e.g. 3 hardwoods, 2 laminates, 3 tiles, 2 carpets, plaster, drywall). Resize to 1K–2K and convert to compressed JPG/WebP. Record every asset in `ASSETS.md` (name, source URL, license).
- Paint is a flat color plus a subtle roughness map, with a palette of ~24 colors and a custom color picker.

**Core (tested):**
- `quantities.ts`:
  - **Wall paint area** per wall side = length × height − Σ(opening width × height). Paint gallons = area × coats (default 2) ÷ coverage (default 37 m² / ~400 sq ft per gallon), rounded up.
  - **Flooring** = room area × (1 + wasteFactor), converted into boxes if the material has box coverage.
  - **Baseboard** = room perimeter − Σ(door widths on that room's walls), plus 10% waste.
- `costs.ts`: quantities × `costPerUnit` → line items, subtotals per room and per category, total.
- `defaultCosts.ts`: a seed table of rough CAD prices. **The UI must label these as editable rough estimates, not quotes.** Users can override any price per project.

**UI:**
- Material picker panel: select a floor/wall in 2D or 3D, then pick a material, which applies the texture in 3D at the correct real-world scale (UV repeat based on metres).
- **Baseline vs Planned** toggle: the project has two plans. The user starts by drawing the current house (baseline), clicks "Start planning" to clone it into the planned version, then makes changes.
- Before/after view: a toggle or split slider in 3D comparing baseline vs planned.
- Estimate panel: line items grouped by room, quantities, unit prices (editable), totals. Only changes from baseline to planned count.

**Done when:** changing a room's floor in 3D updates the estimate immediately with correct quantities, and the unit tests verify the quantity math against hand-calculated examples.

---

### Phase 4 — Furniture
- Catalog of ~25 CC0 low-poly models from **Kenney** (Furniture Kit) and **Quaternius**: sofa, armchair, beds, dining table, chairs, desk, wardrobe, kitchen counters/cabinets, fridge, stove, toilet, sink, bathtub, rug, lamp, plant.
- Compress every model with `gltf-transform` (Draco or meshopt) and record it in `ASSETS.md`.
- Catalog metadata: id, name, category, footprint (w × d in metres), file path, thumbnail.
- Placement: drag from the catalog into 2D (as a footprint rectangle) or 3D (raycast to the floor). Rotate with the R key or a handle. Delete. Duplicate.
- Collision: prevent footprints from overlapping walls (core function `footprintIntersectsWalls`, tested). Show a red highlight when a placement is invalid.
- Load models lazily with `useGLTF`, and use instancing for repeated items (e.g. dining chairs).

**Done when:** a user can furnish a room in either view, collisions with walls are blocked, and the app still runs at 60 fps with 50 furniture items.

---

### Phase 5 — Tasks, timeline & budget
**Core (tested):**
- `generate.ts`: diff baseline → planned and emit change events (e.g. `FloorChanged(room, from, to)`, `WallPainted(wallSide, color)`, `WallAdded`, `WallRemoved`, `OpeningAdded`).
- `templates.ts`: each change type maps to a task template with an estimated duration and dependencies. Examples:
  - FloorChanged → *Remove old flooring* → *Prep/level subfloor* → *Install new flooring* → *Install baseboard*
  - WallRemoved → *Confirm wall is non-load-bearing (consult professional)* → *Demolition* → *Patch floor/ceiling* → *Paint*
  - WallPainted → *Patch & sand* → *Prime* → *Paint*
  - Cross-room rules: all demolition comes before drywall, drywall before paint, and paint before flooring install in the same room.
- `schedule.ts`: build a DAG, topologically sort it (detect cycles and throw a typed error), and assign start/end dates from a project start date, skipping weekends optionally.

**UI:**
- Task list grouped by room, with status (todo / in progress / done), editable duration, and notes.
- Timeline: a simple Gantt chart built yourself with divs/SVG (no paid libraries).
- Budget: an expenses table (date, description, category, room, amount), and **estimated vs actual** per category, shown as a bar chart (e.g. Recharts, free).
- Export: a printable project summary page (plan snapshot image + estimate + tasks) using browser print-to-PDF styles.

**Done when:** making changes produces a sensible ordered task list and timeline, and the scheduler is fully unit-tested, including cycle detection.

---

### Phase 6 — Accounts & cloud persistence (Supabase)
- Supabase project (free tier). Keep keys in `.env.local`; commit a `.env.example`.
- Auth: email magic link + GitHub OAuth.
- **Guest demo mode:** a "Try the demo" button loads a pre-built sample project locally, without sign-up. **This is important for recruiters.**
- Migrations in `supabase/migrations/`:

```sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  units text default 'metric',
  created_at timestamptz default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  name text not null,
  start_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table project_members (
  project_id uuid references projects on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  primary key (project_id, user_id)
);

create table plan_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  kind text not null check (kind in ('baseline','planned')),
  label text,                       -- e.g. 'Plan A', 'Plan B'
  data jsonb not null,              -- Plan JSON
  revision int not null default 1,  -- optimistic concurrency
  updated_at timestamptz default now()
);

create table cost_overrides (
  project_id uuid references projects on delete cascade,
  material_id text not null,
  cost_per_unit numeric not null,
  primary key (project_id, material_id)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  template_key text,
  room_key text,
  title text not null,
  status text not null default 'todo',
  duration_days numeric not null,
  notes text
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  spent_on date not null,
  description text not null,
  category text not null,
  room_key text,
  amount numeric not null
);
```

- **Row Level Security on every table:** members can read, owners and editors can write, and only owners can delete projects or manage members.
- Persistence layer: the same interface as IndexedDB (`loadProject`, `saveProject`), so swapping storage backends is a single line. Save with a debounce and use `revision` for optimistic concurrency. On conflict, reload and show a toast.
- Project list page: create, rename, duplicate (Plan A → Plan B), delete.

**Done when:** a signed-in user's projects persist across devices, RLS is verified (user B cannot read user A's project), and demo mode works with no account.

---

### Phase 7 — Real-time collaboration *(stretch)*
- Invite by email → `project_members` row with role `editor` or `viewer`.
- Use Supabase Realtime **broadcast** to send **commands** (not whole plans) between clients, and **presence** to show who's online and their selected item.
- Conflict strategy: commands carry the base `revision`. The server-persisted plan is authoritative, and clients rebase their local unconfirmed commands on incoming ones (simple OT-style: replay). Document the trade-offs in the README.
- Viewers get read-only UI.

**Done when:** two browsers editing the same project converge to the same plan, which a Playwright test verifies using two browser contexts.

---

### Phase 8 — Polish, deploy, portfolio
- Deploy to Vercel. Set Supabase env vars in Vercel and configure the auth redirect URLs.
- Add a deploy job to CI (or use Vercel's GitHub integration with preview deploys per PR).
- Playwright E2E smoke tests: open demo → draw a room → see it in 3D → change the floor → estimate updates.
- Lighthouse pass: lazy-load the 3D bundle, code-split routes, compress assets.
- Accessibility basics: keyboard shortcuts listed in a help modal, focus states, labelled controls.
- Empty states, loading states, error boundaries.
- **README** (key for the portfolio):
  - Hero GIF (draw → 3D → estimate)
  - Live demo link + "Try demo, no sign-up"
  - Features list
  - Architecture diagram (plan → derived 3D / estimates / tasks; command pattern; local-first persistence)
  - Tech choices and **why**
  - Interesting problems solved: room detection, wall splitting around openings, scheduling DAG, real-time sync
  - Testing approach + CI badge
  - What I'd do next
- `ASSETS.md` complete with every CC0 asset credited.

---

## 7. Conventions for Claude Code

- **One phase at a time.** At the end of each phase: run `lint`, `typecheck`, `test`, `build`; summarize what was built; then **stop and wait for review**.
- **Core logic gets tests first.** Anything in `src/core/` needs Vitest unit tests with hand-calculated expected values.
- **No `any`.** Use strict TS, discriminated unions for commands and change events.
- **Small, focused commits** with conventional messages (`feat(editor2d): add wall snapping`). Commit after each change.
- **No paid services or APIs.** If something seems to need one, propose a free alternative and ask first.
- **Assets:** only CC0 sources (Poly Haven, ambientCG, Kenney, Quaternius). Never commit an asset without an `ASSETS.md` entry.
- **Don't over-engineer early.** Get a working vertical slice first (Phases 1–3 = the core demo), then expand.
- **Design matters most.** Every screen should feel clean, calm and impressive — use the design tokens and primitives in `src/styles` and `src/components/ui`.
- If a design decision in this plan turns out to be a bad idea in practice, explain why and propose an alternative instead of silently deviating.

---

## 8. Kick-off prompt

> Read `PLAN.md` fully. Then complete **Phase 0** only. When finished, run all checks, commit, and summarize what you did and anything you'd change in the plan.
