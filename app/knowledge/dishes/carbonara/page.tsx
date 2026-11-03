import type { Metadata } from "next";
import Link from "next/link";
import { CarbonaraKnowledgePage } from "../../components/KnowledgePage";

export const metadata: Metadata = {
  title: "Carbonara Knowledge Page",
  description: "Explore Carbonara through connected ingredients, techniques, history, recipe scaling, troubleshooting, and professional production guidance.",
};

export default function CarbonaraPage() {
  return <><CarbonaraKnowledgePage /><section className="section container knowledge-commerce-link"><p className="eyebrow">Solve the failure first</p><h2>Why did my Carbonara scramble?</h2><p>Direct heat, residual pan heat, and timing matter more than blaming the eggs. Use the troubleshooting guide for the fast diagnosis and fix sequence.</p><Link className="button" href="/knowledge/dishes/carbonara/why-carbonara-scrambles">Fix scrambled Carbonara</Link></section><section className="section container knowledge-commerce-link"><p className="eyebrow">Technique → equipment</p><h2>Tools should support the technique.</h2><p>Carbonara succeeds through heat control, timing, and movement—not a gadget. If temperature verification is part of your workflow, compare the five researched thermometer options and their tradeoffs.</p><Link className="button" href="/marketplace?workflow=better-thermometer">Compare thermometers</Link></section></>;
}
