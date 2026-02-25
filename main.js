const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, shell, globalShortcut, session } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const { spawn, execFileSync } = require('child_process');
const os = require('os');

let tray = null;
let mainWindow = null;
let settings = null;
let menuVisible = false;
let downloadedUpdateInfo = null;
const TOP_TRAY_MOST_USED = 2;
const TOP_TRAY_RECENT = 1;
const DIAGNOSTIC_INTERVAL_MS = 6 * 60 * 60 * 1000;
const CURRENT_APP_VERSION = app.getVersion();
const APP_USER_MODEL_ID = 'com.shortcut.tray';
const FONT_SIZE_OPTIONS = new Set(['normal', 'large', 'xlarge']);
const DEFAULT_LOCALE = 'es';
const APP_CSP_HEADER = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https:; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

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

function loadLocaleStrings() {
  const localePath = path.join(__dirname, 'locales', `${DEFAULT_LOCALE}.json`);
  try {
    return JSON.parse(fs.readFileSync(localePath, 'utf8'));
  } catch {
    return {};
  }
}

function applyContentSecurityPolicyHeaders() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const isLocalHtml = details && details.url && details.url.startsWith('file://') && details.resourceType === 'mainFrame';
    if (!isLocalHtml) {
      callback({ responseHeaders: details.responseHeaders || {} });
      return;
    }

    const responseHeaders = details.responseHeaders || {};
    responseHeaders['Content-Security-Policy'] = [APP_CSP_HEADER];
    callback({ responseHeaders });
  });
}

const I18N = loadLocaleStrings();

function t(key, fallback, vars) {
  const raw = getByPath(I18N, key);
  if (typeof raw === 'string') return formatText(raw, vars);
  return formatText(fallback || key, vars);
}

function resolveWindowIcon() {
  const localIcon = path.join(__dirname, 'build', 'icon.ico');
  if (fs.existsSync(localIcon)) return localIcon;
  const fallbackIcon = path.join(__dirname, 'tray.png');
  return fs.existsSync(fallbackIcon) ? fallbackIcon : undefined;
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    app.isQuiting = true;
    app.relaunch();
    app.quit();
  });
}

const maintenanceActions = [
  {
    id: 'cleanmgr_basic',
    name: t('main.maintenance.cleanmgr_basic.name', 'Limpieza de disco'),
    description: t('main.maintenance.cleanmgr_basic.description', 'Abre el limpiador de disco para borrar temporales y otros archivos.'),
    command: 'cleanmgr',
    args: [],
    requiresAdmin: false,
    useCmd: false
  },
  {
    id: 'cleanmgr_sageset',
    name: t('main.maintenance.cleanmgr_sageset.name', 'Configurar limpieza avanzada'),
    description: t('main.maintenance.cleanmgr_sageset.description', 'Permite elegir que categorias se limpiaran (sageset:1).'),
    command: 'cleanmgr',
    args: ['/sageset:1'],
    requiresAdmin: false,
    useCmd: false
  },
  {
    id: 'cleanmgr_sagerun',
    name: t('main.maintenance.cleanmgr_sagerun.name', 'Iniciar limpieza avanzada'),
    description: t('main.maintenance.cleanmgr_sagerun.description', 'Ejecuta la limpieza configurada en sageset:1.'),
    command: 'cleanmgr',
    args: ['/sagerun:1'],
    requiresAdmin: false,
    useCmd: false
  },
  {
    id: 'dism_analyze',
    name: t('main.maintenance.dism_analyze.name', 'Analizar almacen de componentes'),
    description: t('main.maintenance.dism_analyze.description', 'Evalua si el WinSxS se puede limpiar.'),
    command: 'dism',
    args: ['/Online', '/Cleanup-Image', '/AnalyzeComponentStore'],
    requiresAdmin: true,
    useCmd: true
  },
  {
    id: 'dism_cleanup',
    name: t('main.maintenance.dism_cleanup.name', 'Limpiar componentes antiguos'),
    description: t('main.maintenance.dism_cleanup.description', 'Elimina versiones antiguas de componentes.'),
    command: 'dism',
    args: ['/Online', '/Cleanup-Image', '/StartComponentCleanup'],
    requiresAdmin: true,
    useCmd: true
  },
  {
    id: 'sfc_scan',
    name: t('main.maintenance.sfc_scan.name', 'Reparar archivos de sistema'),
    description: t('main.maintenance.sfc_scan.description', 'Ejecuta SFC para reparar archivos del sistema.'),
    command: 'sfc',
    args: ['/scannow'],
    requiresAdmin: true,
    useCmd: true
  }
];

