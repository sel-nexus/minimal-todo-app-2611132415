# Minimal Todo App

A small, directly-openable todo list built to provide a deterministic browser test target. The app uses plain HTML, CSS, and vanilla JavaScript in one file; task state is held in memory and resets when the page reloads.

## Run the app

Open `index.html` directly in a browser. No server, install, build, backend, database, or persistent storage is required.

## Features

- Add tasks with the Add button or Enter.
- Trim task titles and ignore empty or whitespace-only input.
- Assign sequential IDs and preserve add order.
- Toggle completion with a checkbox and show completed titles with a strikethrough.
- Delete tasks individually and restore the exact empty state when the list is empty.
- Expose stable IDs and `data-testid` selectors for browser automation.

## Test harness

The app itself has no runtime dependencies. Optional test tooling is declared separately in `package.json`.

- Unit/behavior tests: `node --test tests/todo.test.js`
- Playwright E2E: `npm run test:e2e` (requires installing the declared dev dependency and Chromium in the test environment)

The E2E spec opens the local `index.html` via a `file://` URL and exercises the complete task lifecycle.
