/**
 * StrokeTracker — Cross-Platform Golf Stroke & Par Tracker
 * Pure Vanilla ES6+ | Zero Dependencies | LocalStorage + Wake Lock API
 */

(() => {
  'use strict';

  const STORAGE_KEY = 'stroketracker_state_v1';
  const TOTAL_HOLES = 18;
  const DEFAULT_PAR = 4;

  // --- DOM Elements ---
  const totalScoreDisplay = document.getElementById('totalScoreDisplay');
  const wakeLockBtn = document.getElementById('wakeLockBtn');
  const wakeLockText = document.getElementById('wakeLockText');

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
  const resetRoundBtn = document.getElementById('resetRoundBtn');

  const confirmModal = document.getElementById('confirmModal');
  const resetParsCheckbox = document.getElementById('resetParsCheckbox');
  const cancelResetBtn = document.getElementById('cancelResetBtn');
  const confirmResetBtn = document.getElementById('confirmResetBtn');

  // --- Application State ---
  let state = loadState();

  // --- Screen Wake Lock State ---
  let wakeLockSentinel = null;
  let wakeLockDesired = true; // Default to trying to keep screen awake on course
  const isWakeLockSupported =
    'wakeLock' in navigator &&
    navigator.wakeLock &&
    typeof navigator.wakeLock.request === 'function';

  // ==========================================================================
  // 1. State Management & Persistence (localStorage)
  // ==========================================================================

  function createDefaultState() {
    const holes = [];
    for (let i = 1; i <= TOTAL_HOLES; i++) {
      holes.push({
        hole: i,
        par: DEFAULT_PAR,
        strokes: 0,
      });
    }
    return {
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

      const sanitizedHoles = parsed.holes.map((h, idx) => ({
        hole: idx + 1,
        par: [3, 4, 5].includes(Number(h.par)) ? Number(h.par) : DEFAULT_PAR,
        strokes: Math.max(0, Math.floor(Number(h.strokes) || 0)),
      }));

      const currentHole = Math.min(
        TOTAL_HOLES,
        Math.max(1, Math.floor(parsed.currentHole))
      );

      return {
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

  // ==========================================================================
  // 2. Tactile Haptic & Micro-Scaling Visual Feedback
  // ==========================================================================

  function triggerFeedback(targetElement) {
    // Guarded vibration for supported mobile browsers
    try {
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (_) {
      // Ignore on restricted environments
    }

    // Instant CSS micro-scaling animation fallback for iOS & Desktop
    if (targetElement) {
      targetElement.classList.remove('tap-pulse');
      // Force reflow so rapid consecutive taps re-trigger the animation
      void targetElement.offsetWidth;
      targetElement.classList.add('tap-pulse');
      setTimeout(() => {
        targetElement.classList.remove('tap-pulse');
      }, 130);
    }
  }

  // ==========================================================================
  // 3. Golf Scoring Calculations & UI Rendering
  // ==========================================================================

  function getGolfTerm(strokes, par) {
    if (strokes === 0) {
      return { label: `Par ${par} • Tap +1 to start`, tone: 'neutral' };
    }
    if (strokes === 1) {
      return { label: 'Hole in One! (-' + (par - 1) + ')', tone: 'under' };
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

  function computeCumulativeScore() {
    let totalStrokes = 0;
    let totalParToDate = 0;
    let holesPlayed = 0;

    for (const h of state.holes) {
      if (h.strokes > 0) {
        totalStrokes += h.strokes;
        totalParToDate += h.par;
        holesPlayed += 1;
      }
    }

    const diff = totalStrokes - totalParToDate;
    let diffFormatted = 'E';
    if (holesPlayed > 0) {
      if (diff > 0) diffFormatted = `+${diff}`;
      else if (diff < 0) diffFormatted = `${diff}`;
    }

    return { totalStrokes, diffFormatted };
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
      scoreSpan.textContent = holeObj.strokes > 0 ? `${holeObj.strokes}` : `P${holeObj.par}`;

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

    // 1. Update Cumulative Score Header (e.g., "Score: 42 (+2)")
    const { totalStrokes, diffFormatted } = computeCumulativeScore();
    totalScoreDisplay.textContent = `Score: ${totalStrokes} (${diffFormatted})`;

    // 2. Update Hole Number & Par Selector Pills
    currentHoleNumber.textContent = String(active.hole);
    parPills.forEach((pill) => {
      const pillPar = Number(pill.dataset.par);
      const isActive = pillPar === active.par;
      pill.classList.toggle('active', isActive);
      pill.setAttribute('aria-pressed', String(isActive));
    });

    // 3. Update Current Hole Strokes & Relative Term
    currentHoleStrokes.textContent = String(active.strokes);
    const termInfo = getGolfTerm(active.strokes, active.par);
    currentHoleTerm.textContent = termInfo.label;
    currentHoleTerm.setAttribute('data-tone', termInfo.tone);

    // 4. Update Undo Button Disabled State
    undoStrokeBtn.disabled = active.strokes <= 0;

    // 5. Refresh Quick-Jump 1–18 Grid
    renderQuickJumpGrid();
  }

  // ==========================================================================
  // 4. Core User Actions (Add Stroke, Undo, Par Edit, Navigation, Reset)
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
    resetParsCheckbox.checked = false;
    confirmModal.hidden = false;
    confirmResetBtn.focus();
  }

  function closeResetModal() {
    confirmModal.hidden = true;
  }

  function confirmResetRound() {
    const resetParsToo = resetParsCheckbox.checked;
    triggerFeedback(confirmResetBtn);

    state.currentHole = 1;
    state.holes.forEach((h) => {
      h.strokes = 0;
      if (resetParsToo) {
        h.par = DEFAULT_PAR;
      }
    });

    saveState();
    render();
    closeResetModal();
    toggleQuickJumpDrawer(false);
  }

  // ==========================================================================
  // 5. Screen Wake Lock API Implementation (with Safe Fallbacks)
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
      // Browser may require a user gesture or battery saver is active
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

  // Automatic re-acquire listener on visibilitychange
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wakeLockDesired && isWakeLockSupported) {
      requestWakeLock();
    }
  });

  // Also attempt wake lock acquisition on first user interaction if desired but blocked on initial load
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
  // 6. Event Listeners & Desktop Keyboard Shortcuts
  // ==========================================================================

  addStrokeBtn.addEventListener('click', addStroke);
  undoStrokeBtn.addEventListener('click', undoStroke);

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
    if (e.target === confirmModal) {
      closeResetModal();
    }
  });

  // Desktop Keyboard Controls:
  // Space or + : Add stroke
  // - or Backspace : Undo stroke
  // ArrowRight / ArrowLeft : Next / Previous hole
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    // If modal is open, only handle Escape
    if (!confirmModal.hidden) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeResetModal();
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
    } else if (e.key === 'Escape' && !holeJumpDrawer.hidden) {
      e.preventDefault();
      toggleQuickJumpDrawer(false);
    }
  });

  // ==========================================================================
  // 7. Boot Application
  // ==========================================================================

  render();

  if (isWakeLockSupported) {
    requestWakeLock();
  } else {
    updateWakeLockBadge('unsupported');
  }
})();
