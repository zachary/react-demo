import { useCallback, useRef } from "react";
import ResizableGrid from "./ResizableGrid.jsx";
import PokemonEdit from "./PokemonEdit.jsx";

/**
 * PokemonComponent
 * ----------------
 * Composes the two grid building blocks:
 *
 *  - `ResizableGrid` renders the resizable/sortable AG Grid (and the generated
 *    "Edit" button column).
 *  - `PokemonEdit` is the sibling row detail dialog.
 *
 * Neither child knows about the other. This component owns the shared state
 * between them:
 *  - `gridApiRef` is handed to the grid so it can publish its AG Grid API, and
 *    to the dialog so it can read the rows in the order they are displayed
 *    (which keeps Previous / Next following the current sort).
 *  - `handleEditRow` bridges the grid's Edit button to the dialog's `open`,
 *    which is exposed through a ref.
 */
export default function PokemonComponent({
  rowData,
  columnDefs,
  storageKey,
  title = "Pokémon",
}) {
  const gridApiRef = useRef(null);
  const pokemonEditRef = useRef(null);

  const handleEditRow = useCallback((row) => {
    pokemonEditRef.current?.open(row);
  }, []);

  return (
    <>
      <ResizableGrid
        title={title}
        rowData={rowData}
        columnDefs={columnDefs}
        storageKey={storageKey}
        gridApiRef={gridApiRef}
        onEditRow={handleEditRow}
      />

      <PokemonEdit
        ref={pokemonEditRef}
        rowData={rowData}
        columnDefs={columnDefs}
        gridApiRef={gridApiRef}
      />
    </>
  );
}