function getDataPath() {
  return path.join(app.getPath('userData'), 'shortcuts.json');
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function normalizeAccessibility(value) {
  const data = value && typeof value === 'object' ? value : {};
  const fontSize = FONT_SIZE_OPTIONS.has(data.fontSize) ? data.fontSize : 'normal';
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
    // Compatibilidad con versiones anteriores.
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

function getDefaultSettings() {
  return {
    keepInTray: true,
    launchOnStartup: false,
    autoUpdateCheck: true,
    notificationsEnabled: true,
    advancedMode: false,
    theme: 'light',
    accessibility: normalizeAccessibility(null),
    quickHelp: normalizeQuickHelp(null),
    uiHints: normalizeUiHints(null),
    diagnostic: { lastRun: null, result: null }
  };
}

function loadSettings() {
  const file = getSettingsPath();
  if (!fs.existsSync(file)) {
    return getDefaultSettings();
  }
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') {
      return getDefaultSettings();
    }
    return {
      keepInTray: data.keepInTray !== false,
      launchOnStartup: data.launchOnStartup === true,
      autoUpdateCheck: data.autoUpdateCheck !== false,
      notificationsEnabled: data.notificationsEnabled !== false,
      advancedMode: data.advancedMode === true,
      theme: data.theme === 'dark' ? 'dark' : 'light',
      accessibility: normalizeAccessibility(data.accessibility),
      quickHelp: normalizeQuickHelp(data.quickHelp),
      uiHints: normalizeUiHints(data.uiHints),
      diagnostic: data.diagnostic && typeof data.diagnostic === 'object'
        ? {
            lastRun: data.diagnostic.lastRun || null,
            result: data.diagnostic.result || null
          }
        : { lastRun: null, result: null }
    };
  } catch {
    return getDefaultSettings();
  }
}

function saveSettings(nextSettings) {
  const file = getSettingsPath();
  fs.writeFileSync(file, JSON.stringify(nextSettings, null, 2), 'utf8');
}

async function clearAppCacheData() {
  const currentSession = mainWindow && !mainWindow.isDestroyed()
    ? mainWindow.webContents.session
    : null;

  if (currentSession) {
    await currentSession.clearCache();
    await currentSession.clearStorageData();
  }

  const dataFiles = [getDataPath(), getSettingsPath()];
  dataFiles.forEach((file) => {
    if (fs.existsSync(file)) {
      fs.rmSync(file, { force: true });
    }
  });
}

function applyLaunchOnStartup(enabled) {
  if (!app.isPackaged) return;
  app.setLoginItemSettings({
    openAtLogin: enabled === true
  });
}

function shouldKeepInTray() {
  return app.isPackaged && settings && settings.keepInTray === true;
}

