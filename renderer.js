const listEl = document.getElementById('list');
const addBtn = document.getElementById('addBtn');
const addMenu = document.getElementById('addMenu');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalInput = document.getElementById('modalInput');
const modalCancel = document.getElementById('modalCancel');
const modalOk = document.getElementById('modalOk');
const keepInTrayToggle = document.getElementById('keepInTrayToggle');
const themeToggle = document.getElementById('themeToggle');
const tabShortcuts = document.getElementById('tabShortcuts');
const tabMaintenance = document.getElementById('tabMaintenance');
const shortcutsPanel = document.getElementById('shortcutsPanel');
const maintenancePanel = document.getElementById('maintenancePanel');
const maintenanceList = document.getElementById('maintenanceList');
const maintenanceOutput = document.getElementById('maintenanceOutput');
const clearOutput = document.getElementById('clearOutput');
const maintenanceOutputWrap = document.getElementById('maintenanceOutputWrap');
const toggleOutput = document.getElementById('toggleOutput');
const confirmModal = document.getElementById('confirm');
const confirmText = document.getElementById('confirmText');
const confirmCancel = document.getElementById('confirmCancel');
const confirmOk = document.getElementById('confirmOk');
const diagnosticMeta = document.getElementById('diagnosticMeta');
const diagnosticList = document.getElementById('diagnosticList');
const refreshDiagnostic = document.getElementById('refreshDiagnostic');
const chromeCache = document.getElementById('chromeCache');
const chromeGpuCache = document.getElementById('chromeGpuCache');
const chromeServiceWorker = document.getElementById('chromeServiceWorker');
const chromeCookies = document.getElementById('chromeCookies');
const chromeHistory = document.getElementById('chromeHistory');
const chromeSessions = document.getElementById('chromeSessions');
const chromeWarning = document.getElementById('chromeWarning');
const runChromeCleanup = document.getElementById('runChromeCleanup');
const chromeProfiles = document.getElementById('chromeProfiles');
const chromeRunningWarn = document.getElementById('chromeRunningWarn');

let shortcuts = [];
let modalResolve = null;
let settings = { keepInTray: true, theme: 'light' };
let maintenanceActions = [];
let confirmResolve = null;
let diagnostic = null;
let outputVisible = false;
let chromeProfileList = [];

function openModal(title, value) {
  modalTitle.textContent = title;
  modalInput.value = value || '';
  modal.classList.remove('hidden');
  modalInput.focus();
  return new Promise((resolve) => {
    modalResolve = resolve;
  });
}

function closeModal(result) {
  modal.classList.add('hidden');
  const resolve = modalResolve;
  modalResolve = null;
  if (resolve) resolve(result);
}

modalCancel.addEventListener('click', () => closeModal(null));
modalOk.addEventListener('click', () => closeModal(modalInput.value.trim()));
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal(null);
});

function openConfirm(message) {
  confirmText.textContent = message;
  confirmModal.classList.remove('hidden');
  return new Promise((resolve) => {
    confirmResolve = resolve;
  });
}

function closeConfirm(result) {
  confirmModal.classList.add('hidden');
  const resolve = confirmResolve;
  confirmResolve = null;
  if (resolve) resolve(result);
}

confirmCancel.addEventListener('click', () => closeConfirm(false));
confirmOk.addEventListener('click', () => closeConfirm(true));
confirmModal.addEventListener('click', (e) => {
  if (e.target === confirmModal) closeConfirm(false);
});

