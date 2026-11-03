import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Your Food Cost Didn’t Jump Overnight — You Noticed It Late",
  description:
    "Chef Gringo explains invoice drift, yield, waste, portion creep, theoretical vs actual food cost, and what kitchen managers should review every week.",
  alternates: { canonical: "/business/food-cost-drift" },
};

export default function FoodCostDriftPage() {
  return (
    <article className="editorial-article">
      <header className="editorial-hero">
        <div className="editorial-hero-copy">
          <p className="breadcrumbs"><Link href="/">Home</Link> / <Link href="/business">Build</Link> / Food cost</p>
          <p className="eyebrow">Manage · Food cost</p>
          <h1>Your food cost didn’t jump overnight. You noticed it late.</h1>
          <p className="editorial-deck">
            Food cost usually leaks in boring places: vendor price changes, yield, waste, portion creep, and menu prices that never caught up.
            The expensive part is often the delay between the problem starting and somebody actually seeing it.
          </p>
        </div>
      </header>

      <div className="editorial-body">
        <p className="article-kicker">
          Fast answer: review theoretical food cost, actual food cost, purchase-price movement, waste, and portion/yield variance every week.
          Monthly review is often where you discover a problem you have already been paying for.
        </p>

        <section>
          <h2>Theoretical versus actual food cost.</h2>
          <p>
            <strong>Theoretical food cost</strong> is what your menu should cost if recipes, yields, portions, and purchase prices behave exactly as expected.
            <strong> Actual food cost</strong> is what the operation really spent relative to the revenue it produced.
          </p>
          <p>
            The gap between those two numbers is where the investigation starts. A variance is not automatically theft or waste.
            It can be price drift, inaccurate recipes, poor yields, oversized portions, transfers, comps, spoilage, or bad data.
          </p>
        </section>

        <section>
          <h2>Five places I would look first.</h2>
          <ol>
            <li><strong>Vendor price drift.</strong> A case creeps from $42 to $46 to $51 and the recipe cost still thinks it is $42.</li>
            <li><strong>Yield loss.</strong> You buy forty pounds, but trim, cooking loss, and usable yield leave far less to sell.</li>
            <li><strong>Portion creep.</strong> The recipe says six ounces; the plate quietly becomes seven or eight.</li>
            <li><strong>Waste and overproduction.</strong> Spoilage, prep mistakes, rejected food, overcooking, and “just in case” production all count.</li>
            <li><strong>Menu-price lag.</strong> Ingredient cost moves faster than selling price.</li>
          </ol>
        </section>

        <section>
          <h2>The five numbers I want every week.</h2>
          <div className="evidence-grid">
            <article className="evidence-card evidence-strong"><p className="evidence-label">1 · Purchases</p><p>What did the kitchen actually buy, and which categories changed materially?</p></article>
            <article className="evidence-card evidence-strong"><p className="evidence-label">2 · Revenue / meals served</p><p>What volume did those purchases support?</p></article>
            <article className="evidence-card evidence-moderate"><p className="evidence-label">3 · Theoretical food cost</p><p>What should the food have cost according to current recipes, yields, and prices?</p></article>
            <article className="evidence-card evidence-moderate"><p className="evidence-label">4 · Actual food cost</p><p>What did the operation really spend relative to output?</p></article>
            <article className="evidence-card evidence-emerging"><p className="evidence-label">5 · Variance</p><p>Where are theoretical and actual performance separating, and why?</p></article>
          </div>
        </section>

        <section>
          <h2>A one-point change is not “just one point.”</h2>
          <p>
            On $100,000 in monthly food-related revenue, one percentage point is $1,000. Three points is $3,000.
            The exact impact depends on the operation and the denominator you use, but percentage drift becomes real money quickly.
          </p>
          <p>
            That is why I care more about catching the direction early than celebrating a perfect spreadsheet after the month is already closed.
          </p>
        </section>

        <section>
          <h2>Software can shorten the delay. It cannot run the kitchen for you.</h2>
          <p>
            A platform can help centralize invoices, recipe costs, inventory, and purchasing data. That can make price changes and variance easier to spot.
            It does not fix sloppy portions, poor receiving, bad prep, weak leadership, or inaccurate recipes by itself.
          </p>
          <p>
            If you already know your numbers and the manual process is the bottleneck, software may be worth evaluating.
            If nobody is using recipes, tracking waste, or taking inventory seriously, buying software will not magically create discipline.
          </p>
        </section>

        <aside className="notice-card">
          <strong>Chef Gringo rule</strong>
          <p>Do not wait for the monthly P&amp;L to tell you what the kitchen was doing three weeks ago.</p>
        </aside>

        <section className="next-article">
          <p className="eyebrow">Operator tool · referral disclosure</p>
          <h2>Where Restoke may fit.</h2>
          <p>
            Restoke is relevant if your problem is visibility across purchasing, invoice prices, recipes, inventory, and food-cost tracking.
            Chef Gringo may earn a referral commission if you choose to sign up through an eligible referral link.
          </p>
          <p>
            Evaluate the workflow first. Ask whether it reduces manual work, catches price changes sooner, and fits the way your team actually receives, counts, and orders.
          </p>
          <p><Link href="/marketplace?goal=reduce-food-or-labor-costs"><strong>Compare food-cost and operator tools →</strong></Link></p>
        </section>
      </div>
    </article>
  );
}
