// main.js
import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { segmentsMerge, start } from "./start.js";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 700,
    height: 500,
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
ipcMain.handle("segmentsMerge", async (_) => {
  return segmentsMerge();
});

export function sendStatus(data) {
  win.webContents.send("from-main", data);
}
export function sendInfo(data) {
  win.webContents.send("from-main-info", data);
}
export function sendClear(data) {
  win.webContents.send("from-main-clear", data);
}
export function sendIsLoading(data) {
  win.webContents.send("from-main-isLoading", data);
}

const server = express();

server.use(express.json());

server.post("/message", (req, res) => {
  console.log(req.body);
  win.webContents.send("from-chrome", req.body);
  res.json({ ok: true });
});

server.listen(3333);
