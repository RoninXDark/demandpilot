import {
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  DatabaseZap,
  Gauge,
  Menu,
  PackageCheck,
  Sparkles,
} from "lucide-react";

type LandingPageProps = {
  onOpenDemo: () => void;
};

export function LandingPage({ onOpenDemo }: LandingPageProps) {
  return (
    <div className="landing-shell">
      <header className="landing-header">
        <a className="brand-lockup" href="#top" aria-label="DemandPilot home">
          <span className="brand-mark">
            <Gauge size={19} strokeWidth={2.4} />
          </span>
          <span>DemandPilot</span>
        </a>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#product">Product</a>
          <a href="#workflow">Workflow</a>
          <a href="#technology">Technology</a>
        </nav>
        <div className="landing-actions">
          <button className="button-quiet" onClick={onOpenDemo}>
            Log in
          </button>
          <button className="button-solid compact" onClick={onOpenDemo}>
            Open demo
            <ArrowRight size={16} />
          </button>
        </div>
        <button className="mobile-menu" aria-label="Open navigation">
          <Menu size={21} />
        </button>
      </header>

      <main>
        <section className="landing-hero" id="top">
          <div className="hero-media" aria-hidden="true" />
          <div className="hero-scrim" aria-hidden="true" />
          <div className="hero-copy">
            <div className="hero-kicker">
              <Sparkles size={15} />
              AI inventory decision platform
            </div>
            <h1>DemandPilot</h1>
            <p className="hero-headline">
              Turn sales data into inventory decisions.
            </p>
            <p className="hero-summary">
              Forecast demand, expose stock risk, and move every replenishment
              decision into one focused operational queue.
            </p>
            <div className="hero-actions">
              <button className="button-solid" onClick={onOpenDemo}>
                Open live demo
                <ArrowRight size={18} />
              </button>
              <a className="button-outline" href="#workflow">
                See how it works
              </a>
            </div>
            <div className="hero-proof">
              <span>
                <Check size={15} /> No setup required
              </span>
              <span>
                <Check size={15} /> Portfolio demo data
              </span>
            </div>
          </div>
          <div className="hero-status" aria-label="Platform capability summary">
            <span>Forecast engine</span>
            <strong>94% confidence</strong>
            <i />
            <span>Action queue</span>
            <strong>6 decisions ready</strong>
          </div>
        </section>

        <section className="landing-band" id="product">
          <div className="section-heading">
            <span>One operating view</span>
            <h2>From demand signal to a decision your team can execute.</h2>
            <p>
              DemandPilot combines forecasting, inventory health, and
              recommendation logic without burying planners in another report.
            </p>
          </div>
          <div className="capability-grid">
            <article>
              <span className="capability-icon">
                <DatabaseZap size={20} />
              </span>
              <h3>Connect the history</h3>
              <p>
                Import CSV or Excel sales data with automated validation and a
                transparent data-quality report.
              </p>
            </article>
            <article>
              <span className="capability-icon">
                <BarChart3 size={20} />
              </span>
              <h3>Model the demand</h3>
              <p>
                Compare baseline demand with price, promotion, and supplier
                lead-time scenarios in seconds.
              </p>
            </article>
            <article>
              <span className="capability-icon">
                <PackageCheck size={20} />
              </span>
              <h3>Act with confidence</h3>
              <p>
                Prioritize stockouts, planned reorders, and excess inventory in
                one decision-ready action queue.
              </p>
            </article>
          </div>
        </section>

        <section className="workflow-band" id="workflow">
          <div className="workflow-visual">
            <div className="mini-sidebar">
              <span className="brand-mark small">
                <Gauge size={14} />
              </span>
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="mini-workspace">
              <div className="mini-title">
                <span>Inventory Control Tower</span>
                <b>Live</b>
              </div>
              <div className="mini-grid">
                <div className="mini-queue">
                  <strong>Action Queue</strong>
                  <span className="mini-action critical" />
                  <span className="mini-action warning" />
                  <span className="mini-action calm" />
                </div>
                <div className="mini-chart">
                  <strong>Scenario Forecast</strong>
                  <svg viewBox="0 0 420 160" role="img" aria-label="Demand forecast">
                    <path
                      d="M5 118 C45 94 65 121 105 90 S165 110 205 70 S270 92 315 46 S370 72 415 28"
                      fill="none"
                      stroke="#20b9a4"
                      strokeWidth="5"
                    />
                    <path
                      d="M5 129 C50 112 78 130 120 106 S180 121 220 88 S285 109 330 71 S380 92 415 60"
                      fill="none"
                      stroke="#e5a93b"
                      strokeDasharray="8 8"
                      strokeWidth="3"
                    />
                  </svg>
                  <div className="mini-insight">
                    <Sparkles size={13} /> AI insight: reorder window moved
                    forward by 4 days.
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="workflow-copy">
            <span className="eyebrow">Built for daily planning</span>
            <h2>Problems first. Forecasts in context.</h2>
            <p>
              The Inventory Control Tower starts with the actions that protect
              service level and working capital. Every recommendation opens the
              exact demand view behind it.
            </p>
            <ul>
              <li>
                <Boxes size={18} /> Critical stockout risks stay at the top.
              </li>
              <li>
                <BarChart3 size={18} /> Scenario controls update the forecast
                curve.
              </li>
              <li>
                <PackageCheck size={18} /> Reorders become exportable Draft POs.
              </li>
            </ul>
            <button className="button-solid dark" onClick={onOpenDemo}>
              Explore the Control Tower
              <ArrowRight size={18} />
            </button>
          </div>
        </section>

        <section className="technology-band" id="technology">
          <div>
            <span className="eyebrow">Transparent intelligence</span>
            <h2>AI signals without the chatbot theatre.</h2>
          </div>
          <p>
            Recommendations show confidence, rationale, timing, and expected
            impact. Planners keep control while the model handles repetitive
            analysis.
          </p>
          <button className="button-outline dark-outline" onClick={onOpenDemo}>
            View recommendations
            <ArrowRight size={17} />
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <a className="brand-lockup" href="#top">
          <span className="brand-mark">
            <Gauge size={18} />
          </span>
          <span>DemandPilot</span>
        </a>
        <p>Decision intelligence for modern inventory teams.</p>
        <span>Portfolio product - 2026</span>
      </footer>
    </div>
  );
}
