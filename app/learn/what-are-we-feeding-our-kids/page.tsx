import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "What Are We Feeding Our Kids? | Chef Gringo",
  description:
    "An evidence-first look at childhood diet, digestive symptoms, ultra-processed foods, additives, the gut microbiome, and what the research actually supports.",
};

const Evidence = ({
  level,
  children,
}: {
  level: "Strong" | "Moderate" | "Emerging" | "Not supported";
  children: React.ReactNode;
}) => (
  <div className={`evidence-card evidence-${level.toLowerCase().replace(" ", "-")}`}>
    <p className="evidence-label">{level} evidence</p>
    <div>{children}</div>
  </div>
);

const Source = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="article-source">
    {children}
  </a>
);

export default function WhatAreWeFeedingOurKidsPage() {
  return (
    <main className="editorial-article">
      <header className="editorial-hero">
        <div className="editorial-hero-copy">
          <p className="breadcrumbs"><Link href="/">Home</Link> / <Link href="/learn">Learn</Link> / The Food We Eat</p>
          <p className="eyebrow">The Food We Eat · Part I</p>
          <h1>What Are We Feeding Our Kids?</h1>
          <p className="editorial-deck">
            A closer look at digestive symptoms, ultra-processed foods, food additives,
            the microbiome—and what the evidence actually says.
          </p>
          <div className="editorial-meta">
            <span>Chef Gringo Editorial</span>
            <span>Evidence-first food &amp; ingredient education</span>
          </div>
        </div>
        <figure className="editorial-hero-image">
          <img
            src="/images/editorial/what-are-we-feeding-our-kids/child-grocery-aisle.jpg"
            alt="Young child standing in a grocery aisle surrounded by packaged foods"
          />
        </figure>
      </header>

      <div className="editorial-body">
        <p className="article-kicker">
          Walk through almost any grocery store with a child and pay attention to what is
          competing for their attention.
        </p>

        <p>
          Bright cereal boxes. Neon drinks. Fruit snacks shaped like characters. Yogurt tubes.
          Cheese crackers. Cookies packaged for lunchboxes. Frozen breakfasts. Chicken nuggets.
          Snack bars. “Zero sugar” treats.
        </p>

        <p>
          None of those foods, by themselves, tells us whether a child will be healthy or unhealthy.
          And this is not another article telling parents that everything in the grocery store is poison.
        </p>

        <p>But there is a number worth stopping for.</p>

        <blockquote>
          American youth ages 1–18 received an average of <strong>61.9% of their calories from
          ultra-processed foods</strong> during August 2021 through August 2023.
        </blockquote>

        <p>
          That is the latest estimate from the National Center for Health Statistics. Among adults,
          the share was 53%. <Source href="https://www.cdc.gov/nchs/products/databriefs/db536.htm">CDC / NCHS data brief</Source>
        </p>

        <p>
          Ultra-processed food is not sitting at the edge of the modern childhood diet. For many
          children, it is the diet.
        </p>

        <p className="article-question">
          So the useful question is not “Which ingredient is poisoning our kids?” The better question
          is: <strong>what happens when highly formulated foods become the foundation of a developing
          child’s diet—and what does the evidence actually tell us?</strong>
        </p>

        <h2>Children aren’t just small adults</h2>

        <figure className="editorial-inline-image">
          <img
            src="/images/editorial/what-are-we-feeding-our-kids/child-digestive-system.jpg"
            alt="Illustration of a child showing the stomach and intestinal tract with common digestive symptoms"
          />
          <figcaption>Digestive symptoms can have many causes. A symptom is not the same thing as a disease.</figcaption>
        </figure>

        <p>
          Childhood is a period of enormous biological change. Bones are growing. Hormonal systems
          are developing. Eating behaviors are being learned. Nutritional requirements change as a
          child grows. The digestive system also contains an extraordinarily complicated ecosystem
          that scientists are still working to understand: the gut microbiome.
        </p>

        <p>
          The American Academy of Pediatrics has also noted that children can receive greater exposure
          to some food-related chemicals relative to body weight while organ and metabolic systems are
          still developing. <Source href="https://publications.aap.org/pediatrics/article/142/2/e20181410/37583/Food-Additives-and-Child-Health">American Academy of Pediatrics</Source>
        </p>

        <p>
          That does <strong>not</strong> mean children cannot safely eat processed foods. It means childhood
          deserves special attention when researchers examine diet and environmental exposures.
        </p>

        <div className="evidence-grid">
          <Evidence level="Strong">
            <p>Overall diet quality during childhood matters for growth, nutrient intake and long-term health.</p>
          </Evidence>
          <Evidence level="Moderate">
            <p>Dietary patterns during childhood can influence metabolic risk and eating behavior later in life.</p>
          </Evidence>
          <Evidence level="Emerging">
            <p>Specific food additives may alter an individual child’s microbiome in ways that contribute directly to disease.</p>
          </Evidence>
        </div>

        <h2>First, separate a stomachache from a disease</h2>

        <p>
          If a child eats something and experiences gas, bloating, diarrhea, constipation, reflux,
          abdominal discomfort or nausea, that does not automatically mean the food is damaging the
          intestine or causing chronic disease.
        </p>

        <h3>Lactose</h3>
        <p>
          For someone with lactose intolerance, the small intestine does not make enough lactase to
          fully digest lactose. Undigested lactose reaches the colon, where bacteria break it down and
          produce fluid and gas. The result can include bloating, gas, abdominal pain, nausea and
          diarrhea. NIDDK also notes that many people with lactose intolerance can tolerate some lactose.
          <Source href="https://www.niddk.nih.gov/health-information/digestive-diseases/lactose-intolerance">NIDDK: lactose intolerance</Source>
        </p>

        <Evidence level="Strong">
          <p>Lactose can cause gastrointestinal symptoms in people who do not digest it well. Lactose itself is not a “toxin.”</p>
        </Evidence>

        <h2>Sugar-free doesn’t automatically mean stomach-friendly</h2>

        <figure className="editorial-inline-image">
          <img
            src="/images/editorial/what-are-we-feeding-our-kids/sugar-alcohol-digestion.jpg"
            alt="Digestive illustration showing how poorly absorbed sugar alcohols can move through the intestine"
          />
          <figcaption>Poorly absorbed carbohydrates can draw water into the intestine and be fermented by gut bacteria.</figcaption>
        </figure>

        <p>
          “Zero sugar” can sound like the obvious better choice. Turn the package around, though, and
          you may find ingredients such as sorbitol, mannitol, maltitol, xylitol, erythritol or isomalt.
          These are sugar alcohols.
        </p>

        <p>
          Some sugar alcohols are absorbed slowly or incompletely in the small intestine. For certain
          people—especially at larger amounts—the result can be gas, bloating, cramping or diarrhea.
          FDA consumer guidance specifically notes that sugar alcohols can produce gastrointestinal
          symptoms in some people. <Source href="https://www.accessdata.fda.gov/scripts/InteractiveNutritionFactsLabel/assets/InteractiveNFL_SugarAlcohols_October2021.pdf">FDA: sugar alcohols</Source>
        </p>

        <Evidence level="Strong">
          <p>Certain poorly absorbed carbohydrates can produce gastrointestinal symptoms.</p>
        </Evidence>

        <Evidence level="Not supported">
          <p>Those symptoms, by themselves, do not prove that a sugar alcohol caused chronic intestinal disease.</p>
        </Evidence>

        <h2>Then there is the modern packaged-food formula</h2>

        <figure className="editorial-inline-image">
          <img
            src="/images/editorial/what-are-we-feeding-our-kids/processed-food-ingredients.jpg"
            alt="Stylized packaged snack surrounded by sugar, oils, colors, powders and other formulation ingredients"
          />
          <figcaption>A long ingredient list is not proof of danger. The useful question is how the food fits into the overall diet.</figcaption>
        </figure>

        <p>
          Pick up an ordinary packaged snack and you may encounter some combination of refined flour
          or starch, added sugar, oils, salt, emulsifiers, gums, colors, flavors, preservatives,
          modified starches and sweeteners.
        </p>

        <p>
          Seeing a long ingredient list does not automatically make a product dangerous. An unfamiliar
          chemical name is not evidence of toxicity. The question researchers are increasingly examining
          is different: <strong>what happens when foods engineered around these formulations make up most
          of a person’s diet?</strong>
        </p>

        <h2>What exactly is an ultra-processed food?</h2>

        <p>
          Not all processing is bad. Cooking is processing. Freezing vegetables is processing.
          Pasteurizing milk is processing. Grinding oats is processing. Canning beans is processing.
          Fermenting yogurt is processing.
        </p>

        <p>
          The NOVA classification generally uses “ultra-processed” for industrial formulations built
          largely from refined components plus combinations of flavors, colors, emulsifiers and other
          additives. That can include some packaged snacks, sweet baked goods, soft drinks, instant
          meals, sweetened cereals and processed meat products.
        </p>

        <p>
          But the category has limits. Two foods labeled ultra-processed can have very different
          nutritional profiles. A high-fiber packaged bread and a candy bar can occupy the same broad
          processing category while providing very different nutrition.
        </p>

        <p><strong>“Ultra-processed” should not replace reading the Nutrition Facts panel and ingredient list.</strong></p>

        <h2>What does this look like on a real breakfast table?</h2>

        <figure className="editorial-inline-image">
          <img
            src="/images/editorial/what-are-we-feeding-our-kids/breakfast-food-comparison.jpg"
            alt="Side-by-side breakfast comparison showing highly processed foods and a whole-food breakfast with oats, fruit and nuts"
          />
          <figcaption>The useful comparison is not “processed versus pure.” It is nutrient density, portion, frequency and what the food replaces.</figcaption>
        </figure>

        <p>
          Consider breakfast cereal. Kellogg’s current SmartLabel information for an individual serving
          of Froot Loops lists 7 grams of total sugar, including 6 grams of added sugar, in a 21-gram
          serving. The ingredient list begins with a corn-flour blend followed by sugar, wheat flour and
          whole-grain oat flour. <Source href="https://smartlabel.kelloggs.com/en_US/Product/Index/00038000017674">Kellogg’s SmartLabel</Source>
        </p>

        <p>
          Does that mean Froot Loops causes gastrointestinal disease? <strong>No.</strong> That would be
          an unsupported conclusion.
        </p>

        <div className="editorial-checklist">
          <p className="eyebrow">Chef Gringo label check</p>
          <ol>
            <li>How much added sugar is there?</li>
            <li>How much fiber?</li>
            <li>How much protein?</li>
            <li>How large is the portion actually being eaten?</li>
            <li>What accompanies it?</li>
            <li><strong>What food did it replace?</strong></li>
          </ol>
        </div>

        <p>
          That last question may be the most important one.
        </p>

        <h2>Ultra-processed food and long-term health</h2>

        <p>
          A major 2024 umbrella review in <em>The BMJ</em> examined 45 pooled analyses representing
          nearly 9.9 million participants. Greater exposure to ultra-processed foods was associated
          with higher risk across numerous health outcomes, including type 2 diabetes, cardiovascular
          outcomes, obesity and mortality. <Source href="https://www.bmj.com/content/384/bmj-2023-077310">BMJ umbrella review</Source>
        </p>

        <p>
          That sounds alarming, but here is the part that should sit beside every headline quoting the
          research: <strong>most of the evidence is observational.</strong>
        </p>

        <p>
          Observational research can identify important associations, but it does not automatically
          prove causation. People consuming large amounts of ultra-processed foods may also differ in
          physical activity, sleep, smoking, healthcare access, income, calorie intake, total diet quality
          and other factors.
        </p>

        <div className="evidence-grid">
          <Evidence level="Strong">
            <p>High consumption of ultra-processed foods is consistently associated with several poorer health outcomes.</p>
          </Evidence>
          <Evidence level="Moderate">
            <p>Ultra-processed dietary patterns probably contribute to at least some of those outcomes.</p>
          </Evidence>
          <Evidence level="Emerging">
            <p>Researchers are still separating the effects of processing, food texture, energy density, additives and displacement of healthier foods.</p>
          </Evidence>
        </div>

        <h2>We do have one important controlled experiment</h2>

        <p>
          In a tightly controlled NIH study, 20 adults stayed at the NIH Clinical Center and received
          either an ultra-processed or minimally processed diet for two weeks before switching to the
          other. Participants could eat as much or as little as they wanted.
        </p>

        <p>
          On the ultra-processed diet, participants consumed roughly <strong>500 additional calories per
          day</strong> and gained weight. On the minimally processed diet, they ate less and lost weight.
          <Source href="https://pubmed.ncbi.nlm.nih.gov/31105044/">NIH randomized controlled trial</Source>
        </p>

        <p>
          That experiment matters because it demonstrates that food formulation can affect intake under
          controlled conditions. But it involved only 20 adults, lasted weeks rather than years and was
          not a childhood study. It cannot tell us which characteristic of the ultra-processed diet caused
          the difference.
        </p>

        <h2>What about emulsifiers, colors and sweeteners?</h2>

        <p>
          Laboratory and animal research has given scientists legitimate reasons to investigate several
          classes of additives. Researchers have examined whether some emulsifiers, sweeteners, colors
          and other ingredients can influence gut bacteria, mucus layers, intestinal permeability or
          inflammation.
        </p>

        <p>
          A 2024 review in <em>Nature Reviews Gastroenterology &amp; Hepatology</em> concluded that evidence
          connecting ultra-processed diets with gut disease is growing, while also emphasizing that much
          of the evidence involving individual additives and intestinal mechanisms still comes from
          preclinical research. Human intervention studies remain comparatively limited.
          <Source href="https://www.nature.com/articles/s41575-024-00893-5">Nature Reviews Gastroenterology &amp; Hepatology</Source>
        </p>

        <Evidence level="Emerging">
          <p>Some additives can alter gut-related biological processes under experimental conditions.</p>
        </Evidence>

        <Evidence level="Not supported">
          <p>That does not establish that ordinary exposure to a particular additive in a specific packaged food causes gastrointestinal disease in a particular child.</p>
        </Evidence>

        <h2>The microbiome changes the conversation</h2>

        <figure className="editorial-inline-image editorial-image-wide">
          <img
            src="/images/editorial/what-are-we-feeding-our-kids/gut-microbiome.jpg"
            alt="Microscopic-style visualization of a diverse community of bacteria in the gut microbiome"
          />
          <figcaption>The microbiome is real and biologically important. Many popular claims about exactly how individual foods change it remain ahead of the evidence.</figcaption>
        </figure>

        <p>
          Inside the digestive tract is an enormous community of microorganisms. They participate in
          digestion, fermentation of dietary fiber, metabolite production, immune signaling and
          intestinal-barrier function. Diet clearly influences this ecosystem.
        </p>

        <p>
          That has created enormous excitement—and enormous exaggeration.
        </p>

        <blockquote>
          The important word is <strong>may</strong>. A dietary exposure may alter microbial communities.
          That change may influence metabolic or immune pathways. Those mechanisms may eventually help
          explain differences in disease risk.
        </blockquote>

        <p>
          That is very different from saying scientists have proved that one packaged-food ingredient
          “destroys a child’s gut.” They have not.
        </p>

        <h2>Symptoms are not the same thing as disease</h2>

        <p>
          A person can experience bloating, gas, diarrhea, constipation, cramping or reflux without having
          chronic gastrointestinal disease. Persistent symptoms also should not automatically be blamed
          on additives.
        </p>

        <p>
          Conditions such as celiac disease, inflammatory bowel disease, bacterial overgrowth,
          constipation and lactose intolerance can produce overlapping symptoms. Persistent or concerning
          symptoms deserve medical evaluation—not an Instagram diagnosis.
          <Source href="https://www.niddk.nih.gov/health-information/digestive-diseases/lactose-intolerance/diagnosis">NIDDK diagnostic guidance</Source>
        </p>

        <h2>Maybe we’ve been asking the wrong question</h2>

        <p>
          Modern nutrition debate often revolves around finding <em>the bad ingredient</em>: sugar, dyes,
          emulsifiers, preservatives, artificial sweeteners, gluten, seed oils or high-fructose corn syrup.
          One villain is chosen and suddenly an extraordinarily complicated food system has an easy explanation.
        </p>

        <p>Human nutrition does not work that way.</p>

        <p className="article-question">
          What if one of the biggest problems is not only what is being added—but <strong>what is disappearing?</strong>
        </p>

        <p>
          Every time a child’s diet is dominated by packaged foods, there is an opportunity cost.
          Something else may not be getting eaten: beans, lentils, vegetables, fruit, whole grains, nuts,
          seeds, minimally processed proteins and foods naturally rich in fiber.
        </p>

        <p>
          The modern diet therefore presents two different questions: <strong>what are we consuming more
          of, and what are we consuming less of?</strong>
        </p>

        <h2>What does this mean over a lifetime?</h2>

        <p>
          You cannot look at a child’s snack and predict whether that child will eventually develop obesity,
          diabetes, inflammatory bowel disease or cancer. Human disease is influenced by genetics,
          environment, infection, physical activity, socioeconomic conditions, total diet and many other factors.
        </p>

        <p>But dietary patterns accumulate.</p>

        <p>
          A breakfast becomes a routine. A lunchbox becomes a habit. A snack becomes an expectation.
          Taste preferences develop. Foods become familiar. Repeated choices eventually form a diet.
        </p>

        <p>
          So the long-term concern is not that one bowl of cereal permanently damages a child. The concern
          is what happens when a pattern dominated by highly formulated foods continues day after day,
          year after year.
        </p>

        <h2>Don’t panic. Improve the pattern.</h2>

        <p>
          Parents do not need another source of guilt. Most families are navigating some combination of
          work, school, childcare, food prices, picky eating, limited time, sports, exhaustion and convenience.
          Packaged food exists partly because it solves real problems.
        </p>

        <p>
          Perfection is not required. A child eating crackers is not nutritional failure. Neither is cereal
          for breakfast or pizza on Friday night.
        </p>

        <p>The better objective is to zoom out and ask what foods dominate the week.</p>

        <h2>So what should we feed the gut?</h2>

        <figure className="editorial-inline-image editorial-image-wide">
          <img
            src="/images/editorial/what-are-we-feeding-our-kids/gut-supportive-foods.jpg"
            alt="Table filled with beans, oats, berries, yogurt, vegetables, nuts, seeds and other fiber-rich whole foods"
          />
          <figcaption>The next article turns the question around: which foods have the strongest evidence for supporting digestive health?</figcaption>
        </figure>

        <p>
          After examining what might work against digestive health, the more useful question is what may
          actually support it.
        </p>

        <ol className="top-foods">
          <li><strong>Beans and lentils</strong></li>
          <li><strong>Oats and other whole grains</strong></li>
          <li><strong>Berries</strong></li>
          <li><strong>Apples and other fiber-rich fruits</strong></li>
          <li><strong>Leafy and cruciferous vegetables</strong></li>
          <li><strong>Onions, garlic and other prebiotic-rich plants</strong></li>
          <li><strong>Nuts and seeds</strong></li>
          <li><strong>Plain yogurt with live cultures</strong></li>
          <li><strong>Kefir and selected fermented foods</strong></li>
          <li><strong>A diverse range of minimally processed plant foods</strong></li>
        </ol>

        <p>
          Even that list needs context. Not every fermented food contains living microorganisms when you
          eat it. More fiber is not automatically better for every digestive condition. “Probiotic” on a
          label does not prove a meaningful health benefit.
        </p>

        <section className="next-article">
          <p className="eyebrow light">Next in The Food We Eat</p>
          <h2>Part II: Building a Better Gut</h2>
          <p>
            Ten foods that may actually support digestive and microbial health—what they provide, what
            the research supports, where gut-health marketing gets ahead of science, and practical ways
            to put the evidence on the plate.
          </p>
          <p><strong>Coming next from Chef Gringo.</strong></p>
        </section>

        <section className="evidence-standard">
          <p className="eyebrow">Chef Gringo Evidence Standard</p>
          <h2>How we label health claims</h2>
          <dl>
            <div><dt>Strong</dt><dd>Consistent support from high-quality human research, major systematic reviews or established medical evidence.</dd></div>
            <div><dt>Moderate</dt><dd>Meaningful human evidence exists, but important questions about causality, magnitude or population differences remain.</dd></div>
            <div><dt>Emerging</dt><dd>Early human, observational, mechanistic, laboratory or animal evidence warrants attention but does not establish the claim.</dd></div>
            <div><dt>Not supported</dt><dd>The available evidence does not currently justify the stronger claim being made.</dd></div>
          </dl>
        </section>

        <p className="article-disclaimer">
          Chef Gringo provides educational information and does not diagnose or treat medical conditions.
          Persistent or concerning gastrointestinal symptoms in a child should be discussed with a
          qualified healthcare professional.
        </p>
      </div>
    </main>
  );
}
