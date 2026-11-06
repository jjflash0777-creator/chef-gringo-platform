import Link from "next/link";

/**
 * Related-posts block for the post template (redesign blueprint,
 * 2026-11-05): internal linking as a path, not a web — one visit should
 * have an obvious next read.
 */
export function RelatedPosts({
  links,
  heading = "Keep reading",
}: {
  links: readonly { href: string; label: string; detail?: string }[];
  heading?: string;
}) {
  if (links.length === 0) return null;
  return (
    <nav className="cg-related-posts" aria-label={heading}>
      <h2>{heading}</h2>
      <ul>
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link href={link.href}>
              <strong>{link.label} →</strong>
              {link.detail ? <span> {link.detail}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
