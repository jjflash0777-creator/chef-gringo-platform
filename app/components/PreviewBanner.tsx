export function PreviewBanner({ product }: { product: string }) {
  return (
    <p className="cg-preview-banner" role="status">
      <strong>Preview.</strong> {product} is planned, not built. What follows is the intended product — not a live engine, not photo recognition, and not a finished library.
    </p>
  );
}
