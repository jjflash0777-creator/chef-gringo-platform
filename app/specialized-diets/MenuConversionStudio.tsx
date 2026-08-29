"use client";

import { useMemo, useState } from "react";
import { trackEvent } from "../components/AnalyticsBridge";
import styles from "./MenuConversionStudio.module.css";

type Goal = "lower_sodium" | "carb_conscious" | "heart_healthy" | "high_protein" | "allergen_aware" | "texture_modified";

type Rule = { title: string; summary: string; swaps: string[]; watch: string[]; service: string[] };

const goals: Record<Goal, { label: string; rule: Rule }> = {
  lower_sodium: { label: "Lower sodium", rule: { title: "Reduce sodium without flattening flavor", summary: "Build flavor with acid, aromatics, herbs, roasting, browning, and unsalted bases before relying on salt-heavy finishers.", swaps: ["Use low- or no-salt-added stocks where practical.", "Move flavor toward citrus, vinegar, herbs, garlic, onion, toasted spices, and browned vegetables.", "Choose lower-sodium sauces or dilute concentrated sauces with unsalted components."], watch: ["Prepared meats, cheese, bouillon, canned soups, seasoning blends, sauces, pickles, and condiments can contribute substantial sodium.", "Do not promise a clinical sodium target unless the recipe has been nutritionally analyzed."], service: ["Keep salty condiments optional at service.", "Label house-made lower-sodium versions clearly so staff do not substitute standard product."] } },
  carb_conscious: { label: "Carbohydrate-conscious", rule: { title: "Shift the plate, not just the starch", summary: "Reduce concentrated carbohydrate load by changing portions and pairings while keeping protein, fiber, texture, and satisfaction visible.", swaps: ["Reduce oversized refined-starch portions and increase non-starchy vegetables where the dish allows.", "Use beans, lentils, intact grains, or higher-fiber sides when they fit the menu concept.", "Pair carbohydrate foods with protein, vegetables, and unsaturated fats instead of serving them alone."], watch: ["Sugar-free does not automatically mean low carbohydrate.", "Individual carbohydrate targets are clinical decisions and should not be generated from this tool."], service: ["Offer a smaller-starch / extra-vegetable plate configuration.", "Keep sweetened beverages and desserts as explicit choices rather than default accompaniments."] } },
  heart_healthy: { label: "Heart-healthy pattern", rule: { title: "Favor the pattern with the strongest practical signal", summary: "Push the menu toward vegetables, legumes, whole grains, nuts/seeds where appropriate, fish, and unsaturated fats while moderating heavily processed and high-saturated-fat components.", swaps: ["Use olive, canola, or other predominantly unsaturated oils in place of solid fats where the recipe works.", "Use beans, fish, poultry, or plant-forward components to reduce reliance on processed meats.", "Increase vegetables, whole grains, fruit, and legumes without turning the meal into a punishment plate."], watch: ["A single ingredient does not make a dish heart-healthy.", "Medication, potassium, fluid, renal, or anticoagulation restrictions require individualized review."], service: ["Make vegetables and whole-food sides the default pairings.", "Keep sauces and richer toppings optional when operationally possible."] } },
  high_protein: { label: "Higher protein", rule: { title: "Increase protein density without wrecking the menu", summary: "Strengthen protein at meals and snacks using familiar ingredients and practical kitchen formats rather than relying only on powders or supplements.", swaps: ["Increase portions of eggs, dairy, fish, poultry, legumes, tofu, or other protein-rich foods when appropriate.", "Use Greek yogurt, cottage cheese, milk powder, beans, lentils, or eggs to fortify compatible recipes.", "Pair snacks with a meaningful protein source rather than offering carbohydrate-only choices."], watch: ["Higher protein is not appropriate for every renal or metabolic situation.", "Do not generate individualized gram targets without a qualified clinical nutrition assessment."], service: ["Protect the protein item from being the first thing cut when appetite is low.", "Offer small-volume, protein-dense options for residents who cannot finish full meals."] } },
  allergen_aware: { label: "Allergen-aware", rule: { title: "Treat allergen control as a process, not a substitution list", summary: "A menu can be modified only if purchasing, storage, prep surfaces, utensils, fryer/oil use, labels, and service controls support the claim.", swaps: ["Identify the exact allergen-containing ingredient before proposing a substitute.", "Use verified alternate products with complete ingredient and facility statements.", "Build a separate prep and service path when cross-contact risk cannot otherwise be controlled."], watch: ["Never call a dish allergen-free solely because one obvious ingredient was removed.", "Cross-contact, shared fryers, sauces, seasoning blends, bakery items, and supplier changes can invalidate assumptions."], service: ["Use a clear allergy ticket / plate-identification protocol.", "Require staff to verify the final plate against the allergy order before service."] } },
  texture_modified: { label: "Texture-modified", rule: { title: "Preserve identity while changing texture", summary: "Texture modification should aim to keep the food recognizable, moist, flavorful, and consistent with the prescribed texture level.", swaps: ["Use moist cooking methods, sauces, gravies, and compatible binders to maintain texture consistency.", "Modify each plate component intentionally instead of blending the entire meal together.", "Standardize portioning, processing time, and hold procedures so texture is reproducible."], watch: ["Texture levels and liquid consistency must match the individual care plan.", "Swallowing disorders require speech-language pathology / clinical oversight; this tool does not assign an IDDSI level."], service: ["Plate components separately and preserve color contrast.", "Train staff on the approved texture standard and final consistency check."] } },
};

