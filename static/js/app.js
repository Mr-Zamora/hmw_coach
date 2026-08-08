// ─── 3×3 HMW Coach — client-side state machine ───

const STORAGE_KEY = 'hmwCoachState';
const MAX_ATTEMPTS = 3;

const PERSONAS = [
  {
    key: 'gamer',
    label: 'The Gamer',
    emoji: '🎮',
    icon: 'images/Screenshot 2026-08-08 195638.png',
    sub: 'Hardcore sessions, peripherals, performance setup'
  },
  {
    key: 'creator',
    label: 'The Content Creator',
    emoji: '📸',
    icon: 'images/Screenshot 2026-08-08 195644.png',
    sub: 'Recording, lighting, camera gear, editing workflow'
  },
  {
    key: 'sports',
    label: 'The Sports Obsessive',
    emoji: '🏅',
    icon: 'images/Screenshot 2026-08-08 195650.png',
    sub: 'Gear, training, recovery, nutrition routine'
  }
];

const FOLLOWUP_QUESTIONS = [
  {
    q: 'Who is this person?',
    sub: "Describe their lifestyle and what they're mainly doing in this space."
  },
  {
    q: 'What do they spend most of their time doing here?',
    sub: 'Focus on the activity most connected to your persona.'
  },
  {
    q: 'What do they need most from their space?',
    sub: 'Think about comfort, storage, privacy, or performance.'
  }
];

function defaultState() {
  return {
    name: '',
    class: '',
    persona: '',
    personaKey: '',
    personaAnswers: ['', '', ''],
    followupIndex: 0,
    genuineNeed: '',
    needAttempts: 0,
    needLastFeedback: '',
    solutionType: '',
    solutionDescription: '',
    solutionAttempts: 0,
    solutionLastFeedback: '',
    testResults: [],
    hmwOptions: [],
    hmwIndex: 0,
    finalHMW: '',
    designProduct: '',
    designSystem: '',
    designEnvironment: '',
    swapJustification: '',
    spatialJustification: '',
    floorSpaceConversion: [],
    lastSavedHMW: '',
    currentScreen: 'start',
    lastUpdated: null
  };
}

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return Object.assign(defaultState(), JSON.parse(raw));
  } catch (e) { /* ignore corrupt state */ }
  return defaultState();
}

function saveState() {
  state.lastUpdated = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function personaEmoji(key) {
  const p = PERSONAS.find(p => p.key === key);
  return p ? p.emoji : '';
}

function personaChipHTML(key, label) {
  return `${personaEmoji(key)} ${label}`;
}

// ─── Screen navigation ───

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  state.currentScreen = id;
  saveState();
  window.scrollTo(0, 0);
}

// ─── SCREEN 0: START ───

function initStart() {
  const continueWrap = document.getElementById('continue-wrap');
  const hasHMW = state.finalHMW || state.currentScreen === 'screen-hmw' || state.currentScreen === 'screen-lockin';
  continueWrap.style.display = hasHMW ? 'block' : 'none';

  document.getElementById('input-name').value = state.name || '';
  document.getElementById('input-class').value = state.class || '10dt';

  document.getElementById('btn-start').addEventListener('click', () => {
    const name = document.getElementById('input-name').value.trim();
    const cls = document.getElementById('input-class').value.trim();
    if (!name) {
      alert('Please enter your name to continue.');
      return;
    }
    state = defaultState();
    state.name = name;
    state.class = cls;
    saveState();
    renderPersona();
    showScreen('screen-persona');
  });

  document.getElementById('btn-continue').addEventListener('click', (e) => {
    e.preventDefault();
    resumeFromSavedState();
  });
}

function resumeFromSavedState() {
  const screen = state.currentScreen;
  const knownScreens = ['screen-persona', 'screen-followup', 'screen-need', 'screen-solution', 'screen-hmw', 'screen-lockin'];

  if (!knownScreens.includes(screen) && state.finalHMW) {
    renderLockin();
    showScreen('screen-lockin');
    return;
  }

  if (screen === 'screen-persona') renderPersona();
  if (screen === 'screen-followup') renderFollowup();
  if (screen === 'screen-need') renderNeed();
  if (screen === 'screen-solution') renderSolution();
  if (screen === 'screen-hmw') renderHmw();
  if (screen === 'screen-lockin') renderLockin();
  showScreen(knownScreens.includes(screen) ? screen : 'screen-persona');
}

