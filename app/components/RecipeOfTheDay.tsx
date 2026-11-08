"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { newYorkDateLabel, recipeOfTheDay } from "../lib/recipe-registry";
import styles from "./RecipeOfTheDay.module.css";

/**
 * Recipe of the Day: one recipe per New York calendar day, picked
 * deterministically from the published registry. The server seeds the
 * pick with its render instant so first paint is never empty; on mount
 * the pick is recomputed with the visitor's clock, so a page rendered
 * or cached before midnight Eastern still shows the right day.
 */
export function RecipeOfTheDay({ initialInstant }: { initialInstant: string }) {
  const [instant, setInstant] = useState(() => new Date(initialInstant));

  useEffect(() => {
    // Re-pick against the visitor's clock: a page rendered or cached
    // before midnight Eastern still lands on the right day, and a tab
    // left open rolls over on its own.
    const refresh = () => setInstant(new Date());
    const initial = setTimeout(refresh, 0);
    const timer = setInterval(refresh, 60_000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, []);

  const recipe = recipeOfTheDay(instant);

  return (
    <article className={styles.card} aria-labelledby="recipe-of-the-day-title">
      <div className={styles.media}>
        <Image
          src={recipe.image}
          alt={recipe.imageAlt}
          width={880}
          height={550}
          sizes="(max-width: 46rem) 100vw, 40vw"
        />
      </div>
      <div className={styles.copy}>
        <p className={styles.kicker}>
          Recipe of the Day · <time dateTime={instant.toISOString()}>{newYorkDateLabel(instant)}</time>
        </p>
        <h3 id="recipe-of-the-day-title">{recipe.title}</h3>
        <p className={styles.hook}>{recipe.hook}</p>
        {recipe.lighterAngle ? <p className={styles.angle}>{recipe.lighterAngle}</p> : null}
        <p className={styles.cadence}>Something new every day from the published shelf — and something lighter in the mix. The pick changes at midnight Eastern.</p>
        <Link className={styles.link} href={recipe.href}>Cook today&apos;s recipe <span aria-hidden="true">→</span></Link>
      </div>
    </article>
  );
}
