# AGENTS.md — La hora del Suanzes

Guide for agents (Claude Code or others) working in this repository.
Sister project of `../multiply` and `../clasifica-express`: same methodology, same constraints, different game.
Publishing is shared by every game and described in `../AGENTS.md`.

## Rules
- Code, identifiers, documentation and comments in **English**. Everything the player sees in **Spanish (Castilian)**. Conversations and development plans with the maintainer in **Spanish (Castilian)**.
- No dependencies, no build, no network beyond the game's own files: HTML + CSS + classic JS (plain `<script>` tags, NOT ES modules). Everything hangs off the global `window.RL` namespace.
- **One difference from the sister games:** the timetable is a real JSON file (`data/schedule.json`) loaded with `fetch`, so the game needs `http://` (`make serve`) and does not run from `file://`. If it cannot load or validate the file it shows a Spanish error card.
- Pure logic modules use the dual export: `module.exports` in node, `window.RL.<name>` in the browser. They must not touch the DOM.
- MIT license. Small, frequent commits. **Never push, publish or deploy** without explicit approval from the maintainer.
- Education first: one clear task on screen, big targets, no time pressure.
- Every interaction must be doable with **keyboard only**, **mouse only** or **touch only**.
- Language correctness is non-negotiable: how a time is said in Spanish lives in `js/spoken.js` and is covered by table tests.

## Art and content limits
- Original retro point-and-click look: hard-edged SVG, limited palette, dithering through SVG patterns. **Never copy** characters, art, interface or music from any existing game.
- No real pupils or staff, in art or in text. School photos are only an architecture reference.
- No official logos: the emblem is an original drawing, because no licence for the real ones was found.
- The school is called «el Suanzes» in the story; the person it is named after stays out of it.

## The game

### Simulator («El aula»)
A classroom with an analog clock (draggable hands) and a digital one (triangles). The time is one integer, minutes 0–1439. The classroom, sun, moon and lights follow it. On release: a soft «clonc» and a hanging sign with the time in words and the current event.

### The timetable: `data/schedule.json`
Editable without touching the rules. `events` is a list of `{ id, time, scene, text }`, in ascending order, starting at `00:00`; each event lasts until the next one. `sun` sets sunrise, sunset and twilight.
- `scene` is one of `dark`, `empty`, `arrival`, `lesson`, `recess`, `lunch` (`SCENES` in `js/schedule.js`).
- Ids in `REQUIRED_IDS` are read by the exercises and cannot be removed. Others can be added freely.
- A test validates the committed file; a bad edit shows the list of problems on screen.
- The defaults are the school's published October–May timetable. **The recess time (11:00–11:30) is an assumption**: the school does not publish it.

### Game («Los retos»)
Three worlds of three levels: read the clock, elapsed time, add and subtract. Levels unlock in order. No lives and no timer: a miss shows why, and the exercise comes back later in the level. Stars (1–3) depend on how many were right at the first try. Progress stays on the device (`localStorage`, `reloj:progress`).

Exercises are generated from a seed (`js/exercises.js`). Wrong options model real mistakes: hour off by one, swapped hands, numeral read as minutes, y/menos mirror, decimal subtraction, forgotten carry. To add a kind: write it in `KINDS`, give it a story in `STORIES` and list it in a level in `js/levels.js`. Each `js/modes/*.js` builds the same shape; see `js/modes/common.js`.

### Structure
```
index.html, css/style.css
data/schedule.json    the school day (editable)
assets/fonts/         Fredoka + Nunito (woff2, OFL licenses)
js/timemath.js        minutes arithmetic (pure, tested)
js/spoken.js          how times and durations are said in Spanish (pure, tested)
js/clockmath.js       hand angles and dragging (pure, tested)
js/schedule.js        timetable validation and lookup (pure, tested)
js/sky.js             daylight model (pure, tested)
js/deck.js            seeded random, exercise queue with retries, stars (pure, tested)
js/levels.js          worlds and levels (pure, tested)
js/exercises.js       generators, distractors, stories (pure, tested)
js/storage.js         device-only progress (pure, tested)
js/svg.js, font.js    SVG helpers and the 5×7 bitmap font (shared with ../multiply)
js/sprites.js         palette, dithering, characters, props, backgrounds
js/scene.js           the classroom, built once and then only updated
js/clockface.js       analog and digital clocks
js/simulator.js       the «El aula» screen
js/modes/*.js         choice, setclock, digital, timeline
js/audio.js, input.js, fx.js
js/game.js            state machine: menu, sim, worlds, intro, play, hint, paused, clear, victory
js/debug.js           dev-only: drives the game through real DOM events
js/main.js            boot: loads the timetable, builds layers, runs the loop
tests/*.test.js       node tests, no deps (tests/harness.js)
tests/browser.sh      end-to-end checks and screenshots in headless Chrome
```

### Commands
`make serve` (then `http://localhost:8000`), `make open`, `make test`, `make check`, `make verify`, `make shots`, `make dist`, `make clean`.

### Debug URL parameters (dev only)
`?time=HH:MM` (open the simulator at that time), `&drag=minute:0,90,180,360` or `hour:…` (sweep a hand with real pointer events), `?level=N`, `&kind=<kind>` (force an exercise kind), `&seed=N`, `&all=1` (unlock everything), `&screen=sim|worlds|intro|play|hint|pause|clear|victory`, `&solve=keys|taps|wrong` (answer through the real interface), `&auto=1|miss` (bot), `&sim=N` (simulate N seconds in fixed steps: headless Chrome does not run animation frames).
The game writes `data-state="state:level:correct"`, `data-time`, `data-scene`, `data-event`, `data-cartel` and, on failure, `data-error` on `<body>`.

If `TMPDIR` is very long Chrome aborts, so `tests/browser.sh` always starts it with `TMPDIR=/tmp`.