// ─── SCREEN 1: PERSONA ───

function clearDownstreamAnswers() {
  state.personaAnswers = ['', '', ''];
  state.followupIndex = 0;
  state.genuineNeed = '';
  state.needAttempts = 0;
  state.needLastFeedback = '';
  state.solutionType = '';
  state.solutionDescription = '';
  state.solutionAttempts = 0;
  state.solutionLastFeedback = '';
  state.testResults = [];
  state.hmwOptions = [];
  state.hmwIndex = 0;
  state.finalHMW = '';
  state.designProduct = '';
  state.designSystem = '';
  state.designEnvironment = '';
  state.swapJustification = '';
  state.spatialJustification = '';
  state.floorSpaceConversion = [];
  state.lastSavedHMW = '';
}

function renderPersona() {
  const wrap = document.getElementById('persona-choices');
  wrap.innerHTML = '';
  PERSONAS.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'btn-choice' + (state.personaKey === p.key ? ' selected' : '');
    btn.innerHTML = `
      <img class="choice-img" src="${STATIC_BASE}${p.icon}" alt="${p.label}">
      <div>
        <div class="choice-title">${p.label}</div>
        <div class="choice-sub">${p.sub}</div>
      </div>`;
    btn.addEventListener('click', () => {
      if (state.personaKey && state.personaKey !== p.key) {
        clearDownstreamAnswers();
      }
      state.personaKey = p.key;
      state.persona = p.label;
      wrap.querySelectorAll('.btn-choice').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('btn-persona-next').classList.remove('btn-disabled');
      saveState();
    });
    wrap.appendChild(btn);
  });

  const nextBtn = document.getElementById('btn-persona-next');
  if (!state.personaKey) nextBtn.classList.add('btn-disabled');
  else nextBtn.classList.remove('btn-disabled');

  nextBtn.onclick = () => {
    if (!state.personaKey) return;
    state.followupIndex = 0;
    saveState();
    renderFollowup();
    showScreen('screen-followup');
  };

  document.getElementById('btn-persona-back').onclick = () => {
    document.getElementById('input-name').value = state.name || '';
    document.getElementById('input-class').value = state.class || '10dt';
    showScreen('screen-start');
  };
}

// ─── SCREEN 1b: FOLLOW-UP ───

function renderFollowup() {
  const idx = state.followupIndex || 0;
  const question = FOLLOWUP_QUESTIONS[idx];

  document.getElementById('followup-persona-chip').textContent = personaChipHTML(state.personaKey, state.persona);
  document.getElementById('followup-q-count').textContent = `Question ${idx + 1} of 3`;
  document.getElementById('followup-question').textContent = question.q;
  document.getElementById('followup-subtitle').textContent = question.sub;
  document.getElementById('followup-answer').value = state.personaAnswers[idx] || '';

  const btn = document.getElementById('btn-followup-next');
  btn.textContent = idx < 2 ? 'Next →' : 'Continue →';
  btn.onclick = () => {
    const answer = document.getElementById('followup-answer').value.trim();
    if (!answer) {
      alert('Please answer the question before continuing.');
      return;
    }
    state.personaAnswers[idx] = answer;
    if (idx < 2) {
      state.followupIndex = idx + 1;
      saveState();
      renderFollowup();
    } else {
      saveState();
      renderNeed();
      showScreen('screen-need');
    }
  };

  document.getElementById('btn-followup-back').onclick = () => {
    const currentAnswer = document.getElementById('followup-answer').value.trim();
    if (currentAnswer) state.personaAnswers[idx] = currentAnswer;
    if (idx > 0) {
      state.followupIndex = idx - 1;
      saveState();
      renderFollowup();
    } else {
      saveState();
      renderPersona();
      showScreen('screen-persona');
    }
  };
}

// ─── SCREEN 2: GENUINE NEED ───

