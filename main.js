const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, shell, globalShortcut } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const { spawn, execFileSync } = require('child_process');
const os = require('os');

let tray = null;
let mainWindow = null;
let settings = null;
let menuVisible = false;
const TOP_TRAY_MOST_USED = 2;
const TOP_TRAY_RECENT = 1;
const DIAGNOSTIC_INTERVAL_MS = 6 * 60 * 60 * 1000;

const maintenanceActions = [
  {
    id: 'cleanmgr_basic',
    name: 'Limpieza de disco',
    description: 'Abre el limpiador de disco para borrar temporales y otros archivos.',
    command: 'cleanmgr',
    args: [],
    requiresAdmin: false,
    useCmd: false
  },
  {
    id: 'cleanmgr_sageset',
    name: 'Configurar limpieza avanzada',
    description: 'Permite elegir que categorias se limpiaran (sageset:1).',
    command: 'cleanmgr',
    args: ['/sageset:1'],
    requiresAdmin: false,
    useCmd: false
  },
  {
    id: 'cleanmgr_sagerun',
    name: 'Ejecutar limpieza avanzada',
    description: 'Ejecuta la limpieza configurada en sageset:1.',
    command: 'cleanmgr',
    args: ['/sagerun:1'],
    requiresAdmin: false,
    useCmd: false
  },
  {
    id: 'dism_analyze',
    name: 'Analizar almacen de componentes',
    description: 'Evalua si el WinSxS se puede limpiar.',
    command: 'dism',
    args: ['/Online', '/Cleanup-Image', '/AnalyzeComponentStore'],
    requiresAdmin: true,
    useCmd: true
  },
  {
    id: 'dism_cleanup',
    name: 'Limpiar componentes antiguos',
    description: 'Elimina versiones antiguas de componentes.',
    command: 'dism',
    args: ['/Online', '/Cleanup-Image', '/StartComponentCleanup'],
    requiresAdmin: true,
    useCmd: true
  },
  {
    id: 'sfc_scan',
    name: 'Reparar archivos de sistema',
    description: 'Ejecuta SFC para reparar archivos del sistema.',
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

function loadSettings() {
  const file = getSettingsPath();
  if (!fs.existsSync(file)) return { keepInTray: true, theme: 'light', diagnostic: { lastRun: null, result: null } };
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return { keepInTray: true, theme: 'light', diagnostic: { lastRun: null, result: null } };
    return {
      keepInTray: data.keepInTray !== false,
      theme: data.theme === 'dark' ? 'dark' : 'light',
      diagnostic: data.diagnostic && typeof data.diagnostic === 'object'
        ? {
            lastRun: data.diagnostic.lastRun || null,
            result: data.diagnostic.result || null
          }
        : { lastRun: null, result: null }
    };
  } catch {
    return { keepInTray: true, theme: 'light', diagnostic: { lastRun: null, result: null } };
  }
}

function saveSettings(nextSettings) {
  const file = getSettingsPath();
  fs.writeFileSync(file, JSON.stringify(nextSettings, null, 2), 'utf8');
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
  mainWindow = new BrowserWindow({
    width: 720,
    height: 520,
    show: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('close', (e) => {
    if (!app.isQuiting && settings && settings.keepInTray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('minimize', (e) => {
    if (settings && settings.keepInTray) {
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
    label: item.name || item.path || item.url || 'Sin nombre',
    click: () => openAndTrack(item.id)
  }));

  template.push({ type: 'separator' });
  template.push({ label: 'Abrir', click: () => mainWindow.show() });
  template.push({ label: 'Cerrar', click: () => { app.isQuiting = true; app.quit(); } });

  const menu = Menu.buildFromTemplate(template);
  tray.setContextMenu(menu);
}

function createTray() {
  const iconPath = path.join(__dirname, 'tray.png');
  tray = new Tray(iconPath);
  tray.setToolTip('Accesos directos');
  tray.on('double-click', () => mainWindow.show());
  rebuildTrayMenu();
}

function getDefaultMenuTemplate() {
  return [
    {
      label: 'File',
      submenu: [{ role: 'quit' }]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' }, { role: 'zoomin' }, { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }]
    },
    {
      label: 'Help',
      submenu: []
    }
  ];
}

function openAndTrack(itemId) {
  const items = loadShortcuts();
  const item = items.find((entry) => entry && entry.id === itemId);
  if (!item) return;
  item.usageCount = (item.usageCount || 0) + 1;
  item.lastUsed = new Date().toISOString();
  saveShortcuts(items);
  rebuildTrayMenu();
  if (item.type === 'url' && item.url) {
    shell.openExternal(item.url);
    return;
  }
  if (item.path) shell.openPath(item.path);
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
        data: 'Comando lanzado con permisos de administrador. La salida no se puede capturar en esta app.'
      });
    }
    return;
  }

  if (useCmd) {
    const child = spawn('cmd.exe', ['/c', command, ...args], { windowsHide: false });
    if (sender) {
      child.stdout.on('data', (data) => sender.send('maintenance-output', { type: 'stdout', data: data.toString() }));
      child.stderr.on('data', (data) => sender.send('maintenance-output', { type: 'stderr', data: data.toString() }));
      child.on('close', (code) => sender.send('maintenance-output', { type: 'exit', data: `Finalizado con codigo ${code}` }));
    }
    return;
  }

  const child = spawn(command, args, { windowsHide: false });
  if (sender) {
    child.stdout.on('data', (data) => sender.send('maintenance-output', { type: 'stdout', data: data.toString() }));
    child.stderr.on('data', (data) => sender.send('maintenance-output', { type: 'stderr', data: data.toString() }));
    child.on('close', (code) => sender.send('maintenance-output', { type: 'exit', data: `Finalizado con codigo ${code}` }));
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
        text: 'Poco espacio libre: ejecuta Limpieza de disco.'
      });
    }
    if (stats.freeGB < 5 || freePercent < 5) {
      recommendations.push({
        actionId: 'cleanmgr_sagerun',
        text: 'Espacio critico: ejecuta Limpieza avanzada (sagerun).'
      });
    }
  }

  if (uptimeHours >= 72) {
    recommendations.push({
      actionId: null,
      text: 'Uptime alto: considera reiniciar el equipo.'
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

app.whenReady().then(() => {
  settings = loadSettings();
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
      { label: 'Ejecutar', click: () => mainWindow.webContents.send('menu-action', { action: 'run', index }) },
      { type: 'separator' },
      { label: 'Editar nombre', click: () => mainWindow.webContents.send('menu-action', { action: 'edit-name', index }) },
      { label: 'Editar ruta', click: () => mainWindow.webContents.send('menu-action', { action: 'edit-path', index }) },
      { type: 'separator' },
      { label: 'Mover arriba', click: () => mainWindow.webContents.send('menu-action', { action: 'move-up', index }) },
      { label: 'Mover abajo', click: () => mainWindow.webContents.send('menu-action', { action: 'move-down', index }) },
      { type: 'separator' },
      { label: 'Eliminar', click: () => mainWindow.webContents.send('menu-action', { action: 'delete', index }) }
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: mainWindow });
  });

  ipcMain.handle('pick-exe', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Aplicaciones', extensions: ['exe'] }]
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

  ipcMain.handle('validate-path', (_evt, targetPath) => {
    if (!targetPath || typeof targetPath !== 'string') return false;
    return fs.existsSync(targetPath);
  });

  ipcMain.handle('open-target', (_evt, item) => {
    if (!item || typeof item !== 'object') return;
    if (item.id) {
      openAndTrack(item.id);
      return;
    }
    if (item.type === 'url' && item.url) {
      shell.openExternal(item.url);
      return;
    }
    if (item.path) shell.openPath(item.path);
  });

  ipcMain.handle('get-settings', () => settings);
  ipcMain.handle('save-settings', (_evt, nextSettings) => {
    settings = {
      keepInTray: nextSettings && nextSettings.keepInTray !== false,
      theme: nextSettings && nextSettings.theme === 'dark' ? 'dark' : 'light',
      diagnostic: settings.diagnostic || { lastRun: null, result: null }
    };
    saveSettings(settings);
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
    evt.sender.send('maintenance-output', { type: 'start', data: `Ejecutando: ${action.name}` });
    runCommand(action, evt.sender);
  });

  ipcMain.handle('get-diagnostic', () => getDiagnosticResult());

  ipcMain.on('run-chrome-cleanup', (evt, options) => {
    const baseDir = path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data');
    if (!baseDir || !fs.existsSync(baseDir)) {
      evt.sender.send('maintenance-output', { type: 'stderr', data: 'No se encontro la carpeta de perfiles de Chrome.' });
      return;
    }

    const selected = options || {};
    const profiles = Array.isArray(selected.profiles) && selected.profiles.length > 0
      ? selected.profiles
      : ['Default'];

    evt.sender.send('maintenance-output', { type: 'start', data: 'Limpiando datos de Chrome...' });

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
            evt.sender.send('maintenance-output', { type: 'stdout', data: `Eliminado: ${target}` });
          }
        } catch (err) {
          evt.sender.send('maintenance-output', { type: 'stderr', data: `No se pudo eliminar: ${target}` });
        }
      });
    });

    evt.sender.send('maintenance-output', { type: 'exit', data: 'Limpieza de Chrome finalizada.' });
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

  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', (e) => {
  if (settings && settings.keepInTray) {
    e.preventDefault();
  }
});
