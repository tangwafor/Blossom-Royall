"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Copy, ExternalLink, LockKeyhole, MapPin, Moon, Play, Plus, Share2, Sparkles, Store, Sun, Trash2, Users, X } from "lucide-react";
import BrandMark from "../brand-mark";
import { createClient } from "../../lib/supabase/client";

type Path = "owner" | "vendor" | "prospect";
type Answers = Record<string, string>;

const paths = [
  { id: "owner" as const, icon: Store, title: "I own Blossom Royall", copy: "Map what already exists and prepare the mall for opening." },
  { id: "vendor" as const, icon: Users, title: "I am a participating vendor", copy: "Prepare your brand, products, inventory, and customer promises." },
  { id: "prospect" as const, icon: Sparkles, title: "I am considering joining", copy: "Introduce your brand and explore the right partnership." },
];

const ownerFields = [
  ["ownerName", "Owner name", "text"], ["ownerEmail", "Owner email", "email"], ["legalName", "Legal business name", "text"], ["storeAddress", "Store address", "address"],
  ["confirmedVendors", "Confirmed vendors", "vendors"], ["existingSystems", "Systems, spreadsheets, websites, or marketplaces already in use", "textarea"],
  ["equipment", "Card readers, printers, scanners, tablets, and computers already available", "textarea"], ["payments", "Current payment provider and how vendors are paid today", "textarea"],
  ["inventory", "Inventory already onsite and how it is currently tracked", "textarea"], ["policies", "Existing return, final sale, layaway, lease, and commission policies", "textarea"],
  ["operations", "Staffing, cashier, fulfillment, delivery, and operating hours", "textarea"], ["priority", "What must work first and what concerns you most", "textarea"],
];

const vendorFields = [
  ["brandName", "Public brand name", "text"], ["contactName", "Owner or contact name", "text"], ["email", "Contact email", "email"], ["phone", "Contact phone", "tel"], ["businessAddress", "Business or fulfillment address", "address"],
  ["category", "What do you sell or provide?", "text"], ["website", "Website or social page", "url"], ["story", "Your brand story and ideal customer", "textarea"],
  ["catalog", "Catalogs, product photographs, spreadsheets, SKUs, or barcodes already available", "textarea"], ["inventory", "What will be onsite, online only, preorder, or vendor fulfilled?", "textarea"],
  ["services", "Tailoring, customization, appointments, delivery, or other services", "textarea"], ["policies", "Return exceptions, final sale items, and fulfillment timing", "textarea"],
  ["goals", "What would make this partnership valuable for your business?", "textarea"],
];

const readinessSuggestions: Record<string, string[]> = {
  existingSystems: ["Spreadsheet", "Square", "Shopify", "Lightspeed", "QuickBooks", "Website", "Instagram shop", "Marketplace account", "Nothing yet"],
  equipment: ["Card reader", "Receipt printer", "Barcode scanner", "Label printer", "Tablet", "Laptop or desktop", "Cash drawer", "Customer display", "Nothing yet"],
  payments: ["Stripe", "Square", "PayPal", "Cash", "Bank transfer", "Vendor paid immediately", "Vendor paid on a schedule", "Not decided"],
  inventory: ["Inventory onsite", "Online only inventory", "Vendor held inventory", "Preorder products", "Made to order", "Barcode tracking", "Spreadsheet tracking", "Not tracked yet"],
  policies: ["Returns allowed", "Exchange only", "Store credit", "Final sale items", "Layaway", "Deposits", "Vendor specific rules", "Mall wide rules needed"],
  operations: ["Shared cashier", "Dedicated cashier", "Customer pickup", "Local delivery", "Shipping", "Vendor fulfilled orders", "Appointments", "Alterations"],
  catalog: ["Product photographs", "Spreadsheet catalog", "SKUs", "Barcodes", "Website catalog", "Social media catalog", "Printed catalog", "No catalog yet"],
  services: ["Tailoring", "Alterations", "Customization", "Appointments", "Gift wrapping", "Local delivery", "Shipping", "Personal styling"],
};

type VendorContact = { name: string; contact: string; email: string; phone: string };

