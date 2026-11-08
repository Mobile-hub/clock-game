#!/bin/sh
# End-to-end checks and screenshots in headless Chrome, against a local server (the timetable needs http://).
# Usage: sh tests/browser.sh verify | shots
set -u

PORT="${PORT:-8766}"
CHROME="${CHROME:-google-chrome}"
WORK="$(mktemp -d)"
BASE="http://localhost:$PORT"
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVERS="$!"
trap 'kill $SERVERS 2>/dev/null; rm -rf "$WORK"' EXIT
sleep 1

FAILED=0

# Chrome is always started with TMPDIR=/tmp: a long temporary path makes it abort (its socket path has a length limit).

# dump BASE QUERY [BUDGET_MS]: prints the <body> tag once the page has run.
dump() {
  timeout 180 env TMPDIR=/tmp "$CHROME" --headless=new --disable-gpu --user-data-dir="$WORK/profile" \
    --virtual-time-budget="${3:-8000}" --dump-dom "$1/index.html?$2" 2>/dev/null | grep -o '<body[^>]*>'
}

# check NAME QUERY REGEX [BUDGET_MS] [BASE]: the body tag must match and carry no error.
check() {
  body="$(dump "${5:-$BASE}" "$2" "${4:-8000}")"
  if printf '%s' "$body" | grep -q 'data-error'; then
    echo "  FAIL $1: $body"
    FAILED=1
  elif printf '%s' "$body" | grep -Eq "$3"; then
    echo "  ok  $1"
  else
    echo "  FAIL $1: expected /$3/ in: $body"
    FAILED=1
  fi
}

verify() {
  echo "# the classroom follows the timetable"
  check 'lesson at 10:00' 'time=10:00&sim=1' 'data-scene="lesson"'
  check 'recess at 11:15' 'time=11:15&sim=1' 'data-scene="recess"'
  check 'lunch at 13:00' 'time=13:00&sim=1' 'data-scene="lunch"'
  check 'empty at 17:00' 'time=17:00&sim=1' 'data-scene="empty"'
  check 'dark at 22:00' 'time=22:00&sim=1' 'data-scene="dark"'

  echo "# dragging the hands with real pointer events"
  check 'a turn of the minute hand' 'time=09:00&drag=minute:0,90,180,270,360&sim=1' 'data-time="10:00"'
  check 'back across twelve' 'time=09:05&drag=minute:30,0,-30&sim=1' 'data-time="08:55"'
  check 'forward across midnight' 'time=23:50&drag=minute:300,360,420&sim=1' 'data-time="00:10"'
  check 'the hour hand keeps the minutes' 'time=09:20&drag=hour:280,310&sim=1' 'data-time="10:20"'
  check 'the sign names the time' 'time=12:45&drag=minute:270,276,270&sim=1' 'data-cartel="Es la una menos cuarto del mediodía · Todos al comedor"'

  echo "# every kind of exercise renders"
  for spec in 1:readPhrase 2:readDigital 2:digitalToAnalog 1:setClock 3:phrase24 3:type24 \
              4:elapsedPair 5:elapsedTimeline 4:lunchLength 4:recessLength 4:morningLength 5:recessLeft \
              7:addChoice 7:addSetClock 8:addDigital 9:subtractChoice 9:subtractDigital 7:afternoonEnd; do
    level="${spec%%:*}"
    kind="${spec##*:}"
    check "$kind" "level=$level&kind=$kind&screen=play&seed=3&sim=1" "data-state=\"play:$level:0\""
  done

  echo "# exercises solved through the real interface"
  for spec in 2:readPhrase 2:digitalToAnalog 3:type24 1:setClock 5:elapsedTimeline 8:addDigital; do
    level="${spec%%:*}"
    kind="${spec##*:}"
    for how in keys taps; do
      check "$kind with $how" "level=$level&kind=$kind&screen=play&seed=3&solve=$how&sim=2" "data-state=\"play:$level:1\""
    done
  done
  check 'a wrong answer shows the hint' 'level=2&kind=readPhrase&screen=play&seed=3&solve=wrong&sim=2' 'data-state="hint:2:0"'

  echo "# screens"
  for screen in worlds intro hint pause clear victory; do
    check "$screen" "level=2&screen=$screen&seed=1&sim=1" "data-state=\"$screen"
  done

  echo "# the bot plays the whole game"
  check 'clean run' 'auto=1&seed=7&sim=330' 'data-state="victory:9:' 900000
  check 'run with misses' 'auto=miss&seed=8&sim=480' 'data-state="victory:9:' 900000

  echo "# editing data/schedule.json changes the game without touching the code"
  cp -r index.html css js data assets "$WORK/"
  python3 - "$WORK/data/schedule.json" <<'PY'
import json, sys
path = sys.argv[1]
data = json.load(open(path, encoding='utf8'))
next(e for e in data['events'] if e['id'] == 'lunch')['time'] = '12:00'
json.dump(data, open(path, 'w', encoding='utf8'), ensure_ascii=False)
PY
  python3 -m http.server --directory "$WORK" "$((PORT + 1))" >/dev/null 2>&1 &
  SERVERS="$SERVERS $!"
  sleep 1
  check 'lunch moved to 12:00' 'time=12:15&sim=1' 'data-scene="lunch"' 8000 "http://localhost:$((PORT + 1))"

  echo "# a broken timetable shows an error card instead of a blank page"
  printf '{ not json' > "$WORK/data/schedule.json"
  body="$(dump "http://localhost:$((PORT + 1))" 'sim=1')"
  if printf '%s' "$body" | grep -q 'data-error="No se ha podido leer'; then
    echo '  ok  error card'
  else
    echo "  FAIL error card: $body"
    FAILED=1
  fi

  [ "$FAILED" -eq 0 ] && echo 'verify OK' || echo 'verify FAILED'
  exit "$FAILED"
}

shot() {
  timeout 60 env TMPDIR=/tmp "$CHROME" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$WORK/profile" --window-size=1280,720 \
    --virtual-time-budget=3500 --screenshot="$PWD/screenshots/$1.png" "$BASE/index.html?$2" 2>/dev/null
}

shots() {
  mkdir -p screenshots
  shot menu 'sim=1'
  shot simulator-day 'time=10:15&drag=minute:90,96,90&sim=1'
  shot simulator-night 'time=21:40&sim=1'
  shot gameplay-1 'level=2&kind=readPhrase&screen=play&seed=4&sim=1'
  shot gameplay-2 'level=5&kind=elapsedTimeline&screen=play&seed=3&sim=1'
  shot gameplay-3 'level=1&kind=setClock&screen=play&seed=2&sim=1'
  echo 'screenshots/ updated'
}

case "${1:-}" in
  verify) verify ;;
  shots) shots ;;
  *) echo 'usage: sh tests/browser.sh verify|shots'; exit 2 ;;
esac