function render() {
  listEl.innerHTML = '';

  if (shortcuts.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'item';
    empty.innerHTML = '<div class="info"><div class="name">Sin accesos directos</div><div class="hint">Presiona + para agregar</div></div>';
    listEl.appendChild(empty);
    return;
  }

  shortcuts.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'item';
    li.dataset.index = String(index);

    const info = document.createElement('div');
    info.className = 'info';

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = item.name || 'Sin nombre';

    const path = document.createElement('div');
    path.className = 'path';
    path.textContent = item.type === 'url' ? (item.url || 'Sin URL') : (item.path || 'Sin ruta');

    info.appendChild(name);
    info.appendChild(path);

    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'Click derecho para opciones';

    const actions = document.createElement('div');
    actions.className = 'actions';

    const runBtn = document.createElement('button');
    runBtn.className = 'run-btn';
    runBtn.textContent = 'RUN';
    runBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await window.api.openTarget({ id: item.id });
    });

    actions.appendChild(runBtn);

    li.appendChild(info);
    li.appendChild(hint);
    li.appendChild(actions);

    li.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      window.api.showItemMenu(index);
    });

    listEl.appendChild(li);
  });
}

async function save() {
  await window.api.saveShortcuts(shortcuts);
  render();
}

function setActiveTab(tabName) {
  const isShortcuts = tabName === 'shortcuts';
  tabShortcuts.classList.toggle('active', isShortcuts);
  tabMaintenance.classList.toggle('active', !isShortcuts);
  shortcutsPanel.classList.toggle('hidden', !isShortcuts);
  maintenancePanel.classList.toggle('hidden', isShortcuts);
}

function applyTheme(theme) {
  const nextTheme = theme === 'dark' ? 'dark' : 'light';
  document.body.setAttribute('data-theme', nextTheme);
  themeToggle.textContent = nextTheme === 'dark' ? 'Modo oscuro' : 'Modo claro';
}

function renderMaintenance() {
  maintenanceList.innerHTML = '';
  maintenanceActions.forEach((action) => {
    const row = document.createElement('div');
    row.className = 'maintenance-item';

    const info = document.createElement('div');
    info.className = 'info';

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = action.name;

    const desc = document.createElement('div');
    desc.className = 'desc';
    desc.textContent = action.description;

    info.appendChild(name);
    info.appendChild(desc);

    if (action.requiresAdmin) {
      const admin = document.createElement('div');
      admin.className = 'admin';
      admin.textContent = 'Requiere administrador';
      info.appendChild(admin);
    }

    const run = document.createElement('button');
    run.className = 'run-btn';
    run.textContent = 'RUN';
    run.addEventListener('click', async () => {
      const ok = await openConfirm(`Ejecutar \"${action.name}\"?`);
      if (!ok) return;
      await window.api.runMaintenance(action.id);
    });

    row.appendChild(info);
    row.appendChild(run);
    maintenanceList.appendChild(row);
  });
}

function renderDiagnostic() {
  diagnosticList.innerHTML = '';
  if (!diagnostic) {
    diagnosticMeta.textContent = 'Sin datos de diagnostico.';
    return;
  }

  const freeText = diagnostic.stats && diagnostic.stats.totalGB
    ? `Espacio libre: ${diagnostic.stats.freeGB} GB / ${diagnostic.stats.totalGB} GB.`
    : 'Espacio libre: no disponible.';
  const uptimeText = diagnostic.stats
    ? `Uptime: ${diagnostic.stats.uptimeHours} horas.`
    : 'Uptime: no disponible.';
  const when = diagnostic.generatedAt
    ? `Ultimo diagnostico: ${new Date(diagnostic.generatedAt).toLocaleString()}.`
    : 'Ultimo diagnostico: no disponible.';

  diagnosticMeta.textContent = `${when} ${freeText} ${uptimeText}`;

  if (!diagnostic.recommendations || diagnostic.recommendations.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Sin recomendaciones por ahora.';
    diagnosticList.appendChild(li);
    return;
  }

  diagnostic.recommendations.forEach((rec) => {
    const li = document.createElement('li');
    li.textContent = rec.text;
    if (rec.actionId) {
      const btn = document.createElement('button');
      btn.className = 'run-btn';
      btn.textContent = 'RUN';
      btn.addEventListener('click', async () => {
        const action = maintenanceActions.find((item) => item.id === rec.actionId);
        const label = action ? action.name : 'esta accion';
        const ok = await openConfirm(`Ejecutar \"${label}\"?`);
        if (!ok) return;
        await window.api.runMaintenance(rec.actionId);
      });
      li.appendChild(document.createTextNode(' '));
      li.appendChild(btn);
    }
    diagnosticList.appendChild(li);
  });
}

