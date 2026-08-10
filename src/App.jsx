import { useState } from "react";
import ResizableGrid from "./components/ResizableGrid.jsx";
import { demoColumnDefs, demoRowData } from "./demoData.js";

const STORAGE_KEY = "ag-grid-demo-column-state";

export default function App() {
  const [showGrid, setShowGrid] = useState(false);

  return (
    <div className="app">
      <header className="header">
        <div className="badge">ag-grid-react · v32</div>
        <h1>Resizable AG Grid</h1>
        <p className="subtitle">
          A custom component built on <code>ag-grid-react</code>. Drag a column
          header border to resize it, or click a header to sort. Widths and
          sort state are saved to <code>localStorage</code> and restored
          automatically when you reopen the grid.
        </p>
      </header>

      <div className="toolbar">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowGrid(true)}
          disabled={showGrid}
        >
          Open Grid
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => setShowGrid(false)}
          disabled={!showGrid}
        >
          Close Grid
        </button>

        <span className={`status ${showGrid ? "status-open" : "status-closed"}`}>
          <span className="dot" />
          Grid is {showGrid ? "open" : "closed"}
        </span>
      </div>

      {showGrid && (
        <ResizableGrid
          rowData={demoRowData}
          columnDefs={demoColumnDefs}
          storageKey={STORAGE_KEY}
        />
      )}
    </div>
  );
}
