import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mirepoix: The Foundation of Flavor",
  description:
    "Chef Gringo explains mirepoix, cut size, sweating aromatics, the Holy Trinity, soffritto, and why flavor starts before the liquid hits the pot.",
};

export default function MirepoixFoundationsPage() {
  return (
    <article className="page-shell container narrow">
      <p className="breadcrumbs"><Link href="/">Home</Link> / <Link href="/learn">Learn</Link> / Mirepoix</p>
      <p className="eyebrow">Foundations of Flavor · Volume I</p>
      <h1>Mirepoix: The Foundation of Flavor</h1>
      <p className="lead">
        Onion, carrot, celery. Three cheap vegetables that quietly decide whether your soup tastes layered or like hot water with ambitions.
        Mirepoix is not complicated. The part people rush is the part that matters: cut it for the job, give it time, and let the aromatics actually develop before you bury them under stock.
      </p>

      <figure className="editorial-figure">
        <img
          src="/images/editorial/foundations-of-flavor/mirepoix-hero.jpg"
          alt="Diced onion, carrot, and celery prepared as mirepoix beside a Dutch oven"
          width="1448"
          height="1086"
          loading="eager"
        />
        <figcaption>Foundations of Flavor begins with three vegetables and the patience to let them do their job.</figcaption>
      </figure>

      <section>
        <h2>First: mirepoix is a mixture, not a knife cut</h2>
        <p>
          Classic French mirepoix is a combination of onion, carrot, and celery. A common starting ratio is roughly two parts onion to one part carrot and one part celery.
          That ratio is useful, not sacred. The dish still gets the final vote.
        </p>
        <p>
          What changes constantly is the <strong>size</strong>. A stock simmering for hours can handle larger pieces. A quick soup or sauce needs smaller pieces so the vegetables soften and release flavor before dinner is already over.
        </p>
        <ul>
          <li><strong>Fine or small:</strong> quick soups, sauces, fillings, and dishes where the vegetables may remain in the finished food.</li>
          <li><strong>Medium:</strong> everyday soups, braises, rice dishes, and stews.</li>
          <li><strong>Large or rough:</strong> long stocks, roasting pans, and slow braises where extraction matters more than presentation.</li>
        </ul>
        <p>
          The rule is simple: <strong>the shorter the cook, the smaller the cut.</strong> If you throw giant chunks into a twenty-minute soup, do not blame the celery when it still tastes raw.
        </p>

        <figure className="editorial-figure">
          <img
            src="/images/editorial/foundations-of-flavor/mirepoix-cut-size.jpg"
            alt="Comparison of large, medium, and fine cuts of onion, carrot, and celery"
            width="1448"
            height="1086"
            loading="lazy"
          />
          <figcaption>Cut size should follow cooking time. Long cook, larger cut. Short cook, smaller cut.</figcaption>
        </figure>
      </section>

      <section>
        <h2>The part people skip: let the aromatics render</h2>
        <p>
          Most weak soups go wrong before the liquid ever enters the pot. The cook turns on the heat, starts chopping while the pan gets hot, dumps everything in, stirs twice, and immediately adds stock.
          Technically, the vegetables were present. Flavor development was not.
        </p>
        <p>
          Get your ingredients together first. Then cook the mirepoix over controlled heat with enough fat to coat it. For many soups and sauces, the goal is to <strong>sweat</strong> the vegetables:
          soften them, draw out moisture, and build sweetness and aroma without aggressively browning them.
        </p>
        <p>
          Use your senses. The onion loses its raw bite. The vegetables soften. The smell changes from chopped vegetables to the beginning of an actual meal.
          When the whole kitchen starts smelling like what is in the pot, you are getting somewhere.
        </p>
        <p><strong>Good flavor is usually less about a secret ingredient and more about giving ordinary ingredients enough time to do their job.</strong></p>
      </section>

      <section>
        <h2>Sweating versus browning</h2>
        <p>
          Neither is automatically better. They produce different results.
        </p>
        <ul>
          <li><strong>Sweat:</strong> moderate to low heat, little to no color. Cleaner, gentler aromatic base for soups, light sauces, grains, and many braises.</li>
          <li><strong>Brown:</strong> higher heat and more color. Deeper roasted notes and sweetness, useful when the finished dish benefits from a darker flavor profile.</li>
        </ul>
        <p>
          The mistake is browning by accident because the pan was screaming hot while you were still looking for the carrots.
          Mise en place is not culinary-school theater. It keeps you from cooking one ingredient while prepping the next three.
        </p>

        <figure className="editorial-figure">
          <img
            src="/images/editorial/foundations-of-flavor/mirepoix-sweating-browning.jpg"
            alt="Side-by-side comparison of gently sweated mirepoix and deeply browned mirepoix"
            width="1448"
            height="1086"
            loading="lazy"
          />
          <figcaption>Sweating builds a gentle aromatic base; browning adds deeper roasted flavor. Choose deliberately.</figcaption>
        </figure>
      </section>

      <section>
        <h2>The aromatic family tree</h2>
        <p>
          Mirepoix is one member of a much larger family. Different cuisines built their own flavor foundations around what grew locally and what tasted right in their food.
        </p>
        <ul>
          <li><strong>French mirepoix:</strong> onion, carrot, celery.</li>
          <li><strong>Cajun and Creole Holy Trinity:</strong> onion, celery, green bell pepper. Carrot steps out; pepper steps in.</li>
          <li><strong>Italian soffritto:</strong> commonly onion, carrot, and celery cooked slowly in fat, often cut quite fine; garlic, herbs, or other aromatics may join depending on the dish and region.</li>
          <li><strong>Sofrito:</strong> a broad family of aromatic preparations across Spanish, Caribbean, Latin American, and other traditions. Ingredients vary widely and may include onion, peppers, garlic, herbs, and tomato.</li>
        </ul>
        <p>
          Do not flatten these into “mirepoix with substitutions.” They come from different food traditions and create different flavor profiles.
          The useful lesson is bigger: <strong>many great dishes begin by developing aromatics before the main ingredients arrive.</strong>
        </p>

        <figure className="editorial-figure">
          <img
            src="/images/editorial/foundations-of-flavor/mirepoix-aromatic-bases.jpg"
            alt="Comparison of French mirepoix, Cajun and Creole Holy Trinity, and Italian soffritto"
            width="1448"
            height="1086"
            loading="lazy"
          />
          <figcaption>Different traditions, different aromatics, same lesson: flavor starts before the main ingredients arrive.</figcaption>
        </figure>
      </section>

      <section>
        <h2>Five mistakes that flatten the flavor</h2>
        <ol>
          <li><strong>Turning on the stove before prep is ready.</strong> Now the onions are cooking while you are hunting for celery.</li>
          <li><strong>Cutting everything too large for the cooking time.</strong> The vegetables never fully soften or release what you need.</li>
          <li><strong>Using too much heat.</strong> Burned onion is not “extra caramelization.”</li>
          <li><strong>Adding liquid too soon.</strong> Once the pot is flooded, you have changed the cooking environment and lost the easiest chance to develop the aromatic base.</li>
          <li><strong>Seasoning only at the end.</strong> Build seasoning in sensible layers as the dish develops instead of trying to repair blandness with one final salt dump.</li>
        </ol>
      </section>

      <section>
        <h2>Where this foundation goes next</h2>
        <p>
          Once you understand aromatic bases, a lot of cooking starts making more sense. Soups, stocks, braises, sauces, rice dishes, beans, ragùs, and countless regional dishes all become easier to read because you can see how the flavor is being built from the bottom up.
        </p>
        <p>
          The next lessons in <strong>Foundations of Flavor</strong> will break down the Holy Trinity, soffritto, knife cuts that actually matter, stocks, and the difference between building flavor and simply piling ingredients into a pot.
        </p>
      </section>

      <aside className="notice-card">
        <strong>Chef Gringo rule</strong>
        <p>
          Prep first. Heat second. Give the aromatics time. If you can smell the dish changing before the stock goes in, you are already doing more than most rushed recipes tell you.
        </p>
      </aside>

      <p><Link href="/learn"><strong>Continue learning the craft →</strong></Link></p>
    </article>
  );
}
