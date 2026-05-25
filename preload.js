const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  start: (data) => ipcRenderer.invoke("start", data),
  onData: (callback) =>
    ipcRenderer.on("from-main", (_, data) => callback(data)),
});
