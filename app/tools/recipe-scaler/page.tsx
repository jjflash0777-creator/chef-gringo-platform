import type { Metadata } from "next";
import { Notice } from "../../components/Notice";
import { RecipeScaler } from "./RecipeScaler";

export const metadata: Metadata = {
  title: "Recipe Serving Calculator & Foodservice Recipe Scaler",
  description: "Accurately scale recipe ingredient quantities for a new serving count while preserving entered units.",
};
export default function ScalerPage() {
  return <div className="page-shell container">
    <p className="breadcrumbs"><a href="/">Home</a> / <a href="/culinary-director-tools">Culinary Director Tools</a> / Recipe Scaler</p>
    <p className="eyebrow">Deterministic kitchen math</p>
    <h1>Recipe scaler</h1>
    <p className="lede">Enter the original yield and the yield you need. We multiply every quantity by the same factor—no AI, no unit switching, no mystery math.</p>
    <RecipeScaler />
    <Notice />
  </div>;
}
