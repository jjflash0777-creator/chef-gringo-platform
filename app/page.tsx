import Link from "next/link";
import { NewsletterForm } from "./components/NewsletterForm";

const caregiverCategories = [
  "Easy to chew",
  "Lower sodium",
  "Higher protein",
  "Small appetite",
  "Soft foods",
  "Favorite-food makeovers",
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="eyebrow">Comfort food, thoughtfully adapted</p>
            <h1>Keep the food they love. Make it work for the life they’re living.</h1>
            <p className="lede">
              Practical recipes, favorite-food makeovers, senior nutrition ideas,
              texture-modified meals, and professional culinary tools—created from
              real senior-living foodservice experience.
            </p>
            <div className="button-row">
              <Link className="button" href="/favorite-food-makeovers" data-event="hero_makeover_click">
                Transform a Favorite Food
              </Link>
              <Link className="button secondary" href="/culinary-director-tools" data-event="hero_tools_click">
                Explore Culinary Director Tools
              </Link>
            </div>
          </div>
          <div className="hero-plate" aria-label="A familiar burger, thoughtfully remade">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="burger">
              <span className="bun top" />
              <span className="greens" />
              <span className="patty" />
              <span className="tomato" />
              <span className="bun bottom" />
            </div>
            <p><strong>Familiar first.</strong><br />Practical changes second.</p>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading">
          <p className="eyebrow">Two kitchens, one practical approach</p>
          <h2>Where should we start?</h2>
        </div>
        <div className="path-grid">
          <Link className="path-card family" href="/senior-caregiver-kitchen">
            <span className="card-number">01</span>
            <h3>Cooking for Someone You Love</h3>
            <p>Ideas that respect preferences, routines, chewing needs, and the power of a familiar plate.</p>
            <span className="text-link">Enter the caregiver kitchen →</span>
          </Link>
          <Link className="path-card pro" href="/culinary-director-tools">
            <span className="card-number">02</span>
            <h3>Running a Professional Kitchen</h3>
            <p>Production tools, operational resources, and no-nonsense support for senior-living foodservice.</p>
            <span className="text-link">See culinary director tools →</span>
          </Link>
        </div>
      </section>

      <section className="section feature-band">
        <div className="container split">
          <div>
            <p className="eyebrow light">Featured makeover</p>
            <h2>Big Mac–style, with a more heart-conscious game plan.</h2>
            <p>
              The point is not to turn a beloved burger into a sad pile of sprouts.
              It is to preserve the familiar flavor and fun while reducing ingredients
              commonly high in sodium and saturated fat.
            </p>
            <Link className="button light-button" href="/favorite-food-makeovers/big-mac-style-burger">
              Make the burger
            </Link>
          </div>
          <blockquote>“If it doesn’t feel like the food they asked for, we haven’t finished the job.”</blockquote>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading">
          <p className="eyebrow">Built for service</p>
          <h2>Useful tools. No clipboard required.</h2>
        </div>
        <div className="tool-grid">
          <Link className="tool-card active-tool" href="/tools/recipe-scaler">
            <span className="status active">Ready now</span>
            <h3>Recipe scaler</h3>
            <p>Scale ingredient quantities to the covers you actually need.</p>
          </Link>
          {["Portion-cost calculator", "Cleaning schedule builder", "Production sheet generator"].map((tool) => (
            <div className="tool-card" key={tool}>
              <span className="status">Coming next</span>
              <h3>{tool}</h3>
              <p>In the prep queue—clearly labeled, not pretending to work.</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section soft-section">
        <div className="container">
          <div className="section-heading">
            <p className="eyebrow">Find a practical starting point</p>
            <h2>Cooking needs change. Enjoyment still matters.</h2>
          </div>
          <div className="pill-grid">
            {caregiverCategories.map((category) => (
              <Link href="/senior-caregiver-kitchen" key={category}>{category}<span>→</span></Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section container credibility">
        <div>
          <p className="eyebrow">Experience behind the apron</p>
          <h2>Made with real foodservice perspective.</h2>
        </div>
        <p>
          Chef Gringo is informed by hands-on senior-living culinary leadership and
          the daily realities of foodservice operations: resident preferences,
          staffing, production, budgets, and the simple truth that people want food
          they recognize and enjoy.
        </p>
      </section>

      <section className="section">
        <div className="container signup-panel">
          <div>
            <p className="eyebrow light">Free kitchen guide</p>
            <h2>10 Favorite Comfort Foods Made Easier to Fit</h2>
            <p>Practical adaptations and a little breathing room for the person doing the cooking.</p>
          </div>
          <NewsletterForm source="homepage" buttonLabel="Send me the guide" />
        </div>
      </section>
    </>
  );
}
