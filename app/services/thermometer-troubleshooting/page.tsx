import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Thermometer Reads Wrong? Check Calibration, Placement, and Process",
  description: "A practical troubleshooting sequence for suspicious kitchen thermometer readings.",
};

export default function ThermometerTroubleshootingPage() {
  return (
    <div className="page-shell container narrow decision-brief-page">
      <p className="breadcrumbs"><Link href="/">Home</Link> / Solve / Thermometer troubleshooting</p>
      <p className="eyebrow">Temperature intelligence · Solve</p>
      <h1>Your thermometer reads wrong. Start here before replacing it.</h1>
      <p className="lead">A strange reading does not automatically mean the instrument failed. Separate instrument error from probe placement, response time, damaged probes, and a process that is genuinely warmer or colder than expected.</p>

      <section className="decision-brief-offer" aria-label="Thermometer troubleshooting sequence">
        <div><strong>1. Repeat the measurement</strong><span>Move to another point in the food or process and give the sensor enough time to stabilize.</span></div>
        <div><strong>2. Check the sensor and probe</strong><span>Look for bent, pinched, damaged, loose, or contaminated components.</span></div>
        <div><strong>3. Verify against the maker's calibration procedure</strong><span>Use the manufacturer's instructions and your operation's documented calibration policy.</span></div>
      </section>

      <h2>Placement errors can look like instrument errors</h2>
      <p>Touching bone, a pan, a heating element, a cold pocket, or a surface layer can produce a reading that is technically real but not representative of the point you intended to measure.</p>

      <h2>Response time changes the workflow</h2>
      <p>Thermapen ONE is specified by ThermoWorks at a one-second response. ThermoPop 2 is specified at about two to three seconds with the 4.5-inch probe and three to four seconds with the 8-inch probe. Waiting for the instrument matters when you compare readings.</p>

      <h2>Leave-in probes fail differently</h2>
      <p>A monitored-cook system such as ChefAlarm adds a cable, connector, and replaceable probe to the chain. If readings become erratic, inspect those components before assuming the display unit is the problem.</p>

      <p><Link href="/marketplace?goal=choose-a-thermometer">Compare current thermometer options</Link> · <Link href="/go/thermoworks">Open the ThermoWorks decision page</Link></p>
    </div>
  );
}
