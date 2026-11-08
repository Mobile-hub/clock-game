.PHONY: open serve test check verify shots dist clean help

PORT ?= 8000
JS := $(wildcard js/*.js) $(wildcard js/modes/*.js) $(wildcard tests/*.js)
TESTS := $(wildcard tests/*.test.js)
RUNTIME := index.html css js LICENSE $(wildcard data) $(wildcard assets)

help:
	@echo "make open   - serve the game and open it in the default browser"
	@echo "make serve  - serve the game on http://localhost:$(PORT)"
	@echo "make test   - run unit tests (node)"
	@echo "make check  - syntax-check every JS file (node)"
	@echo "make verify - end-to-end checks in headless Chrome"
	@echo "make shots  - retake the README screenshots"
	@echo "make dist   - copy the publishable files to dist/"
	@echo "make clean  - remove dist/"

# The timetable is loaded with fetch, which needs http:// (it fails from file://).
open:
	@(sleep 1; xdg-open http://localhost:$(PORT)/ >/dev/null 2>&1 || open http://localhost:$(PORT)/) &
	python3 -m http.server $(PORT)

serve:
	python3 -m http.server $(PORT)

test:
	@for f in $(TESTS); do echo "# $$f"; node $$f || exit 1; done; echo "tests OK"

check:
	@for f in $(JS); do node --check $$f || exit 1; done && echo "syntax OK"

verify:
	sh tests/browser.sh verify

shots:
	sh tests/browser.sh shots

dist: check test clean
	mkdir -p dist
	cp -r $(RUNTIME) dist/
	@echo "dist/ ready: upload its contents to /games/reloj/ (see ../AGENTS.md)"

clean:
	rm -rf dist
