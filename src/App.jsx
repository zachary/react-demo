import { useEffect, useState } from "react";
import PokemonComponent from "./components/PokemonComponent.jsx";
import { fetchPokemonPage, pokemonColumnDefs } from "./pokemonApi.js";

const STORAGE_KEY = "ag-grid-demo-column-state";
const PAGE_LIMIT = 20;

// The API's `next` / `previous` fields are absolute URLs carrying the next
// offset, e.g. https://pokeapi.co/api/v2/pokemon?offset=20&limit=20.
function offsetFromPageUrl(url) {
  if (!url) return null;
  try {
    return Number(new URL(url).searchParams.get("offset"));
  } catch {
    return null;
  }
}

export default function App() {
  const [showGrid, setShowGrid] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [pageInfo, setPageInfo] = useState(null); // { count, next, previous }
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPokemonPage(PAGE_LIMIT, offset)
      .then((data) => {
        if (cancelled) return;
        setRowData(data.results);
        setPageInfo({ count: data.count, next: data.next, previous: data.previous });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setRowData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [offset]);

  const goToNext = () => {
    const next = offsetFromPageUrl(pageInfo?.next);
    if (next !== null) setOffset(next);
  };

  const goToPrevious = () => {
    const previous = offsetFromPageUrl(pageInfo?.previous);
    if (previous !== null) setOffset(previous);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="badge">ag-grid-react · v32 · PokeAPI</div>
        <h1>Resizable AG Grid</h1>
        <p className="subtitle">
          A custom component built on <code>ag-grid-react</code>, fed live data
          from the{" "}
          <a
            href="https://pokeapi.co/docs/v2#resource-listspagination-section"
            target="_blank"
            rel="noreferrer"
          >
            PokeAPI resource list endpoint
          </a>
          . Drag a column header border to resize it, or click a header to sort.
          Widths and sort state are saved to <code>localStorage</code> and
          restored automatically when you reopen the grid.
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
        <>
          <div className="pagination-bar">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={goToPrevious}
              disabled={!pageInfo?.previous || loading}
            >
              ← Previous
            </button>

            <span className="pagination-info" role="status">
              {loading
                ? "Loading…"
                : error
                ? `Failed to load: ${error}`
                : pageInfo
                ? `Showing ${rowData.length} of ${pageInfo.count.toLocaleString()} Pokémon`
                : ""}
            </span>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={goToNext}
              disabled={!pageInfo?.next || loading}
            >
              Next →
            </button>
          </div>

          <PokemonComponent
            title="Pokémon"
            rowData={rowData}
            columnDefs={pokemonColumnDefs}
            storageKey={STORAGE_KEY}
          />
        </>
      )}
    </div>
  );
}