const listEl = document.getElementById('list');
const addBtn = document.getElementById('addBtn');
const addMenu = document.getElementById('addMenu');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalInput = document.getElementById('modalInput');
const modalCancel = document.getElementById('modalCancel');
const modalOk = document.getElementById('modalOk');
const settingsMenuToggle = document.getElementById('settingsMenuToggle');
const settingsMenu = document.getElementById('settingsMenu');
const keepInTrayToggle = document.getElementById('keepInTrayToggle');
const startWithWindowsToggle = document.getElementById('startWithWindowsToggle');
const autoUpdateToggle = document.getElementById('autoUpdateToggle');
const notificationsToggle = document.getElementById('notificationsToggle');
const advancedModeToggle = document.getElementById('advancedModeToggle');
const clearAppCacheBtn = document.getElementById('clearAppCacheBtn');
const accessibilityMenuToggle = document.getElementById('accessibilityMenuToggle');
const accessibilityMenu = document.getElementById('accessibilityMenu');
const fontSizeSelect = document.getElementById('fontSizeSelect');
const highContrastToggle = document.getElementById('highContrastToggle');
const reduceMotionToggle = document.getElementById('reduceMotionToggle');
const focusBoostToggle = document.getElementById('focusBoostToggle');
const comfortableSpacingToggle = document.getElementById('comfortableSpacingToggle');
const actionsRightToggle = document.getElementById('actionsRightToggle');
const showGuidePanelToggle = document.getElementById('showGuidePanelToggle');
const themeToggle = document.getElementById('themeToggle');
const tabShortcuts = document.getElementById('tabShortcuts');
const tabMaintenance = document.getElementById('tabMaintenance');
const shortcutsPanel = document.getElementById('shortcutsPanel');
const maintenancePanel = document.getElementById('maintenancePanel');
const quickHelpSection = document.getElementById('quickHelpSection');
const startGuide = document.getElementById('startGuide');
const guideAutoToggle = document.getElementById('guideAutoToggle');
const shortcutSearch = document.getElementById('shortcutSearch');
const clearShortcutSearch = document.getElementById('clearShortcutSearch');
const importShortcutsBtn = document.getElementById('importShortcuts');
const exportShortcutsBtn = document.getElementById('exportShortcuts');
const addShortcutInline = document.getElementById('addShortcutInline');
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
const checkUpdates = document.getElementById('checkUpdates');
const updateStatus = document.getElementById('updateStatus');
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
const toastContainer = document.getElementById('toastContainer');
const guideTour = document.getElementById('guideTour');
const guideStep = document.getElementById('guideStep');
const guideTitle = document.getElementById('guideTitle');
const guideText = document.getElementById('guideText');
const guideClose = document.getElementById('guideClose');
const guidePrev = document.getElementById('guidePrev');
const guideNext = document.getElementById('guideNext');

let i18n = {};

function getByPath(source, key) {
  if (!source || typeof source !== 'object' || !key) return undefined;
  return key.split('.').reduce((acc, part) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return acc[part];
  }, source);
}

function formatText(template, vars) {
  if (typeof template !== 'string') return '';
  if (!vars || typeof vars !== 'object') return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    if (Object.prototype.hasOwnProperty.call(vars, name)) {
      const value = vars[name];
      return value == null ? '' : String(value);
    }
    return match;
  });
}

function t(key, fallback = '', vars) {
  const raw = getByPath(i18n, key);
  if (typeof raw === 'string') return formatText(raw, vars);
  return formatText(fallback || key, vars);
}

function applyStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const fallback = (el.textContent || '').trim();
    el.textContent = t(key, fallback);
  });

  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (!key) return;
    const fallback = el.getAttribute('title') || '';
    el.setAttribute('title', t(key, fallback));
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (!key) return;
    const fallback = el.getAttribute('placeholder') || '';
    el.setAttribute('placeholder', t(key, fallback));
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (!key) return;
    const fallback = el.getAttribute('aria-label') || '';
    el.setAttribute('aria-label', t(key, fallback));
  });

  if (document.title) {
    document.title = t('app.title', document.title);
  }
}

const ACCESSIBILITY_DEFAULTS = {
  fontSize: 'normal',
  highContrast: false,
  reduceMotion: false,
  focusBoost: false,
  comfortableSpacing: false,
  actionsRight: true,
  showGuidePanel: true
};

const TOAST_CATEGORY_KEYS = {
  interface: 'renderer.toasts.category.interface',
  access: 'renderer.toasts.category.access',
  maintenance: 'renderer.toasts.category.maintenance',
  important: 'renderer.toasts.category.important'
};

let shortcuts = [];
let modalResolve = null;
let settings = {
  keepInTray: true,
  launchOnStartup: false,
  autoUpdateCheck: true,
  notificationsEnabled: true,
  advancedMode: false,
  theme: 'light',
  accessibility: { ...ACCESSIBILITY_DEFAULTS },
  quickHelp: { enabled: true, lastSeenVersion: null },
  uiHints: { settingsMenuSeenVersion: null }
};
let maintenanceActions = [];
let confirmResolve = null;
let diagnostic = null;
let outputVisible = false;
let chromeProfileList = [];
let updateState = 'idle';
let appVersion = '';
let isPackaged = false;
let pendingUndoDelete = null;
let guideSteps = [];
let guideIndex = 0;
let activeGuideTarget = null;
let activeRegularToast = null;

function normalizeAccessibility(value) {
  const data = value && typeof value === 'object' ? value : {};
  const fontSize = ['normal', 'large', 'xlarge'].includes(data.fontSize) ? data.fontSize : 'normal';
  return {
    fontSize,
    highContrast: data.highContrast === true,
    reduceMotion: data.reduceMotion === true,
    focusBoost: data.focusBoost === true,
    comfortableSpacing: data.comfortableSpacing === true,
    actionsRight: data.actionsRight !== false,
    showGuidePanel: data.showGuidePanel !== false,
    menuDismissedVersion: typeof data.menuDismissedVersion === 'string' && data.menuDismissedVersion.trim()
      ? data.menuDismissedVersion.trim()
      : null
  };
}

function normalizeQuickHelp(value) {
  const data = value && typeof value === 'object' ? value : {};
  let lastSeenVersion = null;
  if (typeof data.lastSeenVersion === 'string' && data.lastSeenVersion.trim()) {
    lastSeenVersion = data.lastSeenVersion.trim();
  } else if (typeof data.dismissedVersion === 'string' && data.dismissedVersion.trim()) {
    lastSeenVersion = data.dismissedVersion.trim();
  }
  return {
    enabled: data.enabled !== false,
    lastSeenVersion
  };
}

function normalizeUiHints(value) {
  const data = value && typeof value === 'object' ? value : {};
  return {
    settingsMenuSeenVersion: typeof data.settingsMenuSeenVersion === 'string' && data.settingsMenuSeenVersion.trim()
      ? data.settingsMenuSeenVersion.trim()
      : null
  };
}

function getShortcutType(item) {
  if (!item || !item.type) return 'exe';
  if (item.type === 'url') return 'url';
  if (item.type === 'folder') return 'folder';
  return 'exe';
}

function normalizeNameForCompare(value) {
  return String(value || '').trim().toLowerCase();
}

function hasDuplicateShortcutName(name, excludeId = null) {
  const target = normalizeNameForCompare(name);
  if (!target) return false;
  return shortcuts.some((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    if (excludeId && entry.id === excludeId) return false;
    return normalizeNameForCompare(entry.name) === target;
  });
}

async function resolveNonDuplicateShortcutName(initialName, excludeId = null) {
  let candidate = String(initialName || '').trim();
  if (!candidate) return null;

  while (hasDuplicateShortcutName(candidate, excludeId)) {
    showToast({
      type: 'error',
      title: t('renderer.toasts.duplicateNameTitle', 'Nombre duplicado'),
      message: t('renderer.toasts.duplicateNameMessage', 'Ya existe un acceso con ese nombre. Usa un nombre diferente.'),
      category: 'important'
    });

    const edited = await openModal(
      t('renderer.modals.renameDuplicate', 'Ese nombre ya existe. Escribe otro nombre.'),
      candidate
    );
    if (!edited) return null;
    candidate = edited.trim();
    if (!candidate) return null;
  }

  return candidate;
}

function getShortcutTypeLabel(type) {
  if (type === 'url') return t('renderer.types.url', 'Enlace web');
  if (type === 'folder') return t('renderer.types.folder', 'Carpeta');
  return t('renderer.types.exe', 'Programa');
}

