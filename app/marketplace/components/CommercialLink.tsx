import type { CommercialLink as Link } from "../commercial-links";

/**
 * Renders a classified commercial link. Everything that varies between an
 * affiliate, pending, direct, informational, or unavailable destination comes
 * from the typed record, not from reading the URL or the label.
 */
export function CommercialLinkAction({ link, className, contentId, productId, recommendationId, placement }: { link: Link; className: string; contentId?: string; productId?: string; recommendationId?: string; placement?: string }) {
  if (!link.href) {
    return (
      <span className={`${className} is-unavailable`} aria-disabled="true">
        {link.label}
      </span>
    );
  }

  return (
    <a
      className={className}
      href={link.href}
      target={link.external ? "_blank" : undefined}
      rel={link.rel ?? undefined}
      data-event={link.event ?? undefined}
      data-link-kind={link.kind}
      data-content-id={contentId}
      data-product-id={productId}
      data-recommendation-id={recommendationId}
      data-placement={placement}
    >
      {link.label}
      {link.external && (
        <span className="cg-visually-hidden">
          {link.destinationName ? ` — opens ${link.destinationName} in a new tab` : " — opens in a new tab"}
        </span>
      )}
      {link.external && <span aria-hidden="true"> ↗</span>}
    </a>
  );
}
