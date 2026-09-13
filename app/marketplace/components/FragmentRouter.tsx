"use client";

import { useEffect } from "react";

/**
 * Keeps `/marketplace#<product-id>` working now that the page no longer renders
 * every product.
 *
 * Product ids are passed in from the server so this module does not import the
 * catalogue. A hash is only treated as a product when it exactly matches a
 * known id. Ordinary section hashes such as `how-we-score` or `goals-title`
 * are left alone even if they happen to look like a slug.
 */
export function FragmentRouter({ productIds }: { productIds: readonly string[] }) {
  useEffect(() => {
    const known = new Set(productIds);

    function resolve() {
      const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (!hash) return;

      const target = document.getElementById(hash);
      if (target) {
        target.scrollIntoView();
        if (target instanceof HTMLElement) target.focus({ preventScroll: true });
        return;
      }

      if (known.has(hash)) window.location.replace(`/marketplace/products/${hash}`);
    }

    resolve();
    window.addEventListener("hashchange", resolve);
    return () => window.removeEventListener("hashchange", resolve);
  }, [productIds]);

  return null;
}
