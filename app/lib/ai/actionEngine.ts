export type ChefGringoActionKind =
  | "cooking_mission"
  | "shopping_list"
  | "buy_product"
  | "request_quote"
  | "book_demo"
  | "hire_service"
  | "buy_part"
  | "use_calculator"
  | "create_document"
  | "train_certify"
  | "save_remind"
  | "escalate"
  | "no_buy";

export type ChefGringoActionChoice = {
  id: string;
  label: string;
  description: string;
  value: string;
  emphasis?: "standard" | "premium" | "signature";
};

export type ChefGringoActionTerminal = {
  id: string;
  kind: ChefGringoActionKind;
  title: string;
  description: string;
  choices?: ChefGringoActionChoice[];
  commercialEligible: boolean;
  commercialRouteVerified: false;
  disclosure: string | null;
};

const cookingWords = /\b(make|cook|recipe|marinara|sauce|pasta|lasagna|soup|stew|chicken|beef|pork|fish|dessert|cake|bread|dinner|lunch|breakfast|meal)\b/i;

export function deriveActionTerminals(prompt: string, answer: string): ChefGringoActionTerminal[] {
  const normalized = `${prompt}\n${answer}`;
  const actions: ChefGringoActionTerminal[] = [];

  if (cookingWords.test(normalized)) {
    actions.push({
      id: "cooking-mission:quality-lane",
      kind: "cooking_mission",
      title: "Choose your cooking mission",
      description: "Pick how you want Chef Gringo to balance cost, ingredient quality, and authenticity. You can change lanes at any time.",
      commercialEligible: false,
      commercialRouteVerified: false,
      disclosure: null,
      choices: [
        {
          id: "budget-smart",
          label: "Budget Smart",
          description: "Great result with smart supermarket choices and upgrades only where they matter.",
          value: "Build the Budget Smart version. Keep the result delicious, minimize unnecessary spend, tell me where not to waste money, and give me the full recipe plus a shopping list.",
          emphasis: "standard",
        },
        {
          id: "premium-pantry",
          label: "Premium Pantry",
          description: "Spend more only on the ingredients that create a meaningful flavor or texture improvement.",
          value: "Build the Premium Pantry version. Upgrade the ingredients that materially improve the result, explain why each upgrade matters, and give me the full recipe plus a shopping list.",
          emphasis: "premium",
        },
        {
          id: "bring-italy",
          label: "Bring Italy to the Table",
          description: "Ingredient-first, tradition-conscious, and as close to a destination-quality version as practical.",
          value: "Build the Bring Italy to the Table version. Prioritize traditional technique and excellent ingredients, explain what makes the version special, and give me the full recipe plus a shopping list.",
          emphasis: "signature",
        },
      ],
    });

    actions.push({
      id: "cooking-mission:next-actions",
      kind: "shopping_list",
      title: "Turn the answer into action",
      description: "Once the version is set, Chef Gringo can scale it, organize the shopping list, and prepare a cook-through plan.",
      commercialEligible: false,
      commercialRouteVerified: false,
      disclosure: null,
      choices: [
        { id: "shopping-list", label: "Shopping List", description: "Organize everything to buy by department and useful purchase units.", value: "Turn this into a complete shopping list. Group it by grocery department, include quantities, and separate likely pantry staples from items I probably need to buy." },
        { id: "scale-recipe", label: "Scale Recipe", description: "Recalculate the recipe for a different household or production volume.", value: "Help me scale this recipe. Ask me how many people or servings I need, then recalculate the ingredient quantities." },
        { id: "cook-mode", label: "Cook Mode", description: "Convert the recipe into a clean, timed sequence for cooking without rereading paragraphs.", value: "Put this into Cook Mode: short numbered steps in the exact order I should execute them, with timing cues and the most important doneness or quality checks." },
      ],
    });
  }

  return actions.slice(0, 4);
}
