import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Why Food Temperature Keeps Changing After It Leaves the Heat",
  description: "A practical guide to carryover cooking, probe placement, and why one temperature reading is only part of the picture.",
};

export default function TemperatureCarryoverPage() {
  return (
    <div className="page-shell container narrow">
      <p className="breadcrumbs"><Link href="/">Home</Link> / <Link href="/learn">Learn</Link> / Temperature carryover</p>
      <p className="eyebrow">Temperature intelligence · Learn</p>
      <h1>Why food temperature keeps changing after it leaves the heat.</h1>
      <p className="lede">A thermometer tells you what is happening at the probe tip right now. It does not freeze the cooking process. Heat stored in the exterior of a food can continue moving toward the cooler center after the pan, oven, grill, or fryer is no longer adding heat.</p>

      <h2>What carryover cooking actually means</h2>
      <p>Temperature inside a food is rarely uniform. The surface and outer layers are usually hotter than the center. Once the food leaves the heat source, that temperature difference starts to equalize. The center can keep rising for a period even though the food is resting.</p>

      <h2>Why probe placement matters</h2>
      <p>An instant-read thermometer measures the region around its sensor. For thick proteins, casseroles, reheated foods, or other dense items, check the part most likely to be coldest rather than simply the easiest place to reach. When the geometry is irregular, more than one reading may be appropriate.</p>

      <h2>One reading is not the whole process</h2>
      <p>A fast instant-read tool is useful when the job is repeated spot checks. A leave-in probe is useful when the job is watching a changing temperature over time. Those are different workflows, not competing definitions of accuracy.</p>

      <div className="notice"><strong>Food-safety note:</strong> Required cooking, holding, cooling, and reheating temperatures depend on the food and the rules that apply to your operation. Use the current requirements from your regulatory authority rather than treating this article as a substitute for your food-safety program.</div>

      <p><Link className="cg-button cg-button-primary" href="/marketplace?goal=choose-a-thermometer">Compare thermometer workflows →</Link></p>
    </div>
  );
}
