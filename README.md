# Resizable AG Grid (React)

A Next.js **12.x** + React (JS) demo of a custom grid component built on
[`ag-grid-react`](https://www.npmjs.com/package/ag-grid-react) **v32**.

## Features

- Custom `ResizableGrid` component wrapping `AgGridReact`
- All columns are **resizable** — drag the header border
- Column widths are **saved to `localStorage`** on resize and **restored
  automatically** when the grid is reopened or the page is reloaded
- Every row has an **Edit** button that opens a row-detail modal
- The modal's **Previous / Next** buttons walk the rows in the order shown in
  the grid and wrap around (Next on the last row shows the first; Previous on
  the first row shows the last). The footer shows `Record 3 of 20`. Escape or a
  backdrop click closes it; ← / → also navigate
- Page with two buttons: **Open Grid** (mounts the component) and **Close
  Grid** (unmounts it)
- Live data from the
  [PokeAPI resource list endpoint](https://pokeapi.co/docs/v2#resource-listspagination-section)
  (`GET /api/v2/pokemon?limit=&offset=`), with Previous/Next pagination
  driven by the API's `next`/`previous` links
- Rows-per-page dropdown in the pagination panel with `10 / 20 / 50 / 100`
  presets plus an **All** entry that fits every row onto a single page
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
  App.jsx                    # page with Open/Close buttons, data fetching, pagination
  pokemonApi.js              # PokeAPI fetch + column definitions matching the response
  components/ResizableGrid.jsx  # custom ag-grid-react wrapper (localStorage persistence)
  components/PokemonEdit.jsx    # row-detail popup opened by the grid's Edit button
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