function renderChromeProfiles() {
  chromeProfiles.innerHTML = '';
  if (!chromeProfileList || chromeProfileList.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'hint';
    empty.textContent = 'No se encontraron perfiles de Chrome.';
    chromeProfiles.appendChild(empty);
    return;
  }

  chromeProfileList.forEach((profile) => {
    const label = document.createElement('label');
    label.className = 'switch';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = profile === 'Default';
    input.dataset.profile = profile;

    const slider = document.createElement('span');
    slider.className = 'slider';

    const text = document.createElement('span');
    text.textContent = profile;

    label.appendChild(input);
    label.appendChild(slider);
    label.appendChild(text);
    chromeProfiles.appendChild(label);
  });
}

async function refreshChromeStatus() {
  const running = await window.api.isChromeRunning();
  chromeRunningWarn.classList.toggle('hidden', !running);
}

function showOutput(forceShow) {
  if (typeof forceShow === 'boolean') {
    outputVisible = forceShow;
  } else {
    outputVisible = !outputVisible;
  }
  maintenanceOutputWrap.classList.toggle('hidden', !outputVisible);
  toggleOutput.textContent = outputVisible ? 'Ocultar salida' : 'Mostrar salida';
}

function toggleAddMenu(show) {
  if (show) addMenu.classList.remove('hidden');
  else addMenu.classList.add('hidden');
}

addBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleAddMenu(addMenu.classList.contains('hidden'));
});

document.addEventListener('click', () => toggleAddMenu(false));

addMenu.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-add]');
  if (!btn) return;
  const type = btn.getAttribute('data-add');
  toggleAddMenu(false);

  const name = await openModal('Nombre del acceso directo', '');
  if (!name) return;

  if (type === 'url') {
    const url = await openModal('URL', 'https://');
    if (!url) return;
    let validUrl = false;
    try {
      const parsed = new URL(url);
      validUrl = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      validUrl = false;
    }
    if (!validUrl) {
      alert('URL no valida. Debe empezar con http:// o https://');
      return;
    }
    shortcuts.push({ id: `sc_${Date.now()}_${Math.random().toString(16).slice(2)}`, name, type: 'url', url, usageCount: 0, lastUsed: null });
    await save();
    return;
  }

  if (type === 'exe') {
    const path = await window.api.pickExe();
    if (!path) return;
    const exists = await window.api.validatePath(path);
    if (!exists) {
      alert('La ruta seleccionada no existe.');
      return;
    }
    shortcuts.push({ id: `sc_${Date.now()}_${Math.random().toString(16).slice(2)}`, name, type: 'exe', path, usageCount: 0, lastUsed: null });
    await save();
    return;
  }

  if (type === 'folder') {
    const path = await window.api.pickFolder();
    if (!path) return;
    const exists = await window.api.validatePath(path);
    if (!exists) {
      alert('La ruta seleccionada no existe.');
      return;
    }
    shortcuts.push({ id: `sc_${Date.now()}_${Math.random().toString(16).slice(2)}`, name, type: 'folder', path, usageCount: 0, lastUsed: null });
    await save();
  }
});

