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