function renderNeed() {
  document.getElementById('need-persona-chip').textContent = personaChipHTML(state.personaKey, state.persona);
  document.getElementById('need-answer').value = state.genuineNeed || '';
  renderNeedFeedback();

  document.getElementById('btn-need-check').style.display = 'block';
  document.getElementById('btn-need-proceed').style.display = 'none';

  document.getElementById('btn-need-check').onclick = () => submitNeed();
  document.getElementById('btn-need-proceed').onclick = () => {
    state.genuineNeed = document.getElementById('need-answer').value.trim();
    saveState();
    renderSolution();
    showScreen('screen-solution');
  };

  document.getElementById('btn-need-back').onclick = () => {
    state.genuineNeed = document.getElementById('need-answer').value.trim();
    state.followupIndex = 2;
    saveState();
    renderFollowup();
    showScreen('screen-followup');
  };
}

function renderNeedFeedback() {
  const area = document.getElementById('need-feedback-area');
  area.innerHTML = '';

  if (state.needAttempts === 0) return;

  const lastResult = [...state.testResults].reverse().find(r => r.screen === 'genuineNeed');
  const passed = lastResult && lastResult.pass;

  if (passed) {
    area.innerHTML = `
      <div class="feedback-box pass" style="margin-top:14px">
        <span class="feedback-icon">✅</span>
        <div class="feedback-body">
          <div class="feedback-label">Pass</div>
          <div class="feedback-text">${escapeHTML(lastResult.feedback)}</div>
        </div>
      </div>`;
    document.getElementById('btn-need-check').style.display = 'none';
    document.getElementById('btn-need-proceed').style.display = 'block';
    document.getElementById('btn-need-proceed').textContent = 'Next →';
    return;
  }

  const pipsHTML = Array.from({ length: MAX_ATTEMPTS }, (_, i) =>
    `<div class="pip${i < state.needAttempts ? ' used' : ''}"></div>`
  ).join('');

  let html = `
    <div class="feedback-box fail" style="margin-top:14px">
      <span class="feedback-icon">⚠️</span>
      <div class="feedback-body">
        <div class="feedback-label">Needs work</div>
        <div class="feedback-text">${escapeHTML(state.needLastFeedback || '')}</div>
      </div>
    </div>
    <div class="attempt-counter">
      <div class="attempt-pips">${pipsHTML}</div>
      <span>${state.needAttempts >= MAX_ATTEMPTS ? MAX_ATTEMPTS + ' of ' + MAX_ATTEMPTS + ' attempts used' : 'Attempt ' + state.needAttempts + ' of ' + MAX_ATTEMPTS}</span>
    </div>`;

  if (state.needAttempts >= MAX_ATTEMPTS) {
    html += `
      <div class="hint-box">
        <div class="hint-label">💡 Worked example — use this as inspiration</div>
        <div class="hint-text">
          Think of one exact moment: what is your persona doing, and which other zone (sleeping / living / cooking / bathing) physically gets in the way — because the room is only 9 m²? Name the zone and what breaks, gets exposed, or gets interrupted.
        </div>
      </div>`;
    document.getElementById('btn-need-check').style.display = 'none';
    document.getElementById('btn-need-proceed').style.display = 'block';
    document.getElementById('btn-need-proceed').textContent = 'Keep going →';
  } else {
    document.getElementById('btn-need-check').style.display = 'block';
    document.getElementById('btn-need-check').textContent = 'Try again →';
    document.getElementById('btn-need-proceed').style.display = 'none';
  }

  area.innerHTML = html;
}

function submitNeed() {
  const answer = document.getElementById('need-answer').value.trim();
  if (!answer) {
    alert('Please describe the moment before checking.');
    return;
  }
  state.genuineNeed = answer;
  setButtonLoading('btn-need-check', true);

  fetch('/api/check-answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      screen: 'need',
      persona: state.persona,
      personaAnswers: state.personaAnswers,
      answer: answer
    })
  })
    .then(r => r.json())
    .then(result => {
      state.needAttempts += 1;
      state.needLastFeedback = result.feedback || '';
      state.testResults.push({ screen: 'genuineNeed', pass: !!result.pass, feedback: result.feedback || '' });
      saveState();
      renderNeedFeedback();
    })
    .catch(() => {
      alert('Could not reach the AI checker. Check your connection and try again.');
    })
    .finally(() => setButtonLoading('btn-need-check', false));
}

