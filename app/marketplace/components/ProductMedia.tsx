import type { ProductMedia as Media } from "../view-models";
import Image from "next/image";
export function ProductMedia({ media, name }: { media: Media; name: string }) {
  if (media.url && (media.rights === "authorized" || media.rights === "licensed")) return <div className="commerce-media"><Image src={media.url} alt={media.alt} width={720} height={540} /></div>;
  return <div className="commerce-media commerce-media-placeholder" role="img" aria-label={`Product photography is not yet licensed for ${name}`}><span aria-hidden="true">CG</span><strong>Verified visual coming next</strong><small>Photography appears only when usage rights are clear.</small></div>;
}
