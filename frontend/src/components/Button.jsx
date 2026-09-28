// variant: "primary" | "secondary" | "danger"
// While isLoading is true the button is disabled, so a form cannot be submitted twice.
export function Button({
  variant = 'primary',
  type = 'button',
  isLoading = false,
  loadingText = 'Please wait…',
  disabled = false,
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      className={`button button-${variant}`}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? loadingText : children}
    </button>
  );
}
