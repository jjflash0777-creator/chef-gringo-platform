"use client";

import { useState } from "react";
import { trackEvent } from "../../components/AnalyticsBridge";
import { formatQuantity, scaleQuantity, units, validateServings } from "./scaler.mjs";

type Row = { id: number; name: string; quantity: string; unit: string };
export function RecipeScaler() {
  const [name, setName] = useState("House Soup");
  const [original, setOriginal] = useState("8");
  const [desired, setDesired] = useState("24");
  const [rows, setRows] = useState<Row[]>([
    { id: 1, name: "Broth", quantity: "6", unit: "cup" },
    { id: 2, name: "Diced vegetables", quantity: "1.5", unit: "pound" },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [scaled, setScaled] = useState<Row[] | null>(null);

  function update(id: number, key: keyof Row, value: string) { setRows(rows.map((row) => row.id === id ? { ...row, [key]: value } : row)); }
  function calculate() {
    const nextErrors = validateServings(original, desired) as unknown as Record<string, string>;
    rows.forEach((row, index) => {
      if (!row.name.trim()) nextErrors[`name-${index}`] = "Enter an ingredient name.";
      if (!Number.isFinite(Number(row.quantity)) || Number(row.quantity) <= 0) nextErrors[`quantity-${index}`] = "Enter a quantity greater than zero.";
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setScaled(null); return; }
    setScaled(rows.map((row) => ({ ...row, quantity: formatQuantity(scaleQuantity(row.quantity, original, desired)) })));
    trackEvent("recipe_scaler_used", { original: Number(original), desired: Number(desired), ingredientCount: rows.length });
  }
  function print() { trackEvent("recipe_scaler_printed"); window.print(); }
  return (
    <section className="scaler">
      <div className="scaler-controls">
        <label>Recipe name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Original servings<input inputMode="decimal" value={original} onChange={(e) => setOriginal(e.target.value)} aria-invalid={!!errors.original} /><Error text={errors.original} /></label>
        <label>Desired servings<input inputMode="decimal" value={desired} onChange={(e) => setDesired(e.target.value)} aria-invalid={!!errors.desired} /><Error text={errors.desired} /></label>
      </div>
      <div className="ingredient-editor">
        <div className="ingredient-head"><h2>Ingredients</h2><button className="text-button" type="button" onClick={() => setRows([...rows, { id: Date.now(), name: "", quantity: "", unit: "each" }])}>+ Add ingredient</button></div>
        {rows.map((row, index) => <div className="ingredient-row" key={row.id}>
          <label>Ingredient<input value={row.name} onChange={(e) => update(row.id, "name", e.target.value)} /><Error text={errors[`name-${index}`]} /></label>
          <label>Quantity<input inputMode="decimal" value={row.quantity} onChange={(e) => update(row.id, "quantity", e.target.value)} /><Error text={errors[`quantity-${index}`]} /></label>
          <label>Unit<select value={row.unit} onChange={(e) => update(row.id, "unit", e.target.value)}>{units.map((unit: string) => <option key={unit}>{unit}</option>)}</select></label>
          <button className="remove-button" type="button" disabled={rows.length === 1} onClick={() => setRows(rows.filter((item) => item.id !== row.id))}>Remove</button>
        </div>)}
      </div>
      <button className="button wide-button" type="button" onClick={calculate}>Scale this recipe</button>
      {scaled && <div className="scaled-output" aria-live="polite">
        <div><p className="eyebrow">Scaled production recipe</p><h2>{name || "Untitled recipe"}</h2><p className="formula">Scaling factor = desired servings ÷ original servings = {desired} ÷ {original} = {formatQuantity(Number(desired) / Number(original))}</p></div>
        <ul>{scaled.map((row) => <li key={row.id}><strong>{row.quantity} {row.unit}</strong><span>{row.name}</span></li>)}</ul>
        <button className="button secondary print-button" type="button" onClick={print}>Print scaled recipe</button>
      </div>}
    </section>
  );
}
function Error({ text }: { text?: string }) { return text ? <span className="field-error">{text}</span> : null; }
