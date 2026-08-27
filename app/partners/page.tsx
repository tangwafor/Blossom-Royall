"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BarChart3, Check, PackageCheck, ShieldCheck, Sparkles, Store, Users } from "lucide-react";
import BrandMark from "../brand-mark";

const benefits = [
  { icon: Store, title: "A premium home for your brand", copy: "A beautiful retail setting designed to let independent labels feel established, discoverable, and respected." },
  { icon: BarChart3, title: "Know what is working", copy: "See sales, inventory, customer demand, payouts, and opportunities without piecing together separate systems." },
  { icon: Users, title: "Meet the right customers", copy: "Fit aware discovery, occasion styling, appointments, and thoughtful stories help customers understand what makes your work special." },
  { icon: PackageCheck, title: "Operate with confidence", copy: "Checkout, layaway, pickup, returns, vendor attribution, and settlement stay connected from the first scan to the final payout." },
];

const steps = ["Share your brand story", "Review the right partnership", "Prepare products and policies", "Open beautifully"];

export default function PartnersPage() {
  const [sent, setSent] = useState(false);
  const submit = (formData: FormData) => {
    const interest = Object.fromEntries(formData.entries());
    const existing = JSON.parse(localStorage.getItem("br-partner-interest:blossom-royall") || "[]");
    localStorage.setItem("br-partner-interest:blossom-royall", JSON.stringify([...existing, { ...interest, receivedAt: new Date().toISOString() }]));
    setSent(true);
  };

  return (
    <main className="partner-page">
      <header className="partner-nav">
        <Link href="/welcome" className="partner-brand" aria-label="Back to Blossom Royall">
          <BrandMark className="partner-logo" />
          <span><b>Blossom Royall</b><small>Brand partnerships</small></span>
        </Link>
        <Link href="/welcome"><ArrowLeft /> Back</Link>
      </header>

      <section className="partner-hero">
        <div className="partner-hero-copy">
          <span className="eyebrow">FOR DESIGNERS, BOUTIQUES, AND BEAUTY BRANDS</span>
          <h1>Your next chapter deserves a remarkable stage.</h1>
          <p>Join a fashion destination where local excellence, African creativity, and modern retail intelligence come together under one roof.</p>
          <div className="partner-actions">
            <a href="#interest" className="partner-primary">Start a conversation <ArrowRight /></a>
            <a href="#partnership">Explore the partnership</a>
          </div>
          <div className="partner-trust"><ShieldCheck /><span><b>Your brand stays yours.</b> Clear attribution, role scoped access, and transparent records protect every partner.</span></div>
        </div>
        <div className="partner-hero-image"><span>THE MALL AT PRINCE GEORGE'S</span></div>
      </section>

      <section className="partner-intro" id="partnership">
        <span className="eyebrow">MORE THAN FLOOR SPACE</span>
        <h2>A retail partnership built to help good brands grow.</h2>
        <p>Blossom Royall connects presentation, commerce, customer care, and business insight while keeping each store's identity unmistakably its own.</p>
      </section>

      <section className="partner-benefits">
        {benefits.map(({ icon: Icon, title, copy }) => <article key={title}><Icon /><h3>{title}</h3><p>{copy}</p></article>)}
      </section>

      <section className="partner-promise">
        <div>
          <span className="eyebrow">THE BLOSSOM STANDARD</span>
          <h2>Luxury in presentation. Clarity in business.</h2>
          <p>Choose the arrangement that fits your business. Commercial terms, inventory ownership, fulfillment, returns, layaway, promotions, and payouts are documented before launch and managed consistently afterward.</p>
        </div>
        <ul>
          {["A storefront shaped around your brand", "Editable policies and commercial terms", "Item level sales and inventory attribution", "Transparent statements and audit history", "Styling, appointment, and event opportunities", "Customer experiences that work on mobile"].map(item => <li key={item}><Check />{item}</li>)}
        </ul>
      </section>

      <section className="partner-steps">
        <span className="eyebrow">A CALM PATH TO OPENING</span>
        <h2>From introduction to opening day.</h2>
        <ol>{steps.map((step, index) => <li key={step}><i>{index + 1}</i><span><b>{step}</b><small>{index === 0 ? "Tell us what you make, who it serves, and where you want to grow." : index === 1 ? "We align on space, services, economics, and responsibilities." : index === 2 ? "Together we load inventory, confirm fit, pricing, and customer promises." : "Your team receives support, your collection goes live, and performance becomes visible."}</small></span></li>)}</ol>
      </section>

      <section className="partner-interest" id="interest">
        <div>
          <Sparkles />
          <span className="eyebrow">BECOME A FOUNDING PARTNER</span>
          <h2>Let us discover what makes your brand unforgettable.</h2>
          <p>This is an introduction, not a commitment. We will review your brand and follow up with the most suitable next step.</p>
        </div>
        {sent ? <div className="partner-success" role="status"><i><Check /></i><h3>Your introduction is with us.</h3><p>Thank you. The Blossom Royall partnerships team will review your brand and continue the conversation using the contact details you provided.</p><Link href="/welcome">Return to Blossom Royall</Link></div> :
        <form action={submit}>
          <label>Brand name<input name="brandName" required autoComplete="organization" /></label>
          <label>Your name<input name="contactName" required autoComplete="name" /></label>
          <label>Email<input name="email" required type="email" autoComplete="email" /></label>
          <label>Phone<input name="phone" type="tel" autoComplete="tel" /></label>
          <label>What do you offer?<select name="category" required defaultValue=""><option value="" disabled>Choose a category</option><option>Women's fashion</option><option>Men's fashion</option><option>African fashion and textiles</option><option>Shoes and accessories</option><option>Jewelry</option><option>Beauty and wellness</option><option>Home and lifestyle</option><option>Services</option><option>Other</option></select></label>
          <label>Website or social page<input name="website" type="url" placeholder="https://" /></label>
          <label className="partner-wide">Tell us about your brand<textarea name="story" required rows={4} placeholder="Your story, customer, products, and what growth would mean for you" /></label>
          <label className="partner-consent partner-wide"><input type="checkbox" name="permission" required />I agree that Blossom Royall may contact me about this partnership inquiry.</label>
          <button className="partner-primary partner-wide" type="submit">Introduce my brand <ArrowRight /></button>
        </form>}
      </section>

      <footer className="partner-footer"><BrandMark className="partner-logo" /><span><b>Powered by TA Tech</b><small>Is not where you have been but where you are going.</small></span></footer>
    </main>
  );
}