function VendorRoster({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  let vendors: VendorContact[] = [];
  try { vendors = value ? JSON.parse(value) : []; } catch { vendors = []; }
  const save = (next: VendorContact[]) => onChange(JSON.stringify(next));
  const add = () => save([...vendors, { name: "", contact: "", email: "", phone: "" }]);
  const updateVendor = (index: number, key: keyof VendorContact, nextValue: string) => save(vendors.map((vendor, vendorIndex) => vendorIndex === index ? { ...vendor, [key]: nextValue } : vendor));
  return <fieldset className="readiness-roster"><legend>Confirmed vendors</legend><p>Add each business separately so its brand, contact, inventory, policies, and payouts remain correctly connected.</p>{vendors.map((vendor, index) => <section key={index}><header><b>Vendor {index + 1}</b><button type="button" aria-label={`Remove vendor ${index + 1}`} onClick={() => save(vendors.filter((_, vendorIndex) => vendorIndex !== index))}><Trash2 />Remove</button></header><div><label>Business name<input value={vendor.name} autoComplete="organization" onChange={(event) => updateVendor(index, "name", event.target.value)} /></label><label>Contact person<input value={vendor.contact} autoComplete="name" onChange={(event) => updateVendor(index, "contact", event.target.value)} /></label><label>Email<input type="email" value={vendor.email} autoComplete="email" onChange={(event) => updateVendor(index, "email", event.target.value)} /></label><label>Phone<input type="tel" value={vendor.phone} autoComplete="tel" onChange={(event) => updateVendor(index, "phone", event.target.value)} /></label></div></section>)}<button type="button" className="readiness-add" onClick={add}><Plus />{vendors.length ? "Add another vendor" : "Add first vendor"}</button></fieldset>;
}

function AddressField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const mapUrl = value.trim() ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value.trim())}` : "";
  return <label className="readiness-address">{label}<span><MapPin /><input value={value} autoComplete="street-address" placeholder="Street, city, state, ZIP code" onChange={(event) => onChange(event.target.value)} /></span>{mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer"><ExternalLink />View this address on the map</a>}</label>;
}

function MultiChoiceField({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  let selected: string[] = [];
  let other = "";
  try {
    const saved = JSON.parse(value || "{}");
    selected = Array.isArray(saved.selected) ? saved.selected : [];
    other = typeof saved.other === "string" ? saved.other : "";
  } catch { other = value; }
  const save = (nextSelected: string[], nextOther = other) => onChange(JSON.stringify({ selected: nextSelected, other: nextOther }));
  return <fieldset className="readiness-choices"><legend>{label}</legend><small>Select all that apply.</small><div>{options.map((option) => <label key={option} className={selected.includes(option) ? "selected" : ""}><input type="checkbox" checked={selected.includes(option)} onChange={(event) => save(event.target.checked ? [...selected, option] : selected.filter((item) => item !== option))} /><Check /><span>{option}</span></label>)}</div><label className="readiness-other">Other details<textarea rows={2} value={other} placeholder="Add anything not listed above" onChange={(event) => save(selected, event.target.value)} /></label></fieldset>;
}

export default function ReadinessPage() {
  const [path, setPath] = useState<Path | null>(null);
  const [theme, setTheme] = useState("light");
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [filmOpen, setFilmOpen] = useState(false);
  const fields = path === "owner" ? ownerFields : vendorFields;
  const storageKey = path ? `br-readiness:${path}` : "";
  useEffect(() => {
    const saved = localStorage.getItem("br-theme");
    const next = saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(next);
    document.documentElement.dataset.theme = next;
    const params = new URLSearchParams(window.location.search);
    const invitedRole = params.get("role");
    if (invitedRole === "vendor" || invitedRole === "prospect" || invitedRole === "owner") {
      const invitedPath = invitedRole as Path;
      const invitedKey = `br-readiness:${invitedPath}`;
      const existing = JSON.parse(localStorage.getItem(invitedKey) || "{}");
      const invitedAnswers = {
        ...existing,
        ...(params.get("brandName") ? { brandName: params.get("brandName") } : {}),
        ...(params.get("contactName") ? { contactName: params.get("contactName") } : {}),
        ...(params.get("email") ? { email: params.get("email") } : {}),
      };
      localStorage.setItem(invitedKey, JSON.stringify(invitedAnswers));
      setPath(invitedPath);
    }
  }, []);
  useEffect(() => {
    if (!storageKey) return;
    const saved = localStorage.getItem(storageKey);
    setAnswers(saved ? JSON.parse(saved) : {});
    setSubmitted(false);
  }, [storageKey]);
  useEffect(() => {
    if (!filmOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFilmOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [filmOpen]);
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
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("br-theme", next);
    document.documentElement.dataset.theme = next;
  };
  const submitReadiness = async () => {
    if (!path || submitting) return;
    setSubmitting(true);
    setNotice("Sending securely");
    const email = (answers.ownerEmail || answers.email || "").trim().toLowerCase() || null;
    const { error } = await createClient().from("readiness_submissions").insert({ tenant_slug: "blossom-royall", respondent_role: path, contact_email: email, answers, consent_confirmed: true });
    setSubmitting(false);
    if (error) {
      setNotice("We could not send this yet. Your answers remain safely saved on this device.");
      return;
    }
    setSubmitted(true);
    setNotice("Securely delivered to Blossom Royall");
  };
  return <main className="readiness-page">
    <header className="readiness-nav"><Link href="/welcome"><ArrowLeft />Back</Link><span><BrandMark /><b>Blossom Royall</b><small>Readiness experience</small></span><div className="readiness-nav-actions"><button type="button" aria-label={`Use ${theme === "light" ? "dark" : "light"} theme`} onClick={toggleTheme}>{theme === "light" ? <Moon /> : <Sun />}</button><button onClick={share}><Share2 />Share</button></div></header>
    {!path && <section className="readiness-vision"><div className="readiness-copy"><span className="eyebrow">ONE DESTINATION · MANY REMARKABLE BRANDS</span><h1>Let every brand shine. Let the mall work as one.</h1><p>Customers discover independent fashion, shop onsite or online, pay once, and receive coordinated pickup, delivery, returns, and care. Every item stays connected to its vendor, inventory, policies, earnings, and story.</p><div><span><Check />Shared cashier</span><span><Check />Online and onsite</span><span><Check />Clear vendor earnings</span></div><button className="readiness-film-trigger" type="button" onClick={() => setFilmOpen(true)}><span><i /><Play /></span><b>Watch the Blossom Royall vision</b><small>35 seconds · Natural British narration</small></button></div><aside className="readiness-entry"><header><BrandMark /><span><small>START HERE</small><b>Tell us who you are.</b></span></header><div>{paths.map(({ id, icon: Icon, title, copy }) => <button key={id} onClick={() => setPath(id)}><Icon /><span><b>{title}</b><small>{copy}</small></span><ArrowRight /></button>)}</div><p><LockKeyhole />Private, role specific, and saved as you type.</p></aside></section>}
    {filmOpen && <section className="readiness-film-shell"><button type="button" className="film-backdrop" aria-label="Close vision film" onClick={() => setFilmOpen(false)} /><div className="readiness-film readiness-video" role="dialog" aria-modal="true" aria-label="Blossom Royall vision film"><header><span><BrandMark /><b>Blossom Royall</b></span><small>THE VISION · 00:36</small><button type="button" aria-label="Close vision film" onClick={() => setFilmOpen(false)}><X /></button></header><div className="readiness-video-stage"><video autoPlay playsInline controls preload="metadata" poster="/media/readiness-welcome-2026-08-27-poster.jpg"><source src="/media/readiness-welcome-2026-08-27-natural-british.mp4" type="video/mp4" /><track kind="captions" src="/media/readiness-welcome-2026-08-27.vtt" srcLang="en" label="English" />Your browser does not support this video.</video></div><footer><span>Captions are optional and remain off unless selected in the player.</span><b>Sound on · British female narration</b></footer></div></section>}
    {!path ? <section className="readiness-proof"><article><b>One customer experience</b><p>Every seller remains clear while checkout, delivery, returns, and support feel beautifully coordinated.</p></article><article><b>Less repeated work</b><p>We start with what Blossom Royall and each vendor already own, use, and understand.</p></article><article><b>Built around each brand</b><p>Identity, products, policies, inventory, and earnings stay connected without becoming invisible.</p></article></section> : <section className="readiness-form"><header><button onClick={() => setPath(null)}><ArrowLeft />Choose another role</button><span className="eyebrow">{path === "owner" ? "OWNER READINESS" : path === "vendor" ? "VENDOR READINESS" : "PARTNERSHIP INTRODUCTION"}</span><h2>{path === "owner" ? "Show us what Blossom Royall already has." : "Help us present your brand beautifully."}</h2><p>{path === "owner" ? "We will reuse existing vendors, systems, equipment, policies, and information wherever practical." : "Your answers help prepare the right storefront, inventory setup, customer promises, and partnership conversation."}</p><div className="readiness-progress"><i style={{ width: `${progress}%` }} /><span>{progress}% complete · {notice || "Answers save as you type"}</span></div></header>{submitted ? <div className="readiness-complete"><Check /><h3>Your readiness profile was securely delivered.</h3><p>Delly and the Blossom Royall team can now review these answers. A copy remains saved on this device.</p><button onClick={share}><Copy />Share this experience</button></div> : <form onSubmit={(event) => { event.preventDefault(); void submitReadiness(); }}>{fields.map(([id, label, type]) => type === "vendors" ? <VendorRoster key={id} value={answers[id] || ""} onChange={(value) => update(id, value)} /> : type === "address" ? <AddressField key={id} label={label} value={answers[id] || ""} onChange={(value) => update(id, value)} /> : readinessSuggestions[id] ? <MultiChoiceField key={id} label={label} options={readinessSuggestions[id]} value={answers[id] || ""} onChange={(value) => update(id, value)} /> : <label key={id}>{label}{type === "textarea" ? <textarea rows={4} value={answers[id] || ""} onChange={(event) => update(id, event.target.value)} /> : <input type={type} value={answers[id] || ""} onChange={(event) => update(id, event.target.value)} />}</label>)}<label className="readiness-consent"><input type="checkbox" required />I confirm that I am authorized to provide this business information to Blossom Royall.</label><button className="primary" type="submit" disabled={submitting}>{submitting ? "Sending securely" : "Complete readiness profile"}<ArrowRight /></button></form>}</section>}
    <footer className="readiness-footer"><BrandMark /><span><b>Powered by TA Tech</b><small>Is not where you have been but where you are going.</small></span></footer>
  </main>;
}
