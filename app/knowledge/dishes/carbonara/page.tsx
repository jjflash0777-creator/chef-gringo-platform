import type { Metadata } from "next";
import Link from "next/link";
import { CarbonaraKnowledgePage } from "../../components/KnowledgePage";

export const metadata: Metadata = {
  title: "Carbonara Knowledge Page",
  description: "Explore Carbonara through connected ingredients, techniques, history, recipe scaling, troubleshooting, and professional production guidance.",
};

export default function CarbonaraPage() {
  return <><CarbonaraKnowledgePage /><section className="section container knowledge-commerce-link"><p className="eyebrow">Technique → equipment</p><h2>Tools should support the technique.</h2><p>Carbonara succeeds through heat control, timing, and movement—not a gadget. If temperature verification is part of your workflow, compare the five researched thermometer options and their tradeoffs.</p><Link className="button" href="/marketplace#better-thermometer">Compare thermometers</Link></section></>;
}
