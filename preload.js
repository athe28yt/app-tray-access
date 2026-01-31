const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getShortcuts: () => ipcRenderer.invoke('get-shortcuts'),
  saveShortcuts: (items) => ipcRenderer.invoke('save-shortcuts', items),
  pickPath: () => ipcRenderer.invoke('pick-path'),
  pickExe: () => ipcRenderer.invoke('pick-exe'),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  validatePath: (targetPath) => ipcRenderer.invoke('validate-path', targetPath),
  openTarget: (item) => ipcRenderer.invoke('open-target', item),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getMaintenanceActions: () => ipcRenderer.invoke('get-maintenance-actions'),
  runMaintenance: (actionId) => ipcRenderer.send('run-maintenance', actionId),
  onMaintenanceOutput: (cb) => ipcRenderer.on('maintenance-output', (_evt, payload) => cb(payload)),
  getDiagnostic: () => ipcRenderer.invoke('get-diagnostic'),
  runChromeCleanup: (options) => ipcRenderer.send('run-chrome-cleanup', options),
  getChromeProfiles: () => ipcRenderer.invoke('get-chrome-profiles'),
  isChromeRunning: () => ipcRenderer.invoke('is-chrome-running'),
  checkUpdates: () => ipcRenderer.invoke('check-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateStatus: (cb) => ipcRenderer.on('update-status', (_evt, payload) => cb(payload)),
  showItemMenu: (index) => ipcRenderer.invoke('show-item-menu', index),
  onMenuAction: (cb) => ipcRenderer.on('menu-action', (_evt, payload) => cb(payload))
});