function buildIntegrityMessage(type, result) {
  if (type === 'url') {
    if (result.ok) return t('renderer.integrity.urlOk', 'El sitio responde correctamente.');
    if (result.reason === 'empty') return t('renderer.integrity.urlEmpty', 'Ingresa una URL para verificar.');
    if (result.reason === 'format' || result.reason === 'protocol') {
      return t('renderer.integrity.urlInvalid', 'La URL no es valida. Usa http:// o https://');
    }
    if (result.reason === 'http') {
      return t('renderer.integrity.urlHttp', 'El sitio respondio con estado {status}.', {
        status: result.status || 'desconocido'
      });
    }
    if (result.reason === 'timeout') return t('renderer.integrity.urlTimeout', 'No se pudo verificar la URL por tiempo de espera.');
    if (result.reason === 'network') return t('renderer.integrity.urlNetwork', 'No se pudo conectar para validar la URL.');
    return t('renderer.integrity.urlUnknown', 'No se pudo validar la URL.');
  }
  return result.ok
    ? t('renderer.integrity.pathOk', 'La ruta sigue disponible.')
    : t('renderer.integrity.pathMissing', 'La ruta ya no existe o no esta disponible.');
}

async function verifyUrlIntegrity(rawUrl) {
  const value = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!value) return { ok: false, reason: 'empty' };
  if (!window.api.validateUrl) {
    try {
      const parsed = new URL(value);
      const protocolOk = parsed.protocol === 'http:' || parsed.protocol === 'https:';
      return protocolOk ? { ok: true, reason: 'ok' } : { ok: false, reason: 'protocol' };
    } catch {
      return { ok: false, reason: 'format' };
    }
  }
  try {
    const result = await window.api.validateUrl(value);
    return result && typeof result === 'object' ? result : { ok: false, reason: 'network' };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

async function verifyItemIntegrity(item, { showOkToast = false } = {}) {
  if (!item || typeof item !== 'object') {
    return { ok: false, reason: 'invalid', message: t('renderer.labels.invalidItem', 'Elemento invalido.') };
  }

  if (item.type === 'url') {
    const result = await verifyUrlIntegrity(item.url || '');
    const message = buildIntegrityMessage('url', result);
    if (result.ok && showOkToast) {
      showToast({
        type: 'success',
        title: t('renderer.integrity.urlTitle', 'Integridad URL'),
        message,
        category: 'access'
      });
    }
    return { ...result, message };
  }

  const exists = await window.api.validatePath(item.path || '');
  const result = { ok: exists, reason: exists ? 'ok' : 'missing' };
  const message = buildIntegrityMessage('path', result);
  if (exists && showOkToast) {
    showToast({
      type: 'success',
      title: t('renderer.integrity.pathTitle', 'Integridad ruta'),
      message,
      category: 'access'
    });
  }
  return { ...result, message };
}

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

function normalizeShortcuts(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    pinned: item && item.pinned === true
  }));
}

function getRenderList(items, query) {
  const base = items.map((item, index) => ({ item, index }));
  const sorted = [...base].sort((a, b) => {
    if ((a.item.pinned === true) === (b.item.pinned === true)) {
      return a.index - b.index;
    }
    return a.item.pinned === true ? -1 : 1;
  });
  if (!query) return sorted;
  return sorted.filter(({ item }) => {
    const haystack = [
      item.name || '',
      item.path || '',
      item.url || '',
      getShortcutTypeLabel(getShortcutType(item))
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

function clearPendingUndoDelete() {
  if (!pendingUndoDelete) return;
  clearTimeout(pendingUndoDelete.timerId);
  pendingUndoDelete = null;
}

function render() {
  listEl.innerHTML = '';
  const query = (shortcutSearch.value || '').trim().toLowerCase();

  if (shortcuts.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.innerHTML = `<div class="name">${t('renderer.emptyState.noShortcutsTitle', 'Aun no tienes accesos')}</div><div class="hint">${t('renderer.emptyState.noShortcutsHint', 'Agrega tu primer acceso para empezar.')}</div>`;
    const quickAdd = document.createElement('button');
    quickAdd.className = 'run-btn start-btn';
    quickAdd.textContent = t('renderer.emptyState.addFirst', 'Agregar primer acceso');
    quickAdd.title = t('renderer.emptyState.addFirstTitle', 'Agregar tu primer acceso');
    quickAdd.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleAddMenu(true);
    });
    empty.appendChild(quickAdd);
    listEl.appendChild(empty);
    return;
  }

  const filtered = getRenderList(shortcuts, query);

  if (filtered.length === 0) {
    const emptySearch = document.createElement('li');
    emptySearch.className = 'empty-state';
    emptySearch.innerHTML = `<div class="name">${t('renderer.emptyState.noResultsTitle', 'Sin resultados')}</div><div class="hint">${t('renderer.emptyState.noResultsHint', 'Prueba con otro texto de busqueda.')}</div>`;
    listEl.appendChild(emptySearch);
    return;
  }

  filtered.forEach(({ item, index }) => {
    const shortcutType = getShortcutType(item);
    const li = document.createElement('li');
    li.className = 'item';
    li.dataset.index = String(index);
    li.draggable = true;

    const info = document.createElement('div');
    info.className = 'info';

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = item.name || t('renderer.labels.noName', 'Sin nombre');

    const meta = document.createElement('div');
    meta.className = 'meta';

    const typeIcon = document.createElement('span');
    typeIcon.className = `type-icon type-${shortcutType}`;
    typeIcon.setAttribute('aria-hidden', 'true');

    const typeText = document.createElement('span');
    typeText.className = 'type-text';
    typeText.textContent = item.pinned
      ? t('renderer.labels.pinnedPrefix', 'Fijado - {type}', { type: getShortcutTypeLabel(shortcutType) })
      : getShortcutTypeLabel(shortcutType);

    meta.appendChild(typeIcon);
    meta.appendChild(typeText);

    const path = document.createElement('div');
    path.className = 'path';
    path.textContent = item.type === 'url'
      ? (item.url || t('renderer.labels.noUrl', 'Sin URL'))
      : (item.path || t('renderer.labels.noPath', 'Sin ruta'));

    info.appendChild(name);
    info.appendChild(meta);
    info.appendChild(path);

    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = t('renderer.hint.itemContext', 'Clic derecho para editar, mover o eliminar');

    const actions = document.createElement('div');
    actions.className = 'actions';

    const pinBtn = document.createElement('button');
    pinBtn.className = 'run-btn';
    pinBtn.textContent = item.pinned
      ? t('renderer.labels.unpin', 'Desfijar')
      : t('renderer.labels.pin', 'Fijar');
    pinBtn.title = item.pinned
      ? t('renderer.labels.unpinShortcutTitle', 'Quitar de accesos fijados')
      : t('renderer.labels.pinShortcutTitle', 'Fijar arriba');
    pinBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      item.pinned = !item.pinned;
      if (item.pinned) {
        shortcuts.splice(index, 1);
        shortcuts.unshift(item);
      }
      await save();
      showToast({
        type: 'success',
        title: t('renderer.toasts.updatedAccessTitle', 'Acceso actualizado'),
        message: item.pinned
          ? t('renderer.toasts.pinnedMessage', 'Acceso fijado al inicio.')
          : t('renderer.toasts.unpinnedMessage', 'Acceso desfijado.'),
        category: 'access'
      });
    });

    const editBtn = document.createElement('button');
    editBtn.className = 'run-btn';
    editBtn.textContent = t('renderer.labels.edit', 'Editar');
    editBtn.title = t('renderer.labels.editShortcutTitle', 'Editar este acceso');
    editBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await window.api.showItemMenu(index);
    });

    const runBtn = document.createElement('button');
    runBtn.className = 'run-btn start-btn';
    runBtn.textContent = t('renderer.labels.run', 'Iniciar');
    runBtn.title = t('renderer.labels.runShortcutTitle', 'Abrir este acceso');
    runBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await runShortcutWithIntegrity(item);
    });

    actions.appendChild(pinBtn);
    actions.appendChild(editBtn);
    actions.appendChild(runBtn);

    li.appendChild(info);
    li.appendChild(hint);
    li.appendChild(actions);

    li.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      window.api.showItemMenu(index);
    });

    li.addEventListener('dblclick', async () => {
      await runShortcutWithIntegrity(item);
    });

    li.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
      li.classList.add('dragging');
    });

    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
    });

    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    li.addEventListener('drop', async (e) => {
      e.preventDefault();
      const sourceIndex = Number(e.dataTransfer.getData('text/plain'));
      const targetIndex = index;
      if (Number.isNaN(sourceIndex) || sourceIndex === targetIndex) return;
      const moved = shortcuts[sourceIndex];
      if (!moved) return;
      shortcuts.splice(sourceIndex, 1);
      shortcuts.splice(targetIndex, 0, moved);
      await save();
    });

    listEl.appendChild(li);
  });
}

