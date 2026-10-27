# StrokeTracker — Project State & Memory Bank

> **Status:** Version 1.3 Complete (Net/Gross/Stableford Toggle, Decluttered Play UI & 1s Hold Reset)
> **Production App URL (`origin`):** https://bjorkis10.github.io/StrokeTracker/
> **Dev Preview App URL (`dev`):** https://bjorkis10.github.io/StrokeTracker-dev/
> **GitHub Repositories:** [Production](https://github.com/Bjorkis10/StrokeTracker) | [Dev Preview](https://github.com/Bjorkis10/StrokeTracker-dev)
> **Last Updated:** 2026-10-27

---

## 1. Current Features Implemented (v1.3)
- [x] **HCP Score vs. Course Score Header Toggle (`v1.3`)**:
  - Tappable top score header (`#scoreModeToggleBtn`, desktop shortcut `M`) keeps the clean `Score: X (E / ±Y)` format and toggles between:
    - **HCP Score (`net`):** `HCP SCORE` — `Score: 16 (-7)` (strokes + score relative to your Net/HCP par)
    - **Course Score (`gross`):** `COURSE SCORE` — `Score: 16 (+1)` (strokes + score relative to the course's scratch par)
  - Persists preferred `scoreViewMode` in `localStorage`.
- [x] **Decluttered Preset Play Screen (`v1.3`)**:
  - Automatically hides the redundant `EDIT PAR: Par 3 / Par 4 / Par 5` selector row (`#parEditRow`) whenever a recognized course preset (such as **Ljungbyheds GK (Par 71)** or a saved custom course) is active, giving that vertical space to the oversized `+1 STROKE` tap target.
- [x] **1-Second Long-Press Hole Reset (`v1.3`)**:
  - Holding for `1000ms` on the giant stroke counter area resets the current hole's strokes to `0` with a confirmation vibration pattern (`navigator.vibrate([70, 40, 90])`) and visual flash, while suppressing the normal `+1` click on release.
- [x] **Official Ljungbyheds GK (Par 71) & Course Presets (`v1.2`)**:
  - **Ljungbyheds GK (Par 71)** set as default preset with official hole Pars and Stroke Indexes (SI 1–18).
  - **Generic (Par 72)** fallback preset (SI 1–18 standard order) plus full support for user-created custom courses in `localStorage`.
- [x] **Dual Handicap Setup — Manual or WHS Auto-Calculate (`v1.2`)**:
  - Dedicated **Round & Handicap Setup** modal (`#setupModal`) accessible from the `Spelhcp: XX ⚙` button in the header bar.
  - **Mode A (Manual Spelhcp):** Direct integer input (e.g., `38`).
  - **Mode B (Auto WHS from Exact HCP & Tee):** Decimal Exact HCP input (e.g., `37.0`), Gender selector (`Herr` / `Dam`), and official Tee selector (`Gul`, `Blå`, `Röd`, `Orange`) with live WHS formula resolution (`Playing Handicap: 38 strokes`).
- [x] **Extra Strokes per Hole & Net Par Display (`v1.2`)**:
  - Automatically distributes `spelhcp` across all 18 holes based on each hole's Stroke Index (`SI`).
  - Active hole view displays the **SI badge** (`SI 11`), calculated **Net Par** (`Par 3 (Net 5)`), and visual **extra strokes indicator** (`•• +2 strokes`).
- [x] **"Focus / Hide Score" Mode — Blind Golf (`v1.2`)**:
  - Eye toggle button (`#hideScoreBtn`, keyboard shortcut `H`) in the header bar masks the running cumulative total (`Score: •••`).
- [x] **Scorecard Modal, Golf GameBook Summary & Network-First Offline Service Worker (`v1.1–v1.3`)**:
  - 18-hole table with Front 9 (`OUT`), Back 9 (`IN`), and `TOTAL` subtotals (including Net and Stableford points), one-click `Copy Summary` formatted for **Golf GameBook**, and `sw.js` (`stroketracker-cache-v4`) using Network-First + Offline Cache Fallback.
- [x] **Universal PWA, Screen Wake Lock & Responsive OLED UI (`v1.0`)**:
  - Pure `#000000` OLED design, `100dvh` + `env(safe-area-inset-*)` layout, automatic `navigator.wakeLock`, guarded `navigator.vibrate(50)` + `.tap-pulse` animation, and isolated Dev/Prod `localStorage` keys.

---

## 2. Course Data & WHS / Stableford Formulas

### Ljungbyheds GK (Par 71) Official Layout
| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | **OUT** | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | **IN** | **TOT** |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| **Par** | 3 | 4 | 5 | 3 | 5 | 4 | 4 | 4 | 3 | **35** | 4 | 5 | 3 | 4 | 5 | 3 | 4 | 4 | 4 | **36** | **71** |
| **SI** | 11 | 17 | 5 | 3 | 15 | 9 | 1 | 13 | 7 | — | 12 | 4 | 18 | 2 | 14 | 8 | 6 | 16 | 10 | — | — |

### Tee Ratings (Slope & Course Rating)
| Gender | Tee | Slope Rating | Course Rating (CR) |
| :--- | :--- | :---: | :---: |
| **Herr (Men)** | **Gul** | `122` | `69.3` |
| **Herr (Men)** | **Blå** | `117` | `66.9` |
| **Herr (Men)** | **Röd** | `114` | `65.4` |
| **Dam (Women)** | **Gul** | `129` | `74.8` |
| **Dam (Women)** | **Blå** | `123` | `71.8` |
| **Dam (Women)** | **Röd** | `118` | `70.0` |
| **Dam (Women)** | **Orange** | `106` | `64.2` |

### Handicap & Stableford Math Formulas
1. **WHS Playing Handicap (`spelhcp`):**
   ```js
   spelhcp = Math.round(exactHcp * (slope / 113) + (cr - par));
   ```
2. **Extra Strokes Allocated per Hole & Net Par:**
   ```js
   extraStrokes = Math.floor(spelhcp / 18) + (spelhcp % 18 >= hole.si ? 1 : 0);
   netPar = hole.par + extraStrokes;
   ```
3. **Stableford Points per Played Hole:**
   ```js
   holePoints = strokes > 0 ? Math.max(0, 2 + (netPar - strokes)) : 0;
   ```

---

## 3. Architecture & Tech Stack
- **Core Stack:** Pure Vanilla HTML5, CSS3, and ES6+ JavaScript (Zero build dependencies).
- **Modular Files:**
  - `index.html` — Semantic application layout, tappable Score Mode header button, Focus Mode eye toggle, Net Par & Extra Strokes hole banner, Dual Handicap Setup Modal, Scorecard Modal, and Custom Course Editor Modal.
  - `style.css` — OLED `#000000` theme, `100dvh` + safe-area inset layout, desktop phone-card frame, Net Par banner, 1s hold-reset animations, WHS segmented controls, and scorecard table styles.
  - `app.js` — State engine, `localStorage` persistence (`stroketracker_state_v1`, `stroketracker_courses_v1`, with automatic `stroketracker_dev_*` isolation on `-dev`), WHS Slope & Stableford calculator, 1s long-press hole reset, Screen Wake Lock manager, Golf GameBook exporter, and keyboard shortcuts.
  - `sw.js` — Network-First with Offline Cache Fallback Service Worker (`stroketracker-cache-v4`).
  - `manifest.json` — Standalone Web App Manifest.

---

## 4. Deployment & Preview Workflow
- **Push to Dev Preview (`dev`):**
  ```powershell
  git push dev main
  ```
  Preview at: **`https://bjorkis10.github.io/StrokeTracker-dev/`**
- **Publish to Production (`origin`):**
  ```powershell
  git push origin main
  ```
  Live at: **`https://bjorkis10.github.io/StrokeTracker/`**
