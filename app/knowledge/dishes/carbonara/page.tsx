import type { Metadata } from "next";
import { CarbonaraKnowledgePage } from "../../components/KnowledgePage";

export const metadata: Metadata = {
  title: "Carbonara Knowledge Page",
  description: "Explore Carbonara through connected ingredients, techniques, history, recipe scaling, troubleshooting, and professional production guidance.",
};

export default function CarbonaraPage() {
  return <CarbonaraKnowledgePage />;
}