async function save() {
  shortcuts = normalizeShortcuts(shortcuts);
  await window.api.saveShortcuts(shortcuts);
  render();
}

async function runShortcutWithIntegrity(item) {
  const integrity = await verifyItemIntegrity(item);
  if (!integrity.ok) {
    const title = item && item.type === 'url'
      ? t('renderer.integrity.urlInvalidTitle', 'URL no valida')
      : t('renderer.integrity.pathInvalidTitle', 'Ruta no disponible');
    showToast({ type: 'error', title, message: integrity.message, category: 'important' });
    return false;
  }
  const result = await window.api.openTarget({ id: item.id });
  if (!result || result.ok !== true) {
    showToast({
      type: 'error',
      title: t('renderer.toasts.cannotStartTitle', 'No se pudo iniciar'),
      message: buildIntegrityMessage(item.type === 'url' ? 'url' : 'path', result || { ok: false, reason: 'missing_path' }),
      category: 'important'
    });
    return false;
  }
  return true;
}

function setActiveTab(tabName) {
  const allowMaintenance = settings.advancedMode === true;
  const resolvedTab = tabName === 'maintenance' && !allowMaintenance ? 'shortcuts' : tabName;
  const isShortcuts = resolvedTab === 'shortcuts';
  tabShortcuts.classList.toggle('active', isShortcuts);
  tabMaintenance.classList.toggle('active', !isShortcuts);
  shortcutsPanel.classList.toggle('hidden', !isShortcuts);
  maintenancePanel.classList.toggle('hidden', isShortcuts);
}

function applyTheme(theme) {
  const nextTheme = theme === 'dark' ? 'dark' : 'light';
  document.body.setAttribute('data-theme', nextTheme);
  themeToggle.textContent = nextTheme === 'dark'
    ? t('renderer.theme.dark', 'Modo oscuro')
    : t('renderer.theme.light', 'Modo claro');
}

function applyAccessibilityPreferences(preferences) {
  const next = normalizeAccessibility(preferences);
  settings.accessibility = next;

  const scaleByFontSize = {
    normal: '1',
    large: '1.12',
    xlarge: '1.25'
  };
  document.body.style.setProperty('--ui-scale', scaleByFontSize[next.fontSize] || '1');
  document.body.classList.toggle('high-contrast', next.highContrast);
  document.body.classList.toggle('reduce-motion', next.reduceMotion);
  document.body.classList.toggle('focus-boost', next.focusBoost);
  document.body.classList.toggle('comfortable-spacing', next.comfortableSpacing);
  document.body.classList.toggle('item-actions-bottom', !next.actionsRight);

  if (fontSizeSelect) fontSizeSelect.value = next.fontSize;
  if (highContrastToggle) highContrastToggle.checked = next.highContrast;
  if (reduceMotionToggle) reduceMotionToggle.checked = next.reduceMotion;
  if (focusBoostToggle) focusBoostToggle.checked = next.focusBoost;
  if (comfortableSpacingToggle) comfortableSpacingToggle.checked = next.comfortableSpacing;
  if (actionsRightToggle) actionsRightToggle.checked = next.actionsRight;
  if (showGuidePanelToggle) showGuidePanelToggle.checked = next.showGuidePanel;
  applyQuickHelpSectionVisibility();
}

function applyAdvancedMode(enabled) {
  tabMaintenance.classList.toggle('hidden', !enabled);
  importShortcutsBtn.classList.toggle('hidden', !enabled);
  exportShortcutsBtn.classList.toggle('hidden', !enabled);
  if (clearAppCacheBtn) clearAppCacheBtn.classList.toggle('hidden', !enabled);
  if (!enabled) {
    setActiveTab('shortcuts');
  }
}

function shouldHighlightSettingsMenu() {
  settings.uiHints = normalizeUiHints(settings.uiHints);
  const seenVersion = settings.uiHints.settingsMenuSeenVersion;
  if (!appVersion) return !seenVersion;
  return seenVersion !== appVersion;
}

function applySettingsHintState() {
  if (!settingsMenuToggle || !settingsMenu) return;
  const isOpen = !settingsMenu.classList.contains('hidden');
  const highlight = shouldHighlightSettingsMenu() && !isOpen;
  settingsMenuToggle.classList.toggle('attention-pulse', highlight);
}

async function setSettingsMenuVisible(show, persist = true) {
  if (!settingsMenu) return;
  const nextVisible = show === true;
  const wasVisible = !settingsMenu.classList.contains('hidden');
  if (nextVisible !== wasVisible) {
    settingsMenu.classList.toggle('hidden', !nextVisible);
  }
  if (settingsMenuToggle) {
    settingsMenuToggle.setAttribute('aria-expanded', nextVisible ? 'true' : 'false');
  }

  if (persist && nextVisible) {
    const currentVersion = appVersion || 'dev';
    settings.uiHints = normalizeUiHints(settings.uiHints);
    if (settings.uiHints.settingsMenuSeenVersion !== currentVersion) {
      settings.uiHints.settingsMenuSeenVersion = currentVersion;
      try {
        await window.api.saveSettings(settings);
      } catch {
        showToast({
          type: 'error',
          title: t('renderer.toasts.settingsTitle', 'Ajustes'),
          message: t('renderer.errors.cannotSaveSettingsHint', 'No se pudo guardar la ayuda de ajustes.'),
          category: 'important'
        });
      }
    }
  }

  applySettingsHintState();
}

function toggleSettingsMenu(force) {
  const nextVisible = typeof force === 'boolean'
    ? force
    : settingsMenu && settingsMenu.classList.contains('hidden');
  return setSettingsMenuVisible(nextVisible, true);
}

async function setAccessibilityMenuVisible(show, persist = true) {
  if (!accessibilityMenu) return;
  const nextVisible = show === true;
  const wasVisible = !accessibilityMenu.classList.contains('hidden');
  if (nextVisible !== wasVisible) {
    accessibilityMenu.classList.toggle('hidden', !nextVisible);
  }
  if (accessibilityMenuToggle) {
    accessibilityMenuToggle.setAttribute('aria-expanded', nextVisible ? 'true' : 'false');
  }

  if (!persist || nextVisible === wasVisible) return;
  settings.accessibility.menuDismissedVersion = nextVisible ? null : (appVersion || 'dev');
  await persistAccessibilitySettings('');
}

function toggleAccessibilityMenu(force) {
  const nextVisible = typeof force === 'boolean'
    ? force
    : accessibilityMenu && accessibilityMenu.classList.contains('hidden');
  return setAccessibilityMenuVisible(nextVisible, true);
}

async function persistAccessibilitySettings(successMessage) {
  settings.accessibility = normalizeAccessibility(settings.accessibility);
  applyAccessibilityPreferences(settings.accessibility);
  try {
    await window.api.saveSettings(settings);
    if (successMessage) {
      showToast({
        type: 'success',
        title: t('renderer.toasts.accessibilityTitle', 'Accesibilidad'),
        message: successMessage,
        category: 'interface'
      });
    }
  } catch {
    showToast({
      type: 'error',
      title: t('renderer.toasts.accessibilityTitle', 'Accesibilidad'),
      message: t('renderer.toasts.saveError', 'No se pudieron guardar los cambios.'),
      category: 'important'
    });
  }
}

function dismissToast(toast) {
  if (!toast) return;
  if (toast.__timeoutId) {
    clearTimeout(toast.__timeoutId);
    toast.__timeoutId = null;
  }
  if (activeRegularToast === toast) {
    activeRegularToast = null;
  }
  toast.remove();
}

