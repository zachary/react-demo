import { useCallback, useRef, useState } from "react";
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
 *  - `gridApiRef` is handed to the grid so it can publish its AG Grid API,
 *    which is used here to read the rows in the order they are displayed
 *    (keeping Previous / Next following the current sort).
 *  - `handleEditRow` is the grid's Edit handler. It works out which record was
 *    clicked and its position in the displayed rows, then stores that as the
 *    modal state.
 *  - The dialog itself only ever receives the current record plus its position
 *    (`index` / `total`) and the navigation handlers — never the whole list.
 */
export default function PokemonComponent({
  rowData,
  columnDefs,
  storageKey,
  title = "Pokémon",
}) {
  const gridApiRef = useRef(null);
  // `modal` is null when closed, otherwise { rows, index }: the snapshot of
  // displayed rows plus the index of the record shown in the dialog.
  const [modal, setModal] = useState(null);

  const handleEditRow = useCallback(
    (row) => {
      const api = gridApiRef.current;
      let rows = rowData ?? [];
      if (api) {
        // Prefer the rows in the order the user actually sees them, so
        // Previous/Next follow the current sort/filter.
        const displayed = [];
        api.forEachNodeAfterFilterAndSort((node) => {
          if (node.data) displayed.push(node.data);
        });
        if (displayed.length) rows = displayed;
      }
      const index = rows.indexOf(row);
      if (index < 0 || rows.length === 0) return;
      setModal({ rows, index });
    },
    [rowData]
  );

  const closeModal = useCallback(() => setModal(null), []);

  const showNextRow = useCallback(() => {
    setModal((current) => {
      if (!current || current.rows.length === 0) return current;
      // Wrap: after the last record, Next goes back to the first.
      return { ...current, index: (current.index + 1) % current.rows.length };
    });
  }, []);

  const showPreviousRow = useCallback(() => {
    setModal((current) => {
      if (!current || current.rows.length === 0) return current;
      // Wrap: before the first record, Previous goes to the last.
      return {
        ...current,
        index: (current.index - 1 + current.rows.length) % current.rows.length,
      };
    });
  }, []);

  const currentRecord = modal ? modal.rows[modal.index] : null;

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
        record={currentRecord}
        index={modal?.index ?? 0}
        total={modal?.rows.length ?? 0}
        columnDefs={columnDefs}
        onPrevious={showPreviousRow}
        onNext={showNextRow}
        onClose={closeModal}
      />
    </>
  );
}