function loadShortcuts() {
  const file = getDataPath();
  if (!fs.existsSync(file)) return [];
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    const items = Array.isArray(data) ? data : [];
    let mutated = false;
    items.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      if (!item.id) {
        item.id = `sc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        mutated = true;
      }
      if (typeof item.usageCount !== 'number') {
        item.usageCount = 0;
        mutated = true;
      }
      if (!item.lastUsed) {
        item.lastUsed = null;
      }
    });
    if (mutated) saveShortcuts(items);
    return items;
  } catch {
    return [];
  }
}

function saveShortcuts(items) {
  const file = getDataPath();
  fs.writeFileSync(file, JSON.stringify(items, null, 2), 'utf8');
}

function createWindow() {
  const windowIcon = resolveWindowIcon();
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 960,
    minHeight: 640,
    show: false,
    resizable: true,
    icon: windowIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: !app.isPackaged
    }
  });

  mainWindow.loadFile('index.html');

  // En produccion, bloquea los atajos comunes para abrir DevTools.
  if (app.isPackaged) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      const key = String(input.key || '').toUpperCase();
      const isF12 = key === 'F12';
      const isCtrlShiftI = input.control && input.shift && key === 'I';
      const isCtrlShiftJ = input.control && input.shift && key === 'J';
      const isCtrlShiftC = input.control && input.shift && key === 'C';
      if (isF12 || isCtrlShiftI || isCtrlShiftJ || isCtrlShiftC) {
        event.preventDefault();
      }
    });
  }

  mainWindow.on('close', (e) => {
    if (!app.isQuiting && shouldKeepInTray()) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('minimize', (e) => {
    if (shouldKeepInTray()) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function rebuildTrayMenu() {
  const items = loadShortcuts();
  const mostUsed = [...items]
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, TOP_TRAY_MOST_USED);

  const mostRecent = [...items]
    .filter((item) => item && item.lastUsed)
    .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
    .filter((item) => !mostUsed.find((used) => used.id === item.id))
    .slice(0, TOP_TRAY_RECENT);

  const topItems = [...mostUsed, ...mostRecent];

  const template = topItems.map((item) => ({
    label: item.name || item.path || item.url || t('main.tray.unnamed', 'Sin nombre'),
    click: () => openAndTrack(item.id)
  }));

  template.push({ type: 'separator' });
  template.push({ label: t('main.tray.open', 'Abrir'), click: () => mainWindow.show() });
  template.push({ label: t('main.tray.close', 'Cerrar'), click: () => { app.isQuiting = true; app.quit(); } });

  const menu = Menu.buildFromTemplate(template);
  tray.setContextMenu(menu);
}

function createTray() {
  const iconPath = path.join(__dirname, 'tray.png');
  tray = new Tray(iconPath);
  tray.setToolTip(t('main.tray.tooltip', 'Launcher de accesos'));
  tray.on('double-click', () => mainWindow.show());
  rebuildTrayMenu();
}

function getDefaultMenuTemplate() {
  const viewSubmenu = [
    { role: 'reload' },
    ...(app.isPackaged ? [] : [{ role: 'toggledevtools' }]),
    { type: 'separator' },
    { role: 'resetzoom' }, { role: 'zoomin' }, { role: 'zoomout' },
    { type: 'separator' },
    { role: 'togglefullscreen' }
  ];

  return [
    {
      label: t('main.appMenu.file', 'File'),
      submenu: [{ role: 'quit' }]
    },
    {
      label: t('main.appMenu.edit', 'Edit'),
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
      ]
    },
    {
      label: t('main.appMenu.view', 'View'),
      submenu: viewSubmenu
    },
    {
      label: t('main.appMenu.window', 'Window'),
      submenu: [{ role: 'minimize' }, { role: 'close' }]
    },
    {
      label: t('main.appMenu.help', 'Help'),
      submenu: []
    }
  ];
}

async function openAndTrack(itemId) {
  const items = loadShortcuts();
  const item = items.find((entry) => entry && entry.id === itemId);
  if (!item) return { ok: false, reason: 'not_found' };

  if (item.type === 'url' && item.url) {
    const check = await validateUrlIntegrity(item.url);
    if (!check.ok) return { ok: false, reason: check.reason || 'invalid_url', status: check.status || null };
    await shell.openExternal(item.url);
  } else if (item.path) {
    if (!fs.existsSync(item.path)) return { ok: false, reason: 'missing_path' };
    await shell.openPath(item.path);
  } else {
    return { ok: false, reason: 'invalid_target' };
  }

  item.usageCount = (item.usageCount || 0) + 1;
  item.lastUsed = new Date().toISOString();
  saveShortcuts(items);
  rebuildTrayMenu();
  return { ok: true };
}

function runCommand({ command, args, requiresAdmin, useCmd }, sender) {
  if (!command) return;

  if (requiresAdmin) {
    const argList = useCmd
      ? ['-Command', `Start-Process cmd.exe -ArgumentList '/c ${command} ${args.join(' ')}' -Verb RunAs`]
      : ['-Command', `Start-Process '${command}' -ArgumentList '${args.join(' ')}' -Verb RunAs`];
    const child = spawn('powershell.exe', argList, { detached: true, stdio: 'ignore' });
    child.unref();
    if (sender) {
      sender.send('maintenance-output', {
        type: 'info',
        data: t(
          'main.maintenance.launchAdminInfo',
          'Comando lanzado con permisos de administrador. La salida no se puede capturar en esta app.'
        )
      });
    }
    return;
  }

  if (useCmd) {
    const child = spawn('cmd.exe', ['/c', command, ...args], { windowsHide: false });
    if (sender) {
      child.stdout.on('data', (data) => sender.send('maintenance-output', { type: 'stdout', data: data.toString() }));
      child.stderr.on('data', (data) => sender.send('maintenance-output', { type: 'stderr', data: data.toString() }));
      child.on('close', (code) =>
        sender.send('maintenance-output', {
          type: 'exit',
          data: t('main.maintenance.finishedCode', 'Finalizado con codigo {code}', { code })
        })
      );
    }
    return;
  }

  const child = spawn(command, args, { windowsHide: false });
  if (sender) {
    child.stdout.on('data', (data) => sender.send('maintenance-output', { type: 'stdout', data: data.toString() }));
    child.stderr.on('data', (data) => sender.send('maintenance-output', { type: 'stderr', data: data.toString() }));
    child.on('close', (code) =>
      sender.send('maintenance-output', {
        type: 'exit',
        data: t('main.maintenance.finishedCode', 'Finalizado con codigo {code}', { code })
      })
    );
  }
}

function getSystemDriveStats() {
  try {
    const ps = [
      "$d=Get-PSDrive -Name ($env:SystemDrive.TrimEnd(':'));",
      "$obj=[PSCustomObject]@{FreeGB=[math]::Round($d.Free/1GB,2);TotalGB=[math]::Round(($d.Used+$d.Free)/1GB,2)};",
      "$obj | ConvertTo-Json -Compress"
    ].join(' ');
    const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8' }).trim();
    const parsed = JSON.parse(output);
    return { freeGB: parsed.FreeGB || 0, totalGB: parsed.TotalGB || 0 };
  } catch {
    return { freeGB: 0, totalGB: 0 };
  }
}

function runBasicDiagnostic() {
  const stats = getSystemDriveStats();
  const uptimeHours = Math.round(os.uptime() / 3600);
  const recommendations = [];

  if (stats.totalGB > 0) {
    const freePercent = (stats.freeGB / stats.totalGB) * 100;
    if (stats.freeGB < 10 || freePercent < 10) {
      recommendations.push({
        actionId: 'cleanmgr_basic',
        text: t('main.diagnostic.lowSpace', 'Poco espacio libre: ejecuta Limpieza de disco.')
      });
    }
    if (stats.freeGB < 5 || freePercent < 5) {
      recommendations.push({
        actionId: 'cleanmgr_sagerun',
        text: t('main.diagnostic.criticalSpace', 'Espacio critico: ejecuta Limpieza avanzada (sagerun).')
      });
    }
  }

  if (uptimeHours >= 72) {
    recommendations.push({
      actionId: null,
      text: t('main.diagnostic.highUptime', 'Uptime alto: considera reiniciar el equipo.')
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    stats: {
      freeGB: stats.freeGB,
      totalGB: stats.totalGB,
      uptimeHours
    },
    recommendations
  };
}

function getDiagnosticResult() {
  const now = Date.now();
  if (settings && settings.diagnostic && settings.diagnostic.lastRun) {
    const last = new Date(settings.diagnostic.lastRun).getTime();
    if (!Number.isNaN(last) && now - last < DIAGNOSTIC_INTERVAL_MS && settings.diagnostic.result) {
      return settings.diagnostic.result;
    }
  }

  const result = runBasicDiagnostic();
  settings.diagnostic = { lastRun: result.generatedAt, result };
  saveSettings(settings);
  return result;
}

function mapUpdateErrorMessage(errorText) {
  const text = (errorText || '').toLowerCase();
  if (text.includes('401') || text.includes('403')) return t('main.updates.authError', 'Error de autorizacion del servicio de actualizaciones.');
  if (text.includes('404') || text.includes('406')) return t('main.updates.notFound', 'No se encontro una version disponible para actualizar.');
  if (text.includes('429')) return t('main.updates.rateLimit', 'Demasiadas solicitudes al servicio de actualizaciones. Intenta mas tarde.');
  if (text.includes('enotfound') || text.includes('econnrefused') || text.includes('etimedout') || text.includes('network')) {
    return t('main.updates.network', 'No se pudo conectar al servicio de actualizaciones.');
  }
  return t('main.updates.unavailable', 'No disponible temporalmente.');
}

function verifyDownloadedUpdateIntegrity(info) {
  const data = info && typeof info === 'object' ? info : {};
  const versionOk = typeof data.version === 'string' && data.version.trim().length > 0;
  const files = Array.isArray(data.files) ? data.files : [];
  const checksumOk = files.length > 0 && files.every((file) => typeof file.sha512 === 'string' && file.sha512.trim().length > 0);

  if (!versionOk) {
    return {
      ok: false,
      message: t('main.updates.integrityVersionMissing', 'No se pudo verificar la version del paquete descargado.')
    };
  }
  if (!checksumOk) {
    return {
      ok: false,
      message: t('main.updates.integrityChecksumMissing', 'No se pudo validar la integridad del paquete descargado.')
    };
  }

  return { ok: true, message: '' };
}

async function validateUrlIntegrity(targetUrl) {
  const raw = typeof targetUrl === 'string' ? targetUrl.trim() : '';
  if (!raw) return { ok: false, reason: 'empty' };

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: 'format' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'protocol' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    let response = await fetch(parsed.toString(), {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal
    });

    if (response.status === 405 || response.status === 501) {
      response = await fetch(parsed.toString(), {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal
      });
    }

    const status = response.status;
    const ok = (status >= 200 && status < 400) || status === 401 || status === 403 || status === 429;
    return {
      ok,
      reason: ok ? 'ok' : 'http',
      status,
      finalUrl: response.url || parsed.toString()
    };
  } catch (error) {
    if (error && error.name === 'AbortError') {
      return { ok: false, reason: 'timeout' };
    }
    return { ok: false, reason: 'network' };
  } finally {
    clearTimeout(timeoutId);
  }
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId(APP_USER_MODEL_ID);
  }
  applyContentSecurityPolicyHeaders();
  settings = loadSettings();
  if (!app.isPackaged) {
    // En desarrollo no mantenemos la app en segundo plano.
    settings.keepInTray = false;
  }
  applyLaunchOnStartup(settings.launchOnStartup);
  createWindow();
  createTray();
  menuVisible = !app.isPackaged;
  if (menuVisible) {
    Menu.setApplicationMenu(Menu.buildFromTemplate(getDefaultMenuTemplate()));
  } else {
    Menu.setApplicationMenu(null);
  }

  globalShortcut.register('CommandOrControl+Shift+M', () => {
    menuVisible = !menuVisible;
    if (menuVisible) {
      Menu.setApplicationMenu(Menu.buildFromTemplate(getDefaultMenuTemplate()));
    } else {
      Menu.setApplicationMenu(null);
    }
  });

  ipcMain.handle('get-shortcuts', () => loadShortcuts());
  ipcMain.handle('get-i18n', () => I18N);

  ipcMain.handle('save-shortcuts', (_evt, items) => {
    saveShortcuts(items);
    rebuildTrayMenu();
  });

  ipcMain.handle('pick-path', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'openDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('show-item-menu', (_evt, index) => {
    const template = [
      { label: t('main.contextMenu.run', 'Iniciar'), click: () => mainWindow.webContents.send('menu-action', { action: 'run', index }) },
      { label: t('main.contextMenu.check', 'Verificar estado'), click: () => mainWindow.webContents.send('menu-action', { action: 'check-integrity', index }) },
      { type: 'separator' },
      { label: t('main.contextMenu.editName', 'Editar nombre'), click: () => mainWindow.webContents.send('menu-action', { action: 'edit-name', index }) },
      { label: t('main.contextMenu.editPath', 'Editar ruta'), click: () => mainWindow.webContents.send('menu-action', { action: 'edit-path', index }) },
      { type: 'separator' },
      { label: t('main.contextMenu.moveUp', 'Mover arriba'), click: () => mainWindow.webContents.send('menu-action', { action: 'move-up', index }) },
      { label: t('main.contextMenu.moveDown', 'Mover abajo'), click: () => mainWindow.webContents.send('menu-action', { action: 'move-down', index }) },
      { type: 'separator' },
      { label: t('main.contextMenu.delete', 'Eliminar'), click: () => mainWindow.webContents.send('menu-action', { action: 'delete', index }) }
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: mainWindow });
  });

  ipcMain.handle('pick-exe', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: t('main.importExport.appsFilterName', 'Aplicaciones'), extensions: ['exe'] }]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('pick-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('import-shortcuts', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: t('main.importExport.jsonFilterName', 'JSON'), extensions: ['json'] }]
    });
    if (result.canceled || result.filePaths.length === 0) return { canceled: true };

    try {
      const filePath = result.filePaths[0];
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return { success: false, message: t('main.importExport.invalidList', 'El archivo no contiene una lista valida.') };
      }

      const items = parsed.map((item) => {
        const type = item && item.type ? item.type : (item && item.url ? 'url' : 'exe');
        return {
          id: item && item.id ? item.id : `sc_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          name: item && item.name ? String(item.name) : t('main.tray.unnamed', 'Sin nombre'),
          type,
          path: item && item.path ? String(item.path) : '',
          url: item && item.url ? String(item.url) : '',
          pinned: item && item.pinned === true,
          usageCount: item && typeof item.usageCount === 'number' ? item.usageCount : 0,
          lastUsed: item && item.lastUsed ? item.lastUsed : null
        };
      });

      return { success: true, items };
    } catch {
      return { success: false, message: t('main.importExport.readError', 'No se pudo leer el archivo seleccionado.') };
    }
  });

  ipcMain.handle('export-shortcuts', async (_evt, items) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: t('main.importExport.exportTitle', 'Exportar accesos'),
      defaultPath: `shortcuts-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: t('main.importExport.jsonFilterName', 'JSON'), extensions: ['json'] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };

    try {
      fs.writeFileSync(result.filePath, JSON.stringify(Array.isArray(items) ? items : [], null, 2), 'utf8');
      return { success: true };
    } catch {
      return { success: false, message: t('main.importExport.writeError', 'No se pudo guardar el archivo.') };
    }
  });

  ipcMain.handle('validate-path', (_evt, targetPath) => {
    if (!targetPath || typeof targetPath !== 'string') return false;
    return fs.existsSync(targetPath);
  });

  ipcMain.handle('validate-url', async (_evt, targetUrl) => {
    return validateUrlIntegrity(targetUrl);
  });

  ipcMain.handle('open-target', async (_evt, item) => {
    if (!item || typeof item !== 'object') return;
    if (item.id) {
      return openAndTrack(item.id);
    }
    if (item.type === 'url' && item.url) {
      const check = await validateUrlIntegrity(item.url);
      if (!check.ok) return { ok: false, reason: check.reason || 'invalid_url', status: check.status || null };
      await shell.openExternal(item.url);
      return { ok: true };
    }
    if (item.path) {
      if (!fs.existsSync(item.path)) return { ok: false, reason: 'missing_path' };
      await shell.openPath(item.path);
      return { ok: true };
    }
    return { ok: false, reason: 'invalid_target' };
  });

  ipcMain.handle('get-settings', () => {
    const launchOnStartup = app.isPackaged
      ? app.getLoginItemSettings().openAtLogin === true
      : settings.launchOnStartup === true;
    settings.launchOnStartup = launchOnStartup;
    settings.autoUpdateCheck = settings.autoUpdateCheck !== false;
    settings.notificationsEnabled = settings.notificationsEnabled !== false;
    settings.advancedMode = settings.advancedMode === true;
    if (!app.isPackaged) settings.keepInTray = false;
    settings.accessibility = normalizeAccessibility(settings.accessibility);
    settings.quickHelp = normalizeQuickHelp(settings.quickHelp);
    settings.uiHints = normalizeUiHints(settings.uiHints);
    return settings;
  });
  ipcMain.handle('save-settings', (_evt, nextSettings) => {
    settings = {
      keepInTray: app.isPackaged && nextSettings && nextSettings.keepInTray !== false,
      launchOnStartup: nextSettings && nextSettings.launchOnStartup === true,
      autoUpdateCheck: nextSettings && nextSettings.autoUpdateCheck !== false,
      notificationsEnabled: nextSettings && nextSettings.notificationsEnabled !== false,
      advancedMode: nextSettings && nextSettings.advancedMode === true,
      theme: nextSettings && nextSettings.theme === 'dark' ? 'dark' : 'light',
      accessibility: normalizeAccessibility(nextSettings && nextSettings.accessibility),
      quickHelp: normalizeQuickHelp(nextSettings && nextSettings.quickHelp),
      uiHints: normalizeUiHints(nextSettings && nextSettings.uiHints),
      diagnostic: settings.diagnostic || { lastRun: null, result: null }
    };
    applyLaunchOnStartup(settings.launchOnStartup);
    saveSettings(settings);
  });

  ipcMain.handle('clear-app-cache', async () => {
    try {
      if (!settings || settings.advancedMode !== true) {
        return {
          ok: false,
          message: t('main.cache.advancedOnly', 'Esta accion solo esta disponible en modo avanzado.')
        };
      }

      await clearAppCacheData();

      setTimeout(() => {
        app.isQuiting = true;
        app.relaunch();
        app.exit(0);
      }, 120);

      return { ok: true };
    } catch {
      return {
        ok: false,
        message: t('main.cache.clearFailed', 'No se pudo limpiar la cache de la app.')
      };
    }
  });

  ipcMain.handle('get-maintenance-actions', () =>
    maintenanceActions.map(({ id, name, description, requiresAdmin }) => ({
      id,
      name,
      description,
      requiresAdmin
    }))
  );

  ipcMain.on('run-maintenance', (evt, actionId) => {
    const action = maintenanceActions.find((entry) => entry.id === actionId);
    if (!action) return;
    evt.sender.send('maintenance-output', {
      type: 'start',
      data: t('main.maintenance.running', 'Ejecutando: {name}', { name: action.name })
    });
    runCommand(action, evt.sender);
  });

  ipcMain.handle('get-diagnostic', () => getDiagnosticResult());

  ipcMain.on('run-chrome-cleanup', (evt, options) => {
    const baseDir = path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data');
    if (!baseDir || !fs.existsSync(baseDir)) {
      evt.sender.send('maintenance-output', {
        type: 'stderr',
        data: t('main.maintenance.chromeMissingProfileDir', 'No se encontro la carpeta de perfiles de Chrome.')
      });
      return;
    }

    const selected = options || {};
    const profiles = Array.isArray(selected.profiles) && selected.profiles.length > 0
      ? selected.profiles
      : ['Default'];

    evt.sender.send('maintenance-output', {
      type: 'start',
      data: t('main.maintenance.chromeCleanupStart', 'Limpiando datos de Chrome...')
    });

    profiles.forEach((profile) => {
      const userData = path.join(baseDir, profile);
      if (!fs.existsSync(userData)) return;

      const targets = [];

      if (selected.cache) {
        targets.push(path.join(userData, 'Cache'));
        targets.push(path.join(userData, 'Code Cache'));
      }
      if (selected.gpuCache) {
        targets.push(path.join(userData, 'GPUCache'));
        targets.push(path.join(userData, 'Media Cache'));
      }
      if (selected.serviceWorker) {
        targets.push(path.join(userData, 'Service Worker'));
        targets.push(path.join(userData, 'CacheStorage'));
      }
      if (selected.cookies) {
        targets.push(path.join(userData, 'Cookies'));
        targets.push(path.join(userData, 'Cookies-journal'));
      }
      if (selected.history) {
        targets.push(path.join(userData, 'History'));
        targets.push(path.join(userData, 'History-journal'));
      }
      if (selected.sessions) {
        targets.push(path.join(userData, 'Sessions'));
        targets.push(path.join(userData, 'Current Session'));
        targets.push(path.join(userData, 'Current Tabs'));
        targets.push(path.join(userData, 'Last Session'));
        targets.push(path.join(userData, 'Last Tabs'));
      }

      targets.forEach((target) => {
        try {
          if (fs.existsSync(target)) {
            fs.rmSync(target, { recursive: true, force: true });
            evt.sender.send('maintenance-output', {
              type: 'stdout',
              data: t('main.maintenance.removedPath', 'Eliminado: {path}', { path: target })
            });
          }
        } catch (err) {
          evt.sender.send('maintenance-output', {
            type: 'stderr',
            data: t('main.maintenance.cannotRemovePath', 'No se pudo eliminar: {path}', { path: target })
          });
        }
      });
    });

    evt.sender.send('maintenance-output', {
      type: 'exit',
      data: t('main.maintenance.chromeCleanupDone', 'Limpieza de Chrome finalizada.')
    });
  });

  ipcMain.handle('get-chrome-profiles', () => {
    const baseDir = path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data');
    if (!baseDir || !fs.existsSync(baseDir)) return [];
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    const profiles = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => name === 'Default' || /^Profile \\d+$/.test(name));
    return profiles;
  });

  ipcMain.handle('is-chrome-running', () => {
    try {
      const list = execFileSync('tasklist', ['/FI', 'IMAGENAME eq chrome.exe'], { encoding: 'utf8' });
      return /chrome\\.exe/i.test(list);
    } catch {
      return false;
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (app.isPackaged && settings.autoUpdateCheck) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  autoUpdater.on('checking-for-update', () => {
    downloadedUpdateInfo = null;
    if (mainWindow) mainWindow.webContents.send('update-status', { state: 'checking' });
  });
  autoUpdater.on('update-available', () => {
    downloadedUpdateInfo = null;
    if (mainWindow) mainWindow.webContents.send('update-status', { state: 'available' });
  });
  autoUpdater.on('update-not-available', () => {
    downloadedUpdateInfo = null;
    if (mainWindow) mainWindow.webContents.send('update-status', { state: 'latest' });
  });
  autoUpdater.on('error', (err) => {
    downloadedUpdateInfo = null;
    const raw = String(err || '');
    const message = app.isPackaged ? mapUpdateErrorMessage(raw) : raw;
    if (mainWindow) mainWindow.webContents.send('update-status', { state: 'error', message });
  });
  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow) mainWindow.webContents.send('update-status', { state: 'downloading', percent: Math.round(progress.percent) });
  });
  autoUpdater.on('update-downloaded', (info) => {
    const integrity = verifyDownloadedUpdateIntegrity(info);
    if (!integrity.ok) {
      downloadedUpdateInfo = null;
      if (mainWindow) mainWindow.webContents.send('update-status', { state: 'error', message: integrity.message });
      return;
    }

    downloadedUpdateInfo = {
      version: String(info.version || ''),
      verifiedAt: new Date().toISOString()
    };
    if (mainWindow) mainWindow.webContents.send('update-status', { state: 'downloaded' });
  });

  ipcMain.handle('check-updates', () => {
    if (!app.isPackaged) return { state: 'dev' };
    autoUpdater.checkForUpdates().catch((err) => {
      const message = mapUpdateErrorMessage(String(err || ''));
      if (mainWindow) mainWindow.webContents.send('update-status', { state: 'error', message });
    });
    return { state: 'checking' };
  });

  ipcMain.handle('install-update', () => {
    if (!app.isPackaged) return { state: 'dev' };
    if (!downloadedUpdateInfo) {
      const message = t(
        'main.updates.integrityInstallBlocked',
        'No se puede instalar la actualizacion porque no paso la verificacion de integridad.'
      );
      if (mainWindow) mainWindow.webContents.send('update-status', { state: 'error', message });
      return { state: 'error', message };
    }
    app.isQuiting = true;
    if (mainWindow) {
      mainWindow.destroy();
    }
    autoUpdater.quitAndInstall();
    return { state: 'installing' };
  });

  ipcMain.handle('get-app-info', () => ({
    version: CURRENT_APP_VERSION,
    packaged: app.isPackaged
  }));
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', (e) => {
  if (!app.isQuiting && shouldKeepInTray()) {
    e.preventDefault();
    return;
  }
  app.quit();
});

app.on('before-quit', () => {
  app.isQuiting = true;
});
