/// <reference types="vite/client" />

import type { EditorialArticle, EditorialSectionId } from "./types";

const rawModules = import.meta.glob("../../content/articles/*.json", {
  eager: true,
  import: "default",
}) as Record<string, EditorialArticle>;

function validate(article: EditorialArticle, source: string) {
  const required = [
    "id", "slug", "headline", "deck", "section", "format", "author",
    "publishedAt", "heroImage", "body", "seoTitle", "seoDescription",
    "analyticsContentId",
  ] as const;
  for (const field of required) {
    const value = article[field];
    if (value === undefined || value === null || value === "") {
      throw new Error(`Editorial article ${source} is missing required field: ${field}`);
    }
  }
  if (!Array.isArray(article.body) || article.body.length === 0) {
    throw new Error(`Editorial article ${source} must contain body paragraphs.`);
  }
  return article;
}

const articles = Object.entries(rawModules)
  .map(([source, article]) => validate(article, source))
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export function allArticles() {
  return [...articles];
}

export function publishedArticles() {
  return articles.filter((article) => article.status === "published");
}

export function articleBySlug(slug: string) {
  return articles.find((article) => article.slug === slug);
}

export function articlesBySection(section: EditorialSectionId) {
  return publishedArticles().filter((article) => article.section === section);
}

export function featuredArticle() {
  return publishedArticles().find((article) => article.featured) ?? publishedArticles()[0];
}

export function dailyHomepageArticles() {
  const onePerSection = new Map<EditorialSectionId, EditorialArticle>();
  for (const article of publishedArticles().filter((item) => item.homepageSlot === "daily")) {
    if (!onePerSection.has(article.section)) onePerSection.set(article.section, article);
  }
  return [...onePerSection.values()];
}

export function recentArticles(limit = 5) {
  return publishedArticles().filter((article) => !article.featured).slice(0, limit);
}

export function relatedArticles(article: EditorialArticle, limit = 3) {
  const explicit = article.relatedStories
    .map((slug) => articleBySlug(slug))
    .filter((item): item is EditorialArticle => Boolean(item) && item.status === "published");
  if (explicit.length >= limit) return explicit.slice(0, limit);

  const fallbacks = publishedArticles().filter((candidate) =>
    candidate.slug !== article.slug &&
    candidate.section === article.section &&
    !explicit.some((item) => item.slug === candidate.slug)
  );
  return [...explicit, ...fallbacks].slice(0, limit);
}
