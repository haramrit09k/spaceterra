# AI Player Harness

An experiment: let an AI control the SpaceTerra rocket autonomously, in the
same style as TypeSafe AI's Jev demos (a Minecraft bot, a Subway-Surfers-style
runner) — a model making split-second typed decisions inside a real-time game
loop, instead of generating text.

This does **not** modify the real game or server. Everything lives in this
folder and talks to the existing `public/` assets over its own tiny server.

## Run it

```bash
node ai-player/play.js --seconds=45       # headless, 45-second run
node ai-player/play.js --seconds=45 --headed   # watch it play in a real window
```

You'll see a console transcript like:

```
[t=30] score=17 threats=3 safety=1.00 (heuristic-fallback) -> HOLD
[t=40] score=22 threats=3 safety=0.03 (heuristic-fallback) -> release
```

## The architecture: sense → decide → act

Same shape as a self-driving car, and deliberately split into three files so
each piece can be explained (and changed) on its own:

| Piece | File | Job |
|---|---|---|
| **Sensor** | `play.js` → `readState()` | Runs inside the browser, reads the handful of Phaser globals that matter (rocket position, obstacle/alien positions, score, the "idle too long" counter) and reduces them to one small JSON object. |
| **Brain** | `jev.js` | Takes that state, asks one typed yes/no question — *"is it safe to hold up right now?"* — and returns a probability. This is the file a real Jev API call plugs into. |
| **Hands** | `play.js` main loop | Turns the brain's probability into an actual `ArrowUp` key press/release via Playwright, at a fixed cadence. |

Nothing about the sensor or the actuator needs to change if the brain gets
smarter (or gets replaced with a real API call) — that's the whole reason for
the split, and it's the first thing worth pointing at if you're explaining
the design.

## Why this maps onto Jev specifically

TypeSafe's Jev is a "System-1" model: instead of generating text token by
token, you send it **state + a typed question** and it returns a **typed,
calibrated answer** (a `Noul` is exactly "is this true?" → a probability from
0 to 1), in 70–500ms, cheaply enough to call in a tight loop. That is
precisely what a real-time control problem like this needs: not a
conversation, a fast yes/no with a confidence attached.

`jev.js` builds the exact request shape Jev expects:

```js
{
  state: { rocketX, oscIndex, intensity, threats: [...] },
  questions: [{ id: 'safe_to_advance', type: 'noul', text: '...' }]
}
```

**Why it's not calling the real API right now:** this sandbox's network
policy blocks `api.typesafe.ai` (confirmed with a direct `curl` — connection
rejected), so `callJev()` falls back to `heuristicNoul()`, a hand-written
function that answers the *same question* the *same way* a Noul call would:
geometry in, probability out. The moment you have a `TYPESAFE_API_KEY` and
run this somewhere with real network access, set the env var and the real
`fetch()` path (already written, just currently unused) takes over —
nothing else in the project changes.

## Design decisions worth being able to explain

1. **Poll every 100ms, not every frame.** Jev's own docs quote 70–500ms
   latency. Deciding every 16ms (60fps) would be pretending the model can
   answer faster than it actually can — the polling interval should match
   the tool you're designing around, not the frame rate.

2. **A safety override sits on top of the model's answer.** SpaceTerra kills
   the rocket outright if you don't advance for 300 frames
   (`oscIndexNew === 300` in `gameplay.js`). The loop hard-forces `HOLD` once
   that counter gets close, regardless of what the brain says. This is a
   common real-world pattern: let the model make the judgment call, but keep
   a hard-coded guardrail for the one failure mode you can't afford to leave
   to a probability.

3. **The heuristic predicts, it doesn't just react.** The first version
   compared the rocket's *current* x position to each threat's x position —
   and died almost immediately. The reason: the rocket's x is a pure sine
   wave (`utils.js`'s `oscillation()`) that keeps swinging every frame
   whether or not you're advancing; the player never steers it directly.
   Checking the rocket's *current* position tells you nothing about where
   it'll be a few frames from now, when the threat actually arrives. The
   fix (`predictFutureX()` in `jev.js`) projects the sine wave forward to
   the frame the threat would reach the collision line, and checks clearance
   against *that* position instead. That one change took the score from
   ~10 to ~22 in testing.

4. **Known remaining weakness (a good "what I'd do next" answer):**
   releasing the key pauses the world scroll, but it does **not** pause the
   rocket's own sine-wave oscillation — so "wait it out" is only safe if the
   threat's fixed screen position happens to be outside the rocket's swing
   arc while paused. The heuristic doesn't currently model that; a sharper
   version would check whether releasing is actually safer than a
   differently-timed hold, not just default to "release when scared."

## Files

- `harness-server.js` — serves `public/` plus a couple of stub endpoints
  (`/api/user`, `/api/user/stats`) so the landing page's `fetch()` calls
  don't error out. Doesn't touch Mongo or Google OAuth — neither is needed
  to play.
- `harness.html` — a copy of `views/index.html` with the `cdn.socket.io`
  script swapped for a no-op stub, since that CDN is also blocked here and
  the AI player never submits a leaderboard score anyway.
- `jev.js` — the brain: request shape, heuristic fallback, real-API path.
- `play.js` — the runner: boots the harness server, launches Chromium via
  Playwright, runs the sense/decide/act loop, prints a run summary.
