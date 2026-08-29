"use client";

import { useMemo, useState } from "react";
import { trackEvent } from "../components/AnalyticsBridge";
import styles from "./specialized-diets.module.css";

type MenuKey = "tuscan" | "mediterranean" | "steakhouse" | "sunday";
type DietaryMode = "original" | "lower_sodium" | "high_protein" | "vegetarian" | "gluten_aware";

type Ingredient = { item: string; quantity: number; unit: string; category: string };
type Course = { course: string; dish: string; description: string; ingredients: Ingredient[] };
type Menu = { name: string; eyebrow: string; description: string; baseParty: number; courses: Course[] };

const menus: Record<MenuKey, Menu> = {
  tuscan: {
    name: "Tuscan Dinner",
    eyebrow: "5-course Italian",
    description: "A restaurant-style progression built around bright antipasti, handmade-feeling pasta, rosemary chicken, greens, and olive-oil cake.",
    baseParty: 4,
    courses: [
      { course: "Antipasto", dish: "Whipped ricotta, roasted tomatoes & crostini", description: "Creamy, acidic, crisp — designed to wake up the table.", ingredients: [
        { item: "whole-milk ricotta", quantity: 12, unit: "oz", category: "Dairy" },
        { item: "cherry tomatoes", quantity: 16, unit: "oz", category: "Produce" },
        { item: "baguette", quantity: 1, unit: "loaf", category: "Bakery" },
        { item: "lemon", quantity: 1, unit: "ea", category: "Produce" },
      ]},
      { course: "Primo", dish: "Wild mushroom pappardelle", description: "Silky pasta with browned mushrooms, garlic, herbs, and parmesan.", ingredients: [
        { item: "pappardelle", quantity: 12, unit: "oz", category: "Pantry" },
        { item: "mixed mushrooms", quantity: 16, unit: "oz", category: "Produce" },
        { item: "parmesan", quantity: 4, unit: "oz", category: "Dairy" },
        { item: "garlic", quantity: 4, unit: "cloves", category: "Produce" },
      ]},
      { course: "Secondo", dish: "Rosemary chicken with pan jus", description: "Crisp-skinned chicken, lemon, rosemary, and a reduced pan sauce.", ingredients: [
        { item: "bone-in chicken", quantity: 4, unit: "pieces", category: "Meat" },
        { item: "rosemary", quantity: 1, unit: "bunch", category: "Produce" },
        { item: "lemon", quantity: 1, unit: "ea", category: "Produce" },
        { item: "chicken stock", quantity: 2, unit: "cups", category: "Pantry" },
      ]},
      { course: "Contorno", dish: "Charred broccolini", description: "Broccolini finished with garlic, lemon, and olive oil.", ingredients: [
        { item: "broccolini", quantity: 2, unit: "bunches", category: "Produce" },
        { item: "garlic", quantity: 2, unit: "cloves", category: "Produce" },
      ]},
      { course: "Dolce", dish: "Olive-oil cake with mascarpone", description: "Tender citrus cake with barely sweet mascarpone.", ingredients: [
        { item: "all-purpose flour", quantity: 1.5, unit: "cups", category: "Pantry" },
        { item: "olive oil", quantity: 0.75, unit: "cup", category: "Pantry" },
        { item: "eggs", quantity: 3, unit: "ea", category: "Dairy" },
        { item: "mascarpone", quantity: 8, unit: "oz", category: "Dairy" },
      ]},
    ],
  },
  mediterranean: {
    name: "Mediterranean Table",
    eyebrow: "Shareable dinner",
    description: "A mezze-forward menu with charred vegetables, lemon-herb chicken, grains, herbs, yogurt, and fruit.",
    baseParty: 4,
    courses: [
      { course: "Mezze", dish: "Hummus, cucumber, olives & warm flatbread", description: "A relaxed opening board for passing around the table.", ingredients: [
        { item: "hummus", quantity: 12, unit: "oz", category: "Deli" }, { item: "cucumber", quantity: 2, unit: "ea", category: "Produce" }, { item: "olives", quantity: 8, unit: "oz", category: "Deli" }, { item: "flatbread", quantity: 4, unit: "ea", category: "Bakery" },
      ]},
      { course: "Main", dish: "Lemon-oregano chicken", description: "Roasted chicken with oregano, garlic, lemon, and olive oil.", ingredients: [
        { item: "chicken thighs", quantity: 8, unit: "ea", category: "Meat" }, { item: "lemon", quantity: 2, unit: "ea", category: "Produce" }, { item: "oregano", quantity: 1, unit: "bunch", category: "Produce" }, { item: "garlic", quantity: 6, unit: "cloves", category: "Produce" },
      ]},
      { course: "Sides", dish: "Herbed farro & roasted vegetables", description: "Chewy grains, caramelized vegetables, parsley, and olive oil.", ingredients: [
        { item: "farro", quantity: 1.5, unit: "cups", category: "Pantry" }, { item: "zucchini", quantity: 2, unit: "ea", category: "Produce" }, { item: "bell peppers", quantity: 2, unit: "ea", category: "Produce" }, { item: "parsley", quantity: 1, unit: "bunch", category: "Produce" },
      ]},
      { course: "Dessert", dish: "Greek yogurt, citrus & pistachio", description: "Cool yogurt with oranges, honey, and pistachios.", ingredients: [
        { item: "Greek yogurt", quantity: 24, unit: "oz", category: "Dairy" }, { item: "oranges", quantity: 3, unit: "ea", category: "Produce" }, { item: "pistachios", quantity: 4, unit: "oz", category: "Pantry" },
      ]},
    ],
  },
  steakhouse: {
    name: "Steakhouse Night",
    eyebrow: "Classic dinner",
    description: "A polished steakhouse menu with wedge salad, seared steak, potatoes, greens, and chocolate dessert.",
    baseParty: 4,
    courses: [
      { course: "Starter", dish: "Wedge salad", description: "Iceberg, tomato, onion, blue cheese, and crisp topping.", ingredients: [
        { item: "iceberg lettuce", quantity: 1, unit: "head", category: "Produce" }, { item: "tomatoes", quantity: 2, unit: "ea", category: "Produce" }, { item: "blue cheese", quantity: 4, unit: "oz", category: "Dairy" },
      ]},
      { course: "Main", dish: "Cast-iron strip steak", description: "Hard sear, garlic, herbs, and rested butter finish.", ingredients: [
        { item: "NY strip steaks", quantity: 4, unit: "ea", category: "Meat" }, { item: "garlic", quantity: 6, unit: "cloves", category: "Produce" }, { item: "thyme", quantity: 1, unit: "bunch", category: "Produce" }, { item: "butter", quantity: 8, unit: "tbsp", category: "Dairy" },
      ]},
      { course: "Sides", dish: "Crispy potatoes & creamed spinach", description: "Restaurant-style comfort sides made for sharing.", ingredients: [
        { item: "baby potatoes", quantity: 2, unit: "lb", category: "Produce" }, { item: "spinach", quantity: 20, unit: "oz", category: "Produce" }, { item: "heavy cream", quantity: 1, unit: "cup", category: "Dairy" },
      ]},
      { course: "Dessert", dish: "Dark chocolate pots", description: "Small-format chocolate custard with whipped cream.", ingredients: [
        { item: "dark chocolate", quantity: 8, unit: "oz", category: "Pantry" }, { item: "heavy cream", quantity: 2, unit: "cups", category: "Dairy" }, { item: "eggs", quantity: 4, unit: "ea", category: "Dairy" },
      ]},
    ],
  },
  sunday: {
    name: "Sunday Family Dinner",
    eyebrow: "Comfort table",
    description: "Roast chicken, mashed potatoes, green beans, pan gravy, and apple crisp — familiar, scalable, and crowd-friendly.",
    baseParty: 6,
    courses: [
      { course: "Main", dish: "Herb-roasted chicken", description: "Whole roasted chicken with garlic, herbs, and pan drippings.", ingredients: [
        { item: "whole chickens", quantity: 2, unit: "ea", category: "Meat" }, { item: "garlic", quantity: 1, unit: "head", category: "Produce" }, { item: "thyme", quantity: 1, unit: "bunch", category: "Produce" },
      ]},
      { course: "Sides", dish: "Mashed potatoes & green beans", description: "Classic sides built for family-style service.", ingredients: [
        { item: "russet potatoes", quantity: 4, unit: "lb", category: "Produce" }, { item: "green beans", quantity: 2, unit: "lb", category: "Produce" }, { item: "butter", quantity: 8, unit: "tbsp", category: "Dairy" }, { item: "milk", quantity: 2, unit: "cups", category: "Dairy" },
      ]},
      { course: "Dessert", dish: "Apple crisp", description: "Warm apples, oat crumble, cinnamon, and optional vanilla ice cream.", ingredients: [
        { item: "apples", quantity: 8, unit: "ea", category: "Produce" }, { item: "rolled oats", quantity: 2, unit: "cups", category: "Pantry" }, { item: "brown sugar", quantity: 1, unit: "cup", category: "Pantry" },
      ]},
    ],
  },
};

