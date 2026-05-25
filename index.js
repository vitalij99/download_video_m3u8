const startButton = document.getElementById("start");
const statusParagraph = document.getElementById("statusParagraph");
const info = document.getElementById("info");

startButton.addEventListener("click", async () => {
  const name = document.getElementById("name").value;
  const url = document.getElementById("url").value;

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
