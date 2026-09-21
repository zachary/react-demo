import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AgGridReact } from "ag-grid-react";

const DEFAULT_STORAGE_KEY = "ag-grid-column-state";

// Column id of the generated "Edit" button column.
const ACTIONS_COL_ID = "actions";

// AG Grid reports the source of every columnResized event. Only resizes
// caused by the user dragging a header border have source "uiColumnResized".
// Programmatic width changes (source "api") and internal layout passes must
// NOT overwrite the persisted widths.
const USER_RESIZE_SOURCE = "uiColumnResized";

// localStorage only exists in the browser. Next.js server-renders this
// component, so every access must be guarded to avoid `ReferenceError`.
function isBrowser() {
  return typeof window !== "undefined";
}

function loadSavedColumnState(storageKey) {
  if (!isBrowser()) return null;
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : null;
  } catch (err) {
    console.warn("Could not load saved grid column state:", err);
    return null;
  }
}

/**
 * ResizableGrid
 * -------------
 * A custom component built on top of `ag-grid-react`.
 *
 * Features:
 *  - All columns are resizable (drag the header border).
 *  - All columns are sortable (click the header).
 *  - When an `onEditRow` callback is supplied, a generated "Edit" button
 *    column calls it with the clicked row. The grid itself does not render
 *    any dialog; the parent owns that (see `PokemonComponent`).
 *  - Column widths and sort state are saved to `localStorage` when the user
 *    finishes a drag or changes the sort.
 *  - On mount, the saved widths and sort are baked into the column definitions
 *    handed to the grid, so columns are *created* with the persisted state.
 *    This avoids a race where the grid's post-ready layout pass resets state
 *    applied via `applyColumnState` inside `onGridReady`.
 *  - Paging uses AG Grid's own pagination panel. The panel is themed from the
 *    global stylesheet by overriding AG Grid's `ag-paging-*` class selectors,
 *    scoped to this component's `resizable-grid` marker class so the styles
 *    don't leak onto other grids (see `src/index.css`).
 *  - The rows-per-page dropdown is the one exception: it is portalled into the
 *    panel's page-size slot so it can offer an "All" entry next to the numeric
 *    presets (see `PageSizePicker`).
 */

// Rows-per-page choices offered by the pagination panel.
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Sentinel for the "All" entry of the rows-per-page dropdown. It never reaches
// AG Grid: it selects the full row count instead of a fixed page size.
const ALL_ROWS = "all";

/**
 * Rows-per-page dropdown rendered into AG Grid's pagination panel.
 *
 * AG Grid v32 only accepts numbers in `paginationPageSizeSelector` and labels
 * each option with that number, so an "All" entry cannot be produced through
 * the public API. Instead `paginationPageSizeSelector={false}` leaves the
 * panel's page-size slot empty and this picker is portalled into it: the panel
 * keeps its layout and only the dropdown itself is ours.
 */
