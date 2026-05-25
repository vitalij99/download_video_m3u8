const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  start: (data) => ipcRenderer.invoke("start", data),
  onData: (callback) =>
    ipcRenderer.on("from-main", (_, data) => callback(data)),
  onInfo: (callback) =>
    ipcRenderer.on("from-main-info", (_, data) => callback(data)),
  onClear: (callback) => ipcRenderer.on("from-main-clear", () => callback()),
});
