import { useCallback, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";

const DEFAULT_STORAGE_KEY = "ag-grid-column-state";

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
 *  - Column widths and sort state are saved to `localStorage` when the user
 *    finishes a drag or changes the sort.
 *  - On mount, the saved widths and sort are baked into the column definitions
 *    handed to the grid, so columns are *created* with the persisted state.
 *    This avoids a race where the grid's post-ready layout pass resets state
 *    applied via `applyColumnState` inside `onGridReady`.
 */
export default function ResizableGrid({
  rowData,
  columnDefs,
  storageKey = DEFAULT_STORAGE_KEY,
}) {
  const gridApiRef = useRef(null);
  const [hasSavedState, setHasSavedState] = useState(() => {
    if (!isBrowser()) return false;
    try {
      return !!localStorage.getItem(storageKey);
    } catch {
      return false;
    }
  });

  // --- Load: bake saved widths into the column defs (once per mount) -------
  // Note: this assumes `columnDefs` is a stable reference from the parent.
  // If a parent rebuilt `columnDefs` on every render, ag-grid-react would
  // re-apply the defs and reset user widths.
  const savedColumnState = useMemo(
    () => loadSavedColumnState(storageKey),
    [storageKey]
  );
  const restoredColumnDefs = useMemo(() => {
    if (!savedColumnState) return columnDefs;
    return columnDefs.map((def) => {
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
  }, [columnDefs, savedColumnState]);

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
    const defaults = columnDefs.map((def) => ({
      colId: def.colId ?? def.field,
      width: def.width,
    }));
    // Programmatic change → source "api" → not persisted by onColumnResized.
    api.applyColumnState({ state: defaults });
  }, [storageKey, columnDefs]);

  return (
    <div className="grid-card">
      <div className="grid-toolbar">
        <span className="grid-title">
          Demo Grid{" "}
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
        style={{ height: "420px", width: "100%" }}
      >
        <AgGridReact
          rowData={rowData}
          columnDefs={restoredColumnDefs}
          onGridReady={onGridReady}
          onColumnResized={onColumnResized}
          onSortChanged={onSortChanged}
          defaultColDef={{ resizable: true, sortable: true }}
          animateRows
        />
      </div>
    </div>
  );
}
