/**
 * StrokeTracker — Cross-Platform Golf Stroke & Handicap Tracker (v1.3)
 * Pure Vanilla ES6+ | Zero Dependencies | Net/Gross/Stableford + 1s Hold Reset
 */

(() => {
  'use strict';

  const IS_DEV = window.location.pathname.toLowerCase().includes('-dev');
  const STORAGE_KEY = IS_DEV
    ? 'stroketracker_dev_state_v1'
    : 'stroketracker_state_v1';
  const CUSTOM_COURSES_KEY = IS_DEV
    ? 'stroketracker_dev_courses_v1'
    : 'stroketracker_courses_v1';
  const TOTAL_HOLES = 18;
  const DEFAULT_PAR = 4;
  const LONG_PRESS_MS = 1000;

  // Score Display Modes (cycles on header tap):
  // 'net'    -> Mode A (Net relative to HCP): e.g. "Net: E" or "Net: +2"
  // 'gross'  -> Mode B (Gross / Scratch): e.g. "Gross: 54 (+19)"
  // 'points' -> Mode C (Stableford Points): e.g. "Points: 18p"
  const SCORE_MODES = ['net', 'gross', 'points'];

  // Official Course Presets:
  // 1. Ljungbyheds GK (Par 71) with official Pars and Stroke Indexes (SI)
  // 2. Generic (Par 72) fallback (SI 1-18 standard order)
  const PRESET_COURSES = [
    {
      id: 'ljungbyheds-gk',
      name: 'Ljungbyheds GK (Par 71)',
      isPreset: true,
      isCustom: false,
      pars: [3, 4, 5, 3, 5, 4, 4, 4, 3, 4, 5, 3, 4, 5, 3, 4, 4, 4],
      si: [11, 17, 5, 3, 15, 9, 1, 13, 7, 12, 4, 18, 2, 14, 8, 6, 16, 10],
    },
    {
      id: 'generic-72',
      name: 'Generic (Par 72)',
      isPreset: false,
      isCustom: false,
      pars: [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4],
      si: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    },
  ];

  // Official WHS Tee Slope & Course Rating (CR) Data
  const TEE_OPTIONS = {
    herr: [
      { id: 'gul', label: 'Gul', slope: 122, cr: 69.3 },
      { id: 'bla', label: 'Blå', slope: 117, cr: 66.9 },
      { id: 'rod', label: 'Röd', slope: 114, cr: 65.4 },
    ],
    dam: [
      { id: 'gul', label: 'Gul', slope: 129, cr: 74.8 },
      { id: 'bla', label: 'Blå', slope: 123, cr: 71.8 },
      { id: 'rod', label: 'Röd', slope: 118, cr: 70.0 },
      { id: 'orange', label: 'Orange', slope: 106, cr: 64.2 },
    ],
  };

  // --- DOM Elements ---
  const scoreModeToggleBtn = document.getElementById('scoreModeToggleBtn');
  const topScoreLabel = document.getElementById('topScoreLabel');
  const totalScoreDisplay = document.getElementById('totalScoreDisplay');
  const hideScoreBtn = document.getElementById('hideScoreBtn');
  const hideScoreIcon = document.getElementById('hideScoreIcon');
  const wakeLockBtn = document.getElementById('wakeLockBtn');
  const wakeLockText = document.getElementById('wakeLockText');

  const courseSelect = document.getElementById('courseSelect');
  const openSetupBtn = document.getElementById('openSetupBtn');
  const headerHcpBadge = document.getElementById('headerHcpBadge');

  const prevHoleBtn = document.getElementById('prevHoleBtn');
  const nextHoleBtn = document.getElementById('nextHoleBtn');
  const holeJumpToggleBtn = document.getElementById('holeJumpToggleBtn');
  const holeJumpDrawer = document.getElementById('holeJumpDrawer');
  const holeGrid = document.getElementById('holeGrid');
  const currentHoleNumber = document.getElementById('currentHoleNumber');
  const currentHoleSiBadge = document.getElementById('currentHoleSiBadge');
  const currentHoleNetParText = document.getElementById('currentHoleNetParText');
  const currentHoleExtraStrokesBadge = document.getElementById('currentHoleExtraStrokesBadge');
  const currentHoleExtraDots = document.getElementById('currentHoleExtraDots');
  const currentHoleExtraText = document.getElementById('currentHoleExtraText');
  const parEditRow = document.getElementById('parEditRow');
  const parPills = document.querySelectorAll('.par-pill');

  const addStrokeBtn = document.getElementById('addStrokeBtn');
  const currentHoleStrokes = document.getElementById('currentHoleStrokes');
  const currentHoleTerm = document.getElementById('currentHoleTerm');
  const longPressHint = document.getElementById('longPressHint');

  const undoStrokeBtn = document.getElementById('undoStrokeBtn');
  const viewScorecardBtn = document.getElementById('viewScorecardBtn');
  const resetRoundBtn = document.getElementById('resetRoundBtn');

  // Round & Handicap Setup Modal Elements
  const setupModal = document.getElementById('setupModal');
  const closeSetupIconBtn = document.getElementById('closeSetupIconBtn');
  const setupCourseSelect = document.getElementById('setupCourseSelect');
  const openCustomCourseFromSetupBtn = document.getElementById('openCustomCourseFromSetupBtn');
  const tabModeWhs = document.getElementById('tabModeWhs');
  const tabModeManual = document.getElementById('tabModeManual');
  const whsModePanel = document.getElementById('whsModePanel');
  const manualModePanel = document.getElementById('manualModePanel');
  const exactHcpInput = document.getElementById('exactHcpInput');
  const genderButtons = document.querySelectorAll('.seg-btn[data-gender]');
  const teeSelect = document.getElementById('teeSelect');
  const whsFormulaBreakdown = document.getElementById('whsFormulaBreakdown');
  const manualSpelhcpInput = document.getElementById('manualSpelhcpInput');
  const resolvedSpelhcpPreview = document.getElementById('resolvedSpelhcpPreview');
  const cancelSetupBtn = document.getElementById('cancelSetupBtn');
  const saveSetupBtn = document.getElementById('saveSetupBtn');

  // Scorecard Modal Elements
  const scorecardModal = document.getElementById('scorecardModal');
  const scorecardCourseSubtitle = document.getElementById('scorecardCourseSubtitle');
  const summaryFront9 = document.getElementById('summaryFront9');
  const summaryFront9Par = document.getElementById('summaryFront9Par');
  const summaryBack9 = document.getElementById('summaryBack9');
  const summaryBack9Par = document.getElementById('summaryBack9Par');
  const summaryTotal = document.getElementById('summaryTotal');
  const summaryTotalPar = document.getElementById('summaryTotalPar');
  const scorecardTableBody = document.getElementById('scorecardTableBody');
  const copySummaryBtn = document.getElementById('copySummaryBtn');
  const closeScorecardBtn = document.getElementById('closeScorecardBtn');
  const closeScorecardIconBtn = document.getElementById('closeScorecardIconBtn');

  // Custom Course Editor Modal Elements
  const courseModal = document.getElementById('courseModal');
  const courseModalTitle = document.getElementById('courseModalTitle');
  const closeCourseModalIconBtn = document.getElementById('closeCourseModalIconBtn');
  const customCourseNameInput = document.getElementById('customCourseNameInput');
  const courseEditorParSummary = document.getElementById('courseEditorParSummary');
  const courseParGrid = document.getElementById('courseParGrid');
  const deleteCustomCourseBtn = document.getElementById('deleteCustomCourseBtn');
  const cancelCourseModalBtn = document.getElementById('cancelCourseModalBtn');
  const saveCourseModalBtn = document.getElementById('saveCourseModalBtn');

  // New Round Confirmation Modal Elements
  const confirmModal = document.getElementById('confirmModal');
  const newRoundCourseSelect = document.getElementById('newRoundCourseSelect');
  const cancelResetBtn = document.getElementById('cancelResetBtn');
  const confirmResetBtn = document.getElementById('confirmResetBtn');

  // --- Application State ---
  let customCourses = loadCustomCourses();
  let state = loadState();

  // Draft state for modals
  let draftSetup = null;
  let editingCourseId = null;
  let draftCoursePars = [];

  // Long-press state for 1-second hole reset
  let longPressTimer = null;
  let longPressTriggered = false;

  // --- Screen Wake Lock State ---
  let wakeLockSentinel = null;
  let wakeLockDesired = true;
  const isWakeLockSupported =
    'wakeLock' in navigator &&
    navigator.wakeLock &&
    typeof navigator.wakeLock.request === 'function';

  // ==========================================================================
  // 1. Course Presets, Custom Courses & WHS / Stableford Math Helpers
  // ==========================================================================

  function sanitizeParsArray(pars) {
    if (!Array.isArray(pars) || pars.length !== TOTAL_HOLES) {
      return PRESET_COURSES[0].pars.slice();
    }
    return pars.map((p) => ([3, 4, 5].includes(Number(p)) ? Number(p) : DEFAULT_PAR));
  }

  function sanitizeSiArray(si) {
    if (!Array.isArray(si) || si.length !== TOTAL_HOLES) {
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    }
    return si.map((s, idx) => {
      const n = Number(s);
      return n >= 1 && n <= 18 ? Math.floor(n) : idx + 1;
    });
  }

  function loadCustomCourses() {
    try {
      const raw = localStorage.getItem(CUSTOM_COURSES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string')
        .map((c) => ({
          id: c.id,
          name: c.name.trim().slice(0, 42) || 'Custom Course',
          isPreset: true,
          isCustom: true,
          pars: sanitizeParsArray(c.pars),
          si: sanitizeSiArray(c.si),
        }));
    } catch (err) {
      console.warn('StrokeTracker: Could not read custom courses.', err);
      return [];
    }
  }

  function saveCustomCourses() {
    try {
      localStorage.setItem(CUSTOM_COURSES_KEY, JSON.stringify(customCourses));
    } catch (err) {
      console.warn('StrokeTracker: Could not save custom courses.', err);
    }
  }

  function getAllCourses() {
    return [...PRESET_COURSES, ...customCourses];
  }

  function getCourseById(courseId) {
    const all = getAllCourses();
    return all.find((c) => c.id === courseId) || PRESET_COURSES[0];
  }

  function getTeeObject(gender, teeId) {
    const g = gender === 'dam' ? 'dam' : 'herr';
    const list = TEE_OPTIONS[g];
    return list.find((t) => t.id === teeId) || list[0];
  }

  /**
   * WHS Playing Handicap Formula:
   * spelhcp = Math.round(exactHcp * (slope / 113) + (cr - par))
   */
  function calculateWhsSpelhcp(exactHcp, slope, cr, coursePar) {
    const raw = Number(exactHcp) * (Number(slope) / 113) + (Number(cr) - Number(coursePar));
    return Math.max(0, Math.round(raw));
  }

  /**
   * Extra Strokes per Hole Formula:
   * extraStrokes = Math.floor(spelhcp / 18) + (spelhcp % 18 >= hole.si ? 1 : 0)
   */
  function getExtraStrokesForHole(spelhcp, holeSi) {
    const safeHcp = Math.max(0, Math.floor(Number(spelhcp) || 0));
    const safeSi = Math.max(1, Math.min(18, Math.floor(Number(holeSi) || 18)));
    return Math.floor(safeHcp / 18) + (safeHcp % 18 >= safeSi ? 1 : 0);
  }

  /**
   * Stableford Points per Hole:
   * points = Math.max(0, 2 + (netPar - strokes)) for played holes (strokes > 0)
   */
  function calculateStablefordPoints(strokes, netPar) {
    if (!strokes || strokes <= 0) return 0;
    return Math.max(0, 2 + (netPar - strokes));
  }

  // ==========================================================================
  // 2. Round State Management & Persistence (localStorage)
  // ==========================================================================

  function createDefaultState(courseId = 'ljungbyheds-gk') {
    const course = getCourseById(courseId);
    const totalPar = course.pars.reduce((a, b) => a + b, 0);
    const defaultGender = 'herr';
    const defaultTee = getTeeObject(defaultGender, 'gul');
    const defaultExactHcp = 37.0;
    const defaultSpelhcp = calculateWhsSpelhcp(
      defaultExactHcp,
      defaultTee.slope,
      defaultTee.cr,
      totalPar
    );

    const holes = course.pars.map((parVal, idx) => ({
      hole: idx + 1,
      par: parVal,
      si: course.si[idx],
      strokes: 0,
    }));

    return {
      selectedCourseId: course.id,
      currentHole: 1,
      hcpMode: 'whs', // 'whs' | 'manual'
      gender: defaultGender, // 'herr' | 'dam'
      teeId: defaultTee.id, // 'gul' | 'bla' | 'rod' | 'orange'
      exactHcp: defaultExactHcp,
      manualSpelhcp: defaultSpelhcp,
      spelhcp: defaultSpelhcp,
      scoreViewMode: 'net', // 'net' | 'gross' | 'points'
      hideScore: false,
      holes,
      updatedAt: Date.now(),
    };
  }

  function resolveCurrentSpelhcp(stateObj) {
    const totalCoursePar = stateObj.holes.reduce((sum, h) => sum + h.par, 0);
    if (stateObj.hcpMode === 'manual') {
      return Math.max(0, Math.round(Number(stateObj.manualSpelhcp) || 0));
    }
    const tee = getTeeObject(stateObj.gender, stateObj.teeId);
    return calculateWhsSpelhcp(stateObj.exactHcp, tee.slope, tee.cr, totalCoursePar);
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultState();

      const parsed = JSON.parse(raw);
      if (
        !parsed ||
        typeof parsed.currentHole !== 'number' ||
        !Array.isArray(parsed.holes) ||
        parsed.holes.length !== TOTAL_HOLES
      ) {
        return createDefaultState();
      }

      const selectedCourse = getCourseById(parsed.selectedCourseId || 'ljungbyheds-gk');
      const gender = parsed.gender === 'dam' ? 'dam' : 'herr';
      const tee = getTeeObject(gender, parsed.teeId || 'gul');
      const hcpMode = parsed.hcpMode === 'manual' ? 'manual' : 'whs';
      const exactHcp =
        typeof parsed.exactHcp === 'number' && !Number.isNaN(parsed.exactHcp)
          ? parsed.exactHcp
          : 37.0;
      const manualSpelhcp =
        typeof parsed.manualSpelhcp === 'number' && !Number.isNaN(parsed.manualSpelhcp)
          ? Math.max(0, Math.round(parsed.manualSpelhcp))
          : 38;
      const scoreViewMode = SCORE_MODES.includes(parsed.scoreViewMode)
        ? parsed.scoreViewMode
        : 'net';

      const sanitizedHoles = parsed.holes.map((h, idx) => ({
        hole: idx + 1,
        par: [3, 4, 5].includes(Number(h.par))
          ? Number(h.par)
          : selectedCourse.pars[idx],
        si: selectedCourse.si[idx],
        strokes: Math.max(0, Math.floor(Number(h.strokes) || 0)),
      }));

      const currentHole = Math.min(
        TOTAL_HOLES,
        Math.max(1, Math.floor(parsed.currentHole))
      );

      const loadedState = {
        selectedCourseId: selectedCourse.id,
        currentHole,
        hcpMode,
        gender,
        teeId: tee.id,
        exactHcp,
        manualSpelhcp,
        spelhcp: 38,
        scoreViewMode,
        hideScore: Boolean(parsed.hideScore),
        holes: sanitizedHoles,
        updatedAt: parsed.updatedAt || Date.now(),
      };

      loadedState.spelhcp = resolveCurrentSpelhcp(loadedState);
      return loadedState;
    } catch (err) {
      console.warn('StrokeTracker: Could not read localStorage, using defaults.', err);
      return createDefaultState();
    }
  }

  function saveState() {
    state.spelhcp = resolveCurrentSpelhcp(state);
    state.updatedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('StrokeTracker: Could not save state to localStorage.', err);
    }
  }

  function getActiveHoleData() {
    return state.holes[state.currentHole - 1];
  }

  function applyCourseSelection(courseId, resetStrokes = false) {
    const course = getCourseById(courseId);
    state.selectedCourseId = course.id;
    state.holes.forEach((h, idx) => {
      h.par = course.pars[idx];
      h.si = course.si[idx];
      if (resetStrokes) {
        h.strokes = 0;
      }
    });
    if (resetStrokes) {
      state.currentHole = 1;
    }
    saveState();
    render();
  }

  // ==========================================================================
  // 3. Tactile Haptic & Micro-Scaling Visual Feedback
  // ==========================================================================

  function triggerFeedback(targetElement, vibratePattern = 50) {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(vibratePattern);
      }
    } catch (_) {
      // Ignore on unsupported devices
    }

    if (targetElement) {
      targetElement.classList.remove('tap-pulse');
      void targetElement.offsetWidth;
      targetElement.classList.add('tap-pulse');
      setTimeout(() => {
        targetElement.classList.remove('tap-pulse');
      }, 130);
    }
  }

  // ==========================================================================
  // 4. Golf Scoring, Extra Strokes, Stableford & UI Rendering
  // ==========================================================================

  function formatDiff(diff, hasPlayedHoles = true) {
    if (!hasPlayedHoles || diff === 0) return 'E';
    return diff > 0 ? `+${diff}` : `${diff}`;
  }

  function getDiffTone(diff, isPlayed = true) {
    if (!isPlayed) return 'unplayed';
    if (diff < 0) return 'under';
    if (diff === 0) return 'par';
    return 'over';
  }

  function getGolfTerm(strokes, par, netPar) {
    if (strokes === 0) {
      return {
        label: `Par ${par} (Net ${netPar}) • Tap +1`,
        tone: 'neutral',
      };
    }

    const pts = calculateStablefordPoints(strokes, netPar);
    if (strokes === 1) {
      return { label: `Hole in One! • ${pts}p`, tone: 'under' };
    }

    const diff = strokes - par;
    const netDiff = strokes - netPar;
    const netStr = `Net ${formatDiff(netDiff, true)} (${pts}p)`;

    if (diff <= -3) return { label: `Albatross (${diff}) • ${netStr}`, tone: 'under' };
    if (diff === -2) return { label: `Eagle (-2) • ${netStr}`, tone: 'under' };
    if (diff === -1) return { label: `Birdie (-1) • ${netStr}`, tone: 'under' };
    if (diff === 0) return { label: `Even Par (E) • ${netStr}`, tone: 'par' };
    if (diff === 1) return { label: `Bogey (+1) • ${netStr}`, tone: 'over' };
    if (diff === 2) return { label: `Double Bogey (+2) • ${netStr}`, tone: 'over' };
    if (diff === 3) return { label: `Triple Bogey (+3) • ${netStr}`, tone: 'over' };
    return { label: `+${diff} Over Par • ${netStr}`, tone: 'over' };
  }

  function computeRangeStats(holeSlice) {
    let strokes = 0;
    let playedPar = 0;
    let playedNetPar = 0;
    let totalPar = 0;
    let totalNetPar = 0;
    let points = 0;
    let playedCount = 0;

    for (const h of holeSlice) {
      const extra = getExtraStrokesForHole(state.spelhcp, h.si);
      const holeNetPar = h.par + extra;
      totalPar += h.par;
      totalNetPar += holeNetPar;

      if (h.strokes > 0) {
        strokes += h.strokes;
        playedPar += h.par;
        playedNetPar += holeNetPar;
        points += calculateStablefordPoints(h.strokes, holeNetPar);
        playedCount += 1;
      }
    }

    const diff = strokes - playedPar;
    const netDiff = strokes - playedNetPar;
    const diffFormatted = formatDiff(diff, playedCount > 0);
    const netDiffFormatted = formatDiff(netDiff, playedCount > 0);

    return {
      strokes,
      playedPar,
      playedNetPar,
      totalPar,
      totalNetPar,
      points,
      playedCount,
      diff,
      netDiff,
      diffFormatted,
      netDiffFormatted,
    };
  }

  function computeRoundBreakdown() {
    const front9 = computeRangeStats(state.holes.slice(0, 9));
    const back9 = computeRangeStats(state.holes.slice(9, 18));
    const total = computeRangeStats(state.holes);
    return { front9, back9, total };
  }

  function populateCourseDropdown(selectEl, selectedId) {
    selectEl.innerHTML = '';
    const allCourses = getAllCourses();

    allCourses.forEach((course) => {
      const opt = document.createElement('option');
      const totalPar = course.pars.reduce((sum, p) => sum + p, 0);
      opt.value = course.id;
      opt.textContent = course.name.includes('Par ')
        ? course.name
        : `${course.name} (Par ${totalPar})`;
      if (course.id === selectedId) {
        opt.selected = true;
      }
      selectEl.appendChild(opt);
    });
  }

  function renderQuickJumpGrid() {
    holeGrid.innerHTML = '';
    state.holes.forEach((holeObj) => {
      const extra = getExtraStrokesForHole(state.spelhcp, holeObj.si);
      const dotsStr = extra > 0 ? '•'.repeat(Math.min(extra, 4)) : '';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hole-cell';
      if (holeObj.hole === state.currentHole) {
        btn.classList.add('is-current');
      }
      if (holeObj.strokes > 0) {
        btn.classList.add('is-played');
      }
      btn.setAttribute(
        'aria-label',
        `Jump to Hole ${holeObj.hole}, Par ${holeObj.par}, Net Par ${holeObj.par + extra}, Strokes ${holeObj.strokes}`
      );

      const numSpan = document.createElement('span');
      numSpan.className = 'hole-cell-num';
      numSpan.textContent = holeObj.hole;

      const dotsSpan = document.createElement('span');
      dotsSpan.className = 'hole-cell-dots';
      dotsSpan.textContent = dotsStr;

      const scoreSpan = document.createElement('span');
      scoreSpan.className = 'hole-cell-score';
      scoreSpan.textContent =
        holeObj.strokes > 0 ? `${holeObj.strokes}` : `P${holeObj.par}`;

      btn.appendChild(numSpan);
      btn.appendChild(dotsSpan);
      btn.appendChild(scoreSpan);

      btn.addEventListener('click', () => {
        triggerFeedback(btn);
        selectHole(holeObj.hole);
        toggleQuickJumpDrawer(false);
      });

      holeGrid.appendChild(btn);
    });
  }

  function render() {
    const active = getActiveHoleData();
    const activeCourse = getCourseById(state.selectedCourseId);

    // 1. Update Course Dropdown & Spelhcp Setup Pill
    populateCourseDropdown(courseSelect, activeCourse.id);
    headerHcpBadge.textContent = `Spelhcp: ${state.spelhcp}`;

    // 2. Update Tappable Score Header (Net / Gross / Stableford + Blind Mode)
    const { total } = computeRoundBreakdown();
    const devSuffix = IS_DEV ? ' • DEV' : '';
    hideScoreBtn.setAttribute('aria-pressed', String(state.hideScore));

    if (state.hideScore) {
      totalScoreDisplay.textContent = 'Score: •••';
      hideScoreIcon.textContent = '🙈';
      topScoreLabel.textContent = `FOCUS MODE • HIDDEN${devSuffix}`;
    } else {
      hideScoreIcon.textContent = '👁';
      if (state.scoreViewMode === 'net') {
        topScoreLabel.textContent = `VIEW: NET vs HCP (TAP)${devSuffix}`;
        totalScoreDisplay.textContent = `Net: ${total.netDiffFormatted}`;
      } else if (state.scoreViewMode === 'gross') {
        topScoreLabel.textContent = `VIEW: GROSS / SCRATCH (TAP)${devSuffix}`;
        totalScoreDisplay.textContent = `Gross: ${total.strokes} (${total.diffFormatted})`;
      } else {
        topScoreLabel.textContent = `VIEW: STABLEFORD (TAP)${devSuffix}`;
        totalScoreDisplay.textContent = `Points: ${total.points}p`;
      }
    }

    // 3. Update Hole Number, SI Badge, Extra Strokes & Net Par Banner
    const extraStrokes = getExtraStrokesForHole(state.spelhcp, active.si);
    const netPar = active.par + extraStrokes;

    currentHoleNumber.textContent = String(active.hole);
    currentHoleSiBadge.textContent = `SI ${active.si}`;
    currentHoleNetParText.textContent = `Par ${active.par} (Net ${netPar})`;

    currentHoleExtraStrokesBadge.setAttribute('data-extra', String(extraStrokes));
    if (extraStrokes > 0) {
      currentHoleExtraDots.textContent = '•'.repeat(extraStrokes);
      currentHoleExtraText.textContent = `+${extraStrokes} ${
        extraStrokes === 1 ? 'stroke' : 'strokes'
      }`;
    } else {
      currentHoleExtraDots.textContent = '';
      currentHoleExtraText.textContent = '0 extra strokes';
    }

    // 4. Hide redundant Par Edit Buttons when a recognized course preset (like Ljungbyheds GK) is active
    const shouldHideParEdit = Boolean(activeCourse.isPreset);
    parEditRow.hidden = shouldHideParEdit;

    if (!shouldHideParEdit) {
      parPills.forEach((pill) => {
        const pillPar = Number(pill.dataset.par);
        const isActive = pillPar === active.par;
        pill.classList.toggle('active', isActive);
        pill.setAttribute('aria-pressed', String(isActive));
      });
    }

    // 5. Update Current Hole Strokes, Term & Long-Press Hint
    currentHoleStrokes.textContent = String(active.strokes);
    const termInfo = getGolfTerm(active.strokes, active.par, netPar);
    currentHoleTerm.textContent = termInfo.label;
    currentHoleTerm.setAttribute('data-tone', termInfo.tone);
    longPressHint.textContent =
      active.strokes > 0 ? 'Hold 1s to reset hole to 0' : '';

    // 6. Update Undo Button Disabled State
    undoStrokeBtn.disabled = active.strokes <= 0;

    // 7. Refresh Quick-Jump 1–18 Grid
    renderQuickJumpGrid();

    // 8. If Scorecard Modal is open, keep it synced
    if (!scorecardModal.hidden) {
      renderScorecardModal();
    }
  }

  // ==========================================================================
  // 5. Score Display Mode Cycling & Focus / Hide Score Mode
  // ==========================================================================

  function cycleScoreViewMode() {
    triggerFeedback(scoreModeToggleBtn);
    // If score is currently hidden in Focus Mode, unhide on tap or cycle seamlessly
    if (state.hideScore) {
      state.hideScore = false;
    } else {
      const idx = SCORE_MODES.indexOf(state.scoreViewMode);
      state.scoreViewMode = SCORE_MODES[(idx + 1) % SCORE_MODES.length];
    }
    saveState();
    render();
  }

  function toggleHideScoreMode() {
    triggerFeedback(hideScoreBtn);
    state.hideScore = !state.hideScore;
    saveState();
    render();
  }

  // ==========================================================================
  // 6. Dual Handicap & Round Setup Modal
  // ==========================================================================

  function populateSetupTeeDropdown(gender, selectedTeeId) {
    const g = gender === 'dam' ? 'dam' : 'herr';
    const tees = TEE_OPTIONS[g];
    teeSelect.innerHTML = '';

    tees.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.label} (Slope ${t.slope}, CR ${t.cr.toFixed(1)})`;
      if (t.id === selectedTeeId) {
        opt.selected = true;
      }
      teeSelect.appendChild(opt);
    });
  }

  function updateSetupModalPreview() {
    if (!draftSetup) return;

    const selectedCourse = getCourseById(draftSetup.courseId);
    const coursePar = selectedCourse.pars.reduce((a, b) => a + b, 0);

    const isWhs = draftSetup.hcpMode === 'whs';
    tabModeWhs.classList.toggle('active', isWhs);
    tabModeWhs.setAttribute('aria-selected', String(isWhs));
    tabModeManual.classList.toggle('active', !isWhs);
    tabModeManual.setAttribute('aria-selected', String(!isWhs));

    whsModePanel.hidden = !isWhs;
    manualModePanel.hidden = isWhs;

    genderButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.gender === draftSetup.gender);
    });

    let resolvedSpelhcp = 0;
    if (isWhs) {
      const tee = getTeeObject(draftSetup.gender, draftSetup.teeId);
      resolvedSpelhcp = calculateWhsSpelhcp(
        draftSetup.exactHcp,
        tee.slope,
        tee.cr,
        coursePar
      );
      whsFormulaBreakdown.textContent = `Formula: round(${draftSetup.exactHcp.toFixed(
        1
      )} × (${tee.slope} / 113) + (${tee.cr.toFixed(1)} − ${coursePar})) = ${resolvedSpelhcp}`;
    } else {
      resolvedSpelhcp = Math.max(0, Math.round(Number(draftSetup.manualSpelhcp) || 0));
    }

    draftSetup.resolvedSpelhcp = resolvedSpelhcp;
    resolvedSpelhcpPreview.textContent = `Playing Handicap: ${resolvedSpelhcp} ${
      resolvedSpelhcp === 1 ? 'stroke' : 'strokes'
    }`;
  }

  function openSetupModal() {
    triggerFeedback(openSetupBtn);
    draftSetup = {
      courseId: state.selectedCourseId,
      hcpMode: state.hcpMode,
      gender: state.gender,
      teeId: state.teeId,
      exactHcp: state.exactHcp,
      manualSpelhcp: state.manualSpelhcp,
      resolvedSpelhcp: state.spelhcp,
    };

    populateCourseDropdown(setupCourseSelect, draftSetup.courseId);
    populateSetupTeeDropdown(draftSetup.gender, draftSetup.teeId);
    exactHcpInput.value = draftSetup.exactHcp.toFixed(1);
    manualSpelhcpInput.value = String(draftSetup.manualSpelhcp);

    updateSetupModalPreview();
    setupModal.hidden = false;
  }

  function closeSetupModal() {
    setupModal.hidden = true;
    draftSetup = null;
  }

  function saveSetupFromModal() {
    if (!draftSetup) return;
    triggerFeedback(saveSetupBtn);

    const courseChanged = draftSetup.courseId !== state.selectedCourseId;
    state.hcpMode = draftSetup.hcpMode;
    state.gender = draftSetup.gender;
    state.teeId = draftSetup.teeId;
    state.exactHcp = draftSetup.exactHcp;
    state.manualSpelhcp = draftSetup.manualSpelhcp;

    if (courseChanged) {
      applyCourseSelection(draftSetup.courseId, false);
    } else {
      saveState();
      render();
    }

    closeSetupModal();
  }

  // ==========================================================================
  // 7. Scorecard Modal & Golf GameBook Summary Export
  // ==========================================================================

  function createSubtotalRow(label, stats) {
    const tr = document.createElement('tr');
    tr.className = 'scorecard-subtotal-row';

    const tdLabel = document.createElement('td');
    tdLabel.textContent = label;

    const tdSi = document.createElement('td');
    tdSi.textContent = '';

    const tdPar = document.createElement('td');
    tdPar.innerHTML = `${stats.totalPar} <span class="scorecard-net-sub">(${stats.totalNetPar})</span>`;

    const tdStrokes = document.createElement('td');
    tdStrokes.textContent = stats.playedCount > 0 ? String(stats.strokes) : '—';

    const tdDiff = document.createElement('td');
    const pill = document.createElement('span');
    pill.className = 'score-diff-pill';
    pill.setAttribute('data-tone', getDiffTone(stats.diff, stats.playedCount > 0));
    pill.textContent =
      stats.playedCount > 0 ? `${stats.diffFormatted} (${stats.points}p)` : '—';
    tdDiff.appendChild(pill);

    tr.appendChild(tdLabel);
    tr.appendChild(tdSi);
    tr.appendChild(tdPar);
    tr.appendChild(tdStrokes);
    tr.appendChild(tdDiff);
    return tr;
  }

  function renderScorecardModal() {
    const activeCourse = getCourseById(state.selectedCourseId);
    const { front9, back9, total } = computeRoundBreakdown();
    const tee = getTeeObject(state.gender, state.teeId);
    const hcpDesc =
      state.hcpMode === 'whs'
        ? `Spelhcp ${state.spelhcp} (${state.gender === 'dam' ? 'Dam' : 'Herr'} ${tee.label}, HCP ${state.exactHcp.toFixed(1)})`
        : `Spelhcp ${state.spelhcp} (Manual)`;

    scorecardCourseSubtitle.textContent = `${activeCourse.name} • ${hcpDesc}`;

    summaryFront9.textContent = `${front9.strokes} (${front9.diffFormatted})`;
    summaryFront9Par.textContent = `Net ${front9.netDiffFormatted} • ${front9.points}p`;

    summaryBack9.textContent = `${back9.strokes} (${back9.diffFormatted})`;
    summaryBack9Par.textContent = `Net ${back9.netDiffFormatted} • ${back9.points}p`;

    summaryTotal.textContent = `${total.strokes} (${total.diffFormatted})`;
    summaryTotalPar.textContent = `Net ${total.netDiffFormatted} • ${total.points}p`;

    scorecardTableBody.innerHTML = '';

    state.holes.forEach((h, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'scorecard-row';
      if (h.hole === state.currentHole) {
        tr.classList.add('is-active-hole');
      }

      const extra = getExtraStrokesForHole(state.spelhcp, h.si);
      const netPar = h.par + extra;
      const isPlayed = h.strokes > 0;
      const holeDiff = h.strokes - h.par;
      const holePts = calculateStablefordPoints(h.strokes, netPar);

      const tdHole = document.createElement('td');
      tdHole.textContent = `${h.hole}`;

      const tdSi = document.createElement('td');
      tdSi.className = 'scorecard-si-cell';
      tdSi.textContent = `${h.si}`;

      const tdPar = document.createElement('td');
      tdPar.innerHTML = `${h.par} <span class="scorecard-net-sub">(${netPar})</span>`;

      const tdStrokes = document.createElement('td');
      tdStrokes.textContent = isPlayed ? `${h.strokes}` : '—';

      const tdDiff = document.createElement('td');
      const pill = document.createElement('span');
      pill.className = 'score-diff-pill';
      pill.setAttribute('data-tone', getDiffTone(holeDiff, isPlayed));
      pill.textContent = isPlayed
        ? `${formatDiff(holeDiff, true)} (${holePts}p)`
        : '—';
      tdDiff.appendChild(pill);

      tr.appendChild(tdHole);
      tr.appendChild(tdSi);
      tr.appendChild(tdPar);
      tr.appendChild(tdStrokes);
      tr.appendChild(tdDiff);

      tr.addEventListener('click', () => {
        triggerFeedback(tr);
        selectHole(h.hole);
        closeScorecardModal();
      });

      scorecardTableBody.appendChild(tr);

      if (idx === 8) {
        scorecardTableBody.appendChild(createSubtotalRow('OUT (1–9)', front9));
      }
      if (idx === 17) {
        scorecardTableBody.appendChild(createSubtotalRow('IN (10–18)', back9));
        scorecardTableBody.appendChild(createSubtotalRow('TOTAL', total));
      }
    });
  }

  function openScorecardModal() {
    triggerFeedback(viewScorecardBtn);
    copySummaryBtn.textContent = 'Copy Summary';
    renderScorecardModal();
    scorecardModal.hidden = false;
  }

  function closeScorecardModal() {
    scorecardModal.hidden = true;
  }

  function buildGameBookSummaryText() {
    const activeCourse = getCourseById(state.selectedCourseId);
    const { front9, back9, total } = computeRoundBreakdown();
    const tee = getTeeObject(state.gender, state.teeId);
    const dateStr = new Date().toISOString().slice(0, 10);

    const lines = [
      `⛳ StrokeTracker — Golf GameBook Entry Summary`,
      `Course: ${activeCourse.name} (Par ${total.totalPar})`,
      `Handicap: Spelhcp ${state.spelhcp} (${
        state.hcpMode === 'whs'
          ? `${state.gender === 'dam' ? 'Dam' : 'Herr'} ${tee.label}, Exact HCP ${state.exactHcp.toFixed(1)}`
          : 'Manual'
      })`,
      `Date: ${dateStr}`,
      `Gross: ${total.strokes} (${total.diffFormatted}) | Net: ${total.netDiffFormatted} | Stableford: ${total.points}p`,
      `Out (1-9): ${front9.strokes} (${front9.diffFormatted}, ${front9.points}p) | In (10-18): ${back9.strokes} (${back9.diffFormatted}, ${back9.points}p)`,
      `----------------------------------------`,
      `FRONT 9 (OUT - Par ${front9.totalPar}):`,
    ];

    const front9Line = state.holes
      .slice(0, 9)
      .map((h) => `H${h.hole}(P${h.par}): ${h.strokes > 0 ? h.strokes : '-'}`)
      .join(' | ');
    lines.push(front9Line);

    lines.push(`BACK 9 (IN - Par ${back9.totalPar}):`);
    const back9Line = state.holes
      .slice(9, 18)
      .map((h) => `H${h.hole}(P${h.par}): ${h.strokes > 0 ? h.strokes : '-'}`)
      .join(' | ');
    lines.push(back9Line);

    lines.push(`----------------------------------------`);
    lines.push(`Hole-by-Hole (Hole | SI | Par (Net) | Strokes | Gross +/- | Pts):`);
    state.holes.forEach((h) => {
      const extra = getExtraStrokesForHole(state.spelhcp, h.si);
      const netPar = h.par + extra;
      const isPlayed = h.strokes > 0;
      const diffStr = isPlayed ? formatDiff(h.strokes - h.par, true) : '-';
      const ptsStr = isPlayed ? `${calculateStablefordPoints(h.strokes, netPar)}p` : '-';
      const strokeStr = isPlayed ? String(h.strokes) : '-';
      lines.push(
        `Hole ${String(h.hole).padStart(2, ' ')} | SI ${String(h.si).padStart(2, ' ')} | Par ${h.par} (Net ${netPar}) | Strokes: ${strokeStr} (${diffStr}, ${ptsStr})`
      );
    });

    return lines.join('\n');
  }

  async function copyRoundSummary() {
    triggerFeedback(copySummaryBtn);
    const summaryText = buildGameBookSummaryText();

    let copied = false;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(summaryText);
        copied = true;
      } catch (_) {
        copied = false;
      }
    }

    if (!copied) {
      const tempArea = document.createElement('textarea');
      tempArea.value = summaryText;
      tempArea.setAttribute('readonly', '');
      tempArea.style.position = 'fixed';
      tempArea.style.opacity = '0';
      document.body.appendChild(tempArea);
      tempArea.select();
      try {
        copied = document.execCommand('copy');
      } catch (_) {
        copied = false;
      }
      document.body.removeChild(tempArea);
    }

    copySummaryBtn.textContent = copied ? '✓ Copied Summary!' : 'Copy Failed';
    setTimeout(() => {
      if (!scorecardModal.hidden) {
        copySummaryBtn.textContent = 'Copy Summary';
      }
    }, 2200);
  }

  // ==========================================================================
  // 8. Custom Course Editor Modal
  // ==========================================================================

  function renderDraftCourseParGrid() {
    const outPar = draftCoursePars.slice(0, 9).reduce((a, b) => a + b, 0);
    const inPar = draftCoursePars.slice(9, 18).reduce((a, b) => a + b, 0);
    const totalPar = outPar + inPar;
    courseEditorParSummary.textContent = `Out: ${outPar} • In: ${inPar} • Total Par: ${totalPar}`;

    courseParGrid.innerHTML = '';
    draftCoursePars.forEach((parVal, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'course-par-cell';
      btn.dataset.par = String(parVal);
      btn.setAttribute('aria-label', `Hole ${idx + 1} Par ${parVal}, tap to cycle`);

      const holeLbl = document.createElement('span');
      holeLbl.className = 'course-par-hole-lbl';
      holeLbl.textContent = `H${idx + 1}`;

      const parSpan = document.createElement('span');
      parSpan.className = 'course-par-val';
      parSpan.textContent = `P${parVal}`;

      btn.appendChild(holeLbl);
      btn.appendChild(parSpan);

      btn.addEventListener('click', () => {
        triggerFeedback(btn);
        const nextPar = parVal === 3 ? 4 : parVal === 4 ? 5 : 3;
        draftCoursePars[idx] = nextPar;
        renderDraftCourseParGrid();
      });

      courseParGrid.appendChild(btn);
    });
  }

  function openCourseModal() {
    const activeCourse = getCourseById(state.selectedCourseId);

    if (activeCourse.isCustom) {
      editingCourseId = activeCourse.id;
      courseModalTitle.textContent = 'Edit Custom Course';
      customCourseNameInput.value = activeCourse.name;
      draftCoursePars = activeCourse.pars.slice();
      deleteCustomCourseBtn.hidden = false;
    } else {
      editingCourseId = null;
      courseModalTitle.textContent = 'Add Custom Course';
      customCourseNameInput.value = '';
      draftCoursePars = state.holes.map((h) => h.par);
      deleteCustomCourseBtn.hidden = true;
    }

    renderDraftCourseParGrid();
    courseModal.hidden = false;
    setTimeout(() => customCourseNameInput.focus(), 50);
  }

  function closeCourseModal() {
    courseModal.hidden = true;
  }

  function saveCustomCourseFromModal() {
    triggerFeedback(saveCourseModalBtn);
    const rawName = customCourseNameInput.value.trim();
    const courseName = rawName || `Custom Course ${customCourses.length + 1}`;
    const cleanPars = sanitizeParsArray(draftCoursePars);
    const standardSi = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

    let targetCourseId = editingCourseId;

    if (editingCourseId) {
      const idx = customCourses.findIndex((c) => c.id === editingCourseId);
      if (idx !== -1) {
        customCourses[idx].name = courseName;
        customCourses[idx].pars = cleanPars;
      }
    } else {
      targetCourseId = `custom-${Date.now()}`;
      customCourses.push({
        id: targetCourseId,
        name: courseName,
        isPreset: true,
        isCustom: true,
        pars: cleanPars,
        si: standardSi,
      });
    }

    saveCustomCourses();
    applyCourseSelection(targetCourseId, false);
    closeCourseModal();
  }

  function deleteActiveCustomCourse() {
    if (!editingCourseId) return;
    triggerFeedback(deleteCustomCourseBtn);
    customCourses = customCourses.filter((c) => c.id !== editingCourseId);
    saveCustomCourses();
    applyCourseSelection('ljungbyheds-gk', false);
    closeCourseModal();
  }

  // ==========================================================================
  // 9. Core Gameplay Actions (+1 Stroke, 1s Hold Reset, Undo, Par Edit, Nav)
  // ==========================================================================

  function addStroke() {
    const active = getActiveHoleData();
    active.strokes += 1;
    saveState();
    render();
    triggerFeedback(addStrokeBtn);
  }

  function resetCurrentHoleToZero() {
    const active = getActiveHoleData();
    if (active.strokes <= 0) return;

    active.strokes = 0;
    saveState();
    render();

    // Confirmation vibration pattern + visual flash
    triggerFeedback(addStrokeBtn, [70, 40, 90]);
    addStrokeBtn.classList.add('reset-flash');
    currentHoleTerm.textContent = 'Hole reset to 0';
    setTimeout(() => {
      addStrokeBtn.classList.remove('reset-flash');
      render();
    }, 650);
  }

  function startLongPressTimer() {
    clearLongPressTimer();
    const active = getActiveHoleData();
    if (active.strokes <= 0) return;

    addStrokeBtn.classList.add('holding-reset');
    longPressTimer = setTimeout(() => {
      longPressTimer = null;
      longPressTriggered = true;
      addStrokeBtn.classList.remove('holding-reset');
      resetCurrentHoleToZero();
    }, LONG_PRESS_MS);
  }

  function clearLongPressTimer() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    addStrokeBtn.classList.remove('holding-reset');
  }

  function undoStroke() {
    const active = getActiveHoleData();
    if (active.strokes <= 0) return;
    active.strokes = Math.max(0, active.strokes - 1);
    saveState();
    render();
    triggerFeedback(undoStrokeBtn);
  }

  function setHolePar(newPar) {
    if (![3, 4, 5].includes(newPar)) return;
    const active = getActiveHoleData();
    active.par = newPar;

    const activeCourse = getCourseById(state.selectedCourseId);
    if (activeCourse.isCustom) {
      activeCourse.pars[state.currentHole - 1] = newPar;
      saveCustomCourses();
    }

    saveState();
    render();
  }

  function selectHole(holeNumber) {
    let target = holeNumber;
    if (target < 1) target = TOTAL_HOLES;
    if (target > TOTAL_HOLES) target = 1;
    state.currentHole = target;
    saveState();
    render();
  }

  function toggleQuickJumpDrawer(forceState) {
    const isCurrentlyOpen = !holeJumpDrawer.hidden;
    const nextState = typeof forceState === 'boolean' ? forceState : !isCurrentlyOpen;
    holeJumpDrawer.hidden = !nextState;
    holeJumpToggleBtn.setAttribute('aria-expanded', String(nextState));
  }

  function openResetModal() {
    triggerFeedback(resetRoundBtn);
    populateCourseDropdown(newRoundCourseSelect, state.selectedCourseId);
    confirmModal.hidden = false;
    confirmResetBtn.focus();
  }

  function closeResetModal() {
    confirmModal.hidden = true;
  }

  function confirmResetRound() {
    triggerFeedback(confirmResetBtn);
    const chosenCourseId = newRoundCourseSelect.value || state.selectedCourseId;
    applyCourseSelection(chosenCourseId, true);
    closeResetModal();
    toggleQuickJumpDrawer(false);
  }

  // ==========================================================================
  // 10. Screen Wake Lock API Implementation (with Safe Fallbacks)
  // ==========================================================================

  function updateWakeLockBadge(status) {
    wakeLockBtn.setAttribute('data-state', status);
    if (status === 'active') {
      wakeLockText.textContent = 'Screen Always On: Active';
    } else if (status === 'inactive') {
      wakeLockText.textContent = 'Screen Always On: Inactive';
    } else {
      wakeLockText.textContent = 'Screen Always On: Unsupported';
    }
  }

  async function requestWakeLock() {
    if (!isWakeLockSupported) {
      updateWakeLockBadge('unsupported');
      return;
    }

    if (wakeLockSentinel && !wakeLockSentinel.released) {
      updateWakeLockBadge('active');
      return;
    }

    try {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      updateWakeLockBadge('active');

      wakeLockSentinel.addEventListener('release', () => {
        if (!wakeLockSentinel || wakeLockSentinel.released) {
          updateWakeLockBadge('inactive');
        }
      });
    } catch (_) {
      updateWakeLockBadge('inactive');
    }
  }

  async function releaseWakeLock() {
    if (wakeLockSentinel) {
      try {
        await wakeLockSentinel.release();
      } catch (_) {
        // Ignore release errors
      }
      wakeLockSentinel = null;
    }
    updateWakeLockBadge('inactive');
  }

  async function toggleWakeLock() {
    if (!isWakeLockSupported) {
      updateWakeLockBadge('unsupported');
      return;
    }

    triggerFeedback(wakeLockBtn);
    const isCurrentlyActive = wakeLockSentinel && !wakeLockSentinel.released;

    if (isCurrentlyActive) {
      wakeLockDesired = false;
      await releaseWakeLock();
    } else {
      wakeLockDesired = true;
      await requestWakeLock();
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wakeLockDesired && isWakeLockSupported) {
      requestWakeLock();
    }
  });

  document.addEventListener(
    'pointerdown',
    () => {
      if (
        isWakeLockSupported &&
        wakeLockDesired &&
        (!wakeLockSentinel || wakeLockSentinel.released)
      ) {
        requestWakeLock();
      }
    },
    { passive: true }
  );

  // ==========================================================================
  // 11. Event Listeners & Desktop Keyboard Shortcuts
  // ==========================================================================

  // Primary +1 Stroke button with 1-second long-press hole reset
  addStrokeBtn.addEventListener('pointerdown', (e) => {
    if (e.button && e.button !== 0) return;
    longPressTriggered = false;
    startLongPressTimer();
  });

  addStrokeBtn.addEventListener('pointerup', clearLongPressTimer);
  addStrokeBtn.addEventListener('pointerleave', clearLongPressTimer);
  addStrokeBtn.addEventListener('pointercancel', clearLongPressTimer);
  addStrokeBtn.addEventListener('contextmenu', (e) => e.preventDefault());

  addStrokeBtn.addEventListener('click', (e) => {
    if (longPressTriggered) {
      longPressTriggered = false;
      e.preventDefault();
      return;
    }
    addStroke();
  });

  undoStrokeBtn.addEventListener('click', undoStroke);
  scoreModeToggleBtn.addEventListener('click', cycleScoreViewMode);
  hideScoreBtn.addEventListener('click', toggleHideScoreMode);

  courseSelect.addEventListener('change', (e) => {
    applyCourseSelection(e.target.value, false);
  });

  // Round & Handicap Setup Modal Listeners
  openSetupBtn.addEventListener('click', openSetupModal);
  closeSetupIconBtn.addEventListener('click', closeSetupModal);
  cancelSetupBtn.addEventListener('click', closeSetupModal);
  saveSetupBtn.addEventListener('click', saveSetupFromModal);

  setupModal.addEventListener('click', (e) => {
    if (e.target === setupModal) closeSetupModal();
  });

  setupCourseSelect.addEventListener('change', (e) => {
    if (!draftSetup) return;
    draftSetup.courseId = e.target.value;
    updateSetupModalPreview();
  });

  openCustomCourseFromSetupBtn.addEventListener('click', () => {
    closeSetupModal();
    openCourseModal();
  });

  tabModeWhs.addEventListener('click', () => {
    if (!draftSetup) return;
    triggerFeedback(tabModeWhs);
    draftSetup.hcpMode = 'whs';
    updateSetupModalPreview();
  });

  tabModeManual.addEventListener('click', () => {
    if (!draftSetup) return;
    triggerFeedback(tabModeManual);
    draftSetup.hcpMode = 'manual';
    updateSetupModalPreview();
  });

  exactHcpInput.addEventListener('input', (e) => {
    if (!draftSetup) return;
    const rawVal = String(e.target.value).replace(',', '.');
    const parsed = parseFloat(rawVal);
    if (!Number.isNaN(parsed)) {
      draftSetup.exactHcp = Math.max(-10, Math.min(54, parsed));
      updateSetupModalPreview();
    }
  });

  genderButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!draftSetup) return;
      triggerFeedback(btn);
      const nextGender = btn.dataset.gender === 'dam' ? 'dam' : 'herr';
      draftSetup.gender = nextGender;
      const validTee = getTeeObject(nextGender, draftSetup.teeId);
      draftSetup.teeId = validTee.id;
      populateSetupTeeDropdown(nextGender, draftSetup.teeId);
      updateSetupModalPreview();
    });
  });

  teeSelect.addEventListener('change', (e) => {
    if (!draftSetup) return;
    draftSetup.teeId = e.target.value;
    updateSetupModalPreview();
  });

  manualSpelhcpInput.addEventListener('input', (e) => {
    if (!draftSetup) return;
    const parsed = parseInt(e.target.value, 10);
    if (!Number.isNaN(parsed)) {
      draftSetup.manualSpelhcp = Math.max(0, Math.min(72, parsed));
      updateSetupModalPreview();
    }
  });

  // Custom Course Modal Listeners
  closeCourseModalIconBtn.addEventListener('click', closeCourseModal);
  cancelCourseModalBtn.addEventListener('click', closeCourseModal);
  saveCourseModalBtn.addEventListener('click', saveCustomCourseFromModal);
  deleteCustomCourseBtn.addEventListener('click', deleteActiveCustomCourse);

  courseModal.addEventListener('click', (e) => {
    if (e.target === courseModal) closeCourseModal();
  });

  // Scorecard Modal Listeners
  viewScorecardBtn.addEventListener('click', openScorecardModal);
  closeScorecardBtn.addEventListener('click', closeScorecardModal);
  closeScorecardIconBtn.addEventListener('click', closeScorecardModal);
  copySummaryBtn.addEventListener('click', copyRoundSummary);

  scorecardModal.addEventListener('click', (e) => {
    if (e.target === scorecardModal) closeScorecardModal();
  });

  // Hole Navigation & Par Listeners
  prevHoleBtn.addEventListener('click', () => {
    triggerFeedback(prevHoleBtn);
    selectHole(state.currentHole - 1);
  });

  nextHoleBtn.addEventListener('click', () => {
    triggerFeedback(nextHoleBtn);
    selectHole(state.currentHole + 1);
  });

  holeJumpToggleBtn.addEventListener('click', () => {
    triggerFeedback(holeJumpToggleBtn);
    toggleQuickJumpDrawer();
  });

  parPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      triggerFeedback(pill);
      setHolePar(Number(pill.dataset.par));
    });
  });

  wakeLockBtn.addEventListener('click', toggleWakeLock);

  resetRoundBtn.addEventListener('click', openResetModal);
  cancelResetBtn.addEventListener('click', closeResetModal);
  confirmResetBtn.addEventListener('click', confirmResetRound);

  confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) closeResetModal();
  });

  // Desktop Keyboard Controls:
  // Space or + : Add stroke
  // - or Backspace : Undo stroke
  // ArrowRight / ArrowLeft : Next / Previous hole
  // M : Cycle Score View Mode (Net / Gross / Stableford)
  // S : Open Scorecard Modal
  // H : Toggle Focus / Hide Score Mode
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const tag = document.activeElement ? document.activeElement.tagName : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSetupModal();
        closeCourseModal();
        closeResetModal();
      }
      return;
    }

    if (
      !confirmModal.hidden ||
      !scorecardModal.hidden ||
      !courseModal.hidden ||
      !setupModal.hidden
    ) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeResetModal();
        closeScorecardModal();
        closeCourseModal();
        closeSetupModal();
      }
      return;
    }

    if (e.key === ' ' || e.key === '+' || e.key === '=') {
      e.preventDefault();
      addStroke();
    } else if (e.key === '-' || e.key === '_' || e.key === 'Backspace') {
      e.preventDefault();
      undoStroke();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      triggerFeedback(nextHoleBtn);
      selectHole(state.currentHole + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      triggerFeedback(prevHoleBtn);
      selectHole(state.currentHole - 1);
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      cycleScoreViewMode();
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      openScorecardModal();
    } else if (e.key === 'h' || e.key === 'H') {
      e.preventDefault();
      toggleHideScoreMode();
    } else if (e.key === 'Escape' && !holeJumpDrawer.hidden) {
      e.preventDefault();
      toggleQuickJumpDrawer(false);
    }
  });

  // ==========================================================================
  // 12. Offline Service Worker Registration & Boot
  // ==========================================================================

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('StrokeTracker: Service worker registration skipped/failed:', err);
      });
    });
  }

  if (IS_DEV) {
    document.title = '[DEV] ' + document.title;
  }

  render();

  if (isWakeLockSupported) {
    requestWakeLock();
  } else {
    updateWakeLockBadge('unsupported');
  }
})();
