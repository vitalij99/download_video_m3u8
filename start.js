import fs from "fs";
import axios from "axios";
import ffmpeg from "ffmpeg-static";
import { exec } from "child_process";
import { sendInfo, sendStatus, sendClear, sendIsLoading } from "./main.js";
import path from "path";

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

    const info = name;

    fs.writeFileSync("./segments/info.txt", info);

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
  try {
    sendClear();
    sendInfo(`Starting download`);

    sendIsLoading(true);

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
  } catch (error) {
    console.error("An error occurred:", error);
    sendInfo(`Error: ${error.message}`);
    return;
  } finally {
    sendIsLoading(false);
  }
}
export async function segmentsMerge() {
  try {
    sendClear();
    sendInfo(`Starting segments merge`);
    sendIsLoading(true);

    const segmentsDir = "./segments";
    if (!fs.existsSync(segmentsDir)) {
      console.error("Segments directory does not exist!");
      sendInfo("Error: Segments directory does not exist!");
      return;
    }

    const infoFilePath = path.join(segmentsDir, "info.txt");
    if (!fs.existsSync(infoFilePath)) {
      console.error("Info file does not exist!");
      sendInfo("Error: Info file does not exist!");
      return;
    }

    const name = fs.readFileSync(infoFilePath, "utf-8").trim();

    let fileList = "";

    const segmentFiles = fs
      .readdirSync(segmentsDir)
      .filter((file) => file.endsWith(".ts"))
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map((file) => (fileList += `file '${file}'\n` && file));

    const segmentsCount = segmentFiles.length;

    fs.writeFileSync("./segments/list.txt", fileList);

    console.log("Name:", name);
    console.log("Segments count:", segmentsCount);

    await mergeSegments(segmentsCount, name);
    sendStatus("Segments merged successfully!");
  } catch (error) {
    console.error("An error occurred:", error);
    sendInfo(`Error: ${error.message}`);
    return;
  } finally {
    sendIsLoading(false);
  }
}
