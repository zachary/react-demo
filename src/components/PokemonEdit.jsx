import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";

function isUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

/**
 * PokemonEdit
 * -----------
 * The row detail popup used by `ResizableGrid`.
 *
 * It renders nothing until it is opened and owns all of its own state, so the
 * grid only has to call `open(row)` through a ref.
 *
 * Features:
 *  - Shows the clicked row's details, one field per configured grid column.
 *  - Previous / Next buttons walk the rows in the order they are displayed in
 *    the grid. Navigation wraps around: Next on the last row shows the first
 *    row, Previous on the first row shows the last. The footer shows which
 *    record is displayed (`Record 3 of 20`).
 *  - Escape closes the dialog, arrow keys move between records.
 *  - Clicking the backdrop closes the dialog.
 */
const PokemonEdit = forwardRef(function PokemonEdit(
  { rowData, columnDefs, gridApiRef },
  ref
) {
  // `modal` is null when closed, otherwise { rows, index }: the snapshot of
  // displayed rows plus the index of the record shown in the dialog.
  const [modal, setModal] = useState(null);

  const open = useCallback(
    (data) => {
      const api = gridApiRef?.current;
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
      const index = rows.indexOf(data);
      if (index < 0 || rows.length === 0) return;
      setModal({ rows, index });
    },
    [rowData, gridApiRef]
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

  useImperativeHandle(
    ref,
    () => ({ open, close: closeModal }),
    [open, closeModal]
  );

  // Escape closes the dialog, arrow keys move between records.
  useEffect(() => {
    if (!modal) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeModal();
      else if (event.key === "ArrowRight") showNextRow();
      else if (event.key === "ArrowLeft") showPreviousRow();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modal, closeModal, showNextRow, showPreviousRow]);

  const currentRow = modal ? modal.rows[modal.index] : null;

  // Detail rows are driven by the configured columns, so any grid built with
  // this component gets the modal for free.
  const detailFields = useMemo(
    () =>
      (columnDefs ?? [])
        .filter((def) => def.field)
        .map((def) => ({ field: def.field, label: def.headerName ?? def.field })),
    [columnDefs]
  );

  if (!modal || !currentRow) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={closeModal}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="row-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="row-detail-title">Row detail</h2>
          <button
            type="button"
            className="btn btn-ghost modal-close"
            onClick={closeModal}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {detailFields.map(({ field, label }) => {
            const value = currentRow[field];
            return (
              <div className="detail-row" key={field}>
                <span className="detail-label">{label}</span>
                <span className="detail-value">
                  {isUrl(value) ? (
                    <a href={value} target="_blank" rel="noreferrer">
                      {value}
                    </a>
                  ) : (
                    String(value ?? "—")
                  )}
                </span>
              </div>
            );
          })}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={showPreviousRow}
          >
            ← Previous
          </button>

          <span className="modal-counter" role="status">
            Record {modal.index + 1} of {modal.rows.length}
          </span>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={showNextRow}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
});

export default PokemonEdit;
