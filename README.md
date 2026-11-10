<div align="center">

# Renotion

**Plan your renovation before the first nail.**

Draw your home in 2D, see it in 3D instantly, and get material quantities, costs and a task timeline, all generated from your plan.

![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)

</div>

> **Status:** Phase 0 is done (project setup, design system, app shell). See [PLAN.md](PLAN.md) for the roadmap.

## Features (planned)

- ✏️ **2D floor-plan editor**: walls, doors and windows with snapping and automatic room detection
- 🧊 **Live 3D view**: orbit, top-down and walk-through modes, derived from the 2D plan
- 🎨 **Materials and estimates**: paint, flooring and trim quantities, priced line by line
- 🗓️ **Tasks and timeline**: an ordered task list and Gantt chart generated from your changes
- 💰 **Budget tracking**: estimated vs. actual spend
- 🔌 **Local-first**: works offline, with optional cloud sync later

## Architecture at a glance

- **The plan is the single source of truth.** The 3D scene, estimates and tasks are all derived from it.
- **Pure core, thin UI.** `src/core/` is framework-free TypeScript, and an ESLint rule enforces it.
- **Command pattern** for every edit, which gives undo/redo and later collaboration.

## Getting started

```bash
nvm use            # Node 22+
npm install
npm run dev        # http://localhost:5173
```

| Script              | What it does                       |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Start the Vite dev server          |
| `npm run build`     | Typecheck and build for production |
| `npm run preview`   | Serve the production build         |
| `npm run lint`      | ESLint (zero warnings allowed)     |
| `npm run typecheck` | `tsc` in strict mode               |
| `npm test`          | Vitest unit and component tests    |
| `npm run test:e2e`  | Playwright end-to-end tests        |
| `npm run format`    | Prettier                           |

## Keyboard shortcuts

| Key                         | Action                                 |
| --------------------------- | -------------------------------------- |
| `V` / `W` / `D` / `N` / `X` | Select / Wall / Door / Window / Delete |
| `1` / `2` / `3`             | 2D / Split / 3D view                   |
| `Esc`                       | Back to Select                         |

## Credits

Every third-party asset is listed in [ASSETS.md](ASSETS.md).
