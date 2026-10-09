import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecipePage } from "../RecipePage";
import { recipeBySlug, recipes } from "../data";

export function generateStaticParams() {
  return recipes.map((recipe) => ({ slug: recipe.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const recipe = recipeBySlug((await params).slug);
  if (!recipe) return { title: "Recipe not found" };
  return {
    title: recipe.title,
    description: recipe.description,
  };
}

export default async function RecipeRoute({ params }: { params: Promise<{ slug: string }> }) {
  const recipe = recipeBySlug((await params).slug);
  if (!recipe) notFound();
  return <RecipePage recipe={recipe} />;
}
