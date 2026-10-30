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
  runShellCommand: payload => ipcRenderer.invoke('workspace:run-custom-command', payload)
});
