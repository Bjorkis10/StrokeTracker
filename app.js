/**
 * StrokeTracker — Cross-Platform Golf Stroke & Par Tracker (v1.1)
 * Pure Vanilla ES6+ | Zero Dependencies | Courses + Scorecard + Offline SW
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

  // Built-in Course Presets (Generic Par 72 + 3 Local Course Presets)
  const PRESET_COURSES = [
    {
      id: 'generic-72',
      name: 'Generic Par 72',
      isCustom: false,
      pars: [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4],
    },
    {
      id: 'course-a',
      name: 'Course A — Championship Links (Par 72)',
      isCustom: false,
      pars: [4, 5, 3, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 5, 3, 4, 4],
    },
    {
      id: 'course-b',
      name: 'Course B — Parkland Pines (Par 71)',
      isCustom: false,
      pars: [4, 4, 3, 5, 4, 3, 4, 4, 4, 4, 5, 3, 4, 4, 3, 5, 4, 4],
    },
    {
      id: 'course-c',
      name: 'Course C — Executive Valley (Par 69)',
      isCustom: false,
      pars: [4, 3, 4, 5, 3, 4, 4, 3, 4, 4, 4, 3, 5, 3, 4, 4, 3, 5],
    },
  ];

  // --- DOM Elements ---
  const totalScoreDisplay = document.getElementById('totalScoreDisplay');
  const wakeLockBtn = document.getElementById('wakeLockBtn');
  const wakeLockText = document.getElementById('wakeLockText');

  const courseSelect = document.getElementById('courseSelect');
  const manageCourseBtn = document.getElementById('manageCourseBtn');

  const prevHoleBtn = document.getElementById('prevHoleBtn');
  const nextHoleBtn = document.getElementById('nextHoleBtn');
  const holeJumpToggleBtn = document.getElementById('holeJumpToggleBtn');
  const holeJumpDrawer = document.getElementById('holeJumpDrawer');
  const holeGrid = document.getElementById('holeGrid');
  const currentHoleNumber = document.getElementById('currentHoleNumber');
  const parPills = document.querySelectorAll('.par-pill');

  const addStrokeBtn = document.getElementById('addStrokeBtn');
  const currentHoleStrokes = document.getElementById('currentHoleStrokes');
  const currentHoleTerm = document.getElementById('currentHoleTerm');

  const undoStrokeBtn = document.getElementById('undoStrokeBtn');
  const viewScorecardBtn = document.getElementById('viewScorecardBtn');
  const resetRoundBtn = document.getElementById('resetRoundBtn');

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
  let editingCourseId = null;
  let draftCoursePars = [];

  // --- Screen Wake Lock State ---
  let wakeLockSentinel = null;
  let wakeLockDesired = true;
  const isWakeLockSupported =
    'wakeLock' in navigator &&
    navigator.wakeLock &&
    typeof navigator.wakeLock.request === 'function';

  // ==========================================================================
  // 1. Course Presets & Custom Course Persistence (localStorage)
  // ==========================================================================

  function sanitizeParsArray(pars) {
    if (!Array.isArray(pars) || pars.length !== TOTAL_HOLES) {
      return PRESET_COURSES[0].pars.slice();
    }
    return pars.map((p) => ([3, 4, 5].includes(Number(p)) ? Number(p) : DEFAULT_PAR));
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
          isCustom: true,
          pars: sanitizeParsArray(c.pars),
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

  // ==========================================================================
  // 2. Round State Management & Persistence (localStorage)
  // ==========================================================================

  function createDefaultState(courseId = 'generic-72') {
    const course = getCourseById(courseId);
    const holes = course.pars.map((parVal, idx) => ({
      hole: idx + 1,
      par: parVal,
      strokes: 0,
    }));
    return {
      selectedCourseId: course.id,
      currentHole: 1,
      holes,
      updatedAt: Date.now(),
    };
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

      const selectedCourse = getCourseById(parsed.selectedCourseId || 'generic-72');

      const sanitizedHoles = parsed.holes.map((h, idx) => ({
        hole: idx + 1,
        par: [3, 4, 5].includes(Number(h.par))
          ? Number(h.par)
          : selectedCourse.pars[idx],
        strokes: Math.max(0, Math.floor(Number(h.strokes) || 0)),
      }));

      const currentHole = Math.min(
        TOTAL_HOLES,
        Math.max(1, Math.floor(parsed.currentHole))
      );

      return {
        selectedCourseId: selectedCourse.id,
        currentHole,
        holes: sanitizedHoles,
        updatedAt: parsed.updatedAt || Date.now(),
      };
    } catch (err) {
      console.warn('StrokeTracker: Could not read localStorage, using defaults.', err);
      return createDefaultState();
    }
  }

  function saveState() {
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

  function triggerFeedback(targetElement) {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(50);
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
  // 4. Golf Scoring Calculations & UI Rendering
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

  function getGolfTerm(strokes, par) {
    if (strokes === 0) {
      return { label: `Par ${par} • Tap +1 to start`, tone: 'neutral' };
    }
    if (strokes === 1) {
      return { label: `Hole in One! (-${par - 1})`, tone: 'under' };
    }

    const diff = strokes - par;
    if (diff <= -3) return { label: `Albatross (${diff})`, tone: 'under' };
    if (diff === -2) return { label: 'Eagle (-2)', tone: 'under' };
    if (diff === -1) return { label: 'Birdie (-1)', tone: 'under' };
    if (diff === 0) return { label: 'Even Par (E)', tone: 'par' };
    if (diff === 1) return { label: 'Bogey (+1)', tone: 'over' };
    if (diff === 2) return { label: 'Double Bogey (+2)', tone: 'over' };
    if (diff === 3) return { label: 'Triple Bogey (+3)', tone: 'over' };
    return { label: `+${diff} Over Par`, tone: 'over' };
  }

  function computeRangeStats(holeSlice) {
    let strokes = 0;
    let playedPar = 0;
    let totalPar = 0;
    let playedCount = 0;

    for (const h of holeSlice) {
      totalPar += h.par;
      if (h.strokes > 0) {
        strokes += h.strokes;
        playedPar += h.par;
        playedCount += 1;
      }
    }

    const diff = strokes - playedPar;
    const diffFormatted = formatDiff(diff, playedCount > 0);

    return {
      strokes,
      playedPar,
      totalPar,
      playedCount,
      diff,
      diffFormatted,
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
        `Jump to Hole ${holeObj.hole}, Par ${holeObj.par}, Strokes ${holeObj.strokes}`
      );

      const numSpan = document.createElement('span');
      numSpan.className = 'hole-cell-num';
      numSpan.textContent = holeObj.hole;

      const scoreSpan = document.createElement('span');
      scoreSpan.className = 'hole-cell-score';
      scoreSpan.textContent =
        holeObj.strokes > 0 ? `${holeObj.strokes}` : `P${holeObj.par}`;

      btn.appendChild(numSpan);
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

    // 1. Update Course Dropdown & Custom Course Button Label
    populateCourseDropdown(courseSelect, activeCourse.id);
    manageCourseBtn.textContent = activeCourse.isCustom ? 'Edit Course' : '+ Custom';

    // 2. Update Cumulative Score Header (e.g., "Score: 42 (+2)")
    const { total } = computeRoundBreakdown();
    totalScoreDisplay.textContent = `Score: ${total.strokes} (${total.diffFormatted})`;

    // 3. Update Hole Number & Par Selector Pills
    currentHoleNumber.textContent = String(active.hole);
    parPills.forEach((pill) => {
      const pillPar = Number(pill.dataset.par);
      const isActive = pillPar === active.par;
      pill.classList.toggle('active', isActive);
      pill.setAttribute('aria-pressed', String(isActive));
    });

    // 4. Update Current Hole Strokes & Relative Term
    currentHoleStrokes.textContent = String(active.strokes);
    const termInfo = getGolfTerm(active.strokes, active.par);
    currentHoleTerm.textContent = termInfo.label;
    currentHoleTerm.setAttribute('data-tone', termInfo.tone);

    // 5. Update Undo Button Disabled State
    undoStrokeBtn.disabled = active.strokes <= 0;

    // 6. Refresh Quick-Jump 1–18 Grid
    renderQuickJumpGrid();

    // 7. If Scorecard Modal is open, keep it synced
    if (!scorecardModal.hidden) {
      renderScorecardModal();
    }
  }

  // ==========================================================================
  // 5. Scorecard Modal & Golf GameBook Summary Export
  // ==========================================================================

  function createSubtotalRow(label, stats) {
    const tr = document.createElement('tr');
    tr.className = 'scorecard-subtotal-row';

    const tdLabel = document.createElement('td');
    tdLabel.textContent = label;

    const tdPar = document.createElement('td');
    tdPar.textContent = String(stats.totalPar);

    const tdStrokes = document.createElement('td');
    tdStrokes.textContent = stats.playedCount > 0 ? String(stats.strokes) : '—';

    const tdDiff = document.createElement('td');
    const pill = document.createElement('span');
    pill.className = 'score-diff-pill';
    pill.setAttribute('data-tone', getDiffTone(stats.diff, stats.playedCount > 0));
    pill.textContent = stats.playedCount > 0 ? stats.diffFormatted : '—';
    tdDiff.appendChild(pill);

    tr.appendChild(tdLabel);
    tr.appendChild(tdPar);
    tr.appendChild(tdStrokes);
    tr.appendChild(tdDiff);
    return tr;
  }

  function renderScorecardModal() {
    const activeCourse = getCourseById(state.selectedCourseId);
    const { front9, back9, total } = computeRoundBreakdown();

    scorecardCourseSubtitle.textContent = `${activeCourse.name} • Par ${total.totalPar}`;

    summaryFront9.textContent = `${front9.strokes} (${front9.diffFormatted})`;
    summaryFront9Par.textContent = `Par ${front9.totalPar}`;

    summaryBack9.textContent = `${back9.strokes} (${back9.diffFormatted})`;
    summaryBack9Par.textContent = `Par ${back9.totalPar}`;

    summaryTotal.textContent = `${total.strokes} (${total.diffFormatted})`;
    summaryTotalPar.textContent = `Par ${total.totalPar}`;

    scorecardTableBody.innerHTML = '';

    state.holes.forEach((h, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'scorecard-row';
      if (h.hole === state.currentHole) {
        tr.classList.add('is-active-hole');
      }

      const isPlayed = h.strokes > 0;
      const holeDiff = h.strokes - h.par;

      const tdHole = document.createElement('td');
      tdHole.textContent = `${h.hole}`;

      const tdPar = document.createElement('td');
      tdPar.textContent = `${h.par}`;

      const tdStrokes = document.createElement('td');
      tdStrokes.textContent = isPlayed ? `${h.strokes}` : '—';

      const tdDiff = document.createElement('td');
      const pill = document.createElement('span');
      pill.className = 'score-diff-pill';
      pill.setAttribute('data-tone', getDiffTone(holeDiff, isPlayed));
      pill.textContent = isPlayed ? formatDiff(holeDiff, true) : '—';
      tdDiff.appendChild(pill);

      tr.appendChild(tdHole);
      tr.appendChild(tdPar);
      tr.appendChild(tdStrokes);
      tr.appendChild(tdDiff);

      tr.addEventListener('click', () => {
        triggerFeedback(tr);
        selectHole(h.hole);
        closeScorecardModal();
      });

      scorecardTableBody.appendChild(tr);

      // Insert Front 9 (OUT) subtotal after Hole 9
      if (idx === 8) {
        scorecardTableBody.appendChild(createSubtotalRow('OUT (1–9)', front9));
      }
      // Insert Back 9 (IN) and TOTAL subtotals after Hole 18
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
    const dateStr = new Date().toISOString().slice(0, 10);

    const lines = [
      `⛳ StrokeTracker — Golf GameBook Entry Summary`,
      `Course: ${activeCourse.name} (Par ${total.totalPar})`,
      `Date: ${dateStr}`,
      `Total Score: ${total.strokes} (${total.diffFormatted}) | Out: ${front9.strokes} (${front9.diffFormatted}) | In: ${back9.strokes} (${back9.diffFormatted})`,
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
    lines.push(`Hole-by-Hole (Hole | Par | Strokes | +/-):`);
    state.holes.forEach((h) => {
      const isPlayed = h.strokes > 0;
      const diffStr = isPlayed ? formatDiff(h.strokes - h.par, true) : '-';
      const strokeStr = isPlayed ? String(h.strokes) : '-';
      lines.push(
        `Hole ${String(h.hole).padStart(2, ' ')} | Par ${h.par} | Strokes: ${strokeStr} (${diffStr})`
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
  // 6. Custom Course Editor Modal
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
        // Cycle 3 -> 4 -> 5 -> 3
        const nextPar = parVal === 3 ? 4 : parVal === 4 ? 5 : 3;
        draftCoursePars[idx] = nextPar;
        renderDraftCourseParGrid();
      });

      courseParGrid.appendChild(btn);
    });
  }

  function openCourseModal() {
    triggerFeedback(manageCourseBtn);
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
      // Seed with current round's hole pars so any inline edits carry over
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
        isCustom: true,
        pars: cleanPars,
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
    applyCourseSelection('generic-72', false);
    closeCourseModal();
  }

  // ==========================================================================
  // 7. Core Gameplay Actions (Add Stroke, Undo, Par Edit, Navigation, Reset)
  // ==========================================================================

  function addStroke() {
    const active = getActiveHoleData();
    active.strokes += 1;
    saveState();
    render();
    triggerFeedback(addStrokeBtn);
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

    // If a custom course is currently selected, persist this hole's par update to that custom course
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
  // 8. Screen Wake Lock API Implementation (with Safe Fallbacks)
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
  // 9. Event Listeners & Desktop Keyboard Shortcuts
  // ==========================================================================

  addStrokeBtn.addEventListener('click', addStroke);
  undoStrokeBtn.addEventListener('click', undoStroke);

  courseSelect.addEventListener('change', (e) => {
    applyCourseSelection(e.target.value, false);
  });

  manageCourseBtn.addEventListener('click', openCourseModal);
  closeCourseModalIconBtn.addEventListener('click', closeCourseModal);
  cancelCourseModalBtn.addEventListener('click', closeCourseModal);
  saveCourseModalBtn.addEventListener('click', saveCustomCourseFromModal);
  deleteCustomCourseBtn.addEventListener('click', deleteActiveCustomCourse);

  courseModal.addEventListener('click', (e) => {
    if (e.target === courseModal) closeCourseModal();
  });

  viewScorecardBtn.addEventListener('click', openScorecardModal);
  closeScorecardBtn.addEventListener('click', closeScorecardModal);
  closeScorecardIconBtn.addEventListener('click', closeScorecardModal);
  copySummaryBtn.addEventListener('click', copyRoundSummary);

  scorecardModal.addEventListener('click', (e) => {
    if (e.target === scorecardModal) closeScorecardModal();
  });

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
  // S : Toggle Scorecard Modal
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    // Do not intercept typing inside form inputs or selects
    const tag = document.activeElement ? document.activeElement.tagName : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      if (e.key === 'Escape' && !courseModal.hidden) {
        e.preventDefault();
        closeCourseModal();
      }
      return;
    }

    // Handle open modals with Escape
    if (!confirmModal.hidden || !scorecardModal.hidden || !courseModal.hidden) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeResetModal();
        closeScorecardModal();
        closeCourseModal();
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
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      openScorecardModal();
    } else if (e.key === 'Escape' && !holeJumpDrawer.hidden) {
      e.preventDefault();
      toggleQuickJumpDrawer(false);
    }
  });

  // ==========================================================================
  // 10. Offline Service Worker Registration & Boot
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
    const topLabelEl = document.querySelector('.top-label');
    if (topLabelEl) {
      topLabelEl.textContent = 'ROUND SCORE • DEV PREVIEW';
      topLabelEl.style.color = '#f59e0b';
    }
  }

  render();

  if (isWakeLockSupported) {
    requestWakeLock();
  } else {
    updateWakeLockBadge('unsupported');
  }
})();
