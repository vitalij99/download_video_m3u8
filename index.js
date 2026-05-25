const startButton = document.getElementById("start");

startButton.addEventListener("click", async () => {
  const name = document.getElementById("name").value;
  const url = document.getElementById("url").value;

  await window.electronAPI.start({
    name,
    url,
  });
});