function roundQuantity(value: number) {
  if (value >= 10) return Math.round(value * 10) / 10;
  return Math.round(value * 100) / 100;
}

export function MenuExperienceEngine() {
  const [selected, setSelected] = useState<MenuKey>("tuscan");
  const [party, setParty] = useState(4);
  const [dietaryMode, setDietaryMode] = useState<DietaryMode>("original");
  const [surpriseSeed, setSurpriseSeed] = useState(0);

  const menu = menus[selected];
  const factor = Math.max(1, party) / menu.baseParty;

  const shoppingList = useMemo(() => {
    const merged = new Map<string, Ingredient>();
    for (const course of menu.courses) {
      for (const ingredient of course.ingredients) {
        const key = `${ingredient.item}|${ingredient.unit}`;
        const existing = merged.get(key);
        if (existing) existing.quantity += ingredient.quantity * factor;
        else merged.set(key, { ...ingredient, quantity: ingredient.quantity * factor });
      }
    }
    return Array.from(merged.values()).map((item) => ({ ...item, quantity: roundQuantity(item.quantity) }));
  }, [menu, factor]);

  function surpriseMe() {
    const keys = Object.keys(menus) as MenuKey[];
    const next = keys[(surpriseSeed + 1) % keys.length];
    setSelected(next);
    setParty(menus[next].baseParty);
    setSurpriseSeed((value) => value + 1);
    trackEvent("menu_experience_surprise_selected", { menu: next });
  }

  function trackRoute(route: "cook" | "order" | "book") {
    trackEvent("menu_experience_route_selected", { route, menu: selected, party, dietaryMode });
  }

  return (
    <section className={styles.menuEngine} id="menu-experiences" aria-labelledby="menu-experience-title">
      <div className={styles.menuEngineHead}>
        <div>
          <p className={styles.eyebrow}>CHEF GRINGO MENUS · DISCOVER → CUSTOMIZE → ACT</p>
          <h2 id="menu-experience-title">Pick the dinner. We&apos;ll finish the decision.</h2>
          <p>Choose a restaurant-style menu, tell us who is eating, then cook it, build the shopping list, or route the same intent toward delivery and reservations.</p>
        </div>
        <button type="button" className={styles.surpriseButton} onClick={surpriseMe}>Surprise me</button>
      </div>

      <div className={styles.menuPicker}>
        {(Object.entries(menus) as [MenuKey, Menu][]).map(([key, item]) => (
          <button key={key} type="button" className={selected === key ? styles.menuPickActive : styles.menuPick} onClick={() => { setSelected(key); setParty(item.baseParty); trackEvent("menu_experience_selected", { menu: key }); }}>
            <span>{item.eyebrow}</span><strong>{item.name}</strong><small>{item.description}</small>
          </button>
        ))}
      </div>

      <div className={styles.menuControls}>
        <label>Party size<input type="number" min="1" max="24" value={party} onChange={(event) => setParty(Math.max(1, Number(event.target.value) || 1))} /></label>
        <label>Make it…<select value={dietaryMode} onChange={(event) => setDietaryMode(event.target.value as DietaryMode)}>
          <option value="original">Original menu</option><option value="lower_sodium">Lower-sodium direction</option><option value="high_protein">Higher-protein direction</option><option value="vegetarian">Vegetarian direction</option><option value="gluten_aware">Gluten-aware direction</option>
        </select></label>
      </div>

      <div className={styles.menuExperienceGrid}>
        <div className={styles.coursePanel}>
          <div className={styles.selectedMenuTitle}><span>{menu.eyebrow}</span><h3>{menu.name} for {party}</h3><p>{dietaryMode === "original" ? menu.description : `Chef Gringo will preserve the menu experience while applying a ${dietaryMode.replaceAll("_", " ")} transformation layer.`}</p></div>
          {menu.courses.map((course) => <article key={`${course.course}-${course.dish}`} className={styles.courseRow}><span>{course.course}</span><div><strong>{course.dish}</strong><p>{course.description}</p></div></article>)}
        </div>

        <aside className={styles.shoppingPanel}>
          <div className={styles.shoppingHeader}><div><span>SMART SHOPPING LIST</span><h3>{shoppingList.length} consolidated ingredients</h3></div><small>Scaled from {menu.baseParty} → {party}</small></div>
          <div className={styles.shoppingList}>{shoppingList.map((item) => <div key={`${item.item}-${item.unit}`}><span>{item.item}</span><strong>{item.quantity} {item.unit}</strong></div>)}</div>
          <button type="button" className={styles.cartButton} onClick={() => trackRoute("cook")}>Build my grocery cart →</button>
          <p className={styles.integrationNote}>Provider handoff is intentionally abstracted. Grocery partners can be added later without tying Chef Gringo to one retailer.</p>
        </aside>
      </div>

      <div className={styles.routeGrid}>
        <button type="button" onClick={() => trackRoute("cook")}><span>COOK IT</span><strong>Recipes + exact shopping list</strong><small>Scale quantities and consolidate ingredients across the full menu.</small></button>
        <button type="button" onClick={() => trackRoute("order")}><span>ORDER IT</span><strong>Find dishes like this nearby</strong><small>Future delivery/takeout routing based on the menu&apos;s actual cuisine and dishes.</small></button>
        <button type="button" onClick={() => trackRoute("book")}><span>BOOK IT</span><strong>Find this experience at a restaurant</strong><small>Future reservation routing for restaurants matching the menu style and occasion.</small></button>
      </div>

      <div className={styles.celebrityNote}><strong>Celebrity & cultural menus:</strong> supported as a content lane only when the favorite dish or public association is reliably sourced. Chef Gringo would create its own recipe formulation and never imply endorsement.</div>
    </section>
  );
}
