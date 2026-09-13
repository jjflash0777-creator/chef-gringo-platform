/** Short, citation-sized excerpts. Not full documents. Provenance is on the manifest. */

export const CORPUS_FIXTURES: Record<string, string> = {
  "usda-fsis-safe-temps": `# Ground Meat & Meat Mixtures
Ground beef, pork, veal, and lamb: 160°F (71.1°C).

# Poultry
All poultry, including ground chicken and turkey: 165°F (73.9°C).

# Fish and shellfish
Fish and shellfish: 145°F (62.8°C). Use a food thermometer. Color is not a reliable doneness test.`,

  "usda-fsis-thawing": `# The Big Thaw
USDA FSIS lists three safe ways to thaw meat and poultry: in the refrigerator, in cold water that is changed every 30 minutes, or in the microwave if the food will be cooked immediately.

# Counter thawing
Do not thaw meat, poultry, or fish on the counter at room temperature. The outer surface can enter the danger zone while the center is still frozen.`,

  "usda-fsis-danger-zone": `# Danger Zone
USDA FSIS describes the danger zone as 40°F to 140°F (4°C to 60°C), where bacteria can grow quickly.

# Leftovers
Perishable cooked food should be refrigerated within 2 hours. If the ambient temperature is above 90°F, refrigerate within 1 hour. This leftover sit-time is not the same as the FDA Food Code two-stage cooling process for foodservice.`,

  "fda-food-code-tcs": `# Time/temperature control for safety food
FDA Food Code 2022 cold-holds TCS food at 41°F (5°C) or below and hot-holds TCS food at 135°F (57°C) or above, unless a jurisdiction has adopted a different code.

# Cooling
Cool TCS food from 135°F to 70°F within 2 hours, then from 70°F to 41°F or below within 4 additional hours. If the first step is missed, the food must be discarded or reheated as the adopted code requires. This is foodservice process cooling, not the FSIS two-hour leftover rule for food left sitting out.`,

  "fda-major-allergens": `# Major food allergens
FDA identifies nine major food allergens: milk, eggs, fish, Crustacean shellfish, tree nuts, peanuts, wheat, soybeans, and sesame.

# Cross-contact
Allergen cross-contact is the unintentional transfer of an allergen to a food that should not contain it. Cleaning, separate utensils, and labeled ingredients reduce that risk. This is not a medical diagnosis.`,

  "cdc-four-steps": `# Four steps to food safety
CDC’s food-safety prevention message is Clean, Separate, Cook, and Chill.

# Separate
Keep raw meat, poultry, seafood, and eggs separate from ready-to-eat foods. Use different cutting boards and wash hands and surfaces after handling raw animal foods.`,

  "fda-cleaning-sanitizing": `# Cleaning and sanitizing
Cleaning removes food, soil, and grease from a surface. Sanitizing is a separate step that reduces pathogens on an already cleaned surface to safe levels. A dirty surface cannot be sanitized by wiping sanitizer over soil. Follow the adopted food code and the sanitizer label for contact time and concentration; this excerpt is not a chemical recipe.`,

  "usda-fooddata-central": `# FoodData Central
USDA FoodData Central is the official U.S. database of food composition. Look up a food there for published nutrient values.

# Limits
FoodData Central is not a meal plan, a clinical diet, or a substitute for a registered dietitian. Chef Gringo does not copy the full database into answers.`,

  "dietary-guidelines-2020": `# Dietary Guidelines for Americans, 2020–2025
The Dietary Guidelines for Americans are jointly issued by USDA and HHS. They are population dietary policy, not a prescription for a named patient.

# Use
Use them as background for general healthy-pattern questions. Therapeutic, renal, dysphagia, and pediatric diets stay with the clinician.`,

  "fda-nutrition-facts": `# Nutrition Facts label
The FDA Nutrition Facts label is the regulated way packaged foods declare serving size, calories, and nutrients.

# Reading it
Use serving size and % Daily Value from the actual label. Do not invent a %DV or a homemade Nutrition Facts panel.`,

  "iddsi-level-5": `# IDDSI Level 5 — Minced & Moist
IDDSI Level 5 (minced and moist) food is soft, moist, and minced, with no separate thin liquid. For adults, pieces should be no larger than 4 mm. It can be scooped and holds its shape on a plate.

# Boundary
This is the official IDDSI name and particle-size descriptor, not an order. Texture modification for dysphagia requires the care team. See https://www.iddsi.org/framework/`,

  "iddsi-level-4": `# IDDSI Level 4 — Pureed
IDDSI Level 4 (pureed / extremely thick) food has no lumps, is not sticky, and falls off the spoon in a single coherent bolus. It is not a drink and is not Level 3 liquidised food.

# Boundary
Do not treat this descriptor as a clinical order. See https://www.iddsi.org/framework/`,

  "florida-dbpr-hotels-restaurants": `# Division of Hotels and Restaurants
Florida public food service establishments are licensed by the Division of Hotels and Restaurants at the Department of Business and Professional Regulation (DBPR).

# Limits
This names the agency. It is not a permit, a fee, or a county exemption. The public landing page redirected from myfloridalicense.com/DBPR/hotels-restaurants/ to www2.myfloridalicense.com/hotels-restaurants/. Current statute text was not retrieved.`,

  "florida-cottage-food": `# Florida cottage food
Florida cottage-food operations are administered by the Florida Department of Agriculture and Consumer Services (FDACS), not by DBPR Hotels and Restaurants.

# Boundary
Cottage food is a limited home-based program with labeling and product limits. It is not a restaurant license. Confirm current sales caps, allowed foods, and labeling on the FDACS cottage-food page before selling. County and municipal rules can add requirements; Sarasota County specifics are not on file.`,

  "florida-dor-sales-tax": `# Florida sales tax
Selling taxable goods in Florida generally requires registration with the Florida Department of Revenue for sales and use tax. A food license does not replace tax registration.

# Limits
This is orientation, not a determination of whether a specific baked good is taxable or exempt. Check floridarevenue.com for current registration steps.`,

  "practice-mirepoix": `# Mirepoix
Mirepoix is a flavor base of onion, carrot, and celery, commonly two parts onion to one part each carrot and celery, cooked gently in fat without browning.

# Practice label
This is Chef Gringo professional practice, not a government document.`,

  "practice-emulsion": `# Broken sauces
An emulsion breaks when fat separates from the water phase. Typical causes are heat that is too high, adding fat too quickly, or not enough continuous shearing.

# Recovery
Take it off the heat. Whisk in a spoon of warm water, or start a fresh yolk or mustard binder and slowly work the broken sauce back in. This is culinary practice, not a chemistry paper.`,

  "practice-stock-sauce": `# Stocks
White stock uses pale bones and mirepoix without browning. Brown stock browns bones and vegetables first for color and roasted flavor.

# Braising and roasting
Braising cooks a tough cut in a covered pan with some liquid after a sear. Roasting is dry heat with the surface exposed. Ratios and times depend on the cut; this is practice, not a tested recipe card.`,

  "practice-yield-cost": `# Food-cost percentage
Food-cost percentage = cost of goods sold for food ÷ food sales. Use the same period for both numbers.

# Edible-portion yield
Edible-portion (EP) yield = edible portion weight ÷ as-purchased (AP) weight. Recipe scaling multiplies ingredient amounts by (new servings ÷ original servings); it does not change yield.

[page 1]
# What is not on file
Chef Gringo does not have a current industry-average food-cost or labor-cost benchmark. Labor percentage = total labor cost ÷ total sales, using your numbers.`,

  "thermoworks-thermapen-one": `# Thermapen ONE
ThermoWorks states the Thermapen ONE response time as 1 second for this exact model. Catalog record of the manufacturer specifications also lists accuracy ±0.5°F from -4 to 248°F, range -58 to 572°F, and IP67 protection.

# Exact model
Do not apply these numbers to ThermoPop or other models. Street price and stock are not on file. Full storefront HTML was not stored.`,

  "waring-wsb50-spec": `# Waring WSB50 Big Stik
The manufacturer specification sheet, as recorded in the Chef Gringo catalog, states a 12-inch shaft, 750 watts, 18,000 RPM maximum, and ETL/NSF certification for the WSB50.

# Exact model
Confirm voltage and shaft family before purchase. The PDF sheet itself was not stored as a binary.`,

  "globe-sp20": `# Globe SP20
Globe publishes the SP20 as a 20-quart gear-driven bench mixer with speeds 104, 194, and 353 RPM and a 1/2 HP motor.

# Use
Capacity charts are limits, not daily production targets. Confirm current electrical and warranty terms with the dealer.`,

  "hobart-hl200": `# Hobart Legacy+ HL200
Hobart publishes the Legacy+ HL200 as a 20-quart countertop mixer with stir plus three speeds, a triple interlock, and 189 lb less bowl.

# Replacement checks
Before replacing a commercial mixer or refrigerator, confirm electrical service, door swing or footprint, local service response, and the exact model—not a similar family name.`,

  "osha-restaurant": `# Restaurant workplace hazards
OSHA identifies restaurant work as involving slips, burns, cuts, and other recognized hazards. A broken freezer or live electrical fault is a workplace-safety issue, not a DIY bypass.

# Boundary
Chef Gringo will not walk through defeating safety devices or working live. Follow the employer’s program and qualified service.`,

  "fda-seafood": `# Seafood safety
FDA advises cooking most seafood to a safe internal temperature and treating raw shellfish as a higher-risk food. People with weaker immune systems, pregnant people, and older adults are advised to avoid raw oysters and similar raw shellfish.

# Limits
This is not a harvest-closure map. Check local advisories for recreational shellfish.`,

  "fda-egg-safety": `# Egg safety
FDA advises cooking eggs until yolks and whites are firm. Recipes that stay undercooked should use pasteurized eggs. Keep eggs refrigerated and avoid cracked shells.

# Service
Undercooked eggs for a high-risk diner are a food-safety decision, not a style choice.`,

  "stale-cold-hold-45f": `# Withdrawn local note
Cold TCS food may be held at 45°F.

# Status
This note is stale and must not be used in public answers. FDA Food Code 2022 uses 41°F unless a jurisdiction has adopted otherwise.`,
};

export const CORPUS_FIXTURE_META: Record<string, { mimeType: string; pageLocators?: boolean }> = {
  "fda-food-code-tcs": { mimeType: "text/plain", pageLocators: false },
  "stale-cold-hold-45f": { mimeType: "text/plain" },
};
