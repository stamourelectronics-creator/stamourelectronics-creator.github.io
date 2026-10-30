const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('isaiahDesktop', {
  getAppConfig: () => ipcRenderer.invoke('app:config'),
  openExternal: url => ipcRenderer.invoke('external:open', url),
  chooseWorkspace: () => ipcRenderer.invoke('workspace:choose'),
  clearWorkspace: () => ipcRenderer.invoke('workspace:clear'),
  getWorkspacePath: () => ipcRenderer.invoke('workspace:path'),
  listWorkspaceFiles: () => ipcRenderer.invoke('workspace:list'),
  readWorkspaceFile: path => ipcRenderer.invoke('workspace:read', path),
  writeWorkspaceFile: payload => ipcRenderer.invoke('workspace:write', payload),
  runApprovedPreset: key => ipcRenderer.invoke('workspace:run-preset', key),
  runShellCommand: payload => ipcRenderer.invoke('workspace:run-custom-command', payload),
  getUnrestrictedMode: () => ipcRenderer.invoke('agent:unrestricted:get'),
  setUnrestrictedMode: enabled => ipcRenderer.invoke('agent:unrestricted:set', enabled),
  createBrowserView: payload => ipcRenderer.invoke('browser:create', payload),
  navigateBrowserView: (tabId, url) => ipcRenderer.invoke('browser:navigate', { tabId, url }),
  setBrowserViewActive: (tabId, visible) => ipcRenderer.invoke('browser:set-active', { tabId, visible }),
  setBrowserViewBounds: bounds => ipcRenderer.send('browser:set-bounds', bounds),
  browserBack: tabId => ipcRenderer.invoke('browser:back', tabId),
  browserForward: tabId => ipcRenderer.invoke('browser:forward', tabId),
  browserReload: tabId => ipcRenderer.invoke('browser:reload', tabId),
  closeBrowserView: tabId => ipcRenderer.invoke('browser:close', tabId),
  onBrowserEvent: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload || {});
    ipcRenderer.on('browser:event', listener);
    return () => ipcRenderer.removeListener('browser:event', listener);
  },
  onBrowserBoundsRefresh: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = () => callback();
    ipcRenderer.on('browser:bounds-refresh', listener);
    return () => ipcRenderer.removeListener('browser:bounds-refresh', listener);
  }
});