// ─── SCREEN 3: SOLUTION ───

function renderSolution() {
  document.getElementById('solution-persona-chip').textContent = personaChipHTML(state.personaKey, state.persona);
  document.getElementById('solution-answer').value = state.solutionDescription || '';

  const choiceButtons = document.querySelectorAll('#solution-type-choices .btn-choice');
  choiceButtons.forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.type === state.solutionType);
    btn.onclick = () => {
      state.solutionType = btn.dataset.type;
      choiceButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      updateSolutionCheckButton();
      saveState();
    };
  });

  document.getElementById('solution-answer').oninput = updateSolutionCheckButton;

  renderSolutionFeedback();
  updateSolutionCheckButton();

  document.getElementById('btn-solution-check').onclick = () => submitSolution();
  document.getElementById('btn-solution-proceed').onclick = () => {
    generateHmw();
  };

  document.getElementById('btn-solution-back').onclick = () => {
    state.solutionDescription = document.getElementById('solution-answer').value.trim();
    saveState();
    renderNeed();
    showScreen('screen-need');
  };
}

function updateSolutionCheckButton() {
  const btn = document.getElementById('btn-solution-check');
  const hasType = !!state.solutionType;
  const hasText = document.getElementById('solution-answer').value.trim().length > 0;
  if (hasType && hasText) btn.classList.remove('btn-disabled');
  else btn.classList.add('btn-disabled');
}

function renderSolutionFeedback() {
  const area = document.getElementById('solution-feedback-area');
  area.innerHTML = '';

  if (state.solutionAttempts === 0) return;

  const lastResult = [...state.testResults].reverse().find(r => r.screen === 'solution');
  const passed = lastResult && lastResult.pass;

  if (passed) {
    area.innerHTML = `
      <div class="feedback-box pass">
        <span class="feedback-icon">✅</span>
        <div class="feedback-body">
          <div class="feedback-label">Pass</div>
          <div class="feedback-text">${escapeHTML(lastResult.feedback)}</div>
        </div>
      </div>`;
    document.getElementById('btn-solution-check').style.display = 'none';
    document.getElementById('btn-solution-proceed').style.display = 'block';
    document.getElementById('btn-solution-proceed').textContent = 'Generate my HMW options →';
    return;
  }

  const pipsHTML = Array.from({ length: MAX_ATTEMPTS }, (_, i) =>
    `<div class="pip${i < state.solutionAttempts ? ' used' : ''}"></div>`
  ).join('');

  let html = `
    <div class="feedback-box fail">
      <span class="feedback-icon">⚠️</span>
      <div class="feedback-body">
        <div class="feedback-label">Needs work</div>
        <div class="feedback-text">${escapeHTML(state.solutionLastFeedback || '')}</div>
      </div>
    </div>
    <div class="attempt-counter">
      <div class="attempt-pips">${pipsHTML}</div>
      <span>${state.solutionAttempts >= MAX_ATTEMPTS ? MAX_ATTEMPTS + ' of ' + MAX_ATTEMPTS + ' attempts used' : 'Attempt ' + state.solutionAttempts + ' of ' + MAX_ATTEMPTS}</span>
    </div>`;

  if (state.solutionAttempts >= MAX_ATTEMPTS) {
    html += `
      <div class="hint-box">
        <div class="hint-label">💡 Worked example — use this as inspiration</div>
        <div class="hint-text">
          Connect your solution directly to the moment you described: what does it physically do, when, and why would it need to change completely for a different persona or a bigger home?
        </div>
      </div>`;
    document.getElementById('btn-solution-check').style.display = 'none';
    document.getElementById('btn-solution-proceed').style.display = 'block';
    document.getElementById('btn-solution-proceed').textContent = 'Keep going →';
  } else {
    document.getElementById('btn-solution-check').style.display = 'block';
    document.getElementById('btn-solution-check').textContent = 'Try again →';
    document.getElementById('btn-solution-proceed').style.display = 'none';
  }

  area.innerHTML = html;
}

