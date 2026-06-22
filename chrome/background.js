chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    if (details.method === "GET") {
      await getVideoUrl(details);
    }
  },
  {
    urls: ["*://*/*.m3u8*"],
  },
);

let lastVideoUrl = null;

async function getVideoUrl(details) {
  if (details.url === lastVideoUrl) return;
  const videoTitle = await getTabTitle(details.tabId);
  lastVideoUrl = details.url;
  const message = {
    type: "videoUrl",
    url: details.url,
    title: videoTitle,
  };
  console.log("Зловлено GET-запит:", {
    url: details.url,
    title: videoTitle,
    details: details,
  });

  // Надсилаємо повідомлення до Electron додатку
  await sendMessageToElectron(message);
}
async function getTabTitle(tabId) {
  const title = await new Promise((resolve) => {
    return chrome.tabs.get(tabId, (tab) => {
      resolve(tab.title);
    });
  });
  return title;
}
async function sendMessageToElectron(message) {
  // Implementation for sending message to Electron app

  const response = await fetch("http://localhost:3333/message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
  if (!response.ok) {
    console.error(
      "Failed to send message to Electron app:",
      response.statusText,
    );
  }

  setTimeout(() => {
    lastVideoUrl = null;
  }, 1000);
}
