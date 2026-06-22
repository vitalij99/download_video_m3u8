const startButton = document.getElementById("start");
const nextButton = document.getElementById("next");
const statusParagraph = document.getElementById("statusParagraph");
const info = document.getElementById("info");
const series = document.getElementById("series");
const segmentsButton = document.getElementById("segments");

segmentsButton.addEventListener("click", async () => {
  await window.electronAPI.segmentsMerge();
});

startButton.addEventListener("click", async () => {
  const name = document.getElementById("name").value;
  const url = document.getElementById("url").value;

  await window.electronAPI.start({
    name,
    url,
  });
});
nextButton.addEventListener("click", async () => {
  const namefirst = document.getElementById("name").value;
  const url = document.getElementById("url").value;
  const seriesValue = parseInt(series.value) || 1;

  const name = `${namefirst}_${seriesValue}`;

  series.value = seriesValue + 1;

  await window.electronAPI.start({
    name,
    url,
  });
});

window.electronAPI.onData((data) => {
  statusParagraph.textContent = data;
});
window.electronAPI.onInfo((data) => {
  const p = document.createElement("p");
  p.textContent = data;
  info.appendChild(p);
});
window.electronAPI.onClear(() => {
  info.innerHTML = "";
  statusParagraph.textContent = "";
});
window.electronAPI.onIsLoading(() => {
  startButton.disabled = !startButton.disabled;
  nextButton.disabled = !nextButton.disabled;
  segmentsButton.disabled = !segmentsButton.disabled;
});
window.electronAPI.onChromeMessage((data) => {
  const p = document.createElement("p");
  const title = data.title || "No title";
  p.textContent = `Video from Chrome: ${title}, URL: ${data.url}`;
  info.appendChild(p);

  const name = document.getElementById("name");
  const url = document.getElementById("url");

  if (name.value === "") {
    name.value = title;
  }
  url.value = data.url;
});
