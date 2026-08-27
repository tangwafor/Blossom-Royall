"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Banknote, Check, CircleDollarSign, LockKeyhole, Package, Pause, Play, ShoppingBag, Sparkles, Store, Truck, Users } from "lucide-react";
import BrandMark from "../brand-mark";

const scenes = [
  { key: "discover", label: "Discover", title: "Many remarkable brands. One beautiful destination.", copy: "Each vendor keeps a distinct identity while customers explore the whole marketplace as one calm, premium experience.", icon: Store },
  { key: "checkout", label: "One checkout", title: "The customer pays once.", copy: "Products from different brands come together in one welcoming checkout while every vendor receives clear sales attribution.", icon: CircleDollarSign },
  { key: "inventory", label: "Smart stock", title: "Know what is selling, wherever you are.", copy: "Vendors can follow product availability and customer demand without being physically present every day.", icon: Package },
  { key: "delivery", label: "Fulfillment", title: "One order, coordinated beautifully.", copy: "Pickup, local delivery, and shipping give customers flexible ways to receive purchases from participating brands.", icon: Truck },
  { key: "payout", label: "Vendor payout", title: "Every vendor sees what they earned.", copy: "A clear vendor view brings sales activity and scheduled payments together in one dependable experience.", icon: Banknote },
] as const;

const engineeringFlows = [
  {
    number: "01",
    title: "One payment, exact ownership",
    invariant: "No payment is accepted until every line has one tenant, vendor, variant, inventory source, tax treatment, policy version, fulfillment owner, and commercial agreement.",
    sequence: "Resolve barcode, reserve stock, snapshot terms, authorize payment, post sale and ledgers atomically, issue one seller attributed receipt.",
    recovery: "One idempotency key prevents a retry from selling the item twice or crediting a vendor twice.",
  },
  {
    number: "02",
    title: "Inventory is a movement ledger",
    invariant: "Stock quantities are derived from immutable movements, never silently overwritten. Physical location and channel availability remain separate.",
    sequence: "Expected, received, available, reserved, sold, return expected, quarantined, damaged, in transit, and returned to vendor.",
    recovery: "Expired reservations release stock. Returns remain quarantined until inspection. Rebalancing begins as a human approved proposal.",
  },
  {
    number: "03",
    title: "One order, coordinated custody",
    invariant: "A multi vendor order may become one customer promise, but every product retains seller attribution and an auditable custody trail.",
    sequence: "Reserve, pick, scan into consolidation tote, inspect, pack, hand off, track, confirm pickup or delivery.",
    recovery: "Delay rules can hold, split, revise, substitute with consent, or cancel only the affected line without losing attribution.",
  },
  {
    number: "04",
    title: "Vendor balances are explainable",
    invariant: "The vendor ledger is append only. Corrections use compensating entries, and a payout batch must balance before release.",
    sequence: "Post sale credit, agreed fees, return effects, reserves, adjustments, payout, and any payout reversal as separate entries.",
    recovery: "Failed payouts, disputes, negative balances, refunds, and webhook retries enter accountable exception queues.",
  },
] as const;