window.api.onMenuAction(async ({ action, index }) => {
  const item = shortcuts[index];
  if (!item) return;

  if (action === 'run') {
    await window.api.openTarget({ id: item.id });
    return;
  }

  if (action === 'edit-name') {
    const name = await openModal('Editar nombre', item.name || '');
    if (name) {
      item.name = name;
      await save();
    }
    return;
  }

  if (action === 'edit-path') {
    if (item.type === 'url') {
      const url = await openModal('Editar URL', item.url || 'https://');
      if (!url) return;
      let validUrl = false;
      try {
        const parsed = new URL(url);
        validUrl = parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        validUrl = false;
      }
      if (!validUrl) {
        alert('URL no valida. Debe empezar con http:// o https://');
        return;
      }
      item.url = url;
      await save();
      return;
    }

    const path = item.type === 'folder'
      ? await window.api.pickFolder()
      : await window.api.pickExe();
    if (path) {
      const exists = await window.api.validatePath(path);
      if (!exists) {
        alert('La ruta seleccionada no existe.');
        return;
      }
      item.path = path;
      await save();
    }
    return;
  }

  if (action === 'delete') {
    shortcuts.splice(index, 1);
    await save();
    return;
  }

  if (action === 'move-up' && index > 0) {
    const tmp = shortcuts[index - 1];
    shortcuts[index - 1] = shortcuts[index];
    shortcuts[index] = tmp;
    await save();
    return;
  }

  if (action === 'move-down' && index < shortcuts.length - 1) {
    const tmp = shortcuts[index + 1];
    shortcuts[index + 1] = shortcuts[index];
    shortcuts[index] = tmp;
    await save();
  }
});

(async () => {
  shortcuts = await window.api.getShortcuts();
  settings = await window.api.getSettings();
  maintenanceActions = await window.api.getMaintenanceActions();
  diagnostic = await window.api.getDiagnostic();
  chromeProfileList = await window.api.getChromeProfiles();
  keepInTrayToggle.checked = settings.keepInTray;
  applyTheme(settings.theme);
  render();
  renderMaintenance();
  renderDiagnostic();
  renderChromeProfiles();
  refreshChromeStatus();
  setActiveTab('shortcuts');
})();

keepInTrayToggle.addEventListener('change', async () => {
  settings.keepInTray = keepInTrayToggle.checked;
  await window.api.saveSettings(settings);
});

themeToggle.addEventListener('click', async () => {
  settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
  applyTheme(settings.theme);
  await window.api.saveSettings(settings);
});

tabShortcuts.addEventListener('click', () => setActiveTab('shortcuts'));
tabMaintenance.addEventListener('click', async () => {
  setActiveTab('maintenance');
  diagnostic = await window.api.getDiagnostic();
  renderDiagnostic();
  chromeProfileList = await window.api.getChromeProfiles();
  renderChromeProfiles();
  refreshChromeStatus();
});

refreshDiagnostic.addEventListener('click', async () => {
  diagnostic = await window.api.getDiagnostic();
  renderDiagnostic();
});

clearOutput.addEventListener('click', () => {
  maintenanceOutput.textContent = '';
});

toggleOutput.addEventListener('click', () => {
  showOutput();
});

window.api.onMaintenanceOutput(({ type, data }) => {
  const stamp = new Date().toLocaleTimeString();
  const line = `[${stamp}] ${data}`.trim();
  if (type === 'stderr') {
    maintenanceOutput.textContent += `${line}\n`;
  } else {
    maintenanceOutput.textContent += `${line}\n`;
  }
  maintenanceOutput.scrollTop = maintenanceOutput.scrollHeight;
  showOutput(true);
});

function updateChromeWarning() {
  chromeWarning.classList.toggle('hidden', !chromeSessions.checked);
}

chromeSessions.addEventListener('change', updateChromeWarning);
updateChromeWarning();

runChromeCleanup.addEventListener('click', async () => {
  const selectedProfiles = Array.from(chromeProfiles.querySelectorAll('input[type="checkbox"]'))
    .filter((input) => input.checked)
    .map((input) => input.dataset.profile)
    .filter(Boolean);

  if (selectedProfiles.length === 0) {
    alert('Selecciona al menos un perfil de Chrome.');
    return;
  }

  const options = {
    cache: chromeCache.checked,
    gpuCache: chromeGpuCache.checked,
    serviceWorker: chromeServiceWorker.checked,
    cookies: chromeCookies.checked,
    history: chromeHistory.checked,
    sessions: chromeSessions.checked,
    profiles: selectedProfiles
  };

  const ok = await openConfirm('Limpiar los datos seleccionados de Chrome? Cierra Chrome para mejores resultados.');
  if (!ok) return;

  await window.api.runChromeCleanup(options);
  await refreshChromeStatus();
});
