import fs from "fs";
import axios from "axios";
import ffmpeg from "ffmpeg-static";
import { exec } from "child_process";
import { sendInfo, sendStatus, sendClear } from "./main.js";

async function downloadSegments(segments, playlistUrl, count) {
  if (!fs.existsSync("./segments")) {
    fs.mkdirSync("./segments");
  } else {
    fs.readdirSync("./segments").forEach((file) => {
      fs.unlinkSync(`./segments/${file}`);
    });
  }

  for (let i = 0; i < segments.length; i++) {
    const url = new URL(segments[i], playlistUrl).href;

    sendStatus(`Downloading: segment ${i + 1} of ${count}...`);

    const response = await axios.get(url, {
      responseType: "arraybuffer",
    });

    fs.writeFileSync(`./segments/${i}.ts`, response.data);
  }
}

function mergeSegments(count, name) {
  sendStatus("Merging segments...");
  return new Promise((resolve, reject) => {
    let fileList = "";

    for (let i = 0; i < count; i++) {
      fileList += `file '${i}.ts'\n`;
    }

    fs.writeFileSync("./segments/list.txt", fileList);

    if (!fs.existsSync("./video")) {
      fs.mkdirSync("./video");
    }

    exec(
      `"${ffmpeg}" -f concat -safe 0 -i list.txt -c copy ../video/${name}.mp4`,
      { cwd: "./segments" },
      (err, stdout, stderr) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(stdout);
      },
    );
  });
}

export async function start(name, url) {
  sendClear();
  sendInfo(`Starting download`);

  if (!name || !url) {
    console.error("Name and URL are required!");
    sendInfo("Error: Name and URL are required!");

    return;
  } else if (!url.endsWith(".m3u8")) {
    console.error("URL must end with .m3u8");
    sendInfo("Error: URL must end with .m3u8!");
    return;
  }

  const playlistUrl = url;

  const transformedName = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^-+|-+$/g, "");
  if (!transformedName) {
    console.error("Invalid name after transformation!");
    sendInfo("Error: Invalid name after transformation!");
    return;
  }

  const playlist = await axios.get(playlistUrl);

  const segments = playlist.data
    .split("\n")
    .filter((line) => line && !line.startsWith("#"));

  sendInfo(`Found ${segments.length} segments. Starting download...`);

  await downloadSegments(segments, playlistUrl, segments.length);

  await mergeSegments(segments.length, transformedName);

  sendStatus("Video complete!");
}
