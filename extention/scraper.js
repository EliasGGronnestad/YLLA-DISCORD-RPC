const LOCAL_RPC_PORT = 3000;

function sendToDiscord(data) {
  fetch(`http://localhost:${LOCAL_RPC_PORT}/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch((err) =>
    console.debug("Companion server offline. Run local daemon.", err),
  );
}

async function fetchStatusAndPropagate() {
  const audio = document.querySelector("audio");

  if (!audio || audio.paused) {
    sendToDiscord({ paused: true });
    return;
  }

  try {
    const res = await fetch("https://radio.ylla.xyz/api/status");
    if (!res.ok) throw new Error("API returned bad status");
    const data = await res.json();

    sendToDiscord({
      song: data.song || "Unknown Song",
      title: data.song?.title || "Unknown Track",
      artist: data.song?.artist || "Unknown Artist",
      album: data.song?.album || "Unknown Album",
      elapsed: data.elapsed || 0,
      duration: data.duration || 0,
      paused: false,
    });
  } catch (err) {
    console.error("Failed fetching radio API:", err);
  }
}

function init() {
  const audio = document.querySelector("audio");
  if (!audio) {
    setTimeout(init, 1000);
    return;
  }

  audio.addEventListener("play", fetchStatusAndPropagate);
  audio.addEventListener("pause", fetchStatusAndPropagate);

  setInterval(fetchStatusAndPropagate, 5000);
}

init();
