"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Copy, LockKeyhole, Share2, Sparkles, Store, Users } from "lucide-react";
import BrandMark from "../brand-mark";

type Path = "owner" | "vendor" | "prospect";
type Answers = Record<string, string>;

const paths = [
  { id: "owner" as const, icon: Store, title: "I own Blossom Royall", copy: "Map what already exists and prepare the mall for opening." },
  { id: "vendor" as const, icon: Users, title: "I am a participating vendor", copy: "Prepare your brand, products, inventory, and customer promises." },
  { id: "prospect" as const, icon: Sparkles, title: "I am considering joining", copy: "Introduce your brand and explore the right partnership." },
];

const ownerFields = [
  ["ownerName", "Owner name", "text"], ["ownerEmail", "Owner email", "email"], ["legalName", "Legal business name", "text"], ["storeAddress", "Store address", "text"],
  ["confirmedVendors", "Confirmed vendors and contact people", "textarea"], ["existingSystems", "Systems, spreadsheets, websites, or marketplaces already in use", "textarea"],
  ["equipment", "Card readers, printers, scanners, tablets, and computers already available", "textarea"], ["payments", "Current payment provider and how vendors are paid today", "textarea"],
  ["inventory", "Inventory already onsite and how it is currently tracked", "textarea"], ["policies", "Existing return, final sale, layaway, lease, and commission policies", "textarea"],
  ["operations", "Staffing, cashier, fulfillment, delivery, and operating hours", "textarea"], ["priority", "What must work first and what concerns you most", "textarea"],
];

const vendorFields = [
  ["brandName", "Public brand name", "text"], ["contactName", "Owner or contact name", "text"], ["email", "Contact email", "email"], ["phone", "Contact phone", "tel"],
  ["category", "What do you sell or provide?", "text"], ["website", "Website or social page", "url"], ["story", "Your brand story and ideal customer", "textarea"],
  ["catalog", "Catalogs, product photographs, spreadsheets, SKUs, or barcodes already available", "textarea"], ["inventory", "What will be onsite, online only, preorder, or vendor fulfilled?", "textarea"],
  ["services", "Tailoring, customization, appointments, delivery, or other services", "textarea"], ["policies", "Return exceptions, final sale items, and fulfillment timing", "textarea"],
  ["goals", "What would make this partnership valuable for your business?", "textarea"],
];

export default function ReadinessPage() {
  const [path, setPath] = useState<Path | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState("");
  const fields = path === "owner" ? ownerFields : vendorFields;
  const storageKey = path ? `br-readiness:${path}` : "";
  useEffect(() => {
    if (!storageKey) return;
    const saved = localStorage.getItem(storageKey);
    setAnswers(saved ? JSON.parse(saved) : {});
    setSubmitted(false);
  }, [storageKey]);
  const completed = useMemo(() => fields.filter(([id]) => answers[id]?.trim()).length, [answers, fields]);
  const progress = fields.length ? Math.round(completed / fields.length * 100) : 0;
  const update = (id: string, value: string) => {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
    setNotice("Progress saved on this device");
  };
  const share = async () => {
    const data = { title: "Blossom Royall Readiness Experience", text: "See the Blossom Royall vision and prepare your brand for the marketplace.", url: window.location.href };
    if (navigator.share) await navigator.share(data);
    else { await navigator.clipboard.writeText(window.location.href); setNotice("Share link copied"); }
  };
  return <main className="readiness-page">
    <header className="readiness-nav"><Link href="/welcome"><ArrowLeft />Back</Link><span><BrandMark /><b>Blossom Royall</b><small>Readiness experience</small></span><button onClick={share}><Share2 />Share</button></header>
    {!path && <section className="readiness-vision"><div className="readiness-copy"><span className="eyebrow">ONE DESTINATION · MANY REMARKABLE BRANDS</span><h1>Let every brand shine. Let the mall work as one.</h1><p>Customers discover independent fashion, shop onsite or online, pay once, and receive coordinated pickup, delivery, returns, and care. Every item stays connected to its vendor, inventory, policies, earnings, and story.</p><div><span><Check />Shared cashier</span><span><Check />Online and onsite</span><span><Check />Clear vendor earnings</span></div></div><aside className="readiness-entry"><header><BrandMark /><span><small>START HERE</small><b>Tell us who you are.</b></span></header><div>{paths.map(({ id, icon: Icon, title, copy }) => <button key={id} onClick={() => setPath(id)}><Icon /><span><b>{title}</b><small>{copy}</small></span><ArrowRight /></button>)}</div><p><LockKeyhole />Private, role specific, and saved as you type.</p></aside></section>}
    {!path ? <section className="readiness-proof"><article><b>One customer experience</b><p>Every seller remains clear while checkout, delivery, returns, and support feel beautifully coordinated.</p></article><article><b>Less repeated work</b><p>We start with what Blossom Royall and each vendor already own, use, and understand.</p></article><article><b>Built around each brand</b><p>Identity, products, policies, inventory, and earnings stay connected without becoming invisible.</p></article></section> : <section className="readiness-form"><header><button onClick={() => setPath(null)}><ArrowLeft />Choose another role</button><span className="eyebrow">{path === "owner" ? "OWNER READINESS" : path === "vendor" ? "VENDOR READINESS" : "PARTNERSHIP INTRODUCTION"}</span><h2>{path === "owner" ? "Show us what Blossom Royall already has." : "Help us present your brand beautifully."}</h2><p>{path === "owner" ? "We will reuse existing vendors, systems, equipment, policies, and information wherever practical." : "Your answers help prepare the right storefront, inventory setup, customer promises, and partnership conversation."}</p><div className="readiness-progress"><i style={{ width: `${progress}%` }} /><span>{progress}% complete · {notice || "Answers save as you type"}</span></div></header>{submitted ? <div className="readiness-complete"><Check /><h3>Your readiness profile is complete.</h3><p>Your answers remain saved on this device. Secure central delivery will activate when the protected intake service is connected.</p><button onClick={share}><Copy />Share this experience</button></div> : <form onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>{fields.map(([id, label, type]) => <label key={id}>{label}{type === "textarea" ? <textarea rows={4} value={answers[id] || ""} onChange={(event) => update(id, event.target.value)} /> : <input type={type} value={answers[id] || ""} onChange={(event) => update(id, event.target.value)} />}</label>)}<label className="readiness-consent"><input type="checkbox" required />I confirm that I am authorized to provide this business information to Blossom Royall.</label><button className="primary" type="submit">Complete readiness profile<ArrowRight /></button></form>}</section>}
    <footer className="readiness-footer"><BrandMark /><span><b>Powered by TA Tech</b><small>Is not where you have been but where you are going.</small></span></footer>
  </main>;
}
