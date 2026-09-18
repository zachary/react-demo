import { useEffect, useState } from "react";
import PokemonComponent from "./components/PokemonComponent.jsx";
import { fetchAllPokemon, pokemonColumnDefs } from "./pokemonApi.js";

const STORAGE_KEY = "ag-grid-demo-column-state";
const DEFAULT_PAGE_SIZE = 20;

export default function App() {
  const [showGrid, setShowGrid] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination is handled by AG Grid itself, so every row is loaded up front
  // and the grid's own pagination panel pages through them on the client.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAllPokemon()
      .then((data) => {
        if (cancelled) return;
        setRowData(data.results);
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
  }, []);

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
          restored automatically when you reopen the grid. Rows are paged by AG
          Grid's own pagination panel.
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

      {error && (
        <p className="error-note" role="alert">
          Failed to load Pokémon: {error}
        </p>
      )}

      {showGrid && (
        <PokemonComponent
          title="Pokémon"
          rowData={rowData}
          columnDefs={pokemonColumnDefs}
          storageKey={STORAGE_KEY}
          pageSize={DEFAULT_PAGE_SIZE}
          loading={loading}
        />
      )}
    </div>
  );
}