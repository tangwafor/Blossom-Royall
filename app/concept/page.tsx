"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Banknote, Check, CircleDollarSign, Package, Pause, Play, Share2, ShoppingBag, Sparkles, Store, Truck, Users } from "lucide-react";
import BrandMark from "../brand-mark";

const scenes = [
  { key: "discover", label: "Discover", title: "Many remarkable brands. One beautiful destination.", copy: "Each vendor keeps a distinct identity while customers explore the whole marketplace as one calm, premium experience.", icon: Store },
  { key: "checkout", label: "One checkout", title: "The customer pays once.", copy: "Every scanned item resolves to its exact vendor, price, policy, inventory source, and commercial agreement before one shared payment is accepted.", icon: CircleDollarSign },
  { key: "inventory", label: "Smart stock", title: "Every item stays attributable.", copy: "Onsite, online only, vendor fulfilled, reserved, transferred, sold, returned, and damaged stock remain separate and visible in real time.", icon: Package },
  { key: "delivery", label: "Fulfillment", title: "One order, coordinated beautifully.", copy: "Pickup, local delivery, and shipping bring products from several vendors into one customer promise with custody tracked at every handoff.", icon: Truck },
  { key: "payout", label: "Vendor payout", title: "Every vendor knows what they earned.", copy: "Sales, fees, returns, reserves, and adjustments post to a transparent ledger before approved balances pay on the vendor's configured schedule.", icon: Banknote },
] as const;

export default function ConceptPage() {
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [monthlySales, setMonthlySales] = useState(6000);
  const [shareState, setShareState] = useState("Share with a vendor");
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setScene((current) => (current + 1) % scenes.length), 5000);
    return () => window.clearInterval(timer);
  }, [playing]);
  const active = scenes[scene];
  const projection = useMemo(() => ({ annual: monthlySales * 12, time: 96, visits: Math.max(18, Math.round(monthlySales / 170)) }), [monthlySales]);
  const share = async () => {
    const data = { title: "Blossom Royall vendor marketplace concept", text: "See how Blossom Royall gives independent brands a premium storefront, one shared checkout, online selling, coordinated delivery, and transparent payouts.", url: window.location.href };
    const canNativeShare = Reflect.has(navigator, "share") && typeof Reflect.get(navigator, "share") === "function";
    try {
      if (canNativeShare) await navigator.share(data);
      else await navigator.clipboard.writeText(`${data.text} ${data.url}`);
      setShareState(canNativeShare ? "Shared" : "Link copied");
    } catch { setShareState("Share canceled"); }
  };
  return <main className="concept-page">
    <header className="concept-nav"><Link href="/welcome" aria-label="Back to Blossom Royall"><ArrowLeft /></Link><span><BrandMark className="concept-logo" /><b>Blossom Royall</b><small>Interactive concept for Delly and our vendor community</small></span><button onClick={share}><Share2 />{shareState}</button></header>
    <section className="concept-hero">
      <div className="concept-copy"><span className="eyebrow">A MARKETPLACE THAT WORKS WHILE YOUR BRAND GROWS</span><h1>One destination.<br />Every brand in motion.</h1><p>Walk through the idea, touch every stage, and see how independent vendors can sell onsite and online without staffing an individual store every day.</p><div><button className="concept-primary" onClick={() => document.getElementById("walkthrough")?.scrollIntoView({ behavior: "smooth" })}>Experience the concept <ArrowRight /></button><button onClick={() => setPlaying((current) => !current)}>{playing ? <Pause /> : <Play />}{playing ? "Pause animation" : "Play animation"}</button></div></div>
      <div className={`concept-world scene-${active.key}`} aria-label={`Animated concept scene: ${active.label}`}>
        <div className="mall-floor" />
        <div className="mall-store store-one"><span>AF</span><b>Africstyle</b><i /></div>
        <div className="mall-store store-two"><span>JK</span><b>Jose Kako</b><i /></div>
        <div className="mall-store store-three"><span>SI</span><b>Sapologie</b><i /></div>
        <div className="mall-store store-four"><span>BR</span><b>Blossom</b><i /></div>
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
    <section className="benefit-switchboard"><div><span className="eyebrow">TOUCH THE BENEFITS</span><h2>What changes for everyone?</h2></div><div className="benefit-columns"><article><Store /><h3>For each vendor</h3><ul><li><Check />Premium physical presence without daily staffing</li><li><Check />Onsite and online inventory kept distinct</li><li><Check />Sales and payouts visible remotely</li><li><Check />Customer discovery beyond one booth</li><li><Check />Delivery, returns, and layaway coordinated</li></ul></article><article><ShoppingBag /><h3>For every customer</h3><ul><li><Check />Many brands through one checkout</li><li><Check />Occasion, fit, budget, and timing aware shopping</li><li><Check />One pickup or coordinated delivery</li><li><Check />Clear seller, provenance, and return details</li><li><Check />One place for orders and support</li></ul></article><article><Sparkles /><h3>For Blossom Royall</h3><ul><li><Check />One shared operating team</li><li><Check />Accurate vendor attribution</li><li><Check />Automatic inventory recommendations</li><li><Check />Auditable settlement and return reserves</li><li><Check />A stronger destination as vendors grow</li></ul></article></div></section>
    <section className="vendor-calculator"><div><span className="eyebrow">MAKE IT REAL</span><h2>Imagine your brand inside.</h2><p>Move the monthly sales estimate to see the opportunity. This is an illustration, not a revenue promise.</p><label>Estimated monthly marketplace sales<input aria-label="Estimated monthly marketplace sales" type="range" min="1000" max="20000" step="500" value={monthlySales} onChange={(event) => setMonthlySales(Number(event.target.value))} /><b>${monthlySales.toLocaleString()}</b></label></div><dl><div><dt>Illustrative annual sales</dt><dd>${projection.annual.toLocaleString()}</dd></div><div><dt>Vendor staffing time reduced</dt><dd>Up to {projection.time}%</dd></div><div><dt>Customer relationships created</dt><dd>About {projection.visits} monthly</dd></div><div><dt>Checkout, delivery, and payout systems</dt><dd>Shared</dd></div></dl></section>
    <section className="concept-invite"><BrandMark className="concept-seal" /><span className="eyebrow">DELLY, THIS IS THE STORY TO SHARE</span><h2>Your brand gets a beautiful home, an intelligent selling system, and a team behind it.</h2><p>Invite vendors to experience the concept, ask questions, and shape the founding marketplace together.</p><div><Link href="/partners" className="concept-primary">Introduce a brand <ArrowRight /></Link><button onClick={share}><Share2 />{shareState}</button></div></section>
    <footer className="concept-footer"><b>Powered by TA Tech</b><span>Is not where you have been but where you are going.</span></footer>
  </main>;
}
