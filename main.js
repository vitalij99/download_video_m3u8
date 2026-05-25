// main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { start } = require("./start");

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 500,
    height: 300,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile("index.html");
}

app.whenReady().then(createWindow);

ipcMain.handle("start", async (_, data) => {
  return start(data.name, data.url);
});
