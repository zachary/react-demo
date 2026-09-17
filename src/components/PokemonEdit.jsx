import { useEffect, useMemo } from "react";

function isUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

/**
 * PokemonEdit
 * -----------
 * The row detail popup used by `ResizableGrid`.
 *
 * It is a controlled, presentational dialog: the parent (`PokemonComponent`)
 * owns the row list, picks the current record and passes only that single
 * record down here, together with its position (`index` / `total`) and the
 * handlers used to move between records.
 *
 * Features:
 *  - Shows the current record's details, one field per configured grid column.
 *  - Previous / Next buttons are delegated to the parent, which walks the rows
 *    in the order they are displayed in the grid. Navigation wraps around:
 *    Next on the last row shows the first row, Previous on the first row shows
 *    the last. The footer shows which record is displayed (`Record 3 of 20`).
 *  - Escape closes the dialog, arrow keys move between records.
 *  - Clicking the backdrop closes the dialog.
 */
export default function PokemonEdit({
  // The single record to display. `null` keeps the dialog closed.
  record,
  // Zero-based position of `record`, and how many records it can be walked to.
  index = 0,
  total = 0,
  columnDefs,
  onPrevious,
  onNext,
  onClose,
}) {
  const isOpen = Boolean(record);

  // Escape closes the dialog, arrow keys move between records.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
      else if (event.key === "ArrowRight") onNext?.();
      else if (event.key === "ArrowLeft") onPrevious?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, onNext, onPrevious]);

  // Detail rows are driven by the configured columns, so any grid built with
  // this component gets the modal for free.
  const detailFields = useMemo(
    () =>
      (columnDefs ?? [])
        .filter((def) => def.field)
        .map((def) => ({ field: def.field, label: def.headerName ?? def.field })),
    [columnDefs]
  );

  if (!record) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
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
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {detailFields.map(({ field, label }) => {
            const value = record[field];
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
            onClick={onPrevious}
          >
            ← Previous
          </button>

          <span className="modal-counter" role="status">
            Record {index + 1} of {total}
          </span>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={onNext}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
