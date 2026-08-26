import { ArrowRight, Building2, CircleCheck, Sparkles } from "lucide-react";
import Link from "next/link";

export default function WelcomePage() {
  return (
    <main className="welcome-page">
      <header className="welcome-nav">
        <Link
          className="welcome-brand"
          href="/welcome"
          aria-label="Blossom Royall home"
        >
          <span>BR</span>
          <b>Blossom Royall</b>
        </Link>
        <nav aria-label="Welcome navigation">
          <a href="#experience">The experience</a>
          <a href="#intelligence">Intelligence</a>
          <Link href="/auth">Sign in</Link>
        </nav>
      </header>

      <section className="welcome-hero">
        <div className="welcome-glow" />
        <div className="welcome-copy">
          <span className="eyebrow">A NEW KIND OF FASHION DESTINATION</span>
          <h1>Step into the future of beautiful retail.</h1>
          <p>
            Blossom Royall brings the grace of a luxury mall together with the
            intelligence of a world class commerce platform.
          </p>
          <div className="welcome-actions">
            <Link className="welcome-primary" href="/auth">
              Enter Blossom Royall <ArrowRight />
            </Link>
            <a className="welcome-secondary" href="#experience">
              Discover the experience
            </a>
          </div>
          <small>
            Powered by TA Tech · Is not where you have been but where you are
            going.
          </small>
        </div>
        <div className="welcome-mark" aria-hidden="true">
          <img src="/og.png" alt="" />
        </div>
      </section>

      <section className="welcome-proof" id="experience">
        <article>
          <Building2 />
          <h2>One elegant destination</h2>
          <p>
            Shopping, vendors, service, fulfillment, and mall operations in a
            single calm experience.
          </p>
        </article>
        <article>
          <Sparkles />
          <h2>Personal in every detail</h2>
          <p>
            Customers discover pieces with clear reasons, fit awareness, and
            full control over their preferences.
          </p>
        </article>
        <article>
          <CircleCheck />
          <h2>Built for confidence</h2>
          <p>
            Teams see the next right action, owners see every brand signal, and
            every decision stays accountable.
          </p>
        </article>
      </section>

      <section className="welcome-intelligence" id="intelligence">
        <div>
          <span className="eyebrow">BLOSSOM INTELLIGENCE</span>
          <h2>Luxury is knowing what matters before anyone has to ask.</h2>
        </div>
        <p>
          From favorite brands and preferred sizes to emerging demand and
          inventory risk, every signal becomes a helpful next step. It is
          explainable, privacy aware, and designed for a better human
          experience.
        </p>
        <Link href="/" className="welcome-link">
          Explore the operating system <ArrowRight />
        </Link>
      </section>
    </main>
  );
}
