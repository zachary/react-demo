import { useCallback, useMemo, useRef, useState } from "react";
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
 *    global stylesheet by overriding AG Grid's `ag-paging-*` class selectors
 *    (see `src/index.css`), so no custom pagination component is involved.
 */

// Rows-per-page choices offered by the native pagination panel.
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function ResizableGrid({
  rowData,
  columnDefs,
  storageKey = DEFAULT_STORAGE_KEY,
  title = "Demo Grid",
  // Rows per page in AG Grid's pagination panel.
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
  const [hasSavedState, setHasSavedState] = useState(() => {
    if (!isBrowser()) return false;
    try {
      return !!localStorage.getItem(storageKey);
    } catch {
      return false;
    }
  });

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

      <div
        className="ag-theme-quartz grid-container"
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
          paginationPageSize={pageSize}
          paginationPageSizeSelector={PAGE_SIZE_OPTIONS}
          loading={loading}
          animateRows
        />
      </div>
    </div>
  );
}
