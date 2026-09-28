// A success notification in the top-right corner. It hides itself (see useFlashMessage).
// The live region is always rendered, so screen readers announce every new message.
export function Toast({ message }) {
  return (
    <div className="toast-region" role="status">
      {message && (
        <div className="toast">
          <span className="toast-icon" aria-hidden="true">
            ✓
          </span>
          {message}
        </div>
      )}
    </div>
  );
}
