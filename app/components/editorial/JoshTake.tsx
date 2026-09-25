export function JoshTake({ children }: { children: React.ReactNode }) {
  return (
    <aside className="cg-josh-take" aria-label="Josh's Take">
      <p>Josh's Take</p>
      <blockquote>{children}</blockquote>
    </aside>
  );
}
