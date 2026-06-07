const RPC = require("discord-rpc");
const http = require("http");

const CLIENT_ID = "1513186029182517378";
const client = new RPC.Client({ transport: "ipc" });
let rpcReady = false;

// 1. Keep this clean so it doesn't crash on startup!
client.on("ready", () => {
  console.log("Discord Rich Presence daemon is locked and loaded.");
  rpcReady = true;
});

client.login({ clientId: CLIENT_ID }).catch((err) => {
  console.error("Could not run RPC. Is Discord desktop app running?", err);
});

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/update") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        if (!rpcReady) {
          res.writeHead(503);
          res.end("RPC engine offline");
          return;
        }

        if (data.paused) {
          client.clearActivity();
          res.writeHead(200);
          res.end("Activity cleared (paused)");
          return;
        }

        const now = Math.floor(Date.now() / 1000);
        const startTimestamp = now - Math.floor(data.elapsed);

        const activityPayload = {
          details: data.title,
          state: `by ${data.artist}`,
          type: 2,
          assets: {
            large_image: `https://radio.ylla.xyz/api/art?file=${encodeURIComponent(data.song.file)}`,
            large_text: data.album || "YLLA // RADIO",
          },
          timestamps: {
            start: startTimestamp,
          },
          buttons: [
            {
              label: "[ TUNE IN // YLLA RADIO ]",
              url: "https://radio.ylla.xyz",
            },
          ],
          instance: false,
        };

        if (data.duration && data.duration > 0) {
          activityPayload.timestamps.end =
            startTimestamp + Math.floor(data.duration);
        }

        // Bypassing setActivity so the type doesn't get stripped cuz discord-rpc is old and fucked
        client.request("SET_ACTIVITY", {
          pid: process.pid,
          activity: activityPayload,
        });

        res.writeHead(200);
        res.end("Presence synced");
      } catch (err) {
        console.error(err);
        res.writeHead(400);
        res.end("Malformed payload");
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(3000, "localhost", () => {
  console.log("Local service listening on http://localhost:3000");
});
