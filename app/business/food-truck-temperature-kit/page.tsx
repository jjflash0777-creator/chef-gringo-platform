import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Food Truck Temperature-Control Kit: Build the Workflow Before the Shopping List",
  description: "A practical framework for planning thermometer and temperature-control tools for a mobile food operation.",
  alternates: { canonical: "/business/food-truck-temperature-kit" },
};

export default function FoodTruckTemperatureKitPage() {
  return (
    <div className="page-shell container narrow">
      <p className="breadcrumbs"><Link href="/">Home</Link> / <Link href="/business">Build</Link> / Food-truck temperature kit</p>
      <p className="eyebrow">Temperature intelligence · Build</p>
      <h1>Build the temperature workflow before you buy the food-truck kit.</h1>
      <p className="lede">A mobile kitchen does not need a random pile of thermometers. It needs tools mapped to the menu, cold storage, cooking process, holding method, cooling plan, and the records required by the authority that regulates the operation.</p>

      <h2>Start with the jobs</h2>
      <ul>
        <li><strong>Spot checks:</strong> receiving, prep, cooking, reheating, and holding verification.</li>
        <li><strong>Monitored cooks:</strong> processes where a probe needs to remain in place while temperature changes.</li>
        <li><strong>Cold-storage awareness:</strong> refrigeration and freezer monitoring appropriate to the equipment and local requirements.</li>
        <li><strong>Documentation:</strong> whatever logs, calibration records, or corrective-action records your operation actually requires.</li>
      </ul>

      <h2>Then choose the instrument type</h2>
      <p>A fast instant-read thermometer is the core tool for repeated spot checks. A leave-in alarm thermometer solves a different problem: watching a process without reopening the equipment every time you want a reading.</p>

      <h2>Do not copy another truck's compliance kit</h2>
      <p>Vehicle layout, menu, commissary relationship, power source, equipment, and local rules can change what is appropriate or required. Chef Gringo can organize the questions, but your regulator determines the requirements that apply to your operation.</p>

      <p><Link className="cg-button cg-button-primary" href="/marketplace?goal=choose-a-thermometer">Compare thermometer roles →</Link></p>
      <p><Link href="/marketplace?goal=equip-a-food-truck">Continue building the food-truck equipment plan</Link></p>
    </div>
  );
}
