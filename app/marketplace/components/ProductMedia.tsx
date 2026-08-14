import type { ProductMedia as Media } from "../view-models";
import Image from "next/image";
export function ProductMedia({ media, name }: { media: Media; name: string }) {
  if (media.url && (media.rights === "authorized" || media.rights === "licensed")) return <div className="commerce-media"><Image src={media.url} alt={media.alt} width={720} height={540} /></div>;
  return <div className="commerce-media commerce-media-placeholder" role="img" aria-label={`Product photography is not licensed for republication for ${name}`}><span aria-hidden="true">CG</span><strong>Product source verified</strong><small>Official imagery is reference-only until reuse rights are explicit.</small></div>;
}