export default function ConceptPage() {
  const [ready, setReady] = useState(false);
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    setReady(true);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setScene((current) => (current + 1) % scenes.length), 5000);
    return () => window.clearInterval(timer);
  }, [playing]);
  const active = scenes[scene];
  return <main className="concept-page" data-concept-ready={ready ? "true" : "false"}>
    <aside className="concept-confidential" aria-label="Internal document notice">Confidential internal strategy. Do not distribute outside Blossom Royall.</aside>
    <header className="concept-nav"><Link href="/welcome" aria-label="Back to Blossom Royall"><ArrowLeft /></Link><span><BrandMark className="concept-logo" /><b>Blossom Royall</b><small>Internal marketplace operating concept</small></span><span className="concept-internal"><LockKeyhole /> Internal only</span></header>
    <section className="concept-hero">
      <div className="concept-copy"><span className="eyebrow">A MARKETPLACE THAT WORKS WHILE YOUR BRAND GROWS</span><h1>One destination.<br />Every brand in motion.</h1><p>Walk through the idea, touch every stage, and see how independent vendors can sell onsite and online without staffing an individual store every day.</p><div><button className="concept-primary" onClick={() => document.getElementById("walkthrough")?.scrollIntoView({ behavior: "smooth" })}>Experience the concept <ArrowRight /></button><button onClick={() => setPlaying((current) => !current)}>{playing ? <Pause /> : <Play />}{playing ? "Pause animation" : "Play animation"}</button></div></div>
      <div className={`concept-world scene-${active.key}`} aria-label={`Animated concept scene: ${active.label}`}>
        <div className="mall-floor" />
        <div className="mall-store store-one"><span className="vendor-logo"><Image src="/vendor-logos/africstyle-fashion.png" alt="Africstyle Fashion" width={70} height={70} unoptimized /></span><b>Africstyle Fashion</b><i /></div>
        <div className="mall-store store-two"><span>JK</span><b>Jose Kako</b><small>Official logo pending</small><i /></div>
        <div className="mall-store store-three"><span className="vendor-logo"><Image src="/vendor-logos/sapologie-italiano.png" alt="Sapologie Italiano Fashion Factory" width={70} height={70} unoptimized /></span><b>Sapologie Italiano</b><i /></div>
        <div className="mall-store store-four"><span className="vendor-logo"><BrandMark /></span><b>Blossom Collections</b><small>House label status pending</small><i /></div>
        <div className="shared-register"><CircleDollarSign /><b>ONE CHECKOUT</b></div>
        <div className="moving-product product-one"><ShoppingBag /></div><div className="moving-product product-two"><Package /></div><div className="moving-product product-three"><ShoppingBag /></div>
        <div className="delivery-van"><Truck /><span>ONE ORDER</span></div>
        <div className="money-stream"><i>$</i><i>$</i><i>$</i><i>$</i></div>
        <div className="customer"><Users /></div>
      </div>
    </section>
    <section className="concept-walkthrough" id="walkthrough">
      <nav aria-label="Concept stages">{scenes.map((item, index) => <button key={item.key} className={scene === index ? "active" : ""} onClick={() => { setScene(index); setPlaying(false); }}><i>{index + 1}</i>{item.label}</button>)}</nav>
      <div className="concept-stage-copy"><active.icon /><span><small>STEP {scene + 1} OF {scenes.length}</small><h2>{active.title}</h2><p>{active.copy}</p></span></div>
      <button className="stage-next" onClick={() => setScene((scene + 1) % scenes.length)}>Next idea <ArrowRight /></button>
    </section>
    <section className="benefit-switchboard"><div><span className="eyebrow">TOUCH THE BENEFITS</span><h2>What changes for everyone?</h2></div><div className="benefit-columns"><article><Store /><h3>For each vendor</h3><ul><li><Check />Premium physical presence without daily staffing</li><li><Check />Onsite and online selling connected</li><li><Check />Sales and payments visible remotely</li><li><Check />Customer discovery beyond one booth</li><li><Check />Delivery, returns, and layaway supported</li></ul></article><article><ShoppingBag /><h3>For every customer</h3><ul><li><Check />Many brands through one checkout</li><li><Check />Occasion, fit, budget, and timing aware shopping</li><li><Check />One pickup or coordinated delivery</li><li><Check />Clear seller and return details</li><li><Check />One place for orders and support</li></ul></article><article><Sparkles /><h3>For Blossom Royall</h3><ul><li><Check />One shared operating team</li><li><Check />Every vendor receives clear sales visibility</li><li><Check />Helpful product and demand insights</li><li><Check />A dependable vendor payment experience</li><li><Check />A stronger destination as vendors grow</li></ul></article></div></section>
    <section className="concept-engineering" aria-labelledby="engineering-model">
      <div className="concept-engineering-intro"><span className="eyebrow">ENGINEERING SOURCE OF TRUTH</span><h2 id="engineering-model">How the promise stays correct.</h2><p>These invariants cross the storefront, shared cashier, online shop, vendor portal, fulfillment desk, and financial ledger. A feature is incomplete if it bypasses them.</p></div>
      <div className="engineering-flows">{engineeringFlows.map((flow) => <article key={flow.number}><span>{flow.number}</span><h3>{flow.title}</h3><dl><div><dt>Invariant</dt><dd>{flow.invariant}</dd></div><div><dt>Happy path</dt><dd>{flow.sequence}</dd></div><div><dt>Failure path</dt><dd>{flow.recovery}</dd></div></dl></article>)}</div>
      <div className="engineering-boundary"><LockKeyhole /><span><b>Tenant boundary</b><small>Every business record carries tenant ownership. Database row level security and endpoint authorization enforce access. UI visibility is never treated as security.</small></span><span><b>Release boundary</b><small>Real payouts remain blocked until concurrency, authorization, balancing, webhook retry, refund, dispute, and tenant isolation tests pass.</small></span></div>
    </section>
    <section className="vendor-calculator vendor-promise"><div><span className="eyebrow">IMAGINE YOUR BRAND INSIDE</span><h2>More ways to be discovered. Less to manage alone.</h2><p>Each founding vendor helps shape a premium destination built around independent fashion, culture, and customer care.</p></div><dl><div><dt>Your brand</dt><dd>Distinct and celebrated</dd></div><div><dt>Your physical presence</dt><dd>Supported by a shared team</dd></div><div><dt>Your online reach</dt><dd>Connected to the marketplace</dd></div><div><dt>Your sales experience</dt><dd>Clear and accessible</dd></div></dl></section>
    <section className="concept-invite"><BrandMark className="concept-seal" /><span className="eyebrow">INTERNAL MARKETPLACE VISION</span><h2>A beautiful home, an intelligent selling system, and one team behind every brand.</h2><p>Use this internal concept to align the team before approving a separate vendor presentation.</p><div><Link href="/partners" className="concept-primary">Review vendor inquiries <ArrowRight /></Link></div></section>
    <footer className="concept-footer"><b>Powered by TA Tech</b><span>Is not where you have been but where you are going.</span><span>Confidential internal strategy. Copyright 2026 Blossom Royall.</span></footer>
  </main>;
}
