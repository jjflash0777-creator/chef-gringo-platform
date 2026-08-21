"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Product = {
  id: number;
  name: string;
  slug: string;
  summary: string;
  bestFor: string;
  editorialStatus: string;
  evidenceLevel: string;
};

const emptyForm = {
  name: "",
  brand: "",
  category: "",
  summary: "",
  bestFor: "",
  notRecommendedFor: "",
  evidenceLevel: "research",
};

export function ProductWorkspace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("Loading the product catalog…");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/marketplace/products", { cache: "no-store" })
      .then(async (response) => ({
        ok: response.ok,
        body: await response.json() as { products?: Product[]; error?: string },
      }))
      .then(({ ok, body }) => {
        if (!active) return;
        if (!ok) {
          setStatus(body.error || "The product catalog is unavailable.");
          return;
        }
        setProducts(body.products || []);
        setStatus(`${body.products?.length || 0} canonical product records`);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("Saving draft…");
    const response = await fetch("/api/marketplace/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await response.json() as { product?: Product; error?: string };
    if (!response.ok || !body.product) {
      setStatus(body.error || "The draft could not be saved.");
      setSaving(false);
      return;
    }
    setProducts((current) => [body.product!, ...current]);
    setForm(emptyForm);
    setStatus(`${body.product.name} saved as a draft.`);
    setSaving(false);
  }

  async function advanceProduct(product: Product) {
    const nextStatus = product.editorialStatus === "draft" ? "in_review" : "published";
    const response = await fetch(`/api/marketplace/products/${product.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ editorialStatus: nextStatus }),
    });
    const body = await response.json() as { product?: Product; error?: string };
    if (!response.ok || !body.product) {
      setStatus(body.error || "The editorial status could not be updated.");
      return;
    }
    setProducts((current) => current.map((item) => item.id === body.product!.id ? body.product! : item));
    setStatus(`${body.product.name} moved to ${body.product.editorialStatus.replace("_", " ")}.`);
  }

  return (
    <div className="admin-workspace">
        <Link className="admin-workflow-link" href="/admin/marketplace/intelligence">Open Intelligence Lab →</Link>
        <Link className="admin-workflow-link" href="/admin/marketplace/research">Open bounded research lab →</Link>
      <aside className="admin-sidebar">
        <p className="eyebrow">Marketplace admin</p>
        <h1>Editorial workspace</h1>
        <nav aria-label="Marketplace administration">
          {["Products", "Brands", "Categories", "Affiliate partners", "Buying guides", "Reviews", "Comparisons"].map((item, index) => (
            <button className={index === 0 ? "active" : ""} type="button" key={item}>
              {item}<span>{index === 0 ? products.length : "—"}</span>
            </button>
          ))}
        </nav>
        <p className="admin-note">Products are canonical. Editorial surfaces reference these records rather than duplicating them.</p>
        <Link className="admin-workflow-link" href="/admin/marketplace/workflows/iddsi-level-4-pureed-meals-senior-living">Open Knowledge Core pilot →</Link>
        <Link className="admin-workflow-link" href="/admin/marketplace/workflows/new">Create workflow draft →</Link>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div><p className="eyebrow">Product management</p><h2>Build evidence before publishing.</h2></div>
          <span className="admin-record-count">{status}</span>
        </header>

        <section className="admin-panel">
          <div className="admin-panel-heading"><h3>Add a product</h3><span>Step 1 of 4 · Core record</span></div>
          <form className="product-form" onSubmit={submitProduct}>
            <label>Product name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Brand<input required value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} /></label>
            <label>Problem category<input required placeholder="e.g. Instant-read thermometers" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
            <label>Evidence level<select value={form.evidenceLevel} onChange={(event) => setForm({ ...form, evidenceLevel: event.target.value })}><option value="research">Research</option><option value="workflow_assessed">Workflow assessed</option><option value="operator_reviewed">Operator reviewed</option></select></label>
            <label className="form-span">Plain-language summary<textarea required value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></label>
            <label className="form-span">Best for<textarea required value={form.bestFor} onChange={(event) => setForm({ ...form, bestFor: event.target.value })} /></label>
            <label className="form-span">Not recommended for<textarea value={form.notRecommendedFor} onChange={(event) => setForm({ ...form, notRecommendedFor: event.target.value })} /></label>
            <div className="form-span admin-form-actions"><p>Saving creates a draft. Context, evidence, merchant offers, and disclosures are added before review.</p><button className="button" disabled={saving}>{saving ? "Saving…" : "Save product draft"}</button></div>
          </form>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading"><h3>Editorial pipeline</h3><span>Draft → Review → Published</span></div>
          <div className="product-table" role="table" aria-label="Marketplace products">
            <div className="product-table-row product-table-head" role="row"><span>Product</span><span>Evidence</span><span>Status</span><span>Next action</span></div>
            {products.length === 0 ? <p className="empty-state">No products have been stored yet. Add the first canonical product above.</p> : products.map((product) => (
              <div className="product-table-row" role="row" key={product.id}>
                <span><strong>{product.name}</strong><small>{product.bestFor}</small></span>
                <span>{product.evidenceLevel.replace("_", " ")}</span>
                <span><i className={`editorial-status ${product.editorialStatus}`}>{product.editorialStatus.replace("_", " ")}</i></span>
                <span>{product.editorialStatus === "published" ? "Complete" : <button type="button" onClick={() => void advanceProduct(product)}>{product.editorialStatus === "draft" ? "Send to review" : "Publish"}</button>}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