function submitSolution() {
  const answer = document.getElementById('solution-answer').value.trim();
  if (!state.solutionType || !answer) return;
  state.solutionDescription = answer;
  setButtonLoading('btn-solution-check', true);

  fetch('/api/check-answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      screen: 'solution',
      persona: state.persona,
      personaAnswers: state.personaAnswers,
      genuineNeed: state.genuineNeed,
      solutionType: state.solutionType,
      answer: answer
    })
  })
    .then(r => r.json())
    .then(result => {
      state.solutionAttempts += 1;
      state.solutionLastFeedback = result.feedback || '';
      state.testResults.push({ screen: 'solution', pass: !!result.pass, feedback: result.feedback || '' });
      saveState();
      renderSolutionFeedback();
    })
    .catch(() => {
      alert('Could not reach the AI checker. Check your connection and try again.');
    })
    .finally(() => setButtonLoading('btn-solution-check', false));
}

// ─── SCREEN 4: HMW OPTIONS ───

function showHmwLoading() {
  document.getElementById('hmw-card-content').innerHTML = `
    <div class="hmw-loading">
      <div class="spinner"></div>
      <div class="hmw-loading-text">Generating your HMW options...</div>
    </div>`;
  document.getElementById('hmw-tap-hint').style.display = 'none';
  document.getElementById('hmw-nav').innerHTML = '';
  document.getElementById('btn-hmw-select').style.display = 'none';
  document.getElementById('btn-hmw-retry').style.display = 'none';
  document.getElementById('btn-hmw-back').onclick = () => {
    renderSolution();
    showScreen('screen-solution');
  };
}

function generateHmw() {
  showScreen('screen-hmw');
  showHmwLoading();

  fetch('/api/generate-hmw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      persona: state.persona,
      personaAnswers: state.personaAnswers,
      genuineNeed: state.genuineNeed,
      solutionType: state.solutionType,
      solutionDescription: state.solutionDescription
    })
  })
    .then(r => r.json())
    .then(result => {
      if (!result.options || !result.options.length) throw new Error('No options returned');
      state.hmwOptions = result.options;
      state.hmwIndex = 0;
      saveState();
      renderHmw();
      document.getElementById('btn-hmw-select').style.display = 'block';
      document.getElementById('btn-hmw-retry').style.display = 'block';
    })
    .catch(() => {
      document.getElementById('hmw-card-content').innerHTML = `
        <div class="hmw-loading">
          <div class="hmw-loading-text">Couldn't generate options. Please try again.</div>
        </div>`;
      document.getElementById('btn-hmw-retry').style.display = 'block';
      document.getElementById('btn-hmw-retry').textContent = 'Try again';
      document.getElementById('btn-hmw-retry').onclick = () => generateHmw();
    });
}

function renderHmw() {
  const options = state.hmwOptions;
  if (!options || !options.length) return;
  const idx = state.hmwIndex || 0;
  const opt = options[idx];

  document.getElementById('hmw-persona-chip').textContent = personaChipHTML(state.personaKey, state.persona);
  document.getElementById('hmw-card-content').innerHTML = `
    <div class="hmw-option-label" id="hmw-option-label">Option ${idx + 1} of ${options.length}</div>
    <div class="hmw-text" id="hmw-text"></div>
    <div class="hmw-divider"></div>
    <div class="hmw-why-label">Why it passes</div>
    <div class="hmw-why-text" id="hmw-why-text"></div>`;
  document.getElementById('hmw-text').textContent = opt.hmw;
  document.getElementById('hmw-why-text').textContent =
    `Fails without 9 m²: ${opt.spatialJustification} Fails Swap Test if changed: ${opt.swapJustification}`;

  document.getElementById('hmw-tap-hint').style.display = options.length > 1 ? 'block' : 'none';

  const nav = document.getElementById('hmw-nav');
  nav.innerHTML = '';
  options.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'hmw-nav-dot' + (i === idx ? ' active' : '');
    dot.addEventListener('click', () => {
      state.hmwIndex = i;
      saveState();
      renderHmw();
    });
    nav.appendChild(dot);
  });

  document.getElementById('hmw-card-front').onclick = () => {
    state.hmwIndex = (idx + 1) % options.length;
    saveState();
    renderHmw();
  };

  document.getElementById('btn-hmw-select').style.display = 'block';
  document.getElementById('btn-hmw-retry').style.display = 'block';
  document.getElementById('btn-hmw-retry').textContent = 'None of these — try again';

  document.getElementById('btn-hmw-select').onclick = (e) => {
    e.stopPropagation();
    state.finalHMW = opt.hmw;
    state.designProduct = opt.designDirections?.product || '';
    state.designSystem = opt.designDirections?.system || '';
    state.designEnvironment = opt.designDirections?.environment || '';
    state.swapJustification = opt.swapJustification;
    state.spatialJustification = opt.spatialJustification;
    state.floorSpaceConversion = opt.floorSpaceConversion || [];
    saveState();
    renderLockin();
    showScreen('screen-lockin');
  };

  document.getElementById('btn-hmw-retry').onclick = (e) => {
    e.stopPropagation();
    generateHmw();
  };

  document.getElementById('btn-hmw-back').onclick = (e) => {
    e.stopPropagation();
    renderSolution();
    showScreen('screen-solution');
  };
}

