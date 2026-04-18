# Abyssal Depths

Phaser 3 platformer. Run locally: `npm install` then `npm run dev`.

After pulling art changes, **hard-refresh** the browser (**Cmd+Shift+R** / **Ctrl+Shift+R**) so cached textures reload.

## Gamepad (8BitDo / macOS)

**macOS recognizing the USB device** (System Information, Bluetooth menu) is **not** the same as **the browser** exposing it via `navigator.getGamepads()`. Many modes (e.g. Switch / “Pro Controller”) show up to the OS but never appear to web pages.

1. **Use a data-capable USB cable** (many cables are charge-only).
2. **Prefer Xbox / X-input mode** on 8BitDo: power off, hold **X + Start**, then connect.
3. **Click the game**, then **press any face button** so the browser can “wake” the pad.
4. **Debug in-game:** open  
   `http://localhost:5173/?gamepaddebug=1`  
   You’ll see what the **browser** reports each frame. If every slot is empty, the game cannot use the controller until mode/driver exposes a standard gamepad.

If [gamepad-tester.com](https://gamepad-tester.com) shows **no** controller in that browser, the issue is mode/OS — not this game.

## Multiplayer (Play Online)

Co-op exploration: everyone in the same room code sees each other running around, jumping, and changing levels. Each client still plays its own game (enemies, damage, doors are not synced); this is a "shared world" presence layer.

### Setup

1. Copy `env.example` to `.env` and fill in `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`. (Free Upstash Redis works fine.)
2. `npm install` — pulls in `express`, `@upstash/redis`, `cors`, `dotenv`, `concurrently`.
3. Run both the game and the room server:

```bash
npm run dev:mp
```

…or run them in separate terminals:

```bash
npm run dev           # vite, http://localhost:5173
npm run room-server   # express + upstash, http://localhost:3002
```

Vite proxies `/platformer/room/*` to `:3002`, so no CORS wrangling is needed in dev.

### Playing

- From the title screen, choose **PLAY ONLINE**.
- **HOST** — creates a room and shows a 5-character code. Share it with friends.
- **JOIN** — enter the 5-character code to drop into the same room.
- The current room code is shown as a pill in the top-right while playing.

### How it works

- The server (`server/roomServer.js`) stores each player's last-known state in a Redis hash keyed by room code, with a 6h TTL.
- Clients heartbeat their position/facing/animation every ~180ms and receive the other players in response.
- `RemotePlayer` sprites interpolate toward the latest snapshot and only render while sharing a room with the local player.
- Disconnects are TTL-based (10s stale cutoff), so tab closes don't strand ghosts.

### Deploying the server

Anything that runs Node 18+ works (Fly.io, Railway, Render, a VM, etc.). Set the same `UPSTASH_REDIS_REST_*` env vars there, and point the client at it via:

```bash
VITE_PLATFORMER_ROOM_API_BASE=https://your-room-server.example.com
```

before `npm run build`.
