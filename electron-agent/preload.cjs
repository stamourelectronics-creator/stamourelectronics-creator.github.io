const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('isaiahDesktop', {
  openExternal: url => ipcRenderer.invoke('external:open', url),
  chooseWorkspace: () => ipcRenderer.invoke('workspace:choose'),
  getWorkspacePath: () => ipcRenderer.invoke('workspace:path'),
  listWorkspaceFiles: () => ipcRenderer.invoke('workspace:list'),
  readWorkspaceFile: path => ipcRenderer.invoke('workspace:read', path),
  writeWorkspaceFile: payload => ipcRenderer.invoke('workspace:write', payload),
  runApprovedPreset: key => ipcRenderer.invoke('workspace:run-preset', key),
  runCustomCommand: command => ipcRenderer.invoke('workspace:run-custom-command', command)
});
