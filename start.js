import fs from "fs";
import axios from "axios";
import ffmpeg from "ffmpeg-static";
import { exec } from "child_process";
import { sendInfo, sendStatus, sendClear, sendIsLoading } from "./main.js";
import path from "path";

async function downloadSegment(segment, playlistUrl, index, count) {
  const url = new URL(segment, playlistUrl).href;

  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
  });

  sendStatus(`Downloading: segment ${index + 1} of ${count}...`);

  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}`);
  }

  fs.writeFileSync(`./segments/${index}.ts`, response.data);
}

async function downloadSegments(segments, playlistUrl, count) {
  fs.rmSync("./segments", { recursive: true, force: true });
  fs.mkdirSync("./segments");

  const BATCH_SIZE = 25;
  const failedFirstPass = [];

  for (let i = 0; i < segments.length; i += BATCH_SIZE) {
    const batch = segments.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((segment, batchIndex) => {
        const globalIndex = i + batchIndex;
        return downloadSegment(segment, playlistUrl, globalIndex, count);
      }),
    );

    results.forEach((result, batchIndex) => {
      if (result.status === "rejected") {
        const globalIndex = i + batchIndex;
        failedFirstPass.push({
          index: globalIndex,
          segment: segments[globalIndex],
          reason: result.reason?.message ?? String(result.reason),
        });
        sendInfo(
          `Segment ${globalIndex + 1} failed (pass 1): ${result.reason?.message}`,
        );
      }
    });
  }

  if (failedFirstPass.length === 0) return;

  sendStatus(`Retrying ${failedFirstPass.length} failed segments...`);

  // --- Retry pass ---
  const stillFailed = [];

  const retryResults = await Promise.allSettled(
    failedFirstPass.map(({ segment, index }) =>
      downloadSegment(segment, playlistUrl, index, count),
    ),
  );

  retryResults.forEach((result, i) => {
    if (result.status === "rejected") {
      const { index, segment } = failedFirstPass[i];
      stillFailed.push({
        index,
        segment,
        reason: result.reason?.message ?? String(result.reason),
      });
      sendInfo(
        `Segment ${index + 1} failed (pass 2): ${result.reason?.message}`,
      );
    }
  });

  if (stillFailed.length === 0) return;

  // --- Write error report ---
  const errorLines = stillFailed.map(
    ({ index, segment, reason }) =>
      `Segment ${index + 1}\nURL: ${new URL(segment, playlistUrl).href}\nReason: ${reason}\n`,
  );

  const errorReport = [
    `Failed segments: ${stillFailed.length} of ${count}`,
    `Date: ${new Date().toISOString()}`,
    "",
    ...errorLines,
  ].join("\n");

  fs.writeFileSync("./segments/errors.txt", errorReport, "utf-8");

  throw new Error(
    `${stillFailed.length} segment(s) failed after retry. See ./segments/errors.txt`,
  );
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
