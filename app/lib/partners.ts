/**
 * The public partner roster: every brand Chef Gringo currently routes
 * readers to through a commercial relationship. One source of truth for
 * the /partners showcase and the homepage partner band, so the roster
 * cannot drift between surfaces. Kind labels state the commercial
 * relationship plainly; inclusion here is advertising, not a ranking —
 * Marketplace order stays commission-blind.
 */
export type PartnerShowcaseEntry = {
  name: string;
  href: string;
  kind: "Affiliate partner" | "Referral partner" | "Referral route";
  role: string;
  blurb: string;
  /**
   * Card imagery. `affiliate-creative` entries point at the partner's
   * own creative as delivered through Impact — the same assets the /go
   * pages run, served unaltered. `editorial` entries are Chef Gringo
   * kitchen photography of the work the partner is for; they never
   * depict the partner's product and their alt text says what the
   * photo actually shows.
   */
  image: string;
  imageAlt: string;
  imageKind: "affiliate-creative" | "editorial";
};

export const PARTNER_SHOWCASE: PartnerShowcaseEntry[] = [
  {
    name: "ThermoWorks",
    href: "/go/thermoworks",
    kind: "Affiliate partner",
    role: "Precision thermometers",
    blurb:
      "Thermapen ONE and NANO, ChefAlarm, ThermoPop — the temperature tools the recipes and food-safety guidance on this site assume. When a recipe here says check the thickest part, this is the check.",
    image: "https://a.impactradius-go.com/display-ad/39638-3270375",
    imageAlt: "ThermoWorks temperature tool being used while cooking",
    imageKind: "affiliate-creative",
  },
  {
    name: "Chef iQ",
    href: "/go/chefiq",
    kind: "Affiliate partner",
    role: "Smart cooking, guided",
    blurb:
      "The iQ Sense wireless probe and the iQ Cooker multicooker. App-guided cooking that teaches while it cooks, and repeatability for people who already know their way around a stove.",
    image: "https://a.impactradius-go.com/display-ad/49274-3941930",
    imageAlt: "Chef iQ iQ Sense wireless cooking probe",
    imageKind: "affiliate-creative",
  },
  {
    name: "Bluetti",
    href: "/go/bluetti",
    kind: "Affiliate partner",
    role: "Portable power & cold storage",
    blurb:
      "Battery power stations and the MultiCooler fridge, sized for food trucks, markets, catering runs, and any operation that cannot afford to lose power or product.",
    image: "/brand/editorial/food-truck.jpg",
    imageAlt: "Cook working inside a food truck kitchen",
    imageKind: "editorial",
  },
  {
    name: "Gustus Vitae",
    href: "/go/gustus-vitae",
    kind: "Affiliate partner",
    role: "Seasonings & infused salts",
    blurb:
      "Small-batch seasoning collections and more than fifty infused sea salts. The fastest legal way to make plain food taste deliberate.",
    image: "https://a.impactradius-go.com/display-ad/58359-4103247",
    imageAlt: "Gustus Vitae seasoning gift set",
    imageKind: "affiliate-creative",
  },
  {
    name: "Toast",
    href: "/go/toast",
    kind: "Referral partner",
    role: "Restaurant point of sale",
    blurb:
      "The POS route for restaurants — terminals, online ordering, and payroll in one system, with a documented statement-credit offer for new customers who qualify.",
    image: "/images/editorial/restaurant-kitchen-service.jpg",
    imageAlt: "Restaurant kitchen during service",
    imageKind: "editorial",
  },
  {
    name: "Kitchen OS",
    href: "/go/kitchen-os",
    kind: "Referral partner",
    role: "Food-safety software",
    blurb:
      "Digital HACCP checks, fridge and freezer monitoring, QR allergen menus, and label printing. Built in the UK, and the strongest fit for UK-led operations.",
    image: "/brand/editorial/refrigeration.jpg",
    imageAlt: "Commercial refrigeration inside a working kitchen",
    imageKind: "editorial",
  },
  {
    name: "Crazy Good Buy",
    href: "/go/crazy-good-buy",
    kind: "Referral route",
    role: "Restaurant equipment deals",
    blurb:
      "Discount commercial equipment. The route only counts when the delivered unit — price plus freight, condition, warranty, and returns — still beats the standard quote.",
    image: "/brand/editorial/repair-replace.jpg",
    imageAlt: "Kitchen operators inspecting equipment and repair costs",
    imageKind: "editorial",
  },
];
