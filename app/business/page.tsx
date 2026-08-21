import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Build a Food Business",
  description: "Honest starting points for cottage food, trucks, catering, and restaurants — without invented licenses or savings.",
};

export default function BusinessPage() {
  return (
    <div className="page-shell container">
      <p className="breadcrumbs"><Link href="/">Home</Link> / Build a food business</p>
      <p className="eyebrow">Guidance, not a license</p>
      <h1 id="start">Start here.</h1>
      <p className="lede">Chef Gringo can help you name the product, the channel, the equipment, and the questions a health department will ask. It cannot license you, underwrite you, or invent a cottage-food rule for your county.</p>

      <section id="cottage-food" className="cg-business-block">
        <h2>Home bakery or cottage food</h2>
        <p>Most of this is local law: what you may sell from a home kitchen, to whom, and with what label. Ask Chef Gringo will collect location, product, channel, and scale before guessing. Marketplace has not researched licensing products; the startup shelf is empty on purpose.</p>
        <p><Link href="/#operator-question">Ask about selling from home</Link> · <Link href="/marketplace?path=business-startup">Startup shelf</Link></p>
      </section>

      <section id="food-truck" className="cg-business-block">
        <h2>Food truck</h2>
        <p>The catalogue can show equipment noted for mobile or outdoor service. Vehicle dimensions, power, propane, and vending permits have not been verified. That gap is stated on the truck goal in Marketplace.</p>
        <p><Link href="/marketplace?goal=equip-a-food-truck">Equip a food truck</Link></p>
      </section>

      <section id="catering" className="cg-business-block">
        <h2>Catering</h2>
        <p>Volume, holding, transport, and recovery time change the equipment list. Ask Chef Gringo for the operation; compare records after you know the job.</p>
        <p><Link href="/marketplace">Open Marketplace</Link> · <Link href="/#operator-question">Ask Chef Gringo</Link></p>
      </section>

      <section id="restaurant" className="cg-business-block">
        <h2>Restaurant or café</h2>
        <p>Researched refrigeration, warewashing, prep, smallwares, and operator software live in Marketplace. Formation, leases, and liquor licenses do not.</p>
        <p><Link href="/marketplace?goal=start-a-food-business">Equipment for a new kitchen</Link> · <Link href="/marketplace?goal=find-software">Find software</Link></p>
      </section>

      <section id="cost" className="cg-business-block">
        <h2>Cost and budgeting</h2>
        <p>Food-cost and labor platforms are listed with the caveat that Chef Gringo has not measured their savings. The recipe scaler will do arithmetic without an LLM.</p>
        <p><Link href="/marketplace?goal=reduce-food-or-labor-costs">Cost platforms</Link> · <Link href="/tools/recipe-scaler">Recipe scaler</Link></p>
      </section>

      <section id="licensing" className="cg-business-block">
        <h2>Licensing and compliance</h2>
        <p>Take the questions to a regulator or a licensed advisor for your place. This page will not generate a permit, a HACCP plan, or a legal opinion.</p>
        <p><Link href="/learn/food-safety">Food-safety preview</Link> · <Link href="/medical-and-nutrition-disclaimer">Medical limits</Link></p>
      </section>
    </div>
  );
}
