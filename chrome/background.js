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

async function getVideoUrl(details) {
  const videoTitle = await getTabTitle(details.tabId);

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

  await fetch("http://localhost:3000/message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
}
