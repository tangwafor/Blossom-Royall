import { ArrowRight, Building2, CalendarDays, CircleCheck, Clock3, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";
import BrandMark from "../brand-mark";

export default function WelcomePage() {
  return (
    <main className="welcome-page">
      <header className="welcome-nav">
        <Link
          className="welcome-brand"
          href="/welcome"
          aria-label="Blossom Royall home"
        >
          <BrandMark className="welcome-logo-mark" />
          <b>Blossom Royall</b>
        </Link>
        <nav aria-label="Welcome navigation">
          <a href="#opening">Grand opening</a>
          <a href="#experience">The experience</a>
          <a href="#intelligence">Intelligence</a>
          <Link href="/partners">Bring your brand</Link>
          <Link href="/concept">See the concept</Link>
          <Link href="/auth">Sign in</Link>
        </nav>
      </header>

      <section className="welcome-hero">
        <div className="welcome-glow" />
        <div className="welcome-copy">
          <span className="eyebrow">GRAND OPENING · SEPTEMBER 1</span>
          <h1>A world of style, in one store.</h1>
          <p>
            Discover women’s and men’s fashion, African designers, shoes,
            jewelry, beauty, and remarkable local brands under one roof.
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
          <img src="/editorial/african-designers-edit.png" alt="" />
        </div>
      </section>

      <section className="opening-card" id="opening">
        <div><span className="eyebrow">YOU ARE INVITED</span><h2>Meet us at The Mall at Prince George’s Plaza.</h2><p>Come celebrate the opening of Blossom Royall and experience fashion, culture, and local creativity together.</p></div>
        <dl>
          <div><CalendarDays /><dt>Opening day</dt><dd>September 1</dd></div>
          <div><MapPin /><dt>Find the store</dt><dd>3500 East West Highway, Hyattsville, MD 20782</dd></div>
          <div><Building2 /><dt>Inside the mall</dt><dd>Directly opposite Victoria’s Secret</dd></div>
          <div><Clock3 /><dt>Store hours</dt><dd>Monday through Saturday, 11 AM to 8 PM. Sunday, noon to 6 PM.</dd></div>
        </dl>
      </section>

      <section className="welcome-proof" id="experience">
        <article>
          <Building2 />
          <h2>Local brands, beautifully presented</h2>
          <p>
            Africstyle Fashion and other remarkable local brands receive a
            premium stage alongside every collection.
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
