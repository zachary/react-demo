# Resizable AG Grid (React)

A Next.js **12.x** + React (JS) demo of a custom grid component built on
[`ag-grid-react`](https://www.npmjs.com/package/ag-grid-react) **v32**.

## Features

- Custom `ResizableGrid` component wrapping `AgGridReact`
- All columns are **resizable** — drag the header border
- Column widths are **saved to `localStorage`** on resize and **restored
  automatically** when the grid is reopened or the page is reloaded
- Page with two buttons: **Open Grid** (mounts the component with demo data)
  and **Close Grid** (unmounts it)
- "Reset widths" button inside the grid card clears the saved state

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

## Project structure

```
pages/
  _app.js                    # Next.js App — loads global + AG Grid styles
  index.js                   # page that renders the App component
src/
  App.jsx                    # page with Open/Close buttons
  demoData.js                # demo column definitions + row data
  components/ResizableGrid.jsx  # custom ag-grid-react wrapper (localStorage persistence)
  index.css                  # page styles
next.config.js               # Next.js config (React Strict Mode)
```

## How persistence works

- `onColumnResized` fires when a drag ends — only events where
  `event.finished === true` **and** `event.source === "uiColumnResized"`
  (i.e. a real user drag, not a programmatic/layout change) are persisted.
  The column state from `api.getColumnState()` is JSON-serialized into
  `localStorage` under `ag-grid-demo-column-state` (configurable via the
  `storageKey` prop).
- On mount, the saved widths are baked into the column definitions passed to
  the grid (`columnDefs.map(d => ({ ...d, width: savedWidth }))`), so columns
  are *created* with the persisted widths. This avoids a race where the grid's
  post-`onGridReady` layout pass resets widths applied via
  `api.applyColumnState`, which previously made resizes appear "reset" after
  reopening the grid.
