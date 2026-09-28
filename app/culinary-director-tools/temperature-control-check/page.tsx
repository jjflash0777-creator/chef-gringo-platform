import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The 5-Minute Temperature-Control Check for Kitchen Managers",
  description: "A short manager routine for thermometer readiness, cold storage, logs, corrective actions, and staff handoff.",
  alternates: { canonical: "/culinary-director-tools/temperature-control-check" },
};

export default function TemperatureControlCheckPage() {
  return (
    <div className="page-shell container narrow">
      <p className="breadcrumbs"><Link href="/">Home</Link> / <Link href="/culinary-director-tools">Manage</Link> / Temperature-control check</p>
      <p className="eyebrow">Temperature intelligence · Manage</p>
      <h1>The five-minute temperature-control check.</h1>
      <p className="lede">The goal is not another clipboard ritual. It is to catch a broken measurement system before service turns it into a food-safety, quality, or operational problem.</p>

      <h2>1. Are the working thermometers actually present?</h2>
      <p>Confirm the tools are at the stations where the work happens, not locked in an office or buried in a drawer.</p>

      <h2>2. Has calibration or verification been handled on schedule?</h2>
      <p>Follow the manufacturer&apos;s instructions and the written policy for your operation. If a unit fails verification, remove it from service or follow the documented corrective process.</p>

      <h2>3. Do refrigeration readings make sense?</h2>
      <p>Look for unusual trends, conflicting displays, doors left open, overloaded equipment, or a reading that does not match what staff are seeing during service.</p>

      <h2>4. Are the logs usable?</h2>
      <p>A complete sheet full of impossible or repeated numbers is not better than an honest gap. Review exceptions and corrective actions, not just whether every box contains ink.</p>

      <h2>5. Does the next shift know what is wrong?</h2>
      <p>Pass along failed probes, suspect equipment, products being watched, and any follow-up that must happen. Temperature control is a system, not one person&apos;s thermometer.</p>

      <div className="notice"><strong>Compliance boundary:</strong> This routine is an operational prompt, not a substitute for your HACCP plan, food-safety plan, corporate policy, or regulatory requirements.</div>

      <p><Link href="/marketplace?goal=choose-a-thermometer">Compare thermometer workflows</Link> · <Link href="/culinary-director-tools">Back to manager tools</Link></p>
    </div>
  );
}
