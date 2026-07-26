"use client";
import { useEffect } from "react";
import { trackEvent } from "../../components/AnalyticsBridge";
export function RecipeViewTracker() { useEffect(() => trackEvent("big_mac_recipe_viewed"), []); return null; }
