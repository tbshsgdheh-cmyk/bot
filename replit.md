# Eternel Bot Fleet

## Overview

Standalone Java Minecraft bot fleet for `eternel.eu:25565`. The fleet contains
the original `0bot52` plus 159 additional bots named `0bot53` through `0bot211`
for 160 total bots.

## Dashboard

The `Bot` workflow runs the local dashboard on port 5000. It provides:

- Individual start/stop controls for every bot
- Start-all and stop-all controls
- Online, starting, stopped, and error counts
- Recent connection, authentication, and server events
- Bot filtering by username
- Website chat and command panel for fleet commands or Minecraft messages

The dashboard is intended for the local workspace and has no public login.
Do not expose or publish it without adding authentication first.

## Console commands

The workflow also accepts commands through standard input:

```text
start <username>
stop <username>
start-all
stop-all
status
help
```

All 160 bots are queued automatically when the workflow starts. They join one at
a time with the configured 20-second gap. The dashboard and console can still
stop the fleet or start individual bots.

## Run

```bash
./gradlew run
```

Environment variables:

- `BOT_SERVER` (`host` or `host:port`)
- `BOT_PASSWORD`
- `BOT_REGISTER_DELAY_SECONDS`
- `BOT_LOGIN_DELAY_SECONDS`
- `BOT_RECONNECT_DELAY_SECONDS`
- `BOT_START_DELAY_SECONDS` (default: 20; delay between bots in `start-all`)
- `DASHBOARD_PORT`
- `WEB_ACCESS_TOKEN` (Render hosted chat access token)

## Render deployment

The repository includes an Express web host and a Dockerfile for Render. The
Express process listens on Render's `PORT`, serves a public `Bot is alive`
page at `/`, and starts the Java bot in the same service. The Java dashboard
uses an internal port so it does not conflict with Render's public port.

To deploy:

1. Push this repository to GitHub or GitLab.
2. In Render, choose **New > Web Service** and connect the repository.
3. Choose the **Docker** runtime. Render will use the included `Dockerfile`
   (or choose **Blueprint** and apply `render.yaml`).
4. Add `BOT_SERVER` with the Minecraft server address.
5. Add `BOT_PASSWORD` as a secret environment variable.
6. Add `WEB_ACCESS_TOKEN` as a separate secret. The hosted chat requires this
   token before it accepts commands or messages.
7. Deploy and open the generated `onrender.com` URL. `/` shows the health page
   and chat box, and `/health` is the Render health check.

The full 160-bot queue takes about 53 minutes to reach the last bot with the
20-second stagger. Use an always-on Render service for a persistent bot fleet;
the hosted chat is protected by `WEB_ACCESS_TOKEN`.