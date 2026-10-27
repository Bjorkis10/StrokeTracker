# StrokeTracker — Project State & Memory Bank

> **Status:** Version 1.0 Complete (Deployed to GitHub Pages)
> **Live App URL:** https://bjorkis10.github.io/StrokeTracker/
> **GitHub Repository:** https://github.com/Bjorkis10/StrokeTracker
> **Last Updated:** 2026-10-27

---

## 1. Current Features Implemented (v1.0)
- [x] **Universal PWA & Cross-Browser Installation**:
  - Valid `manifest.json` configured with `display: standalone`, `theme_color: #000000`, `background_color: #000000`, and embedded SVG maskable icons.
  - Apple iOS Home Screen meta tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, `apple-touch-icon`).
  - Dynamic viewport units (`100dvh`) with `env(safe-area-inset-*)` padding so notches, Dynamic Islands, and mobile browser toolbars never clip controls.
- [x] **Screen Wake Lock API (with Safe Fallbacks)**:
  - Feature-detects `navigator.wakeLock` and requests a `'screen'` lock automatically on launch and first interaction.
  - Automatically re-acquires the wake lock on `visibilitychange` when returning to the app.
  - Interactive header status badge (`Screen Always On: Active` / `Inactive` / `Unsupported`) allowing manual toggle when supported.
- [x] **Responsive OLED UI (Mobile Full-Bleed + Desktop Centered)**:
  - Pure black (`#000000`) background for maximum OLED battery savings and outdoor sunlight legibility.
  - Full-screen native layout on mobile viewports; sleek phone-sized card container (`max-width: 420px`) centered on desktop/tablet monitors.
  - Oversized, glove-friendly `+1 STROKE` primary button with live hole stroke count and golf score term badge (`Birdie`, `Even Par`, `Bogey`, etc.).
  - Dedicated `-1 / Undo Stroke` button isolated in the bottom bar to prevent accidental taps.
  - Large Hole Number (`1–18`) indicator with `Prev`/`Next` buttons, an expandable 18-hole Quick-Jump grid drawer, and editable Par selector pills (`Par 3`, `Par 4`, `Par 5`, defaulting to `Par 4`).
  - Live cumulative round score header displaying total strokes and relative-to-par score across played holes (e.g., `Score: 42 (+2)`).
- [x] **Desktop Keyboard Controls**:
  - `Space` or `+` (`=`): Add stroke (`+1`)
  - `-` or `Backspace`: Undo stroke (`-1`)
  - `ArrowRight` / `ArrowLeft`: Next / Previous hole
  - `Escape`: Dismiss confirmation modal or quick-jump drawer
- [x] **Haptic & Visual Feedback + LocalStorage Persistence**:
  - Guarded haptic vibration (`if (navigator.vibrate) navigator.vibrate(50)`) paired with an instant CSS micro-scaling animation (`tap-pulse`) for non-vibrating devices (iOS Safari, Desktop).
  - Automatic `localStorage` persistence (`stroketracker_state_v1`) saving all 18 holes, custom pars, stroke counts, and active hole on every action.
  - Guarded `New Round` confirmation modal with an optional checkbox to also reset custom hole pars back to default Par 4.

---

## 2. Architecture & Tech Stack
- **Core Stack:** Pure Vanilla HTML5, CSS3, and ES6+ JavaScript.
- **Zero Build Dependencies:** No external frameworks, bundlers, or npm packages required.
- **Modular Files:**
  - `index.html` — Semantic application layout, PWA meta tags, quick-jump drawer, and accessible confirmation dialog.
  - `style.css` — OLED black theme variables, `100dvh` + safe-area inset layout, desktop card frame, and tactile micro-scale animations.
  - `app.js` — State engine, `localStorage` sync, Screen Wake Lock manager, cumulative par calculator, haptic/CSS feedback, and keyboard shortcuts.
  - `manifest.json` — Standalone Web App Manifest with embedded vector icons.

---

## 3. Cross-Platform Browser Support Matrix