// ─── SCREEN 5: LOCK IN ───

function renderLockin() {
  document.getElementById('lockin-hmw-text').textContent = state.finalHMW;
  document.getElementById('lockin-swap').textContent = state.swapJustification;
  document.getElementById('lockin-spatial').textContent = state.spatialJustification;
  document.getElementById('lockin-product').textContent = state.designProduct;
  document.getElementById('lockin-system').textContent = state.designSystem;
  document.getElementById('lockin-environment').textContent = state.designEnvironment;

  const arrowWrap = document.getElementById('lockin-arrow');
  arrowWrap.innerHTML = '';
  (state.floorSpaceConversion || []).forEach((step, i, arr) => {
    const span = document.createElement('span');
    span.className = 'arrow-step';
    span.textContent = step;
    arrowWrap.appendChild(span);
    if (i < arr.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'arrow-sep';
      sep.textContent = '→';
      arrowWrap.appendChild(sep);
    }
  });

  if (state.lastSavedHMW !== state.finalHMW) {
    saveRecordToServer();
    state.lastSavedHMW = state.finalHMW;
    saveState();
  }

  document.getElementById('btn-copy').onclick = () => {
    const text = `${state.finalHMW}\n\nSwap Test: ${state.swapJustification}\nSpatial Test: ${state.spatialJustification}\nFloor-space conversion: ${(state.floorSpaceConversion || []).join(' → ')}\n\nDesign directions:\nProduct: ${state.designProduct}\nSystem: ${state.designSystem}\nEnvironment: ${state.designEnvironment}`;
    navigator.clipboard.writeText(text).then(() => {
      const confirm = document.getElementById('copy-confirm');
      confirm.style.display = 'block';
      setTimeout(() => (confirm.style.display = 'none'), 2000);
    });
  };

  document.getElementById('btn-lockin-back').onclick = () => {
    renderHmw();
    showScreen('screen-hmw');
  };
}

function saveRecordToServer() {
  fetch('/api/save-record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: state.name,
      class: state.class,
      persona: state.persona,
      finalHMW: state.finalHMW,
      swapJustification: state.swapJustification,
      spatialJustification: state.spatialJustification,
      floorSpaceConversion: state.floorSpaceConversion,
      designProduct: state.designProduct,
      designSystem: state.designSystem,
      designEnvironment: state.designEnvironment,
      allHMWOptions: state.hmwOptions
    })
  }).catch(() => { /* non-blocking — student already has localStorage copy */ });
}

// ─── Helpers ───

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function setButtonLoading(id, loading) {
  const btn = document.getElementById(id);
  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.textContent = 'Checking...';
    btn.classList.add('btn-disabled');
  } else {
    btn.textContent = btn.dataset.originalText || btn.textContent;
    btn.classList.remove('btn-disabled');
  }
}

// ─── Init ───

document.addEventListener('DOMContentLoaded', () => {
  initStart();

  document.querySelectorAll('.app-logo').forEach(el => {
    el.addEventListener('click', () => {
      state = defaultState();
      saveState();
      document.getElementById('input-name').value = '';
      document.getElementById('input-class').value = '10dt';
      document.getElementById('continue-wrap').style.display = 'none';
      showScreen('screen-start');
    });
  });
});