function PageSizePicker({ selection, sizes, showAll, onChange }) {
  return (
    <label className="page-size-picker">
      <span className="ag-label">Page Size:</span>
      <select
        className="page-size-select"
        value={selection === ALL_ROWS ? ALL_ROWS : String(selection)}
        onChange={onChange}
      >
        {sizes.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
        {showAll && <option value={ALL_ROWS}>All</option>}
      </select>
    </label>
  );
}

export default function ResizableGrid({
  rowData,
  columnDefs,
  storageKey = DEFAULT_STORAGE_KEY,
  title = "Demo Grid",
  // Rows per page when the grid opens. The rows-per-page dropdown in the
  // pagination panel can change it afterwards, including to "All".
  pageSize = 20,
  // Shows AG Grid's native loading overlay while rows are being fetched.
  loading = false,
  // Called with the clicked row when the generated "Edit" button is pressed.
  // Omit it to render a plain grid with no Edit column.
  onEditRow,
  // Optional ref the parent can pass in to receive the AG Grid API, so a
  // sibling component can read the displayed rows. Falls back to a local ref
  // when the grid is used on its own.
  gridApiRef: externalGridApiRef,
}) {
  const internalGridApiRef = useRef(null);
  const gridApiRef = externalGridApiRef ?? internalGridApiRef;
  const containerRef = useRef(null);
  // AG Grid's pagination panel's page-size slot (an empty element, because its
  // own picker is disabled). Populated in onGridReady; the rows-per-page
  // dropdown is portalled into it from the render below.
  const [pageSizeSlot, setPageSizeSlot] = useState(null);
  // Current choice: a number of rows per page, or ALL_ROWS to show every row.
  // The picker owns this after mount because, in v32, `paginationPageSize` is
  // the only supported way to change the page size.
  const [pageSizeSelection, setPageSizeSelection] = useState(pageSize);
  const [hasSavedState, setHasSavedState] = useState(() => {
    if (!isBrowser()) return false;
    try {
      return !!localStorage.getItem(storageKey);
    } catch {
      return false;
    }
  });

  // Follow the prop if the parent changes it; picking a size in the dropdown
  // only moves `pageSizeSelection`, so this stays quiet after mount.
  useEffect(() => {
    setPageSizeSelection(pageSize);
  }, [pageSize]);

  // --- Rows-per-page dropdown ---------------------------------------------
  const rowCount = rowData?.length ?? 0;
  // Handed to AG Grid: every row once "All" is selected.
  const rowsPerPage =
    pageSizeSelection === ALL_ROWS ? rowCount || pageSize : pageSizeSelection;

  // Always offer the current size as a choice so the dropdown can never show a
  // value it does not contain (AG Grid does the same for its own picker).
  const pageSizeChoices = useMemo(() => {
    const sizes = new Set(PAGE_SIZE_OPTIONS);
    if (pageSizeSelection !== ALL_ROWS) sizes.add(pageSizeSelection);
    return [...sizes].sort((a, b) => a - b);
  }, [pageSizeSelection]);

  // Offer "All" only when the row count isn't already one of the presets, but
  // keep it while selected so the dropdown can still display its own value.
  const showAllRows =
    rowCount > 0 &&
    (!PAGE_SIZE_OPTIONS.includes(rowCount) || pageSizeSelection === ALL_ROWS);

  const onPageSizeChange = useCallback((event) => {
    const { value } = event.target;
    setPageSizeSelection(value === ALL_ROWS ? ALL_ROWS : Number(value));
  }, []);

  // --- Generated "Edit" column ---------------------------------------------
  // The button only reports the clicked row upwards; the parent decides what
  // to do with it.
  const actionsColumnDef = useMemo(
    () =>
      onEditRow
        ? {
            colId: ACTIONS_COL_ID,
            headerName: "",
            width: 110,
            minWidth: 96,
            sortable: false,
            resizable: true,
            suppressMovable: true,
            pinned: "right",
            cellClass: "actions-cell",
            cellRenderer: (params) => (
              <button
                type="button"
                className="btn btn-ghost row-edit-btn"
                title="Edit this row"
                onClick={() => onEditRow(params.data)}
              >
                Edit
              </button>
            ),
          }
        : null,
    [onEditRow]
  );

  // Only the columns the caller passed are persisted-sensitive, but the
  // actions column participates in the saved state too, so append it before
  // restoring.
  const allColumnDefs = useMemo(
    () =>
      actionsColumnDef ? [...columnDefs, actionsColumnDef] : [...columnDefs],
    [columnDefs, actionsColumnDef]
  );

  // --- Load: bake saved widths into the column defs (once per mount) -------
  // Note: this assumes `columnDefs` is a stable reference from the parent.
  // If a parent rebuilt `columnDefs` on every render, ag-grid-react would
  // re-apply the defs and reset user widths.
  const savedColumnState = useMemo(
    () => loadSavedColumnState(storageKey),
    [storageKey]
  );
  const restoredColumnDefs = useMemo(() => {
    if (!savedColumnState) return allColumnDefs;
    return allColumnDefs.map((def) => {
      const colId = def.colId ?? def.field;
      const saved = savedColumnState.find((c) => c.colId === colId);
      if (!saved) return def;
      const restored = { ...def };
      if (typeof saved.width === "number") {
        restored.width = saved.width;
      }
      // Persist multi-column sort order via the same saved column state.
      if (saved.sort) {
        restored.sort = saved.sort;
        if (typeof saved.sortIndex === "number") {
          restored.sortIndex = saved.sortIndex;
        }
      }
      return restored;
    });
  }, [allColumnDefs, savedColumnState]);

  const onGridReady = useCallback((params) => {
    gridApiRef.current = params.api;
    // `paginationPageSizeSelector={false}` leaves this slot empty for the
    // rows-per-page dropdown to render into.
    setPageSizeSlot(
      containerRef.current?.querySelector(".ag-paging-page-size") ?? null
    );
  }, []);

  // --- Save ---------------------------------------------------------------
  const saveColumnState = useCallback(() => {
    const api = gridApiRef.current;
    if (!api || !isBrowser()) return;
    try {
      const state = api.getColumnState();
      localStorage.setItem(storageKey, JSON.stringify(state));
      setHasSavedState(true);
    } catch (err) {
      console.warn("Could not save grid column state:", err);
    }
  }, [storageKey]);

  const onColumnResized = useCallback(
    (event) => {
      // `finished` is only true once the user releases the drag handle, and
      // `source` is only "uiColumnResized" for actual user drags.
      if (event.finished && event.source === USER_RESIZE_SOURCE) {
        saveColumnState();
      }
    },
    [saveColumnState]
  );

  // Sort changes don't carry a source flag, so save on every sortChanged. The
  // initial bake-in of saved sort state triggers this once on mount, but it
  // re-writes the same state, so it's harmless. A programmatic reset also
  // fires this, which correctly persists the cleared sort.
  const onSortChanged = useCallback(() => {
    saveColumnState();
  }, [saveColumnState]);

  // --- Reset widths to the original defaults ----------------------------------
  const resetColumnState = useCallback(() => {
    if (!isBrowser()) return;
    localStorage.removeItem(storageKey);
    setHasSavedState(false);
    const api = gridApiRef.current;
    if (!api) return;
    const defaults = allColumnDefs.map((def) => ({
      colId: def.colId ?? def.field,
      width: def.width,
    }));
    // Programmatic change → source "api" → not persisted by onColumnResized.
    api.applyColumnState({ state: defaults });
  }, [storageKey, allColumnDefs]);

  // The container is taller than the visible row area so the native pagination
  // panel at the bottom of the grid doesn't eat into the rows.
  return (
    <div className="grid-card">
      <div className="grid-toolbar">
        <span className="grid-title">
          {title}{" "}
          <span className="grid-meta">
            {hasSavedState ? "state saved in localStorage" : "default widths"}
          </span>
        </span>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={resetColumnState}
        >
          Reset widths & sort
        </button>
      </div>

      {/* `resizable-grid` is the marker class the pagination styles in
          src/index.css are scoped to, so they don't leak onto other
          ag-grid-react components on the page. */}
      <div
        ref={containerRef}
        className="ag-theme-quartz grid-container resizable-grid"
        data-ag-theme-mode="dark"
        style={{ height: "480px", width: "100%" }}
      >
        <AgGridReact
          rowData={rowData}
          columnDefs={restoredColumnDefs}
          onGridReady={onGridReady}
          onColumnResized={onColumnResized}
          onSortChanged={onSortChanged}
          defaultColDef={{ resizable: true, sortable: true }}
          pagination
          paginationPageSize={rowsPerPage}
          // AG Grid's own picker only knows numeric page sizes, so it is
          // disabled and `PageSizePicker` takes its place in the panel.
          paginationPageSizeSelector={false}
          loading={loading}
          animateRows
        />

        {pageSizeSlot &&
          createPortal(
            <PageSizePicker
              selection={pageSizeSelection}
              sizes={pageSizeChoices}
              showAll={showAllRows}
              onChange={onPageSizeChange}
            />,
            pageSizeSlot
          )}
      </div>
    </div>
  );
}