| Platform / Browser | Standalone PWA | Wake Lock API | Haptic Vibration | Dynamic Viewport (`100dvh`) | Notes |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **iOS Safari (iPhone/iPad)** | Yes (Add to Home Screen) | Yes (iOS 16.4+) | No (CSS visual pulse fallback) | Yes | Full notch & home-indicator safe-area support |
| **Android Chrome** | Yes (Install App) | Yes | Yes (`navigator.vibrate(50)`) | Yes | Full native-like standalone experience |
| **Desktop Chrome / Edge** | Yes (Installable PWA) | Yes | No (CSS visual pulse fallback) | Yes | Centered phone card UI + keyboard shortcuts |
| **Desktop Firefox** | Partial (Browser tab) | Yes (v126+) | No (CSS visual pulse fallback) | Yes | Centered phone card UI + keyboard shortcuts |
| **Desktop Safari (macOS)** | Yes (Add to Dock) | Yes | No (CSS visual pulse fallback) | Yes | Centered phone card UI + keyboard shortcuts |

---

## 4. Roadmap / Future Ideas
- **v1.1 — Shot & Stat Breakdown:** Track putts per hole, Fairways in Regulation (FIR), Greens in Regulation (GIR), and penalty strokes.
- **v1.2 — Course & GPS Integration:** Geolocation API (`navigator.geolocation`) for distance to front/middle/back of green and saved course par templates.
- **v1.3 — Scorecard History & Export:** Multi-round history archive with full 18-hole scorecard table (Front 9 / Back 9 / Total) and CSV/JSON export.
- **v1.4 — Offline Service Worker:** Cache-first `sw.js` for 100% offline loading in remote courses with zero cellular reception.

---

## 5. How to Run & Preview (PC & Mobile)

### Option A: Preview on PC (Desktop Browser)
1. **Direct File Open (Quickest):**
   Double-click `index.html` or open it directly in Chrome, Edge, Firefox, or Safari.
   *(Note: Some browsers restrict PWA installation and `navigator.wakeLock` on `file://` URLs; use a local HTTP server below to test all APIs).*
2. **Local HTTP Server (Recommended for Full PWA & Wake Lock Testing):**
   Run one of the following commands inside the project folder (`StrokeTracker`):
   ```powershell
   # Using Python 3
   python -m http.server 8080

   # Or using Node.js
   npx --yes serve -l 8080 .
   ```
   Then open **`http://localhost:8080`** in your desktop browser. Try the keyboard shortcuts (`Space`/`+`, `-`/`Backspace`, `ArrowLeft`/`ArrowRight`).

### Option B: Preview on Mobile Devices (iPhone Safari & Android Chrome)
1. **Connect to the Same Wi-Fi Network:** Ensure your phone and PC are on the same local Wi-Fi network.
2. **Find Your PC's Local LAN IP Address:**
   - On Windows PowerShell: run `ipconfig` and look for **IPv4 Address** (e.g., `192.168.1.50`).
   - On macOS/Linux: run `ifconfig` or `ip addr`.
3. **Start the Local Server Bound to All Interfaces:**
   ```powershell
   python -m http.server 8080 --bind 0.0.0.0
   ```
4. **Open on Your Phone:**
   - Navigate to `http://<YOUR_PC_IP>:8080` in **iPhone Safari** or **Android Chrome**.
   - **Install to Home Screen (iOS):** Tap the **Share** button in Safari $\rightarrow$ **Add to Home Screen** $\rightarrow$ Launch **StrokeTracker** as a full-screen standalone app.
   - **Install to Home Screen (Android):** Tap the browser menu ($\vdots$) $\rightarrow$ **Add to Home screen / Install app**.
   - *(Tip: `navigator.wakeLock` requires either `localhost` or `https://`. When testing from a phone over LAN HTTP, the header badge will gracefully fall back to `Inactive`/`Unsupported`; deploying to GitHub Pages, Cloudflare Pages, Vercel, or Netlify provides automatic `https://` so Wake Lock activates on mobile automatically).*
