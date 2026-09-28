export function SuccessMessage({ message }) {
  if (!message) {
    return null;
  }

  return (
    <p className="alert alert-success" role="status">
      {message}
    </p>
  );
}
