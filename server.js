const express = require("express");
const { spawn } = require("node:child_process");
const path = require("node:path");

const app = express();
const port = Number(process.env.PORT || 5000);
const dashboardPort = Number(process.env.BOT_DASHBOARD_PORT || 5001);
const webAccessToken = process.env.WEB_ACCESS_TOKEN;
const botExecutable = process.env.BOT_EXECUTABLE
  || path.join(__dirname, "build", "install", "eternel-afk-bot", "bin", "eternel-afk-bot");

let botProcess;
let shuttingDown = false;

app.use(express.json({ limit: "8kb" }));

app.get("/", (_request, response) => {
  response.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Eternel Bot</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center;
        background: #101827; color: #f5f7fb; font: 16px system-ui, sans-serif; }
      main { max-width: 34rem; padding: 2.5rem; text-align: center; }
      .dot { display: inline-block; width: .7rem; height: .7rem; margin-right: .5rem;
        border-radius: 50%; background: #48d597; }
      p, label { color: #b9c4d6; }
      form { display: flex; gap: .5rem; margin-top: 1.5rem; }
      input, button { border: 1px solid #334769; border-radius: .5rem; padding: .7rem;
        background: #18253d; color: #f5f7fb; font: inherit; }
      input { flex: 1; min-width: 0; }
      button { cursor: pointer; background: #2858ae; }
      #result { min-height: 1.5rem; margin-top: 1rem; color: #8fc7ff; white-space: pre-wrap; }
      .token { display: block; margin-top: 1rem; text-align: left; font-size: .85rem; }
      .token input { width: 100%; margin-top: .35rem; }
    </style>
  </head>
  <body>
    <main>
      <h1><span class="dot"></span>Bot is alive</h1>
      <p>The Eternel AFK bot service is running.</p>
      <p><a href="/health" style="color:#8fc7ff">View health status</a></p>
      <label class="token">Access token
        <input id="token" type="password" autocomplete="off" placeholder="WEB_ACCESS_TOKEN">
      </label>
      <form id="chat">
        <input id="message" autocomplete="off"
          placeholder="status, start-all, or a Minecraft message">
        <button type="submit">Send</button>
      </form>
      <div id="result"></div>
    </main>
    <script>
      const form = document.querySelector("#chat");
      const token = document.querySelector("#token");
      const message = document.querySelector("#message");
      const result = document.querySelector("#result");
      token.value = sessionStorage.getItem("botToken") || "";
      form.addEventListener("submit", async event => {
        event.preventDefault();
        const value = message.value.trim();
        if (!value) return;
        sessionStorage.setItem("botToken", token.value);
        result.textContent = "Sending…";
        try {
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-bot-token": token.value
            },
            body: JSON.stringify({ target: "all", message: value })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Request failed");
          result.textContent = data.message;
          message.value = "";
        } catch (error) {
          result.textContent = error.message;
        }
      });
    </script>
  </body>
</html>`);
});

app.get("/health", (_request, response) => {
  const running = botProcess && botProcess.exitCode === null && !botProcess.killed;
  response.status(running ? 200 : 503).json({
    ok: running,
    service: "eternel-afk-bot",
    botProcess: running ? "running" : "stopped",
  });
});

app.post("/api/chat", async (request, response) => {
  if (process.env.NODE_ENV === "production" && (!webAccessToken
      || request.get("x-bot-token") !== webAccessToken)) {
    response.status(webAccessToken ? 401 : 503).json({
      ok: false,
      error: webAccessToken ? "Invalid access token" : "WEB_ACCESS_TOKEN is not configured",
    });
    return;
  }

  try {
    const dashboardResponse = await fetch(`http://127.0.0.1:${dashboardPort}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.body),
    });
    const body = await dashboardResponse.text();
    response.status(dashboardResponse.status).type("application/json").send(body);
  } catch (error) {
    response.status(503).json({ ok: false, error: `Bot dashboard unavailable: ${error.message}` });
  }
});

function startBot() {
  if (shuttingDown) {
    return;
  }

  botProcess = spawn(botExecutable, [], {
    cwd: __dirname,
    env: {
      ...process.env,
      DASHBOARD_PORT: String(dashboardPort),
    },
    stdio: "inherit",
  });

  botProcess.on("error", (error) => {
    console.error(`[bot] failed to start: ${error.message}`);
  });

  botProcess.on("exit", (code, signal) => {
    botProcess = undefined;
    if (!shuttingDown) {
      console.error(`[bot] exited (code=${code}, signal=${signal || "none"}); retrying in 5 seconds`);
      setTimeout(startBot, 5000).unref();
    }
  });
}

const httpServer = app.listen(port, "0.0.0.0", () => {
  console.log(`Web server listening on port ${port}`);
  console.log(`Starting Java bot with its internal dashboard on port ${dashboardPort}`);
  startBot();
});

function shutdown(signal) {
  shuttingDown = true;
  console.log(`Received ${signal}; shutting down`);
  if (botProcess && botProcess.exitCode === null) {
    botProcess.kill("SIGTERM");
  }
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));