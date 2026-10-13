import type { Metadata } from "next";
import { CarbonaraKnowledgePage } from "../../components/KnowledgePage";

export const metadata: Metadata = {
  title: "Carbonara: It’s All About Technique | Chef Gringo",
  description: "A visual, step-by-step Chef Gringo guide to carbonara: ingredients, heat control, sauce troubleshooting, serving scaler, and professional pickup notes.",
};

export default function CarbonaraPage() {
  return <CarbonaraKnowledgePage />;
}
