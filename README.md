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