function showToast({
  type = 'info',
  title = '',
  message = '',
  duration = 3800,
  actionLabel = '',
  action = null,
  category = 'interface',
  allowWhenMuted = false
}) {
  const normalizedCategory = TOAST_CATEGORY_KEYS[category] ? category : 'interface';
  const isImportant = normalizedCategory === 'important';
  if (settings.notificationsEnabled === false && !allowWhenMuted && !isImportant) {
    return null;
  }

  if (!isImportant && activeRegularToast) {
    dismissToast(activeRegularToast);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type} toast-category-${normalizedCategory}`;

  const meta = document.createElement('div');
  meta.className = 'toast-meta';

  const categoryEl = document.createElement('span');
  categoryEl.className = 'toast-category';
  categoryEl.textContent = t(TOAST_CATEGORY_KEYS[normalizedCategory], normalizedCategory);

  const titleEl = document.createElement('div');
  titleEl.className = 'toast-title';
  titleEl.textContent = title || (type === 'error'
    ? t('renderer.toasts.defaultError', 'Error')
    : t('renderer.toasts.defaultInfo', 'Aviso'));

  meta.appendChild(categoryEl);
  meta.appendChild(titleEl);

  const messageEl = document.createElement('div');
  messageEl.className = 'toast-message';
  messageEl.textContent = message;

  toast.appendChild(meta);
  toast.appendChild(messageEl);

  const actions = document.createElement('div');
  actions.className = 'toast-actions';

  if (actionLabel && typeof action === 'function') {
    const actionBtn = document.createElement('button');
    actionBtn.className = 'run-btn';
    actionBtn.textContent = actionLabel;
    actionBtn.addEventListener('click', () => {
      action();
      dismissToast(toast);
    });
    actions.appendChild(actionBtn);
  }

  const closeBtn = document.createElement('button');
  closeBtn.className = 'run-btn';
  closeBtn.textContent = t('renderer.toasts.close', 'Cerrar');
  closeBtn.addEventListener('click', () => dismissToast(toast));
  actions.appendChild(closeBtn);

  toast.appendChild(actions);
  toastContainer.appendChild(toast);
  if (!isImportant) {
    activeRegularToast = toast;
  }

  const resolvedDuration = isImportant && duration > 0 ? Math.max(duration, 7200) : duration;
  if (resolvedDuration > 0) {
    toast.__timeoutId = setTimeout(() => dismissToast(toast), resolvedDuration);
  }
  return toast;
}

function copyToClipboard(text) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast({
      type: 'success',
      title: t('renderer.toasts.copiedTitle', 'Copiado'),
      message: t('renderer.toasts.copiedMessage', 'Se copio el detalle al portapapeles.'),
      category: 'interface'
    });
  }).catch(() => {
    showToast({
      type: 'error',
      title: t('renderer.toasts.copyErrorTitle', 'No se pudo copiar'),
      message: t('renderer.toasts.copyErrorMessage', 'Copia el detalle manualmente.'),
      category: 'important'
    });
  });
}

function clearGuideTarget() {
  if (!activeGuideTarget) return;
  activeGuideTarget.classList.remove('guide-target');
  activeGuideTarget = null;
}

function hasGuideBeenSeenForCurrentVersion() {
  settings.quickHelp = normalizeQuickHelp(settings.quickHelp);
  if (!settings.quickHelp.lastSeenVersion) return false;
  if (appVersion) return settings.quickHelp.lastSeenVersion === appVersion;
  return settings.quickHelp.lastSeenVersion === 'dev';
}

function applyQuickHelpSectionVisibility() {
  if (!quickHelpSection) return;
  settings.accessibility = normalizeAccessibility(settings.accessibility);
  const showPanel = settings.accessibility.showGuidePanel !== false;
  quickHelpSection.classList.toggle('hidden', !showPanel);
}

function buildGuideSteps() {
  const maintenanceStep = settings.advancedMode
    ? {
        selector: '#tabMaintenance',
        tab: 'maintenance',
        title: t('renderer.guide.steps.maintenance.title', 'Cuidado del equipo'),
        text: t('renderer.guide.steps.maintenance.text', 'Aqui tienes diagnostico, limpieza de Chrome y tareas de mantenimiento.')
      }
    : {
        selector: '#advancedModeToggle',
        tab: 'shortcuts',
        title: t('renderer.guide.steps.advancedMode.title', 'Modo avanzado'),
        text: t('renderer.guide.steps.advancedMode.text', 'Activa este ajuste si quieres ver herramientas de mantenimiento.')
      };

  return [
    {
      selector: '#addBtn',
      tab: 'shortcuts',
      title: t('renderer.guide.steps.add.title', 'Agregar accesos'),
      text: t('renderer.guide.steps.add.text', 'Pulsa el boton + para agregar un programa, carpeta o pagina web.')
    },
    {
      selector: '#list',
      tab: 'shortcuts',
      title: t('renderer.guide.steps.list.title', 'Tus accesos'),
      text: t('renderer.guide.steps.list.text', 'Cada item muestra su informacion a la izquierda y botones a la derecha para editar, iniciar o fijar.')
    },
    {
      selector: '#shortcutSearch',
      tab: 'shortcuts',
      title: t('renderer.guide.steps.search.title', 'Busqueda rapida'),
      text: t('renderer.guide.steps.search.text', 'Escribe aqui para encontrar accesos mas rapido.')
    },
    {
      selector: '#accessibilityMenuToggle',
      tab: 'shortcuts',
      title: t('renderer.guide.steps.accessibility.title', 'Accesibilidad'),
      text: t('renderer.guide.steps.accessibility.text', 'Desde aqui ajustas texto, contraste y la forma en que se acomodan los botones.')
    },
    maintenanceStep
  ];
}

function renderGuideStep() {
  if (!guideTour || guideSteps.length === 0) return;
  const step = guideSteps[guideIndex];
  if (!step) return;

  setActiveTab(step.tab || 'shortcuts');
  clearGuideTarget();

  const target = document.querySelector(step.selector);
  if (target instanceof HTMLElement) {
    activeGuideTarget = target;
    activeGuideTarget.classList.add('guide-target');
    activeGuideTarget.scrollIntoView({
      behavior: settings.accessibility.reduceMotion ? 'auto' : 'smooth',
      block: 'center',
      inline: 'nearest'
    });
  }

  if (guideStep) {
    guideStep.textContent = t('renderer.guide.stepCounter', 'Paso {current} de {total}', {
      current: guideIndex + 1,
      total: guideSteps.length
    });
  }
  if (guideTitle) guideTitle.textContent = step.title;
  if (guideText) guideText.textContent = step.text;
  if (guidePrev) guidePrev.disabled = guideIndex === 0;
  if (guideNext) {
    guideNext.textContent = guideIndex === guideSteps.length - 1
      ? t('renderer.guide.finish', 'Finalizar')
      : t('renderer.guide.next', 'Siguiente');
  }
}

function shouldAutoStartGuide() {
  const quickHelp = normalizeQuickHelp(settings.quickHelp);
  settings.quickHelp = quickHelp;
  settings.accessibility = normalizeAccessibility(settings.accessibility);
  if (!settings.accessibility.showGuidePanel) return false;
  if (!quickHelp.enabled) return false;
  if (!appVersion) return !quickHelp.lastSeenVersion;
  return quickHelp.lastSeenVersion !== appVersion;
}

function startGuideTour() {
  if (!guideTour) return;
  guideSteps = buildGuideSteps();
  guideIndex = 0;
  guideTour.classList.remove('hidden');
  renderGuideStep();
}

async function closeGuideTour(markSeen, completed = false) {
  if (!guideTour || guideTour.classList.contains('hidden')) return;
  guideTour.classList.add('hidden');
  clearGuideTarget();
  guideSteps = [];
  guideIndex = 0;

  if (!markSeen) return;
  settings.quickHelp = normalizeQuickHelp(settings.quickHelp);
  settings.quickHelp.lastSeenVersion = appVersion || settings.quickHelp.lastSeenVersion || 'dev';
  if (completed) {
    settings.accessibility = normalizeAccessibility(settings.accessibility);
    settings.accessibility.showGuidePanel = false;
    applyQuickHelpSectionVisibility();
  }
  try {
    await window.api.saveSettings(settings);
  } catch {
    showToast({
      type: 'error',
      title: t('renderer.toasts.guideTitle', 'Guia'),
      message: t('renderer.errors.cannotSaveGuideState', 'No se pudo guardar el estado de la guia.')
    });
  }
}

function setUpdateStatus(state, detail) {
  updateState = state || 'idle';
  switch (state) {
    case 'checking':
      updateStatus.textContent = t('renderer.updates.checking', 'Verificando...');
      checkUpdates.textContent = t('renderer.updates.buttonChecking', 'Buscando...');
      break;
    case 'available':
      updateStatus.textContent = t('renderer.updates.available', 'Hay una actualizacion disponible');
      checkUpdates.textContent = t('renderer.updates.buttonUpdate', 'Actualizar');
      break;
    case 'downloading':
      updateStatus.textContent = t('renderer.updates.downloading', 'Descargando {percent}%', { percent: detail || 0 });
      checkUpdates.textContent = t('renderer.updates.buttonDownloading', 'Descargando');
      break;
    case 'downloaded':
      updateStatus.textContent = t('renderer.updates.downloaded', 'Actualizacion lista para instalar');
      checkUpdates.textContent = t('renderer.updates.buttonInstall', 'Reiniciar y actualizar');
      break;
    case 'latest':
      updateStatus.textContent = t('renderer.updates.latest', 'Ya tienes la ultima version');
      checkUpdates.textContent = t('renderer.updates.buttonCheck', 'Buscar actualizaciones');
      break;
    case 'dev':
      updateStatus.textContent = t('renderer.updates.devOnly', 'Disponible solo en produccion');
      checkUpdates.textContent = t('renderer.updates.buttonCheck', 'Buscar actualizaciones');
      break;
    case 'error':
      updateStatus.textContent = t('renderer.updates.error', 'Error: {detail}', { detail: detail || '' }).trim();
      checkUpdates.textContent = t('renderer.updates.buttonCheck', 'Buscar actualizaciones');
      break;
    case 'idle':
      updateStatus.textContent = t('renderer.updates.autoOff', 'Actualizacion automatica desactivada');
      checkUpdates.textContent = t('renderer.updates.buttonCheck', 'Buscar actualizaciones');
      break;
    default:
      updateStatus.textContent = t('renderer.updates.none', '-');
      checkUpdates.textContent = t('renderer.updates.buttonCheck', 'Buscar actualizaciones');
      break;
  }
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
      admin.textContent = t('renderer.labels.requiresAdmin', 'Requiere administrador');
      info.appendChild(admin);
    }

    const run = document.createElement('button');
    run.className = 'run-btn start-btn';
    run.textContent = t('renderer.labels.run', 'Iniciar');
    run.title = t('renderer.labels.runTaskTitle', 'Iniciar esta tarea');
    run.addEventListener('click', async () => {
      const ok = await openConfirm(t('renderer.confirm.runAction', 'Deseas iniciar "{name}"?', { name: action.name }));
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
    diagnosticMeta.textContent = t('renderer.diagnostic.noData', 'Sin datos de diagnostico.');
    return;
  }

  const freeText = diagnostic.stats && diagnostic.stats.totalGB
    ? t('renderer.diagnostic.freeSpace', 'Espacio libre: {free} GB / {total} GB.', {
        free: diagnostic.stats.freeGB,
        total: diagnostic.stats.totalGB
      })
    : t('renderer.diagnostic.freeSpaceUnknown', 'Espacio libre: no disponible.');
  const uptimeText = diagnostic.stats
    ? t('renderer.diagnostic.uptime', 'Uptime: {hours} horas.', { hours: diagnostic.stats.uptimeHours })
    : t('renderer.diagnostic.uptimeUnknown', 'Uptime: no disponible.');
  const when = diagnostic.generatedAt
    ? t('renderer.diagnostic.lastDiagnostic', 'Ultimo diagnostico: {date}.', {
        date: new Date(diagnostic.generatedAt).toLocaleString()
      })
    : t('renderer.diagnostic.lastDiagnosticUnknown', 'Ultimo diagnostico: no disponible.');

  diagnosticMeta.textContent = `${when} ${freeText} ${uptimeText}`;

  if (!diagnostic.recommendations || diagnostic.recommendations.length === 0) {
    const li = document.createElement('li');
    li.textContent = t('renderer.diagnostic.noRecommendations', 'Sin recomendaciones por ahora.');
    diagnosticList.appendChild(li);
    return;
  }

  diagnostic.recommendations.forEach((rec) => {
    const li = document.createElement('li');
    li.textContent = rec.text;
    if (rec.actionId) {
      const btn = document.createElement('button');
      btn.className = 'run-btn start-btn';
      btn.textContent = t('renderer.labels.run', 'Iniciar');
      btn.title = t('renderer.labels.runRecommendationTitle', 'Iniciar esta recomendacion');
      btn.addEventListener('click', async () => {
        const action = maintenanceActions.find((item) => item.id === rec.actionId);
        const label = action ? action.name : t('renderer.diagnostic.defaultActionLabel', 'esta accion');
        const ok = await openConfirm(t('renderer.confirm.runAction', 'Deseas iniciar "{name}"?', { name: label }));
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
    empty.textContent = t('renderer.hint.noChromeProfiles', 'No se encontraron perfiles de Chrome.');
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
  toggleOutput.textContent = outputVisible
    ? t('renderer.output.hide', 'Ocultar detalles')
    : t('renderer.output.show', 'Mostrar detalles');
}

function toggleAddMenu(show) {
  if (show) addMenu.classList.remove('hidden');
  else addMenu.classList.add('hidden');
}

function isVisible(element) {
  return element && !element.classList.contains('hidden');
}

function clearShortcutSearchValue() {
  if (!shortcutSearch.value) return;
  shortcutSearch.value = '';
  updateSearchActions();
  render();
}

function updateSearchActions() {
  const hasQuery = (shortcutSearch.value || '').trim().length > 0;
  clearShortcutSearch.classList.toggle('hidden', !hasQuery);
}

addBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleAddMenu(addMenu.classList.contains('hidden'));
});

addShortcutInline.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  toggleAddMenu(true);
});

shortcutSearch.addEventListener('input', () => {
  updateSearchActions();
  render();
});

shortcutSearch.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    clearShortcutSearchValue();
    shortcutSearch.blur();
  }
});

clearShortcutSearch.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  clearShortcutSearchValue();
  shortcutSearch.focus();
});

importShortcutsBtn.addEventListener('click', async () => {
  const result = await window.api.importShortcuts();
  if (!result || result.canceled) return;
  if (!result.success) {
    showToast({
      type: 'error',
      title: t('renderer.toasts.importErrorTitle', 'Importacion fallida'),
      message: result.message || t('renderer.toasts.importErrorMessage', 'No se pudo importar el archivo.'),
      category: 'important'
    });
    return;
  }
  shortcuts = normalizeShortcuts(result.items || []);
  await save();
  showToast({
    type: 'success',
    title: t('renderer.toasts.importOkTitle', 'Importacion completa'),
    message: t('renderer.toasts.importOkMessage', 'Se cargaron {count} accesos.', { count: shortcuts.length }),
    category: 'interface'
  });
});

exportShortcutsBtn.addEventListener('click', async () => {
  const result = await window.api.exportShortcuts(shortcuts);
  if (!result || result.canceled) return;
  if (!result.success) {
    showToast({
      type: 'error',
      title: t('renderer.toasts.exportErrorTitle', 'Exportacion fallida'),
      message: result.message || t('renderer.toasts.exportErrorMessage', 'No se pudo exportar el archivo.'),
      category: 'important'
    });
    return;
  }
  showToast({
    type: 'success',
    title: t('renderer.toasts.exportOkTitle', 'Exportacion completa'),
    message: t('renderer.toasts.exportOkMessage', 'Accesos exportados correctamente.'),
    category: 'interface'
  });
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    shortcutSearch.focus();
    shortcutSearch.select();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'x') {
    e.preventDefault();
    clearShortcutSearchValue();
    shortcutSearch.focus();
    return;
  }

  if (e.key === 'Escape') {
    if (isVisible(guideTour)) {
      e.preventDefault();
      closeGuideTour(true, false).catch(() => {
        showToast({
          type: 'error',
          title: t('renderer.toasts.guideTitle', 'Guia'),
          message: t('renderer.errors.cannotRunGuideSave', 'No se pudo guardar el estado de la guia.')
        });
      });
      return;
    }
    if (isVisible(modal)) {
      e.preventDefault();
      closeModal(null);
      return;
    }
    if (isVisible(confirmModal)) {
      e.preventDefault();
      closeConfirm(false);
      return;
    }
    if (isVisible(addMenu)) {
      e.preventDefault();
      toggleAddMenu(false);
      return;
    }
    if (isVisible(settingsMenu)) {
      e.preventDefault();
      toggleSettingsMenu(false).catch(() => {
        showToast({
          type: 'error',
          title: t('renderer.toasts.settingsTitle', 'Ajustes'),
          message: t('renderer.errors.cannotCloseSettings', 'No se pudo cerrar el menu de ajustes.'),
          category: 'important'
        });
      });
      return;
    }
    if (isVisible(accessibilityMenu)) {
      e.preventDefault();
      toggleAccessibilityMenu(false).catch(() => {
        showToast({
          type: 'error',
          title: t('renderer.toasts.accessibilityTitle', 'Accesibilidad'),
          message: t('renderer.errors.cannotToggleAccessibility', 'No se pudo actualizar la visibilidad del menu.')
        });
      });
      return;
    }
    if (shortcutSearch.value) {
      e.preventDefault();
      clearShortcutSearchValue();
    }
    return;
  }

  if (e.key === 'Enter') {
    if (isVisible(guideTour)) {
      e.preventDefault();
      if (guideIndex >= guideSteps.length - 1) {
        closeGuideTour(true, true).catch(() => {
          showToast({
            type: 'error',
            title: t('renderer.toasts.guideTitle', 'Guia'),
            message: t('renderer.errors.cannotRunGuideSave', 'No se pudo guardar el estado de la guia.')
          });
        });
      } else {
        guideIndex += 1;
        renderGuideStep();
      }
      return;
    }
    if (isVisible(modal)) {
      e.preventDefault();
      closeModal(modalInput.value.trim());
      return;
    }
    if (isVisible(confirmModal)) {
      e.preventDefault();
      closeConfirm(true);
    }
  }
});

document.addEventListener('click', (e) => {
  const target = e.target;
  if (!(target instanceof Element)) {
    toggleAddMenu(false);
    toggleSettingsMenu(false).catch(() => {
      showToast({
        type: 'error',
        title: t('renderer.toasts.settingsTitle', 'Ajustes'),
        message: t('renderer.errors.cannotCloseSettings', 'No se pudo cerrar el menu de ajustes.'),
        category: 'important'
      });
    });
    return;
  }
  if (!target.closest('.add-wrap')) {
    toggleAddMenu(false);
  }
  if (!target.closest('.settings-wrap')) {
    toggleSettingsMenu(false).catch(() => {
      showToast({
        type: 'error',
        title: t('renderer.toasts.settingsTitle', 'Ajustes'),
        message: t('renderer.errors.cannotCloseSettings', 'No se pudo cerrar el menu de ajustes.'),
        category: 'important'
      });
    });
  }
});

addMenu.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-add]');
  if (!btn) return;
  const type = btn.getAttribute('data-add');
  toggleAddMenu(false);

  try {
    const inputName = await openModal(t('renderer.modals.shortcutName', 'Nombre del acceso directo'), '');
    if (!inputName) return;
    const name = await resolveNonDuplicateShortcutName(inputName);
    if (!name) return;

    if (type === 'url') {
      const url = await openModal(t('renderer.modals.url', 'URL'), 'https://');
      if (!url) return;
      const integrity = await verifyUrlIntegrity(url);
      if (integrity.reason === 'format' || integrity.reason === 'protocol' || integrity.reason === 'empty') {
        showToast({
          type: 'error',
          title: t('renderer.integrity.urlInvalidTitle', 'URL no valida'),
          message: buildIntegrityMessage('url', integrity),
          category: 'important'
        });
        return;
      }
      if (!integrity.ok) {
        const shouldSave = await openConfirm(t('renderer.confirm.saveInvalidUrl', '{message}\n\nDeseas guardar el acceso igualmente?', {
          message: buildIntegrityMessage('url', integrity)
        }));
        if (!shouldSave) return;
      }
      shortcuts.push({ id: `sc_${Date.now()}_${Math.random().toString(16).slice(2)}`, name, type: 'url', url: url.trim(), usageCount: 0, lastUsed: null });
      await save();
      showToast({
        type: 'success',
        title: t('renderer.toasts.addedAccessTitle', 'Acceso agregado'),
        message: t('renderer.toasts.addedWebMessage', 'Se agrego el enlace web.'),
        category: 'access'
      });
      return;
    }

    if (type === 'exe') {
      const path = await window.api.pickExe();
      if (!path) return;
      const exists = await window.api.validatePath(path);
      if (!exists) {
        showToast({
          type: 'error',
          title: t('renderer.integrity.pathInvalidTitle', 'Ruta no disponible'),
          message: t('renderer.integrity.pathMissing', 'La ruta ya no existe o no esta disponible.'),
          category: 'important'
        });
        return;
      }
      shortcuts.push({ id: `sc_${Date.now()}_${Math.random().toString(16).slice(2)}`, name, type: 'exe', path, usageCount: 0, lastUsed: null });
      await save();
      showToast({
        type: 'success',
        title: t('renderer.toasts.addedAccessTitle', 'Acceso agregado'),
        message: t('renderer.toasts.addedProgramMessage', 'Se agrego el programa.'),
        category: 'access'
      });
      return;
    }

    if (type === 'folder') {
      const path = await window.api.pickFolder();
      if (!path) return;
      const exists = await window.api.validatePath(path);
      if (!exists) {
        showToast({
          type: 'error',
          title: t('renderer.integrity.pathInvalidTitle', 'Ruta no disponible'),
          message: t('renderer.integrity.pathMissing', 'La ruta ya no existe o no esta disponible.'),
          category: 'important'
        });
        return;
      }
      shortcuts.push({ id: `sc_${Date.now()}_${Math.random().toString(16).slice(2)}`, name, type: 'folder', path, usageCount: 0, lastUsed: null });
      await save();
      showToast({
        type: 'success',
        title: t('renderer.toasts.addedAccessTitle', 'Acceso agregado'),
        message: t('renderer.toasts.addedFolderMessage', 'Se agrego la carpeta.'),
        category: 'access'
      });
    }
  } catch {
    showToast({
      type: 'error',
      title: t('renderer.toasts.cannotCreateTitle', 'No se pudo crear el acceso'),
      message: t('renderer.toasts.cannotCreateMessage', 'Ocurrio un error inesperado. Intenta de nuevo.'),
      category: 'important'
    });
  }
});

window.api.onMenuAction(async ({ action, index }) => {
  const item = shortcuts[index];
  if (!item) return;

  if (action === 'run') {
    await runShortcutWithIntegrity(item);
    return;
  }

  if (action === 'check-integrity') {
    const integrity = await verifyItemIntegrity(item, { showOkToast: true });
    if (!integrity.ok) {
      showToast({
        type: 'error',
        title: item.type === 'url'
          ? t('renderer.integrity.urlTitle', 'Integridad URL')
          : t('renderer.integrity.pathTitle', 'Integridad ruta'),
        message: integrity.message,
        category: 'important'
      });
    }
    return;
  }

  if (action === 'edit-name') {
    const name = await openModal(t('renderer.modals.editName', 'Editar nombre'), item.name || '');
    if (name) {
      if (hasDuplicateShortcutName(name, item.id)) {
        showToast({
          type: 'error',
          title: t('renderer.toasts.duplicateNameTitle', 'Nombre duplicado'),
          message: t('renderer.toasts.duplicateNameMessage', 'Ya existe un acceso con ese nombre. Usa un nombre diferente.'),
          category: 'important'
        });
        return;
      }
      item.name = name;
      await save();
      showToast({
        type: 'success',
        title: t('renderer.toasts.savedTitle', 'Guardado'),
        message: t('renderer.toasts.nameUpdated', 'Nombre actualizado.'),
        category: 'access'
      });
    }
    return;
  }

  if (action === 'edit-path') {
    if (item.type === 'url') {
      const url = await openModal(t('renderer.modals.editUrl', 'Editar URL'), item.url || 'https://');
      if (!url) return;
      const integrity = await verifyUrlIntegrity(url);
      if (integrity.reason === 'format' || integrity.reason === 'protocol' || integrity.reason === 'empty') {
        showToast({
          type: 'error',
          title: t('renderer.integrity.urlInvalidTitle', 'URL no valida'),
          message: buildIntegrityMessage('url', integrity),
          category: 'important'
        });
        return;
      }
      if (!integrity.ok) {
        const shouldSave = await openConfirm(t('renderer.confirm.saveInvalidUrlEdit', '{message}\n\nDeseas guardar la URL igualmente?', {
          message: buildIntegrityMessage('url', integrity)
        }));
        if (!shouldSave) return;
      }
      item.url = url.trim();
      await save();
      showToast({
        type: 'success',
        title: t('renderer.toasts.savedTitle', 'Guardado'),
        message: t('renderer.toasts.linkUpdated', 'Enlace actualizado.'),
        category: 'access'
      });
      return;
    }

    const path = item.type === 'folder'
      ? await window.api.pickFolder()
      : await window.api.pickExe();
    if (path) {
      const exists = await window.api.validatePath(path);
      if (!exists) {
        showToast({
          type: 'error',
          title: t('renderer.integrity.pathInvalidTitle', 'Ruta no disponible'),
          message: t('renderer.integrity.pathMissing', 'La ruta ya no existe o no esta disponible.'),
          category: 'important'
        });
        return;
      }
      item.path = path;
      await save();
      showToast({
        type: 'success',
        title: t('renderer.toasts.savedTitle', 'Guardado'),
        message: t('renderer.toasts.pathUpdated', 'Ruta actualizada.'),
        category: 'access'
      });
    }
    return;
  }

  if (action === 'delete') {
    clearPendingUndoDelete();
    const removed = shortcuts[index];
    if (!removed) return;
    shortcuts.splice(index, 1);
    await save();
    pendingUndoDelete = {
      timerId: setTimeout(() => {
        pendingUndoDelete = null;
      }, 8000),
      item: removed,
      index
    };
      showToast({
        type: 'info',
        title: t('renderer.toasts.deletedTitle', 'Acceso eliminado'),
        message: t('renderer.toasts.deletedMessage', 'Se elimino "{name}".', {
          name: removed.name || t('renderer.labels.noName', 'Sin nombre')
        }),
        duration: 8000,
        actionLabel: t('renderer.toasts.undoAction', 'Deshacer'),
        category: 'access',
        action: async () => {
        if (!pendingUndoDelete) return;
        const restoredName = await resolveNonDuplicateShortcutName(pendingUndoDelete.item.name || '');
        if (!restoredName) return;
        pendingUndoDelete.item.name = restoredName;
        const safeIndex = Math.max(0, Math.min(shortcuts.length, pendingUndoDelete.index));
        shortcuts.splice(safeIndex, 0, pendingUndoDelete.item);
        clearPendingUndoDelete();
        await save();
        showToast({
          type: 'success',
          title: t('renderer.toasts.restoredTitle', 'Restaurado'),
          message: t('renderer.toasts.restoredMessage', 'El acceso fue restaurado.'),
          category: 'access'
        });
      }
    });
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
  if (window.api.getI18n) {
    try {
      const loaded = await window.api.getI18n();
      if (loaded && typeof loaded === 'object') {
        i18n = loaded;
      }
    } catch {
      i18n = {};
    }
  }
  applyStaticI18n();

  const appInfo = await window.api.getAppInfo();
  appVersion = appInfo && appInfo.version ? String(appInfo.version) : '';
  isPackaged = appInfo && appInfo.packaged === true;
  shortcuts = await window.api.getShortcuts();
  shortcuts = normalizeShortcuts(shortcuts);
  settings = await window.api.getSettings();
  settings.autoUpdateCheck = settings.autoUpdateCheck !== false;
  settings.notificationsEnabled = settings.notificationsEnabled !== false;
  settings.advancedMode = settings.advancedMode === true;
  settings.accessibility = normalizeAccessibility(settings.accessibility);
  settings.quickHelp = normalizeQuickHelp(settings.quickHelp);
  settings.uiHints = normalizeUiHints(settings.uiHints);
  if (hasGuideBeenSeenForCurrentVersion() && settings.accessibility.showGuidePanel !== false) {
    settings.accessibility.showGuidePanel = false;
    try {
      await window.api.saveSettings(settings);
    } catch {
      // Si falla el guardado, mantenemos el ajuste en memoria.
    }
  }
  maintenanceActions = await window.api.getMaintenanceActions();
  diagnostic = await window.api.getDiagnostic();
  chromeProfileList = await window.api.getChromeProfiles();
  keepInTrayToggle.checked = settings.keepInTray;
  if (!isPackaged) {
    keepInTrayToggle.checked = false;
    keepInTrayToggle.disabled = true;
  }
  startWithWindowsToggle.checked = settings.launchOnStartup === true;
  autoUpdateToggle.checked = settings.autoUpdateCheck === true;
  if (notificationsToggle) notificationsToggle.checked = settings.notificationsEnabled === true;
  advancedModeToggle.checked = settings.advancedMode === true;
  if (guideAutoToggle) guideAutoToggle.checked = settings.quickHelp.enabled;
  await setSettingsMenuVisible(false, false);
  applySettingsHintState();
  applyTheme(settings.theme);
  applyAccessibilityPreferences(settings.accessibility);
  applyAdvancedMode(settings.advancedMode);
  const dismissedVersion = settings.accessibility.menuDismissedVersion;
  const shouldShowAccessibilityMenu = !dismissedVersion || (appVersion && dismissedVersion !== appVersion);
  await setAccessibilityMenuVisible(shouldShowAccessibilityMenu, false);
  if (shouldShowAccessibilityMenu && dismissedVersion) {
    settings.accessibility.menuDismissedVersion = null;
    await persistAccessibilitySettings('');
  }
  render();
  renderMaintenance();
  renderDiagnostic();
  renderChromeProfiles();
  refreshChromeStatus();
  updateSearchActions();
  setActiveTab('shortcuts');
  if (shouldHighlightSettingsMenu()) {
    showToast({
      type: 'info',
      title: t('renderer.toasts.quickTipTitle', 'Consejo rapido'),
      message: t('renderer.hint.settingsQuickTip', 'Pulsa Ajustes para configurar la app. Si el texto se ve pequeno, en Accesibilidad puedes agrandarlo.'),
      duration: 9000,
      category: 'interface',
      actionLabel: t('renderer.toasts.openAccessibilityAction', 'Abrir accesibilidad'),
      action: () => {
        toggleSettingsMenu(true)
          .then(() => setAccessibilityMenuVisible(true))
          .catch(() => {
            showToast({
              type: 'error',
              title: t('renderer.toasts.settingsTitle', 'Ajustes'),
              message: t('renderer.errors.cannotOpenAccessibility', 'No se pudo abrir el menu de accesibilidad.'),
              category: 'important'
            });
          });
      }
    });
  }
  if (shouldAutoStartGuide()) {
    setTimeout(() => startGuideTour(), 260);
  }
  if (settings.autoUpdateCheck) {
    const updateInit = await window.api.checkUpdates();
    if (updateInit && updateInit.state) setUpdateStatus(updateInit.state);
  } else {
    setUpdateStatus('idle');
  }
})();

keepInTrayToggle.addEventListener('change', async () => {
  if (!isPackaged) {
    settings.keepInTray = false;
    keepInTrayToggle.checked = false;
    await window.api.saveSettings(settings);
    showToast({
      type: 'info',
      title: t('renderer.toasts.settingsSavedTitle', 'Ajuste guardado'),
      message: t('renderer.toasts.backgroundOff', 'La app se cerrara por completo al salir.'),
      category: 'interface'
    });
    return;
  }

  settings.keepInTray = keepInTrayToggle.checked;
  await window.api.saveSettings(settings);
  showToast({
    type: 'success',
    title: t('renderer.toasts.settingsSavedTitle', 'Ajuste guardado'),
    message: settings.keepInTray
      ? t('renderer.toasts.backgroundOn', 'La app seguira activa en segundo plano al cerrar.')
      : t('renderer.toasts.backgroundOff', 'La app se cerrara por completo al salir.'),
    category: 'interface'
  });
});

startWithWindowsToggle.addEventListener('change', async () => {
  settings.launchOnStartup = startWithWindowsToggle.checked;
  await window.api.saveSettings(settings);
  showToast({
    type: 'success',
    title: t('renderer.toasts.settingsSavedTitle', 'Ajuste guardado'),
    message: settings.launchOnStartup
      ? t('renderer.toasts.startupOn', 'La app se abrira automaticamente al encender la PC.')
      : t('renderer.toasts.startupOff', 'La app ya no se abrira automaticamente al encender la PC.'),
    category: 'interface'
  });
});

autoUpdateToggle.addEventListener('change', async () => {
  settings.autoUpdateCheck = autoUpdateToggle.checked;
  await window.api.saveSettings(settings);
  if (settings.autoUpdateCheck) {
    const result = await window.api.checkUpdates();
    if (result && result.state) setUpdateStatus(result.state);
  } else {
    setUpdateStatus('idle');
  }
  showToast({
    type: 'success',
    title: t('renderer.toasts.settingsSavedTitle', 'Ajuste guardado'),
    message: settings.autoUpdateCheck
      ? t('renderer.toasts.autoUpdatesOn', 'Busqueda automatica de actualizaciones activada.')
      : t('renderer.toasts.autoUpdatesOff', 'Busqueda automatica de actualizaciones desactivada.'),
    category: 'interface'
  });
});

if (notificationsToggle) {
  notificationsToggle.addEventListener('change', async () => {
    settings.notificationsEnabled = notificationsToggle.checked;
    await window.api.saveSettings(settings);
    showToast({
      type: 'info',
      title: t('renderer.toasts.notificationsTitle', 'Notificaciones'),
      message: settings.notificationsEnabled
        ? t('renderer.toasts.notificationsOn', 'Notificaciones activadas.')
        : t('renderer.toasts.notificationsOff', 'Notificaciones desactivadas.'),
      category: 'interface',
      allowWhenMuted: true
    });
  });
}

advancedModeToggle.addEventListener('change', async () => {
  settings.advancedMode = advancedModeToggle.checked;
  applyAdvancedMode(settings.advancedMode);
  await window.api.saveSettings(settings);
  showToast({
    type: 'info',
    title: t('renderer.toasts.interfaceModeTitle', 'Modo de interfaz'),
    message: settings.advancedMode
      ? t('renderer.toasts.advancedOn', 'Modo avanzado activado.')
      : t('renderer.toasts.advancedOff', 'Modo simple activado.'),
    category: 'interface'
  });
});

if (clearAppCacheBtn) {
  clearAppCacheBtn.addEventListener('click', async () => {
    const confirmed = await openConfirm(t(
      'renderer.confirm.clearAppCache',
      'Se borraran cache y datos locales de la app (accesos, ajustes y preferencias).\n\nDeseas continuar? La app se relanzara automaticamente.'
    ));
    if (!confirmed) return;

    const result = await window.api.clearAppCache();
    if (!result || result.ok !== true) {
      showToast({
        type: 'error',
        title: t('renderer.toasts.settingsTitle', 'Ajustes'),
        message: (result && result.message) || t('renderer.toasts.clearCacheFailed', 'No se pudo limpiar la cache de la app.'),
        category: 'important'
      });
      return;
    }

    showToast({
      type: 'info',
      title: t('renderer.toasts.settingsTitle', 'Ajustes'),
      message: t('renderer.toasts.clearCacheRestarting', 'Se limpiaran cache y datos. La app se reiniciara ahora.'),
      category: 'important'
    });
  });
}

if (settingsMenuToggle) {
  settingsMenuToggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSettingsMenu().catch(() => {
      showToast({
        type: 'error',
        title: t('renderer.toasts.settingsTitle', 'Ajustes'),
        message: t('renderer.errors.cannotOpenSettings', 'No se pudo abrir el menu de ajustes.'),
        category: 'important'
      });
    });
  });
}

if (settingsMenu) {
  settingsMenu.addEventListener('click', (e) => e.stopPropagation());
}

if (accessibilityMenuToggle) {
  accessibilityMenuToggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleAccessibilityMenu().catch(() => {
      showToast({
        type: 'error',
        title: t('renderer.toasts.accessibilityTitle', 'Accesibilidad'),
        message: t('renderer.errors.cannotToggleAccessibility', 'No se pudo actualizar la visibilidad del menu.')
      });
    });
  });
}

if (accessibilityMenu) {
  accessibilityMenu.addEventListener('click', (e) => e.stopPropagation());
}

if (fontSizeSelect) {
  fontSizeSelect.addEventListener('change', async () => {
    settings.accessibility.fontSize = fontSizeSelect.value;
    await persistAccessibilitySettings(t('renderer.accessibility.fontSizeUpdated', 'Tamano de texto actualizado.'));
  });
}

if (highContrastToggle) {
  highContrastToggle.addEventListener('change', async () => {
    settings.accessibility.highContrast = highContrastToggle.checked;
    await persistAccessibilitySettings(t('renderer.accessibility.highContrastUpdated', 'Alto contraste actualizado.'));
  });
}

if (reduceMotionToggle) {
  reduceMotionToggle.addEventListener('change', async () => {
    settings.accessibility.reduceMotion = reduceMotionToggle.checked;
    await persistAccessibilitySettings(t('renderer.accessibility.reduceMotionUpdated', 'Preferencia de animacion actualizada.'));
  });
}

if (focusBoostToggle) {
  focusBoostToggle.addEventListener('change', async () => {
    settings.accessibility.focusBoost = focusBoostToggle.checked;
    await persistAccessibilitySettings(t('renderer.accessibility.focusBoostUpdated', 'Resaltado de foco actualizado.'));
  });
}

if (comfortableSpacingToggle) {
  comfortableSpacingToggle.addEventListener('change', async () => {
    settings.accessibility.comfortableSpacing = comfortableSpacingToggle.checked;
    await persistAccessibilitySettings(t('renderer.accessibility.spacingUpdated', 'Espaciado actualizado.'));
  });
}

if (actionsRightToggle) {
  actionsRightToggle.addEventListener('change', async () => {
    settings.accessibility.actionsRight = actionsRightToggle.checked;
    await persistAccessibilitySettings(actionsRightToggle.checked
      ? t('renderer.accessibility.actionsRightOn', 'Botones a la derecha activados.')
      : t('renderer.accessibility.actionsRightOff', 'Botones debajo de la informacion activados.'));
  });
}

if (showGuidePanelToggle) {
  showGuidePanelToggle.addEventListener('change', async () => {
    settings.accessibility.showGuidePanel = showGuidePanelToggle.checked;
    await persistAccessibilitySettings(
      showGuidePanelToggle.checked
        ? t('renderer.toasts.showGuidePanelOn', 'Menu de guia asistida visible.')
        : t('renderer.toasts.showGuidePanelOff', 'Menu de guia asistida oculto.')
    );
  });
}

if (startGuide) {
  startGuide.addEventListener('click', () => {
    startGuideTour();
  });
}

if (guideAutoToggle) {
  guideAutoToggle.addEventListener('change', async () => {
    settings.quickHelp = normalizeQuickHelp(settings.quickHelp);
    settings.quickHelp.enabled = guideAutoToggle.checked;
    await window.api.saveSettings(settings);
    showToast({
      type: 'success',
      title: t('renderer.toasts.guideTitle', 'Guia'),
      message: settings.quickHelp.enabled
        ? t('renderer.toasts.guideAutoOn', 'La guia automatica queda activa para futuras versiones.')
        : t('renderer.toasts.guideAutoOff', 'La guia automatica se desactivo.'),
      category: 'interface'
    });
  });
}

if (guideClose) {
  guideClose.addEventListener('click', async () => {
    await closeGuideTour(true, false);
  });
}

if (guidePrev) {
  guidePrev.addEventListener('click', () => {
    if (guideIndex <= 0) return;
    guideIndex -= 1;
    renderGuideStep();
  });
}

if (guideNext) {
  guideNext.addEventListener('click', async () => {
    if (guideIndex >= guideSteps.length - 1) {
      await closeGuideTour(true, true);
      return;
    }
    guideIndex += 1;
    renderGuideStep();
  });
}

themeToggle.addEventListener('click', async () => {
  settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
  applyTheme(settings.theme);
  await window.api.saveSettings(settings);
});

checkUpdates.addEventListener('click', async () => {
  if (updateState === 'downloaded') {
    const ok = await openConfirm(t('renderer.confirm.updateReady', 'Hay una actualizacion lista. La app se cerrara para instalarla. Continuar?'));
    if (!ok) return;
    await window.api.installUpdate();
    return;
  }

  const result = await window.api.checkUpdates();
  if (result && result.state) setUpdateStatus(result.state);
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

window.api.onUpdateStatus(({ state, percent, message }) => {
  setUpdateStatus(state, percent || message);
  if (state === 'error') {
    const details = typeof message === 'string' ? message : String(message || '');
    if (isPackaged) {
      showToast({
        type: 'error',
        title: t('html.header.updatesButton', 'Buscar actualizaciones'),
        message: details || t('main.updates.unavailable', 'No disponible temporalmente.'),
        category: 'important'
      });
    } else {
      showToast({
        type: 'error',
        title: t('renderer.toasts.devUpdateErrorTitle', 'Error de updates (DEV)'),
        message: details || t('main.updates.unavailable', 'No disponible temporalmente.'),
        duration: 0,
        actionLabel: t('renderer.toasts.copyDetailsAction', 'Copiar detalle'),
        action: () => copyToClipboard(details || t('main.updates.unavailable', 'No disponible temporalmente.')),
        category: 'important'
      });
    }
  }
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
    showToast({
      type: 'error',
      title: t('renderer.toasts.chromeCleanupTitle', 'Limpieza de Chrome'),
      message: t('renderer.toasts.chromeProfileRequired', 'Selecciona al menos un perfil de Chrome para limpiar.'),
      category: 'important'
    });
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

  const ok = await openConfirm(t(
    'renderer.confirm.chromeCleanup',
    'Deseas iniciar la limpieza de Chrome? Se recomienda cerrar Chrome primero.'
  ));
  if (!ok) return;

  await window.api.runChromeCleanup(options);
  await refreshChromeStatus();
});

