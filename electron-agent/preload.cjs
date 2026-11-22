const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('isaiahDesktop', {
  getAppConfig: () => ipcRenderer.invoke('app:config'),
  getHomeNews: () => ipcRenderer.invoke('news:load-home'),
  chooseWorkspace: () => ipcRenderer.invoke('workspace:choose'),
  clearWorkspace: () => ipcRenderer.invoke('workspace:clear'),
  getWorkspacePath: () => ipcRenderer.invoke('workspace:path'),
  chooseCommandFolder: () => ipcRenderer.invoke('command:choose-folder'),
  getCommandFolderPath: () => ipcRenderer.invoke('command:folder-path'),
  listWorkspaceFiles: () => ipcRenderer.invoke('workspace:list'),
  readWorkspaceFile: path => ipcRenderer.invoke('workspace:read', path),
  writeWorkspaceFile: payload => ipcRenderer.invoke('workspace:write', payload),
  runWorkspaceCommand: payload => ipcRenderer.invoke('workspace:run-command', payload),
  runSystemDiagnostic: payload => ipcRenderer.invoke('system:run-diagnostic', payload),
  launchDesktopApp: payload => ipcRenderer.invoke('desktop:launch-app', payload),
  createBrowserView: payload => ipcRenderer.invoke('browser:create', payload),
  navigateBrowserView: (tabId, url) => ipcRenderer.invoke('browser:navigate', { tabId, url }),
  setBrowserViewActive: (tabId, visible) => ipcRenderer.invoke('browser:set-active', { tabId, visible }),
  setBrowserViewBounds: bounds => ipcRenderer.send('browser:set-bounds', bounds),
  browserBack: tabId => ipcRenderer.invoke('browser:back', tabId),
  browserForward: tabId => ipcRenderer.invoke('browser:forward', tabId),
  browserReload: tabId => ipcRenderer.invoke('browser:reload', tabId),
  inspectBrowserView: tabId => ipcRenderer.invoke('browser:inspect', tabId),
  onOpenUrl: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload || {});
    ipcRenderer.on('app:open-url', listener);
    return () => ipcRenderer.removeListener('app:open-url', listener);
  },
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
