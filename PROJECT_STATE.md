# StrokeTracker — Project State & Memory Bank

> **Status:** Version 1.1 Complete (Deployed to Dev Preview; Ready for Production)
> **Production App URL (`origin`):** https://bjorkis10.github.io/StrokeTracker/
> **Dev Preview App URL (`dev`):** https://bjorkis10.github.io/StrokeTracker-dev/
> **GitHub Repositories:** [Production](https://github.com/Bjorkis10/StrokeTracker) | [Dev Preview](https://github.com/Bjorkis10/StrokeTracker-dev)
> **Last Updated:** 2026-10-27

---

## 1. Current Features Implemented (v1.1)
- [x] **Course Selection & Custom Course Builder (`v1.1`)**:
  - Header Course Selector dropdown (`#courseSelect`) and New Round Course Selector (`#newRoundCourseSelect`).
  - Built-in 18-hole presets:
    - `Generic Par 72` (Out 36 / In 36)
    - `Course A — Championship Links (Par 72)` (Out 36 / In 36)
    - `Course B — Parkland Pines (Par 71)` (Out 35 / In 36)
    - `Course C — Executive Valley (Par 69)` (Out 34 / In 35)
  - Interactive **Add / Edit Custom Course Modal** (`#courseModal`) allowing players to name a course, tap any of the 18 holes to cycle Par 3 / 4 / 5 with live Out/In/Total par calculation, and save/edit/delete custom courses in `localStorage` (`stroketracker_courses_v1`).
- [x] **18-Hole Scorecard Modal (`v1.1`)**:
  - Dedicated `View Scorecard` button in the bottom bar (plus desktop shortcut `S`).
  - Displays summary cards for **Front 9 (OUT)**, **Back 9 (IN)**, and **Total (18)** showing strokes, relative-to-par (`+`, `-`, `E`), and section par.
  - Full 18-hole table showing **Hole**, **Par**, **Strokes**, and color-coded **Score vs. Par** pills, including `OUT (1–9)`, `IN (10–18)`, and `TOTAL` subtotal rows. Tapping any hole row jumps directly to that hole.
- [x] **Golf GameBook Summary Export (`v1.1`)**:
  - `Copy Summary` button inside the Scorecard Modal that formats the round into a structured plain-text summary (Course name, Date, Total/Out/In scores, compact Front 9 & Back 9 strips, and hole-by-hole list) ready to reference when entering scores into **Golf GameBook**.
- [x] **Offline-First Service Worker (`v1.1`)**:
  - `sw.js` caches core application shell assets (`./`, `index.html`, `style.css`, `app.js`, `manifest.json`) using a cache-first + background network update strategy so the app loads reliably with zero mobile reception.
- [x] **Universal PWA & Cross-Browser Installation (`v1.0`)**:
  - Valid `manifest.json` (`display: standalone`, `theme_color: #000000`, `background_color: #000000`) and iOS Home Screen meta tags (`apple-mobile-web-app-capable`, `black-translucent`).
  - Dynamic viewport units (`100dvh`) with `env(safe-area-inset-*)` notch/toolbar safety.
- [x] **Screen Wake Lock API (`v1.0`)**:
  - Automatic `'screen'` wake lock request with `visibilitychange` re-acquisition and interactive header badge (`Active`, `Inactive`, `Unsupported`).
- [x] **Responsive OLED UI, Keyboard Controls & Haptic/Visual Feedback (`v1.0`)**:
  - Pure `#000000` OLED theme, oversized `+1 STROKE` tap target, separated `Undo` button, `Space`/`+`, `-`/`Backspace`, `ArrowLeft`/`ArrowRight`, `S` (Scorecard) shortcuts, and `navigator.vibrate(50)` + `.tap-pulse` CSS animation.

---

## 2. Architecture & Tech Stack
- **Core Stack:** Pure Vanilla HTML5, CSS3, and ES6+ JavaScript.
- **Zero Build Dependencies:** No external frameworks, bundlers, or npm packages required.
- **Modular Files:**
  - `index.html` — Semantic application layout, Course Selector header bar, Scorecard Modal, Custom Course Editor Modal, and New Round confirmation dialog.
  - `style.css` — OLED black theme variables, `100dvh` + safe-area inset layout, desktop card frame, scorecard table & summary cards, and tactile micro-scale animations.
  - `app.js` — State engine, `localStorage` sync (`stroketracker_state_v1` & `stroketracker_courses_v1`), Screen Wake Lock manager, scorecard calculator, Golf GameBook text exporter, and Service Worker registration.
  - `sw.js` — Offline-first Service Worker for zero-signal reliability on remote courses.
  - `manifest.json` — Standalone Web App Manifest with embedded vector icons.

---

## 3. Cross-Platform Browser Support Matrix

| Platform / Browser | Standalone PWA | Offline (`sw.js`) | Wake Lock API | Haptic Vibration | Dynamic Viewport (`100dvh`) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **iOS Safari (iPhone/iPad)** | Yes (Add to Home Screen) | Yes | Yes (iOS 16.4+) | No (CSS visual pulse fallback) | Yes |
| **Android Chrome** | Yes (Install App) | Yes | Yes | Yes (`navigator.vibrate(50)`) | Yes |
| **Desktop Chrome / Edge** | Yes (Installable PWA) | Yes | Yes | No (CSS visual pulse fallback) | Yes |
| **Desktop Firefox** | Partial (Browser tab) | Yes | Yes (v126+) | No (CSS visual pulse fallback) | Yes |
| **Desktop Safari (macOS)** | Yes (Add to Dock) | Yes | Yes | No (CSS visual pulse fallback) | Yes |

---

## 4. Roadmap / Future Ideas
- **v1.2 — Shot & Stat Breakdown:** Track putts per hole, Fairways in Regulation (FIR), Greens in Regulation (GIR), and penalty strokes.
- **v1.3 — Course GPS Distance:** Geolocation API (`navigator.geolocation`) for distance to front/middle/back of green.
- **v1.4 — Multi-Round History Archive:** Save completed rounds into a searchable round history log with CSV/JSON export.

---

## 5. How to Run & Preview (GitHub Pages, PC & Mobile)

### Option A: Live GitHub Pages (Recommended for Mobile & Course Use)
- Open **`https://bjorkis10.github.io/StrokeTracker/`** on iPhone Safari, Android Chrome, or Desktop.
- After loading once, `sw.js` caches the app so it opens even with zero mobile reception.

### Option B: Local HTTP Server (For Local Development)
```powershell
python -m http.server 8080 --bind 0.0.0.0
```
Open **`http://localhost:8080`** on PC or `http://<YOUR_PC_IP>:8080` on mobile over LAN.
