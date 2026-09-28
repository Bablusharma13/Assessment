// Shown instead of an empty list, with an optional call-to-action button.
export function EmptyState({ title, message, action }) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p className="muted">{message}</p>
      {action}
    </div>
  );
}
