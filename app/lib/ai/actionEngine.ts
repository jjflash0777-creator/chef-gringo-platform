export type ChefGringoActionKind =
  | "cooking_mission"
  | "shopping_list"
  | "shop_nearby"
  | "delivery"
  | "download"
  | "save_mission"
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
const shoppingWords = /\b(shopping list|grocery|ingredients|pantry|buy ingredients|shop for|pickup|delivery|deliver)\b/i;

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
      description: "Scale it, shop it, cook it, or save it without rebuilding the conversation.",
      commercialEligible: false,
      commercialRouteVerified: false,
      disclosure: null,
      choices: [
        { id: "shopping-list", label: "Shopping List", description: "Organize everything to buy by department and useful purchase units.", value: "Turn this into a complete shopping list. Group it by grocery department, include quantities, separate likely pantry staples from items I probably need to buy, and mark the ingredients where quality matters most." },
        { id: "scale-recipe", label: "Scale Recipe", description: "Recalculate the recipe for a different household or production volume.", value: "Help me scale this recipe. Ask me how many people or servings I need, then recalculate the ingredient quantities in practical purchase units." },
        { id: "cook-mode", label: "Cook Mode", description: "Convert the recipe into a clean, timed sequence for cooking without rereading paragraphs.", value: "Put this into Cook Mode: short numbered steps in the exact order I should execute them, with timing cues and the most important doneness or quality checks." },
        { id: "save-mission", label: "Save This Mission", description: "Prepare a compact version that can later be saved, shared, or exported.", value: "Summarize this cooking mission into a clean saved-recipe format with title, servings, ingredient lane, ingredients, steps, timing, and notes." },
      ],
    });
  }

  if (shoppingWords.test(normalized) || (cookingWords.test(normalized) && /shopping list/i.test(answer))) {
    actions.push({
      id: "shopping-mission:fulfillment",
      kind: "shop_nearby",
      title: "How do you want to shop?",
      description: "Chef Gringo can prepare the basket around convenience, price, or ingredient quality. Live retailer routing will only be shown when a provider is verified.",
      commercialEligible: true,
      commercialRouteVerified: false,
      disclosure: "No retailer or delivery partner is currently represented as active in this action. Recommendations remain independent from future commercial relationships.",
      choices: [
        { id: "closest-stores", label: "Closest Stores", description: "Prepare the list for nearby-store matching.", value: "I want to shop nearby. Ask for my ZIP code or city, then organize the ingredient list for local-store matching. Do not invent store availability or prices." },
        { id: "pickup-today", label: "Pickup Today", description: "Prepare a pickup-friendly basket and identify what needs live availability verification.", value: "I want pickup today. Ask for my ZIP code or city and prepare a pickup-ready basket. Clearly mark anything that requires live retailer availability verification." },
        { id: "deliver-it", label: "Deliver It", description: "Prepare the basket for a future verified grocery-delivery integration.", value: "I want delivery. Ask for my ZIP code or city, keep the shopping list structured by ingredient and quantity, and tell me what must be verified with a live delivery provider before checkout." },
        { id: "best-value", label: "Best Value", description: "Prioritize total basket value without sacrificing the ingredients that matter most.", value: "Optimize this shopping list for best overall value. Tell me where generic or lower-cost choices are fine and where upgrading materially improves the result." },
        { id: "best-quality", label: "Best Quality", description: "Prioritize the strongest ingredient choices and explain which upgrades matter.", value: "Optimize this shopping list for best ingredient quality. Rank the ingredients by how much quality affects the final dish and explain what to look for when shopping." },
      ],
    });

    actions.push({
      id: "shopping-mission:export",
      kind: "download",
      title: "Take it with you",
      description: "Turn the mission into something usable off-screen.",
      commercialEligible: false,
      commercialRouteVerified: false,
      disclosure: null,
      choices: [
        { id: "print-list", label: "Printable List", description: "Create a compact print-friendly checklist.", value: "Convert the shopping list into a compact printable checklist with departments, quantities, and checkboxes represented as [ ]." },
        { id: "prep-sheet", label: "Prep Sheet", description: "Create a mise-en-place and prep plan before cooking starts.", value: "Create a prep sheet for this recipe with ingredients to wash, cut, measure, open, grate, or stage before cooking." },
        { id: "share-plan", label: "Share Plan", description: "Create a concise version someone else can shop or cook from.", value: "Create a concise shareable version of this cooking mission that another person could use to shop and cook without the full conversation." },
      ],
    });
  }

  return actions.slice(0, 4);
}