function scaleNote(servings: number) {
  if (!Number.isFinite(servings) || servings < 1) return "Set a valid serving count before production.";
  if (servings <= 10) return "Small-batch: validate seasoning after conversion before scaling further.";
  if (servings <= 50) return "Mid-volume: test one pan or kettle batch and document yield before full production.";
  return "High-volume: run a controlled production test, record finished yield, hold quality, and service feedback before standardizing.";
}

export function MenuConversionStudio() {
  const [goal, setGoal] = useState<Goal>("lower_sodium");
  const [dish, setDish] = useState("Chicken Alfredo with broccoli");
  const [servings, setServings] = useState(24);
  const [ingredients, setIngredients] = useState("chicken breast\nfettuccine\nheavy cream\nparmesan\nbutter\nbroccoli\ngarlic\nchicken base");
  const [generated, setGenerated] = useState(false);
  const active = goals[goal];
  const ingredientLines = useMemo(() => ingredients.split("\n").map((item) => item.trim()).filter(Boolean), [ingredients]);

  function generate() {
    setGenerated(true);
    trackEvent("specialized_diet_conversion_generated", { goal, servings, ingredientCount: ingredientLines.length });
  }

  function copyPlan() {
    const text = `${dish}\nGoal: ${active.label}\nServings: ${servings}\n\n${active.rule.title}\n${active.rule.summary}\n\nSuggested kitchen moves:\n- ${active.rule.swaps.join("\n- ")}\n\nWatch-outs:\n- ${active.rule.watch.join("\n- ")}\n\nService notes:\n- ${active.rule.service.join("\n- ")}\n\nProduction note: ${scaleNote(servings)}`;
    void navigator.clipboard?.writeText(text);
    trackEvent("specialized_diet_plan_copied", { goal });
  }

  return (
    <section className={styles.studio} id="menu-converter" aria-labelledby="menu-converter-title">
      <div className={styles.studioHeading}>
        <p className={styles.eyebrow}>LIVE PROTOTYPE · MENU CONVERSION STUDIO</p>
        <h2 id="menu-converter-title">Convert a real dish into a safer, more practical service plan.</h2>
        <p>Start with the kitchen reality. This prototype generates culinary direction and operational safeguards — not an individualized medical diet order.</p>
      </div>
      <div className={styles.studioGrid}>
        <form className={styles.converterForm} onSubmit={(event) => { event.preventDefault(); generate(); }}>
          <label>Dish or menu item<input value={dish} onChange={(event) => setDish(event.target.value)} /></label>
          <div className={styles.formRow}>
            <label>Conversion goal<select value={goal} onChange={(event) => setGoal(event.target.value as Goal)}>{Object.entries(goals).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
            <label>Servings<input type="number" min="1" max="1000" value={servings} onChange={(event) => setServings(Number(event.target.value))} /></label>
          </div>
          <label>Main ingredients / components<textarea rows={9} value={ingredients} onChange={(event) => setIngredients(event.target.value)} /><small>One item per line is enough for this prototype.</small></label>
          <button className={styles.generateButton} type="submit">Build conversion plan →</button>
        </form>
        <div className={styles.planPanel} aria-live="polite">
          {!generated ? <div className={styles.emptyPlan}><span>READY</span><h3>Your conversion brief will appear here.</h3><p>Use the prefilled example or replace it with a dish from your own menu.</p></div> : <>
            <div className={styles.planHeader}><div><span>{active.label}</span><h3>{dish || "Untitled dish"}</h3></div><button type="button" onClick={copyPlan}>Copy plan</button></div>
            <p className={styles.planSummary}>{active.rule.summary}</p>
            <div className={styles.planBlock}><strong>Kitchen moves</strong><ul>{active.rule.swaps.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div className={styles.planBlock}><strong>Watch-outs</strong><ul>{active.rule.watch.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div className={styles.planBlock}><strong>Service notes</strong><ul>{active.rule.service.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div className={styles.productionNote}><strong>Production:</strong> {scaleNote(servings)}</div>
            <p className={styles.safetyNote}>For therapeutic diets, medication interactions, renal restrictions, swallowing disorders, allergies, or individualized nutrient targets, use the applicable clinical care plan and qualified professional review.</p>
          </>}
        </div>
      </div>
    </section>
  );
}
