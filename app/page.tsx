"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Banknote,
  Bell,
  BrainCircuit,
  Check,
  ClipboardList,
  ChevronRight,
  CircleDollarSign,
  CircleHelp,
  Clock3,
  FileSignature,
  Heart,
  LayoutDashboard,
  MapPin,
  Menu,
  Moon,
  Package,
  Plus,
  Printer,
  RotateCcw,
  RefreshCw,
  ScanLine,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  ShieldCheck,
  Sun,
  TrendingUp,
  Truck,
  Upload,
  Users,
  X,
} from "lucide-react";
import BrandMark from "./brand-mark";
import Link from "next/link";

const nav = [
  ["Command Center", LayoutDashboard],
  ["Customer Shop", Sparkles],
  ["Checkout", CircleDollarSign],
  ["Orders", ShoppingBag],
  ["My Orders", ClipboardList],
  ["Aftercare", RotateCcw],
  ["Products", Package],
  ["Vendors", Store],
  ["Shared Commerce", RefreshCw],
  ["Delivery", Truck],
  ["Staff", Users],
  ["Intelligence", BrainCircuit],
  ["Policies", Settings],
] as const;

type RetailPolicy = {
  returnWindowDays: number;
  windowStarts: "purchase" | "delivery" | "last_delivery";
  receiptRequired: boolean;
  allowExchange: boolean;
  allowStoreCredit: boolean;
  refundMethod: "original" | "store_credit" | "choice";
  returnShipping: "free" | "flat" | "customer";
  returnShippingFee: number;
  restockingFeePercent: number;
  finalSaleTags: string;
  layawayEnabled: boolean;
  layawayDepositPercent: number;
  layawayTermDays: number;
  layawayPaymentFrequency: "weekly" | "biweekly" | "monthly";
  layawayGraceDays: number;
  layawayCancellationFee: number;
  holdInventory: boolean;
};

const editablePolicyDefaults: RetailPolicy = {
  returnWindowDays: 30,
  windowStarts: "delivery",
  receiptRequired: true,
  allowExchange: true,
  allowStoreCredit: true,
  refundMethod: "choice",
  returnShipping: "free",
  returnShippingFee: 0,
  restockingFeePercent: 0,
  finalSaleTags: "Final sale, Personalized, Worn intimate apparel",
  layawayEnabled: true,
  layawayDepositPercent: 20,
  layawayTermDays: 60,
  layawayPaymentFrequency: "biweekly",
  layawayGraceDays: 5,
  layawayCancellationFee: 10,
  holdInventory: true,
};
const orders = [
  {
    id: "#BR-2048",
    customer: "Amara N.",
    total: "$284.00",
    status: "Ready",
    time: "8 min ago",
  },
  {
    id: "#BR-2047",
    customer: "Walk-in",
    total: "$128.50",
    status: "Paid",
    time: "14 min ago",
  },
  {
    id: "#BR-2046",
    customer: "Nia Carter",
    total: "$412.00",
    status: "Pickup",
    time: "31 min ago",
  },
  {
    id: "#BR-2045",
    customer: "Olivia P.",
    total: "$96.00",
    status: "Paid",
    time: "46 min ago",
  },
];
type Order = (typeof orders)[number];
const products = [
  ["Aurelia Satin Midi", "Emerald · 8", "BR-AUR-EM-08", 3, "$168"],
  ["Sloane Sculpted Blazer", "Wine · M", "BR-SLO-WN-M", 7, "$214"],
  ["Mila Gold Clutch", "Champagne", "BR-MIL-CH-OS", 0, "$86", 14, "Online only, vendor fulfilled"],
  ["Noelle Silk Trousers", "Black · 10", "BR-NOE-BK-10", 2, "$142"],
];
const vendors = [
  ["BC", "Blossom Collections", "House collection", "Launch ready", "Confirmed"],
  ["JK", "Jose Kako", "Men’s formalwear", "Onboarding", "Confirmed"],
  ["AF", "Africstyle Fashion", "African heritage fashion", "Launch ready", "Confirmed"],
  ["SI", "Sapologie Italiano", "Suits and accessories", "Onboarding", "Confirmed"],
];

const tourSteps = [
  {
    title: "Welcome to your Command Center",
    body: "See today’s sales, priorities, orders, and customer demand in one calm view.",
    destination: "Command Center",
  },
  {
    title: "Run every part of the mall",
    body: "Move between checkout, orders, inventory, vendors, and staff from the main navigation.",
    destination: "Products",
  },
  {
    title: "Turn demand into action",
    body: "Blossom Intelligence explains what is changing and keeps every owner decision accountable.",
    destination: "Intelligence",
  },
] as const;

export default function Home() {
  const [active, setActive] = useState("Command Center"),
    [menu, setMenu] = useState(false),
    [sale, setSale] = useState(false),
    [done, setDone] = useState(false),
    [query, setQuery] = useState(""),
    [theme, setTheme] = useState("light"),
    [tourStep, setTourStep] = useState<number | null>(null);
  useEffect(() => {
    const saved = localStorage.getItem("br-theme");
    const next =
      saved ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.documentElement.dataset.appReady = "true";
    if (!localStorage.getItem("br-tour-complete")) setTourStep(0);
  }, []);
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("br-theme", next);
    document.documentElement.dataset.theme = next;
  };
  const filtered = useMemo(
    () =>
      orders.filter((o) =>
        (o.id + o.customer).toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );
  const go = (v: string) => {
    setActive(v);
    setMenu(false);
  };
  const showTourStep = (step: number) => {
    setTourStep(step);
    go(tourSteps[step].destination);
  };
  const closeTour = () => {
    localStorage.setItem("br-tour-complete", "true");
    setTourStep(null);
  };
  return (
    <div className="shell">
      <aside className={menu ? "open" : ""} aria-label="Primary navigation">
        <div className="brand">
          <BrandMark className="brand-nav-mark" />
          <span>
            <strong>Blossom Royall</strong>
            <small>Fashion Mall OS</small>
          </span>
          <button onClick={() => setMenu(false)} aria-label="Close menu">
            <X />
          </button>
        </div>
        <nav>
          {nav.map(([label, Icon]) => (
            <button
              key={label}
              className={active === label ? "active" : ""}
              onClick={() => go(label)}
            >
              <Icon />
              {label}
              {label === "Orders" && <em>9</em>}
            </button>
          ))}
        </nav>
        <a className="profile" href="/auth">
          <i>D</i>
          <span>
            <b>Delly</b>
            <small>Owner</small>
          </span>
        </a>
      </aside>
      {menu && (
        <button
          className="scrim"
          aria-label="Dismiss navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <main>
        <header>
          <div>
            <button
              className="menu"
              aria-label="Open menu"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </button>
            <span>
              <small>Wednesday, August 26</small>
              <h1>{active}</h1>
            </span>
          </div>
          <section>
            <label>
              <Search />
              <input
                aria-label="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search orders, products…"
              />
            </label>
            <button className="bell" aria-label="Notifications">
              <Bell />
            </button>
            <button
              className="bell tour-toggle"
              aria-label="Open guided tour"
              onClick={() => showTourStep(0)}
            >
              <CircleHelp />
            </button>
            <button
              className="bell theme-toggle"
              aria-label={`Use ${theme === "light" ? "dark" : "light"} theme`}
              onClick={toggleTheme}
            >
              {theme === "light" ? <Moon /> : <Sun />}
            </button>
            <button
              className="primary"
              onClick={() => {
                setDone(false);
                setSale(true);
              }}
            >
              <Plus />
              New sale
            </button>
          </section>
        </header>
        {active === "Command Center" && (
          <Dashboard go={go} orders={filtered} openSale={() => setSale(true)} />
        )}
        {tourStep !== null && (
          <div className="tour-wrap" role="presentation">
            <button
              className="tour-bg"
              aria-label="Close guided tour"
              onClick={closeTour}
            />
            <section
              className="tour-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="tour-title"
            >
              <div className="tour-progress" aria-label={`Step ${tourStep + 1} of ${tourSteps.length}`}>
                {tourSteps.map((_, index) => (
                  <i key={index} className={index <= tourStep ? "active" : ""} />
                ))}
              </div>
              <small>GUIDED TOUR · {tourStep + 1} OF {tourSteps.length}</small>
              <h2 id="tour-title">{tourSteps[tourStep].title}</h2>
              <p>{tourSteps[tourStep].body}</p>
              <footer>
                <button className="tour-skip" onClick={closeTour}>Skip tour</button>
                <div>
                  {tourStep > 0 && (
                    <button onClick={() => showTourStep(tourStep - 1)}>Back</button>
                  )}
                  <button
                    className="primary"
                    onClick={() =>
                      tourStep === tourSteps.length - 1
                        ? closeTour()
                        : showTourStep(tourStep + 1)
                    }
                  >
                    {tourStep === tourSteps.length - 1 ? "Finish tour" : "Next"}
                  </button>
                </div>
              </footer>
            </section>
          </div>
        )}
        {active === "Customer Shop" && <CustomerShop go={go} />}
        {active === "Orders" && (
          <ListView
            eyebrow="FULFILLMENT"
            title="All orders"
            subtitle="Track every purchase from payment to pickup."
          >
            <OrderTable rows={filtered} />
          </ListView>
        )}
        {active === "My Orders" && <CustomerOrders />}
        {active === "Aftercare" && <AftercareCenter />}
        {active === "Products" && (
          <ListView
            eyebrow="CATALOG"
            title="Products & inventory"
            subtitle="Live stock across every vendor and sales channel."
          >
            <ProductCatalogManager />
          </ListView>
        )}
        {active === "Vendors" && (
          <ListView
            eyebrow="MALL PARTNERS"
            title="Vendors"
            subtitle="Leases, rent, inventory, and performance in one place."
            action="Invite vendor"
            actionHref="/partners"
          >
            <VendorBrandManager />
            <div className="vendors">
              {vendors.map((v) => (
                <article className="panel vendor" key={v[1]}>
                  <i>{v[0]}</i>
                  <span>
                    <h3>{v[1]}</h3>
                    <small>{v[2]}</small>
                  </span>
                  <span>
                    <small>Opening roster</small>
                    <b>{v[4]}</b>
                  </span>
                  <em
                    className={(v[3] as string).includes("Onboarding") ? "warn" : ""}
                  >
                    {v[3]}
                  </em>
                  <ChevronRight />
                </article>
              ))}
            </div>
          </ListView>
        )}
        {active === "Shared Commerce" && <SharedCommerceCenter />}
        {active === "Delivery" && <DeliveryCenter />}
        {active === "Checkout" && <CheckoutCenter openSale={() => setSale(true)} />}
        {active === "Staff" && (
          <ListView
            eyebrow="TODAY'S TEAM"
            title="Staff & payroll"
            subtitle="Six of eight scheduled team members are clocked in."
            action="Open time clock"
          >
            <div className="staff panel">
              {[
                "Maya · Floor lead",
                "Jordan · Checkout",
                "Elena · Styling",
                "Drew · Fulfillment",
              ].map((x, i) => (
                <div key={x}>
                  <i>{x[0]}</i>
                  <span>
                    <b>{x.split(" · ")[0]}</b>
                    <small>{x.split(" · ")[1]}</small>
                  </span>
                  <time>
                    {i < 2 ? "9:00 AM – 5:00 PM" : "11:00 AM – 7:00 PM"}
                  </time>
                  <em>Clocked in</em>
                </div>
              ))}
            </div>
          </ListView>
        )}
        {active === "Intelligence" && <IntelligenceHub />}
        {active === "Policies" && <PolicyCenter />}
      </main>
      {sale && (
        <div className="modal-wrap">
          <button
            aria-label="Close checkout"
            className="modal-bg"
            onClick={() => setSale(false)}
          />
          <section className="modal" role="dialog" aria-modal="true">
            <button
              className="close"
              aria-label="Close"
              onClick={() => setSale(false)}
            >
              <X />
            </button>
            {!done ? (
              <>
                <div className="modal-icon">
                  <ScanLine />
                </div>
                <span className="eyebrow">EXPRESS CHECKOUT</span>
                <h2>Start a new sale</h2>
                <p>
                  Scan an item or choose a checkout path. Inventory and vendor
                  attribution update automatically.
                </p>
                <button className="scan" onClick={() => setDone(true)}>
                  <ScanLine />
                  <span>
                    <b>Tap to scan barcode</b>
                    <small>Camera or connected scanner</small>
                  </span>
                  <ChevronRight />
                </button>
                <div className="choices">
                  <button onClick={() => setDone(true)}>
                    <ShoppingBag />
                    Browse catalog
                  </button>
                  <button onClick={() => setDone(true)}>
                    <CircleDollarSign />
                    Quick amount
                  </button>
                </div>
              </>
            ) : (
              <div className="success">
                <i>
                  <Check />
                </i>
                <span className="eyebrow">SALE READY</span>
                <h2>Checkout opened</h2>
                <p>Order #BR-2049 is ready for items and payment.</p>
                <button
                  className="primary"
                  onClick={() => {
                    setSale(false);
                    go("Checkout");
                  }}
                >
                  Continue to checkout <ArrowUpRight />
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function ListView({
  eyebrow,
  title,
  subtitle,
  action,
  actionHref,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: string;
  actionHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="content inner">
      <div className="view-head">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {action && actionHref && (
          <Link className="primary" href={actionHref}>
            <Plus />
            {action}
          </Link>
        )}
        {action && !actionHref && (
          <button className="primary">
            <Plus />
            {action}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

type VendorBrandSubmission = {
  id: string;
  brandName: string;
  contactEmail: string;
  logoDataUrl: string;
  fileName: string;
  originalFileName: string;
  width: number;
  height: number;
  status: "Awaiting review" | "Approved";
  submittedAt: string;
};

async function normalizeVendorLogo(file: File) {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const candidate = new Image();
      candidate.onload = () => resolve(candidate);
      candidate.onerror = () => reject(new Error("This image format cannot be read by your browser. Please export it as PNG, JPG, WebP, or SVG."));
      candidate.src = sourceUrl;
    });
    const maxEdge = 1600;
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this image.");
    context.drawImage(image, 0, 0, width, height);
    const logoDataUrl = canvas.toDataURL("image/webp", 0.88);
    if (logoDataUrl.length > 1_350_000) throw new Error("The optimized logo is still too large. Choose an image with less detail or a smaller resolution.");
    const safeBase = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "vendor-logo";
    return { logoDataUrl, fileName: `${safeBase}.webp`, originalFileName: file.name, width, height };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

type ProductDraft = { id: string; name: string; vendor: string; imageDataUrl: string; fileName: string; originalFileName: string; width: number; height: number; status: "Draft" | "Published" };

function productNameFromFile(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()).trim() || "Untitled item";
}

async function normalizeProductImage(file: File) {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const candidate = new Image();
      candidate.onload = () => resolve(candidate);
      candidate.onerror = () => reject(new Error(`${file.name} cannot be read. Export it as PNG, JPG, or WebP and try again.`));
      candidate.src = sourceUrl;
    });
    const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this item image.");
    context.fillStyle = "#f7f3ef";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const imageDataUrl = canvas.toDataURL("image/webp", 0.86);
    if (imageDataUrl.length > 1_750_000) throw new Error(`${file.name} is still too large after formatting.`);
    const safeBase = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "product";
    return { imageDataUrl, fileName: `${safeBase}.webp`, originalFileName: file.name, width, height };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function ProductCatalogManager() {
  const storageKey = "br-product-drafts:blossom-royall";
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<ProductDraft[]>([]);
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) setDrafts(JSON.parse(stored));
  }, []);
  const persist = (next: ProductDraft[]) => {
    setDrafts(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };
  const importItems = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const files = Array.from((form.elements.namedItem("itemImages") as HTMLInputElement).files || []);
    if (!files.length) return setMessage("Choose one item photo or an entire collection.");
    if (files.length > 40) return setMessage("Import up to 40 item photos at a time.");
    if (files.some((file) => file.size > 20_000_000)) return setMessage("Each original photo must be smaller than 20 MB.");
    setProcessing(true);
    setMessage(`Formatting ${files.length} ${files.length === 1 ? "item" : "items"}...`);
    try {
      const normalized = await Promise.all(files.map(normalizeProductImage));
      const next = normalized.map<ProductDraft>((item) => ({ id: crypto.randomUUID(), name: productNameFromFile(item.originalFileName), vendor: String(data.get("vendor")), ...item, status: "Draft" }));
      persist([...next, ...drafts]);
      form.reset();
      setOpen(false);
      setMessage(`${next.length} ${next.length === 1 ? "item was" : "items were"} formatted as WebP and added to the collection studio.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The collection could not be formatted.");
    } finally {
      setProcessing(false);
    }
  };
  const updateName = (id: string, name: string) => persist(drafts.map((item) => item.id === id ? { ...item, name } : item));
  const publish = (id: string) => persist(drafts.map((item) => item.id === id ? { ...item, status: "Published" } : item));
  const publishAll = () => persist(drafts.map((item) => ({ ...item, status: "Published" })));
  return <>
    <section className="panel collection-studio">
      <div className="panel-head"><span><small className="eyebrow">COLLECTION STUDIO</small><h3>Luxury item exposure</h3></span><div><button onClick={() => setOpen((value) => !value)}><Upload />{open ? "Close importer" : "Add one or bulk upload"}</button>{drafts.some((item) => item.status === "Draft") && <button className="primary" onClick={publishAll}><Sparkles />Publish all</button>}</div></div>
      <p>Drop in one hero item or a complete collection. Every photograph is resized, renamed, and converted to a storefront ready WebP asset automatically.</p>
      {open && <form className="collection-importer" onSubmit={importItems}>
        <label>Vendor<select name="vendor" required defaultValue=""><option value="" disabled>Choose the owning vendor</option>{vendors.map((vendor) => <option key={vendor[1]}>{vendor[1]}</option>)}</select></label>
        <label className="collection-file">Item photographs<input name="itemImages" aria-label="Item photographs" type="file" accept="image/*,.heic,.heif" multiple required /><small>Select one image or up to 40 at once. Filenames become editable item names.</small></label>
        <button className="primary" disabled={processing}><Upload />{processing ? "Formatting collection" : "Format and stage items"}</button>
      </form>}
      {message && <output className="policy-saved" aria-live="polite">{message}</output>}
      {drafts.length > 0 && <div className="collection-preview">{drafts.map((item) => <article key={item.id}><div className="collection-image"><img src={item.imageDataUrl} alt={item.name} /><em className={item.status === "Draft" ? "warn" : ""}>{item.status}</em></div><small>{item.vendor}</small><input aria-label={`Item name for ${item.originalFileName}`} value={item.name} onChange={(event) => updateName(item.id, event.target.value)} /><p>{item.width} × {item.height} pixels · {item.fileName}</p>{item.status === "Draft" ? <button onClick={() => publish(item.id)}><Sparkles />Publish item</button> : <span><Check />Live in storefront</span>}</article>)}</div>}
    </section>
    <div className="product-grid">{products.map((p) => <article className="product" key={p[2] as string}><div><ShoppingBag /><span>{(p[3] as number) === 0 ? "Online only" : (p[3] as number) <= 3 ? "Low stock" : "In stock"}</span></div><small>{p[2]}</small><h3>{p[0]}</h3><p>{p[1]}</p><footer><b>{p[4]}</b><span>{p[3]} onsite{p[5] !== undefined ? ` · ${p[5]} online` : ""}</span></footer>{p[6] && <small className="channel-source">{p[6]}</small>}</article>)}</div>
  </>;
}

function VendorBrandManager() {
  const storageKey = "br-vendor-brand-submissions:blossom-royall";
  const [open, setOpen] = useState(false);
  const [submissions, setSubmissions] = useState<VendorBrandSubmission[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) setSubmissions(JSON.parse(stored));
  }, []);
  const persist = (next: VendorBrandSubmission[]) => {
    setSubmissions(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("logo") as File;
    if (!file || !file.size) return setMessage("Choose the official logo file.");
    if (!file.type.startsWith("image/") && !file.name.match(/\.(heic|heif)$/i)) return setMessage("Choose an image file. We will format it automatically.");
    if (file.size > 15_000_000) return setMessage("Choose an original image smaller than 15 MB.");
    setMessage("Formatting logo for the marketplace...");
    try {
      const normalized = await normalizeVendorLogo(file);
      const next: VendorBrandSubmission = {
        id: crypto.randomUUID(),
        brandName: String(data.get("brandName") || "").trim(),
        contactEmail: String(data.get("contactEmail") || "").trim(),
        logoDataUrl: normalized.logoDataUrl,
        fileName: normalized.fileName,
        originalFileName: normalized.originalFileName,
        width: normalized.width,
        height: normalized.height,
        status: "Awaiting review",
        submittedAt: new Date().toISOString(),
      };
      persist([next, ...submissions]);
      form.reset();
      setOpen(false);
      setMessage("Logo formatted as WebP and submitted for owner review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not format this logo.");
    }
  };
  const approve = (id: string) => persist(submissions.map((item) => item.id === id ? { ...item, status: "Approved" } : item));
  return <section className="panel vendor-brand-manager">
    <div className="panel-head"><span><small className="eyebrow">BRAND ASSET QUEUE</small><h3>Vendor supplied logos</h3></span><button onClick={() => setOpen((value) => !value)}><Upload />{open ? "Close submission" : "Submit brand package"}</button></div>
    <p>Vendors provide their official artwork and confirm permission. Owners approve what appears in the mall without a code change.</p>
    {open && <form className="vendor-brand-form" onSubmit={submit}>
      <label>Brand name<input name="brandName" required placeholder="Official customer facing name" /></label>
      <label>Vendor contact email<input name="contactEmail" type="email" required placeholder="brand@example.com" /></label>
      <label>Official logo file<input name="logo" type="file" accept="image/*,.heic,.heif" required /><small>PNG, JPG, WebP, SVG, and browser readable images are automatically normalized.</small></label>
      <label className="brand-rights"><input name="rights" type="checkbox" required /><span>I confirm that I own this logo or am authorized to provide it to Blossom Royall for marketplace use.</span></label>
      <button className="primary"><Upload />Send for owner review</button>
    </form>}
    {message && <output className="policy-saved">{message}</output>}
    {submissions.length > 0 && <div className="brand-submission-list">{submissions.map((item) => <article key={item.id}><img src={item.logoDataUrl} alt={`${item.brandName} submitted logo`} /><span><b>{item.brandName}</b><small>{item.contactEmail} · {item.originalFileName || item.fileName} → {item.fileName}</small><small>{item.width && item.height ? `${item.width} × ${item.height} pixels · ` : ""}WebP marketplace asset</small></span><em className={item.status === "Awaiting review" ? "warn" : ""}>{item.status}</em>{item.status === "Awaiting review" && <button onClick={() => approve(item.id)}><Check />Approve logo</button>}</article>)}</div>}
    <small className="control-note"><ShieldCheck />Preview submissions stay in this browser. Production uses tenant scoped private object storage, malware checks, version history, approval audit records, and reversible publishing.</small>
  </section>;
}

type CommerceSettings = {
  payoutCadence: "weekly" | "biweekly" | "monthly";
  payoutDay: string;
  returnReservePercent: number;
  minimumPayout: number;
  autoRebalance: boolean;
  targetCoverDays: number;
  requireScanMatch: boolean;
};

const commerceDefaults: CommerceSettings = {
  payoutCadence: "biweekly",
  payoutDay: "Friday",
  returnReservePercent: 8,
  minimumPayout: 50,
  autoRebalance: true,
  targetCoverDays: 21,
  requireScanMatch: true,
};

function SharedCommerceCenter() {
  const storageKey = "br-shared-commerce:blossom-royall";
  const [settings, setSettings] = useState<CommerceSettings>(commerceDefaults);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) setSettings({ ...commerceDefaults, ...JSON.parse(stored) });
  }, [storageKey]);
  const update = <K extends keyof CommerceSettings>(key: K, value: CommerceSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };
  const save = () => {
    localStorage.setItem(storageKey, JSON.stringify(settings));
    setSaved(true);
  };
  const payouts = [
    ["Africstyle Fashion", "$6,842.20", "$547.38", "$6,294.82", "Ready"],
    ["Blossom Collections", "$4,118.00", "$329.44", "$3,788.56", "Ready"],
    ["Jose Kako", "$3,764.50", "$301.16", "$3,463.34", "Review"],
    ["Sapologie Italiano", "$2,986.00", "$238.88", "$2,747.12", "Ready"],
  ];
  return (
    <div className="content inner commerce-center">
      <div className="view-head">
        <div><span className="eyebrow">ONE REGISTER · EVERY BRAND</span><h2>Shared commerce control</h2><p>Attribute every scan, balance every shelf, and pay every vendor from one accountable ledger.</p></div>
        <button className="primary" onClick={save}><Check />{saved ? "Settings saved" : "Save controls"}</button>
      </div>
      <section className="commerce-flow" aria-label="Shared checkout flow">
        <article><ScanLine /><span><small>1 · IDENTIFY</small><b>Scan resolves the exact item and vendor</b></span></article>
        <article><CircleDollarSign /><span><small>2 · COLLECT</small><b>Customer pays once at the shared cashier</b></span></article>
        <article><RefreshCw /><span><small>3 · POST</small><b>Stock and vendor ledger update together</b></span></article>
        <article><Banknote /><span><small>4 · SETTLE</small><b>Approved balances pay on schedule</b></span></article>
      </section>
      <section className="commerce-grid">
        <article className="panel commerce-controls">
          <div className="panel-head"><span><small className="eyebrow">TENANT CONTROLS</small><h3>Payout and inventory rules</h3></span><Settings /></div>
          <div className="policy-grid">
            <label>Payout cadence<select value={settings.payoutCadence} onChange={(e) => update("payoutCadence", e.target.value as CommerceSettings["payoutCadence"])}><option value="weekly">Weekly</option><option value="biweekly">Every two weeks</option><option value="monthly">Monthly</option></select></label>
            <label>Payout day<select value={settings.payoutDay} onChange={(e) => update("payoutDay", e.target.value)}><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option></select></label>
            <label>Return reserve<input type="number" min="0" max="100" value={settings.returnReservePercent} onChange={(e) => update("returnReservePercent", Number(e.target.value))} /><span>%</span></label>
            <label>Minimum payout<input type="number" min="0" value={settings.minimumPayout} onChange={(e) => update("minimumPayout", Number(e.target.value))} /><span>$</span></label>
            <label>Target stock cover<input type="number" min="1" value={settings.targetCoverDays} onChange={(e) => update("targetCoverDays", Number(e.target.value))} /><span>days</span></label>
          </div>
          <div className="policy-checks">
            <label><input type="checkbox" checked={settings.autoRebalance} onChange={(e) => update("autoRebalance", e.target.checked)} />Automatically prepare stock rebalance proposals</label>
            <label><input type="checkbox" checked={settings.requireScanMatch} onChange={(e) => update("requireScanMatch", e.target.checked)} />Block checkout when an item cannot resolve to one vendor</label>
          </div>
          <p className="control-note"><ShieldCheck />Proposals never move stock or money silently. A manager approves transfers, exceptions, and payout batches with a permanent audit record.</p>
        </article>
        <article className="panel rebalance-card">
          <div className="panel-head"><span><small className="eyebrow">SMART REBALANCE</small><h3>Three actions recommended</h3></span><Sparkles /></div>
          <ol>
            <li><i>12</i><span><b>Move Kente occasion pieces to the front edit</b><small>Africstyle Fashion · 9 days of cover · demand up 31%</small></span><button>Review</button></li>
            <li><i>6</i><span><b>Replenish navy ceremony jackets</b><small>Jose Kako · weekend appointments exceed available sizes</small></span><button>Review</button></li>
            <li><i>4</i><span><b>Return slow accessories to vendor shelf</b><small>Sapologie Italiano · 64 days of cover · no sale in 21 days</small></span><button>Review</button></li>
          </ol>
        </article>
      </section>
      <section className="panel payout-ledger">
        <div className="panel-head"><span><small className="eyebrow">NEXT PAYOUT · {settings.payoutDay.toUpperCase()}</small><h3>Vendor settlement preview</h3></span><button>Open reconciliation</button></div>
        <div className="payout-table"><div><span>Vendor</span><span>Eligible sales</span><span>Reserve</span><span>Expected payout</span><span>Status</span></div>{payouts.map((row) => <div key={row[0]}>{row.map((cell, index) => index === 4 ? <em className={cell === "Review" ? "warn" : ""} key={cell}>{cell}</em> : <span key={cell}>{cell}</span>)}</div>)}</div>
        <footer><span>Customer tender</span><b>$17,710.70</b><span>Return reserve</span><b>$1,416.86</b><span>Vendor liability</span><b>$16,293.84</b></footer>
      </section>
    </div>
  );
}

type DeliverySettings = {
  pickupEnabled: boolean;
  localDeliveryEnabled: boolean;
  shippingEnabled: boolean;
  localRadiusMiles: number;
  freeLocalMinimum: number;
  localFee: number;
  handlingDays: number;
  consolidationHours: number;
  routingPriority: "fewest_packages" | "fastest" | "lowest_cost";
  signatureThreshold: number;
  vendorFulfillmentEnabled: boolean;
  allowOnlineBackorders: boolean;
};

const deliveryDefaults: DeliverySettings = { pickupEnabled: true, localDeliveryEnabled: true, shippingEnabled: true, localRadiusMiles: 15, freeLocalMinimum: 150, localFee: 9, handlingDays: 1, consolidationHours: 4, routingPriority: "fewest_packages", signatureThreshold: 500, vendorFulfillmentEnabled: true, allowOnlineBackorders: false };

function DeliveryCenter() {
  const storageKey = "br-delivery:blossom-royall";
  const [settings, setSettings] = useState<DeliverySettings>(deliveryDefaults);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) setSettings({ ...deliveryDefaults, ...JSON.parse(stored) });
  }, [storageKey]);
  const update = <K extends keyof DeliverySettings>(key: K, value: DeliverySettings[K]) => { setSettings((current) => ({ ...current, [key]: value })); setSaved(false); };
  const save = () => { localStorage.setItem(storageKey, JSON.stringify(settings)); setSaved(true); };
  const routes = [
    ["#BR-2052", "Amara N.", "3 vendors · 5 items", "Consolidating", "Local delivery", "Today, 4:00 PM"],
    ["#BR-2051", "Olivia P.", "1 vendor · 2 items", "Ready", "Store pickup", "Today, 2:30 PM"],
    ["#BR-2050", "Nia Carter", "2 vendors · 3 items", "Label created", "UPS Ground", "Aug 29"],
  ];
  return <div className="content inner delivery-center">
    <div className="view-head"><div><span className="eyebrow">ONLINE TO DOORSTEP</span><h2>Delivery operations</h2><p>Route every item, consolidate multi vendor orders, and keep the customer informed through one Blossom Royall experience.</p></div><button className="primary" onClick={save}><Check />{saved ? "Delivery saved" : "Save delivery"}</button></div>
    <section className="delivery-modes">
      <label className={settings.pickupEnabled ? "enabled" : ""}><input type="checkbox" checked={settings.pickupEnabled} onChange={(e) => update("pickupEnabled", e.target.checked)} /><Store /><span><b>Store pickup</b><small>Reserve, pick, verify, and hand off with a code</small></span></label>
      <label className={settings.localDeliveryEnabled ? "enabled" : ""}><input type="checkbox" checked={settings.localDeliveryEnabled} onChange={(e) => update("localDeliveryEnabled", e.target.checked)} /><MapPin /><span><b>Local delivery</b><small>Scheduled or same day courier within configured zones</small></span></label>
      <label className={settings.shippingEnabled ? "enabled" : ""}><input type="checkbox" checked={settings.shippingEnabled} onChange={(e) => update("shippingEnabled", e.target.checked)} /><Truck /><span><b>Carrier shipping</b><small>Rate, label, tracking, delivery, and exception events</small></span></label>
    </section>
    <section className="commerce-grid delivery-grid">
      <article className="panel commerce-controls"><div className="panel-head"><span><small className="eyebrow">TENANT RULES</small><h3>Promise and routing</h3></span><Settings /></div><div className="policy-grid">
        <label>Local radius<input aria-label="Local radius" type="number" min="1" value={settings.localRadiusMiles} onChange={(e) => update("localRadiusMiles", Number(e.target.value))} /><span>miles</span></label>
        <label>Local delivery fee<input aria-label="Local delivery fee" type="number" min="0" value={settings.localFee} onChange={(e) => update("localFee", Number(e.target.value))} /><span>$</span></label>
        <label>Free local minimum<input aria-label="Free local minimum" type="number" min="0" value={settings.freeLocalMinimum} onChange={(e) => update("freeLocalMinimum", Number(e.target.value))} /><span>$</span></label>
        <label>Handling time<input aria-label="Handling time" type="number" min="0" value={settings.handlingDays} onChange={(e) => update("handlingDays", Number(e.target.value))} /><span>days</span></label>
        <label>Consolidation window<input aria-label="Consolidation window" type="number" min="0" value={settings.consolidationHours} onChange={(e) => update("consolidationHours", Number(e.target.value))} /><span>hours</span></label>
        <label>Signature threshold<input aria-label="Signature threshold" type="number" min="0" value={settings.signatureThreshold} onChange={(e) => update("signatureThreshold", Number(e.target.value))} /><span>$</span></label>
        <label>Routing priority<select aria-label="Routing priority" value={settings.routingPriority} onChange={(e) => update("routingPriority", e.target.value as DeliverySettings["routingPriority"])}><option value="fewest_packages">Fewest packages</option><option value="fastest">Fastest promise</option><option value="lowest_cost">Lowest cost</option></select></label>
      </div><div className="policy-checks"><label><input type="checkbox" checked={settings.vendorFulfillmentEnabled} onChange={(e) => update("vendorFulfillmentEnabled", e.target.checked)} />Allow approved vendors to fulfill online only inventory</label><label><input type="checkbox" checked={settings.allowOnlineBackorders} onChange={(e) => update("allowOnlineBackorders", e.target.checked)} />Allow online backorders only when a dated supply promise exists</label></div><p className="control-note"><ShieldCheck />The checkout promise uses inventory reservations and validated addresses. It never offers a speed or method that the assigned location and items cannot support.</p></article>
      <article className="panel delivery-journey"><div className="panel-head"><span><small className="eyebrow">MULTI VENDOR ORDER</small><h3>One package when possible</h3></span><Package /></div><ol><li><i>1</i><span><b>Reserve every item</b><small>Inventory is protected before payment capture.</small></span></li><li><i>2</i><span><b>Route to Blossom Royall</b><small>Vendor shelves feed one controlled packing station.</small></span></li><li><i>3</i><span><b>Scan into one parcel</b><small>Every item and seller remain visible on the packing record.</small></span></li><li><i>4</i><span><b>Handoff with proof</b><small>Pickup code, carrier scan, or courier confirmation closes custody.</small></span></li></ol></article>
    </section>
    <section className="panel channel-board"><div className="panel-head"><span><small className="eyebrow">CHANNEL AVAILABILITY</small><h3>Sellable does not always mean onsite</h3></span><button>Manage inventory pools</button></div><div className="channel-table"><div><span>Product</span><span>Onsite</span><span>Online</span><span>Online source</span><span>Customer promise</span></div><div><b>Mila Gold Clutch</b><em className="none">Not onsite</em><em>14 available</em><span>Vendor fulfilled</span><span>Ships in 2 to 3 days</span></div><div><b>Aurelia Satin Midi</b><em>3 available</em><em>9 available</em><span>Store plus reserved vendor stock</span><span>Pickup today or shipping</span></div><div><b>Kente Ceremony Coat</b><em className="none">Not onsite</em><em>Preorder</em><span>Dated production allocation</span><span>Ships September 18</span></div></div></section>
    <section className="panel route-board"><div className="panel-head"><span><small className="eyebrow">ACTIVE FULFILLMENT</small><h3>Today’s handoffs</h3></span><button>Open all orders</button></div><div className="route-table"><div><span>Order</span><span>Customer</span><span>Contents</span><span>Status</span><span>Method</span><span>Promise</span></div>{routes.map((row) => <div key={row[0]}>{row.map((cell, index) => index === 3 ? <em key={cell}>{cell}</em> : <span key={cell}>{cell}</span>)}</div>)}</div></section>
  </div>;
}

function PolicyCenter() {
  const tenantId = "blossom-royall";
  const storageKey = `br-retail-policy:${tenantId}`;
  const [policy, setPolicy] = useState<RetailPolicy>(editablePolicyDefaults);
  const [saved, setSaved] = useState(false);
  const [previewAge, setPreviewAge] = useState(12);
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) setPolicy({ ...editablePolicyDefaults, ...JSON.parse(stored) });
  }, [storageKey]);
  const update = <K extends keyof RetailPolicy>(key: K, value: RetailPolicy[K]) => {
    setSaved(false);
    setPolicy((current) => ({ ...current, [key]: value }));
  };
  const savePolicy = () => {
    localStorage.setItem(storageKey, JSON.stringify(policy));
    setSaved(true);
  };
  const eligible = previewAge <= policy.returnWindowDays;
  return (
    <div className="content policy-center">
      <div className="view-head">
        <div>
          <span className="eyebrow">TENANT POLICY ENGINE</span>
          <h2>Retail policies you control</h2>
          <p>Configure customer promises once, then apply them consistently at checkout, online, and at every store.</p>
        </div>
        <button className="primary" onClick={savePolicy}><Check />Save and publish</button>
      </div>
      {saved && <div className="policy-saved" role="status"><Check />Policy published for Blossom Royall. Future orders use this version.</div>}
      <section className="policy-grid">
        <article className="panel policy-form">
          <header><span className="eyebrow">RETURNS AND EXCHANGES</span><h3>Eligibility rules</h3></header>
          <div className="field-grid">
            <label>Return window<input aria-label="Return window in days" type="number" min="0" value={policy.returnWindowDays} onChange={(event) => update("returnWindowDays", Number(event.target.value))} /><small>Days</small></label>
            <label>Window begins<select aria-label="Return window begins" value={policy.windowStarts} onChange={(event) => update("windowStarts", event.target.value as RetailPolicy["windowStarts"])}><option value="purchase">Purchase</option><option value="delivery">Item delivery</option><option value="last_delivery">Last item delivery</option></select></label>
            <label>Refund destination<select aria-label="Refund destination" value={policy.refundMethod} onChange={(event) => update("refundMethod", event.target.value as RetailPolicy["refundMethod"])}><option value="choice">Customer choice</option><option value="original">Original payment</option><option value="store_credit">Store credit</option></select></label>
            <label>Return shipping<select aria-label="Return shipping" value={policy.returnShipping} onChange={(event) => update("returnShipping", event.target.value as RetailPolicy["returnShipping"])}><option value="free">Complimentary</option><option value="flat">Flat fee</option><option value="customer">Customer arranged</option></select></label>
            <label>Restocking fee<input aria-label="Restocking fee percent" type="number" min="0" max="100" value={policy.restockingFeePercent} onChange={(event) => update("restockingFeePercent", Number(event.target.value))} /><small>Percent</small></label>
            <label>Flat shipping fee<input aria-label="Flat return shipping fee" type="number" min="0" value={policy.returnShippingFee} disabled={policy.returnShipping !== "flat"} onChange={(event) => update("returnShippingFee", Number(event.target.value))} /><small>USD</small></label>
          </div>
          <div className="policy-checks">
            <label><input type="checkbox" checked={policy.receiptRequired} onChange={(event) => update("receiptRequired", event.target.checked)} />Require receipt or order lookup</label>
            <label><input type="checkbox" checked={policy.allowExchange} onChange={(event) => update("allowExchange", event.target.checked)} />Allow exchanges</label>
            <label><input type="checkbox" checked={policy.allowStoreCredit} onChange={(event) => update("allowStoreCredit", event.target.checked)} />Allow store credit</label>
          </div>
          <label className="wide-field">Final sale product tags<textarea aria-label="Final sale product tags" value={policy.finalSaleTags} onChange={(event) => update("finalSaleTags", event.target.value)} /><small>Editable tags replace coded product exceptions.</small></label>
        </article>
        <aside className="panel eligibility-preview">
          <span className="eyebrow">LIVE RULE PREVIEW</span>
          <h3>Would this return qualify?</h3>
          <label>Days since {policy.windowStarts === "purchase" ? "purchase" : "delivery"}<input aria-label="Preview days since purchase or delivery" type="range" min="0" max="120" value={previewAge} onChange={(event) => setPreviewAge(Number(event.target.value))} /><b>{previewAge} days</b></label>
          <div className={eligible ? "eligible" : "ineligible"}><Check /><span><b>{eligible ? "Eligible" : "Outside return window"}</b><small>{eligible ? `${policy.returnWindowDays - previewAge} days remaining` : `Window closed ${previewAge - policy.returnWindowDays} days ago`}</small></span></div>
          <p>Final sale tags, fulfillment status, item condition, receipt rules, and market overrides are also evaluated before approval.</p>
        </aside>
      </section>
      <article className="panel policy-form layaway-policy">
        <header><span className="eyebrow">LAYAWAY</span><h3>Flexible payments without surprises</h3></header>
        <div className="policy-checks"><label><input type="checkbox" checked={policy.layawayEnabled} onChange={(event) => update("layawayEnabled", event.target.checked)} />Offer layaway</label><label><input type="checkbox" checked={policy.holdInventory} onChange={(event) => update("holdInventory", event.target.checked)} />Reserve inventory immediately</label></div>
        <div className="field-grid">
          <label>Minimum deposit<input aria-label="Layaway deposit percent" type="number" min="0" max="100" value={policy.layawayDepositPercent} onChange={(event) => update("layawayDepositPercent", Number(event.target.value))} /><small>Percent</small></label>
          <label>Plan duration<input aria-label="Layaway term in days" type="number" min="1" value={policy.layawayTermDays} onChange={(event) => update("layawayTermDays", Number(event.target.value))} /><small>Days</small></label>
          <label>Payment rhythm<select aria-label="Layaway payment frequency" value={policy.layawayPaymentFrequency} onChange={(event) => update("layawayPaymentFrequency", event.target.value as RetailPolicy["layawayPaymentFrequency"])}><option value="weekly">Weekly</option><option value="biweekly">Every two weeks</option><option value="monthly">Monthly</option></select></label>
          <label>Grace period<input aria-label="Layaway grace period in days" type="number" min="0" value={policy.layawayGraceDays} onChange={(event) => update("layawayGraceDays", Number(event.target.value))} /><small>Days</small></label>
          <label>Cancellation fee<input aria-label="Layaway cancellation fee" type="number" min="0" value={policy.layawayCancellationFee} onChange={(event) => update("layawayCancellationFee", Number(event.target.value))} /><small>USD</small></label>
        </div>
      </article>
      <section className="policy-opportunities">
        {[["Market overrides","Adapt rules for local consumer rights without changing the tenant default."],["Reason intelligence","Track fit, quality, damage, and preference reasons to reduce preventable returns."],["Exception approvals","Give managers a visible, audited path for compassionate exceptions."],["Policy snapshots","Keep the exact policy attached to every order even after future changes."]].map(([title, body]) => <article className="panel" key={title}><Sparkles /><b>{title}</b><p>{body}</p></article>)}
      </section>
    </div>
  );
}

function AftercareCenter() {
  const [returnStatus, setReturnStatus] = useState("Review requested");
  const [layawayStatus, setLayawayStatus] = useState("Payment due tomorrow");
  const [notice, setNotice] = useState("");
  return (
    <div className="content aftercare">
      <div className="view-head">
        <div>
          <span className="eyebrow">POST PURCHASE CARE</span>
          <h2>Returns, exchanges, and layaway</h2>
          <p>Protect the customer relationship while keeping inventory, payments, and vendor attribution correct.</p>
        </div>
      </div>
      {notice && <div className="policy-saved" role="status"><Check />{notice}</div>}
      <section className="aftercare-metrics">
        {[["Open returns","6","2 need review"],["Exchange value","$684","Revenue retained"],["Active layaways","14","$4,260 remaining"],["Due this week","5","1 grace period"]].map(([label, value, note]) => <article className="panel" key={label}><small>{label}</small><b>{value}</b><span>{note}</span></article>)}
      </section>
      <section className="aftercare-grid">
        <article className="panel care-card">
          <header><div><span className="eyebrow">RETURN BR 2046</span><h3>Nia Carter</h3></div><em>{returnStatus}</em></header>
          <div className="care-product"><i><ShoppingBag /></i><span><b>Aurelia Satin Midi</b><small>Emerald · Size 8 · $168</small></span></div>
          <dl><div><dt>Reason</dt><dd>Fit · Too small</dd></div><div><dt>Received</dt><dd>12 days ago</dd></div><div><dt>Policy result</dt><dd className="positive">Eligible · 18 days remain</dd></div><div><dt>Resolution</dt><dd>Exchange for size 10</dd></div></dl>
          <div className="care-actions"><button onClick={() => { setReturnStatus("Approved for exchange"); setNotice("Exchange approved and inventory reserved for Nia Carter."); }}>Approve exchange</button><button onClick={() => setNotice("Manager review opened with the policy snapshot attached.")}>Review exception</button></div>
        </article>
        <article className="panel care-card">
          <header><div><span className="eyebrow">LAYAWAY BR L104</span><h3>Amara Nelson</h3></div><em>{layawayStatus}</em></header>
          <div className="layaway-progress"><i style={{ width: "60%" }} /><span>60% paid</span></div>
          <dl><div><dt>Original total</dt><dd>$420</dd></div><div><dt>Paid</dt><dd>$252</dd></div><div><dt>Remaining</dt><dd>$168</dd></div><div><dt>Next payment</dt><dd>$84 · August 27</dd></div></dl>
          <div className="care-actions"><button onClick={() => { setLayawayStatus("Reminder sent"); setNotice("A friendly payment reminder was sent to Amara Nelson."); }}>Send reminder</button><button onClick={() => { setLayawayStatus("Grace period applied"); setNotice("Five day grace period applied and recorded."); }}>Apply grace period</button></div>
        </article>
      </section>
      <section className="panel care-timeline">
        <div><span className="eyebrow">ACCOUNTABLE HISTORY</span><h3>Every decision leaves a clear trail</h3></div>
        <ol><li><i><Check /></i><span><b>Return requested</b><small>Customer portal · Today, 9:42 AM</small></span></li><li><i><Package /></i><span><b>Item expected at Suite 102</b><small>Vendor inventory destination preserved</small></span></li><li><i><Clock3 /></i><span><b>Inspection awaiting staff</b><small>Condition and disposition required before refund</small></span></li></ol>
      </section>
    </div>
  );
}

type BagItem = { name: string; vendor: string; price: number; fulfillment: string };

function CheckoutCenter({ openSale }: { openSale: () => void }) {
  const [bag, setBag] = useState<BagItem[]>([]);
  const [method, setMethod] = useState<"pickup" | "delivery" | "shipping">("pickup");
  const [payment, setPayment] = useState<"pay_now" | "layaway">("pay_now");
  const [placed, setPlaced] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("br-customer-bag:blossom-royall");
    if (stored) setBag(JSON.parse(stored));
  }, []);
  const subtotal = bag.reduce((sum, item) => sum + item.price, 0);
  const deliveryFee = method === "delivery" && subtotal < 150 ? 9 : method === "shipping" ? 12 : 0;
  const total = subtotal + deliveryFee;
  const deposit = Math.round(total * .2 * 100) / 100;
  const placeOrder = () => {
    const order = { id: "#BR-2053", items: bag, method, payment, total, placedAt: new Date().toISOString() };
    localStorage.setItem("br-latest-order:blossom-royall", JSON.stringify(order));
    localStorage.removeItem("br-customer-bag:blossom-royall");
    setPlaced(true);
  };
  if (!bag.length && !placed) return <div className="checkout empty-checkout"><section><span className="eyebrow">POINT OF SALE</span><h2>Ready when your customer is.</h2><p>Scan products, split tenders, create layaway plans, and send beautiful receipts.</p><button className="primary large" onClick={openSale}><ScanLine />Start checkout</button></section><div className="receipt"><BrandMark className="receipt-mark" /><h3>Blossom Royall</h3><span /><span /><span /><b>$0.00</b><footer><strong>Powered by TA Tech</strong><small>Is not where you have been but where you are going.</small></footer></div></div>;
  if (placed) return <div className="checkout-success receipt-ready"><section className="order-confirmation"><i><Check /></i><span className="eyebrow">ORDER CONFIRMED</span><h2>Your complete look is reserved.</h2><p>Order #BR-2053 is coordinated across every seller. You will receive one update when it is ready for {method === "pickup" ? "pickup" : method}.</p><div><b>${total.toFixed(2)}</b><small>{payment === "layaway" ? `$${deposit.toFixed(2)} deposit collected · balance scheduled` : "Paid in full"}</small></div><div className="receipt-actions"><button className="primary" onClick={() => window.print()}><Printer />Print receipt</button><button onClick={() => { setBag([]); setPlaced(false); }}>Done</button></div></section><article className="sale-receipt" aria-label="Receipt for order BR 2053"><header><BrandMark className="receipt-mark" /><h3>Blossom Royall</h3><small>Fashion Mall OS</small></header><div className="receipt-meta"><span><b>Order</b>#BR-2053</span><span><b>Date</b>{new Date().toLocaleDateString()}</span><span><b>Fulfillment</b>{method}</span></div><section>{bag.map((item) => <div className="receipt-line" key={item.name}><span><b>{item.name}</b><small>Sold by {item.vendor}</small><small>Return eligible for 30 days after handoff</small></span><strong>${item.price.toFixed(2)}</strong></div>)}</section><dl><div><dt>Merchandise</dt><dd>${subtotal.toFixed(2)}</dd></div>{deliveryFee > 0 && <div><dt>Delivery</dt><dd>${deliveryFee.toFixed(2)}</dd></div>}<div className="receipt-total"><dt>{payment === "layaway" ? "Deposit paid" : "Total paid"}</dt><dd>${(payment === "layaway" ? deposit : total).toFixed(2)}</dd></div>{payment === "layaway" && <div><dt>Remaining balance</dt><dd>${(total - deposit).toFixed(2)}</dd></div>}</dl><footer><strong>Powered by TA Tech</strong><small>Is not where you have been but where you are going.</small></footer></article></div>;
  return <div className="customer-checkout content inner"><div className="view-head"><div><span className="eyebrow">ONE BAG · EVERY BRAND</span><h2>Your complete edit</h2><p>Review the sellers, arrival promise, and customer protections before paying once.</p></div></div><div className="customer-checkout-grid"><section className="panel bag-lines"><div className="panel-head"><span><small className="eyebrow">{bag.length} ITEMS</small><h3>Seller attributed bag</h3></span><ShieldCheck /></div>{bag.map((item) => <article key={item.name}><i><ShoppingBag /></i><span><b>{item.name}</b><small>Sold by {item.vendor}</small><em>{item.fulfillment}</em></span><strong>${item.price.toFixed(2)}</strong></article>)}<p><ShieldCheck />Every product is tied to its seller, policy snapshot, and inventory reservation.</p></section><aside className="panel checkout-summary"><span className="eyebrow">FULFILLMENT</span><h3>How would you like it?</h3><div className="fulfillment-choices"><button className={method === "pickup" ? "active" : ""} onClick={() => setMethod("pickup")}><Store /><b>Pickup</b><small>Saturday · Free</small></button><button className={method === "delivery" ? "active" : ""} onClick={() => setMethod("delivery")}><MapPin /><b>Local delivery</b><small>Saturday · {subtotal >= 150 ? "Free" : "$9"}</small></button><button className={method === "shipping" ? "active" : ""} onClick={() => setMethod("shipping")}><Truck /><b>Shipping</b><small>2 to 4 days · $12</small></button></div><span className="eyebrow payment-title">PAYMENT</span><div className="payment-choices"><button className={payment === "pay_now" ? "active" : ""} onClick={() => setPayment("pay_now")}><b>Pay in full</b><small>${total.toFixed(2)} today</small></button><button className={payment === "layaway" ? "active" : ""} onClick={() => setPayment("layaway")}><b>Layaway</b><small>${deposit.toFixed(2)} today · 60 days</small></button></div><dl><div><dt>Merchandise</dt><dd>${subtotal.toFixed(2)}</dd></div><div><dt>Delivery</dt><dd>{deliveryFee ? `$${deliveryFee.toFixed(2)}` : "Free"}</dd></div><div><dt>{payment === "layaway" ? "Deposit due" : "Total"}</dt><dd>${(payment === "layaway" ? deposit : total).toFixed(2)}</dd></div></dl><button className="primary place-order" onClick={placeOrder}>{payment === "layaway" ? "Start secure layaway" : "Place order"}<ArrowUpRight /></button><p>Return eligibility and deadlines appear by item on your receipt. Final sale exceptions are shown before payment.</p></aside></div></div>;
}

function CustomerOrders() {
  const [order, setOrder] = useState<{ id: string; items: BagItem[]; method: string; payment: string; total: number } | null>(null);
  const [returnItem, setReturnItem] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState("Fit was not right");
  const [returnStarted, setReturnStarted] = useState(false);
  const [paymentMade, setPaymentMade] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("br-latest-order:blossom-royall");
    if (stored) setOrder(JSON.parse(stored));
  }, []);
  if (!order) return <ListView eyebrow="YOUR PURCHASES" title="No orders yet" subtitle="Completed purchases, pickup credentials, delivery tracking, layaway, and returns will appear here.">{null}</ListView>;
  const deposit = Math.round(order.total * .2 * 100) / 100;
  const balance = order.total - deposit;
  const startReturn = () => {
    if (!returnItem) return;
    localStorage.setItem("br-latest-return:blossom-royall", JSON.stringify({ orderId: order.id, item: returnItem, reason: returnReason, status: "Requested", requestedAt: new Date().toISOString() }));
    setReturnStarted(true);
  };
  return <div className="content inner customer-orders"><div className="view-head"><div><span className="eyebrow">YOUR PURCHASES</span><h2>One order. Every detail.</h2><p>Follow fulfillment, payments, protections, and returns across every participating seller.</p></div></div><section className="customer-order-hero panel"><div><span className="eyebrow">ORDER {order.id.replace("#", "")}</span><h3>{order.method === "pickup" ? "Preparing your coordinated pickup" : "Preparing your delivery"}</h3><p>All sellers have confirmed their items. Blossom Royall is bringing the order together before handoff.</p></div><div className="pickup-pass"><small>PICKUP CREDENTIAL</small><b>482 915</b><span>Show only when the team asks</span></div></section><section className="order-progress panel" aria-label="Order progress"><div className="complete"><i><Check /></i><b>Order confirmed</b><small>Payment and inventory secured</small></div><div className="complete"><i><Check /></i><b>Seller items located</b><small>Three of three scanned</small></div><div className="active"><i><Package /></i><b>Consolidating</b><small>Quality and packing check</small></div><div><i><Store /></i><b>Ready for pickup</b><small>We will notify you</small></div></section><div className="customer-order-grid"><section className="panel order-items"><div className="panel-head"><span><small className="eyebrow">ITEM PROTECTION</small><h3>Products and sellers</h3></span><ShieldCheck /></div>{order.items.map((item) => <article key={item.name}><span><b>{item.name}</b><small>Sold by {item.vendor}</small><em>Return eligible · 30 days after pickup</em></span><strong>${item.price.toFixed(2)}</strong><button onClick={() => { setReturnItem(item.name); setReturnStarted(false); }}>Return or exchange</button></article>)}</section>{order.payment === "layaway" && <aside className="panel layaway-account"><span className="eyebrow">LAYAWAY PLAN</span><h3>{paymentMade ? "Payment recorded" : `$${balance.toFixed(2)} remaining`}</h3><p>Next scheduled payment is September 11. Five day grace period applies under your saved agreement.</p><dl><div><dt>Order total</dt><dd>${order.total.toFixed(2)}</dd></div><div><dt>Deposit paid</dt><dd>${deposit.toFixed(2)}</dd></div><div><dt>Remaining</dt><dd>${paymentMade ? (balance - 62.4).toFixed(2) : balance.toFixed(2)}</dd></div></dl><button className="primary" onClick={() => setPaymentMade(true)}>{paymentMade ? "Payment complete" : "Pay $62.40"}</button><small>No surprise fees. Cancellation and refund terms remain attached to this plan.</small></aside>}</div>{returnItem && <section className="return-sheet panel" aria-live="polite"><div><span className="eyebrow">RETURN OR EXCHANGE</span><h3>{returnItem}</h3><p>Eligible through September 27. The original seller and policy remain attached automatically.</p></div>{returnStarted ? <div className="return-confirmed"><Check /><span><b>Request received</b><small>Bring the item to Blossom Royall or wait for return instructions. Refunds begin after inspection.</small></span></div> : <div><label>What can we help with?<select aria-label="Return reason" value={returnReason} onChange={(e) => setReturnReason(e.target.value)}><option>Fit was not right</option><option>Prefer a different color</option><option>Item arrived damaged</option><option>Item was not as described</option><option>Changed my mind</option></select></label><button className="primary" onClick={startReturn}>Start request</button></div>}</section>}</div>;
}

function CustomerShop({ go }: { go: (destination: string) => void }) {
  const picks = [
    [
      "Aurelia Satin Midi",
      "Because you love emerald occasionwear",
      "$168",
      "96% match",
    ],
    [
      "Mila Gold Clutch",
      "Pairs with your saved looks",
      "$86",
      "Complete the look",
    ],
    [
      "Noelle Silk Trousers",
      "Inspired by your recent fitting",
      "$142",
      "Your size is in stock",
    ],
  ];
  const [hidden, setHidden] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [showWhy, setShowWhy] = useState(false);
  const [showStyle, setShowStyle] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showHeritage, setShowHeritage] = useState(false);
  const [occasion, setOccasion] = useState("Wedding guest");
  const [budget, setBudget] = useState(350);
  const [needBy, setNeedBy] = useState("Saturday");
  const [missionReady, setMissionReady] = useState(false);
  const [completeLookAdded, setCompleteLookAdded] = useState(false);
  const visiblePicks = picks.filter((pick) => !hidden.includes(pick[0]));
  const missionSavings = budget - 312;
  const hidePick = (name: string) => setHidden((current) => [...current, name]);
  const openBag = () => {
    const bag = completeLookAdded
      ? [
          { name: "Aurelia Satin Midi", vendor: "Africstyle Fashion", price: 168, fulfillment: "Pickup today" },
          { name: "Mila Gold Clutch", vendor: "Blossom Collections", price: 86, fulfillment: "Vendor transfer to store" },
          { name: "Sculpted Gold Earring", vendor: "Nia Collective", price: 58, fulfillment: "Pickup today" },
        ]
      : saved.map((name) => ({ name, vendor: "Blossom Royall partner", price: name === "Mila Gold Clutch" ? 86 : name === "Aurelia Satin Midi" ? 168 : 142, fulfillment: "Pickup today" }));
    localStorage.setItem("br-customer-bag:blossom-royall", JSON.stringify(bag));
    go("Checkout");
  };
  return (
    <div className="content shop">
      <nav className="collection-nav" aria-label="Shop collections">
        {[
          "New arrivals",
          "Dresses",
          "Tailoring",
          "Accessories",
          "Occasion",
        ].map((collection) => (
          <button key={collection}>{collection}</button>
        ))}
      </nav>
      <section className="shopping-mission panel">
        <div className="mission-copy"><Sparkles /><span><small className="eyebrow">SHOP BY YOUR REAL LIFE</small><h2>Tell us the moment. We will build the answer.</h2><p>Blossom considers fit, budget, timing, delivery, cultural preferences, and the pieces you already own before recommending anything.</p></span></div>
        <div className="mission-fields">
          <label>What are you dressing for?<select aria-label="Shopping occasion" value={occasion} onChange={(e) => { setOccasion(e.target.value); setMissionReady(false); }}><option>Wedding guest</option><option>Traditional ceremony</option><option>Work and leadership</option><option>Date night</option><option>Vacation</option><option>Everyday refresh</option><option>A gift</option></select></label>
          <label>Complete look budget<input aria-label="Complete look budget" type="number" min="50" step="25" value={budget} onChange={(e) => { setBudget(Number(e.target.value)); setMissionReady(false); }} /></label>
          <label>When do you need it?<select aria-label="Need by" value={needBy} onChange={(e) => { setNeedBy(e.target.value); setMissionReady(false); }}><option>Today</option><option>Tomorrow</option><option>Saturday</option><option>Next week</option><option>No rush</option></select></label>
          <button className="primary" onClick={() => setMissionReady(true)}>Build my edit <ArrowUpRight /></button>
        </div>
        {missionReady && <div className="mission-result" role="status"><div><span className="eyebrow">YOUR COMPLETE EDIT</span><h3>{occasion}, ready by {needBy.toLowerCase()}</h3><p>Three pieces from three independent brands. All available in your fit. One checkout and one pickup.</p></div><div className="mission-items"><span><b>Aurelia Satin Midi</b><small>Africstyle Fashion · Size 8</small><em>$168</em></span><span><b>Mila Gold Clutch</b><small>Blossom Collections · Champagne</small><em>$86</em></span><span><b>Sculpted Gold Earring</b><small>Nia Collective · Verified maker</small><em>$58</em></span></div><footer><span><b>$312</b><small>${missionSavings} under your ${budget} budget</small></span><button onClick={() => setCompleteLookAdded(true)}>{completeLookAdded ? "Complete look added" : "Add complete look"} {completeLookAdded ? <Check /> : <ShoppingBag />}</button></footer></div>}
      </section>
      <section className="shop-hero">
        <div>
          <span className="eyebrow">THE EVENING EDIT · MADE FOR AMARA</span>
          <h2>An entrance worth remembering.</h2>
          <p>
            A private edit of sculptural silhouettes, luminous satin, and
            finishing pieces selected in your size.
          </p>
          <div className="hero-actions">
            <button
              className="primary"
              onClick={() => setShowStyle((current) => !current)}
            >
              {showStyle ? "Save my style" : "Refine my style"}
            </button>
            <button className="concierge-action">Book a styling appointment</button>
          </div>
          {showStyle && (
            <div className="style-signals" aria-label="Style signals">
              <span>Emerald</span>
              <span>Occasionwear</span>
              <span>Size 8</span>
              <span>Atelier Omi</span>
            </div>
          )}
        </div>
      </section>
      <section className="luxury-services" aria-label="Blossom services">
        <article>
          <small>PRIVATE CLIENTELING</small>
          <b>Your stylist, one message away</b>
        </article>
        <article>
          <small>SEAMLESS FULFILLMENT</small>
          <b>Collect today or deliver beautifully</b>
        </article>
        <article>
          <small>PERFECTED FOR YOU</small>
          <b>Fittings and alterations coordinated</b>
        </article>
      </section>
      <section className="heritage-edit">
        <div className="heritage-image" role="img" aria-label="Contemporary African designers in tailored textile looks" />
        <div className="heritage-copy">
          <span className="eyebrow">THE AFRICAN DESIGNERS EDIT</span>
          <h2>Craft carried forward.</h2>
          <p>Contemporary tailoring meets richly woven cloth and expressive print, selected from designers shaping a new language of African luxury.</p>
          <button onClick={() => setShowHeritage((current) => !current)}>{showHeritage ? "Close collection notes" : "Explore the collection"}<ArrowUpRight /></button>
          {showHeritage && <div className="heritage-notes" aria-live="polite"><b>Designed with provenance in view</b><p>Each listing can carry its designer story, textile origin, maker attribution, care guidance, and limited production details.</p><div><span>Textile story</span><span>Designer profile</span><span>Made in</span><span>Care and repair</span></div></div>}
        </div>
      </section>
      <section className="shop-head">
        <div>
          <span className="eyebrow">YOUR PRIVATE EDIT</span>
          <h2>Selected with intention</h2>
        </div>
        <button onClick={() => setShowWhy((current) => !current)}>
          <CircleHelp />
          Why these picks?
        </button>
      </section>
      {showWhy && (
        <section className="recommendation-explainer panel" aria-live="polite">
          <BrainCircuit />
          <div>
            <b>Recommendations you can understand</b>
            <p>
              These picks use your saved looks, preferred colors, size, recent
              fitting activity, and favorite brands. You can hide anything that
              does not feel right.
            </p>
          </div>
        </section>
      )}
      <div className="recommendations">
        {visiblePicks.map((p, index) => (
          <article key={p[0]}>
            <div className={"recommendation-art r" + index}>
              <ShoppingBag />
              <em>{p[3]}</em>
            </div>
            <small>{p[1]}</small>
            <h3>{p[0]}</h3>
            <div className="pick-confidence"><span><ShieldCheck />Verified seller</span><span><Truck />{index === 1 ? "Ships in 2 to 3 days" : "Pickup today"}</span></div>
            <footer>
              <b>{p[2]}</b>
              <button
                aria-label={`${saved.includes(p[0]) ? "Remove" : "Add"} ${p[0]} ${saved.includes(p[0]) ? "from" : "to"} bag`}
                onClick={() =>
                  setSaved((current) =>
                    current.includes(p[0])
                      ? current.filter((item) => item !== p[0])
                      : [...current, p[0]],
                  )
                }
              >
                {saved.includes(p[0]) ? <Check /> : <Plus />}
              </button>
            </footer>
            <button className="not-for-me" onClick={() => hidePick(p[0])}>
              Not for me
            </button>
          </article>
        ))}
      </div>
      {hidden.length > 0 && (
        <button className="undo-picks" onClick={() => setHidden([])}>
          Restore hidden picks
        </button>
      )}
      {(saved.length > 0 || completeLookAdded) && <section className="smart-bag-bar" aria-label="Shopping bag summary"><span><ShoppingBag /><b>{completeLookAdded ? 3 : saved.length} {completeLookAdded || saved.length !== 1 ? "pieces" : "piece"}</b><small>{completeLookAdded ? "$312 · Three brands · One coordinated pickup" : "Your private edit is ready"}</small></span><button onClick={openBag}>Review bag <ArrowUpRight /></button></section>}
      <section className="shop-row panel">
        <div>
          <span className="eyebrow">SHOP YOUR HISTORY</span>
          <h3>More from brands you love</h3>
          <p>
            New arrivals from Atelier Omi and Nia Collective, tuned to your
            preferred colors and fit.
          </p>
          {showHistory && (
            <small className="history-note">
              Your storefront has 12 new arrivals in your preferred size.
            </small>
          )}
        </div>
        <button onClick={() => setShowHistory((current) => !current)}>
          {showHistory
            ? "Hide familiar favorites"
            : "Explore familiar favorites"}{" "}
          <ArrowUpRight />
        </button>
      </section>
    </div>
  );
}

function IntelligenceHub() {
  const [briefReady, setBriefReady] = useState(false);
  const [reorderApproved, setReorderApproved] = useState(false);
  return (
    <ListView
      eyebrow="BLOSSOM INTELLIGENCE"
      title="Demand you can act on"
      subtitle="Signals are explainable, privacy aware, and tied to an owner action."
    >
      <section className="intelligence-hero panel">
        <div>
          <span className="eyebrow">TODAY'S OPPORTUNITY</span>
          <h3>Emerald occasionwear is accelerating.</h3>
          <p>
            Demand is up 31% from searches, fitting activity, completed sales,
            and repeat customer interest. Current stock covers about four
            selling days.
          </p>
          <div className="signal-row">
            <span>
              <TrendingUp />
              31% demand lift
            </span>
            <span>
              <Heart />
              42% repeat buyers
            </span>
            <span>
              <Package />4 days of stock
            </span>
          </div>
        </div>
        <button className="primary" onClick={() => setBriefReady(true)}>
          {briefReady ? "Brief ready" : "Create merchandising brief"}
        </button>
      </section>
      {briefReady && (
        <section className="brief-card" aria-live="polite">
          <span className="eyebrow">MERCHANDISING BRIEF</span>
          <h3>Protect the weekend opportunity.</h3>
          <ol>
            <li>Feature Aurelia Satin Midi and Mila Gold Clutch together.</li>
            <li>Reorder six emerald size 8 units from Atelier Omi.</li>
            <li>
              Send the edited look to customers who saved emerald occasionwear.
            </li>
          </ol>
        </section>
      )}
      <section className="intelligence-grid">
        <article className="panel">
          <span className="eyebrow">CUSTOMER VALUE</span>
          <h3>Recommendation assisted revenue</h3>
          <b className="big-stat">$1,420</b>
          <p>
            29% of today&apos;s sales began with a personalized discovery
            touchpoint.
          </p>
        </article>
        <article className="panel">
          <span className="eyebrow">BRAND MOMENTUM</span>
          <h3>Atelier Omi</h3>
          <b className="big-stat">+18%</b>
          <p>
            Strongest lift from repeat buyers and complete the look pairings.
          </p>
        </article>
        <article className="panel action-card">
          <span className="eyebrow">INVENTORY DECISION</span>
          <h3>Reorder emerald size 8</h3>
          <p>Six units protect projected demand through Sunday.</p>
          <button onClick={() => setReorderApproved((current) => !current)}>
            {reorderApproved ? (
              <>
                <Check />
                Reorder approved
              </>
            ) : (
              "Approve reorder"
            )}
          </button>
        </article>
      </section>
      <section className="panel trust-card">
        <BrainCircuit />
        <div>
          <span className="eyebrow">TRUST AND CONTROL</span>
          <h3>Intelligence stays accountable.</h3>
          <p>
            Every recommendation has a reason, customers can refine or hide
            suggestions, and customer data is used only within the tenant and
            their consent.
          </p>
        </div>
      </section>
    </ListView>
  );
}
function Dashboard({
  go,
  orders,
  openSale,
}: {
  go: (x: string) => void;
  orders: Order[];
  openSale: () => void;
}) {
  return (
    <div className="content">
      <section className="welcome">
        <div>
          <span className="eyebrow">GOOD MORNING, DELLY</span>
          <h2>Your mall is moving beautifully.</h2>
          <p>
            Sales are 18% ahead of last Wednesday. Three items need your
            attention.
          </p>
        </div>
        <button onClick={openSale}>
          Open checkout <ArrowUpRight />
        </button>
      </section>
      <section className="metrics">
        {[
          ["Net sales", "$4,820", "+18%"],
          ["Orders", "47", "+9"],
          ["Avg. order", "$102.55", "+6.4%"],
          ["Mall traffic", "286", "High"],
        ].map((m, i) => (
          <article key={m[0]}>
            <i className={"m" + i}>
              {i === 0 ? "$" : i === 1 ? "↗" : i === 2 ? "◌" : "◇"}
            </i>
            <span>
              <small>{m[0]}</small>
              <b>{m[1]}</b>
              <em>{m[2]} today</em>
            </span>
          </article>
        ))}
      </section>
      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel-head">
            <span>
              <small className="eyebrow">TODAY</small>
              <h3>Sales performance</h3>
            </span>
            <select aria-label="Sales period">
              <option>Today</option>
              <option>This week</option>
            </select>
          </div>
          <div className="chart">
            {[28, 42, 35, 58, 49, 78, 64, 88, 57].map((h, i) => (
              <i
                key={i}
                style={{ height: h + "%" }}
                className={i === 7 ? "peak" : ""}
              />
            ))}
          </div>
          <footer>
            <span>
              Today <b>$4,820</b>
            </span>
            <span>
              Last Wednesday <b>$4,086</b>
            </span>
          </footer>
        </article>
        <article className="panel attention">
          <div className="panel-head">
            <span>
              <small className="eyebrow">PRIORITIES</small>
              <h3>Needs attention</h3>
            </span>
            <b>3</b>
          </div>
          {[
            [
              Package,
              "12 low-stock variants",
              "Reorder before the weekend",
              "Products",
            ],
            [
              CircleDollarSign,
              "Vendor rent due today",
              "Nia Collective · $800",
              "Vendors",
            ],
            [
              FileSignature,
              "2 signatures waiting",
              "Lease renewals · 3 days",
              "Vendors",
            ],
          ].map(([Icon, t, s, target]: any) => (
            <button key={t} onClick={() => go(target)}>
              <i>
                <Icon />
              </i>
              <span>
                <b>{t}</b>
                <small>{s}</small>
              </span>
              <ChevronRight />
            </button>
          ))}
        </article>
      </section>
      <section className="dashboard-grid lower">
        <article className="panel orders">
          <div className="panel-head">
            <span>
              <small className="eyebrow">LIVE</small>
              <h3>Recent orders</h3>
            </span>
            <button onClick={() => go("Orders")}>
              View all <ChevronRight />
            </button>
          </div>
          <OrderTable rows={orders} />
        </article>
        <article className="panel intelligence">
          <div className="panel-head">
            <span>
              <small className="eyebrow">BLOSSOM INTELLIGENCE</small>
              <h3>What’s shifting</h3>
            </span>
            <Sparkles />
          </div>
          <div>
            <small>Trending now</small>
            <b>Emerald occasionwear</b>
            <p>Searches and fitting-room requests are up 31% this week.</p>
            <button onClick={() => go("Products")}>
              See matching stock <ArrowUpRight />
            </button>
          </div>
        </article>
      </section>
      <section className="brand-performance panel">
        <div className="panel-head">
          <span>
            <small className="eyebrow">BRAND INTELLIGENCE</small>
            <h3>What customers are buying</h3>
          </span>
          <button onClick={() => go("Intelligence")}>
            Open full analysis <ArrowUpRight />
          </button>
        </div>
        <div className="brand-table">
          <div>
            <span>Brand</span>
            <span>Sales</span>
            <span>Units</span>
            <span>Repeat buyers</span>
            <span>Trend</span>
          </div>
          {[
            ["Atelier Omi", "$12,480", "86", "42%", "+18%"],
            ["Nia Collective", "$8,920", "64", "37%", "+11%"],
            ["Maison Halo", "$7,610", "51", "29%", "+6%"],
          ].map((row) => (
            <div key={row[0]}>
              {row.map((cell, index) => (
                <span key={cell} className={index === 4 ? "positive" : ""}>
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
function OrderTable({ rows }: { rows: Order[] }) {
  return (
    <div className="table">
      <div>
        <span>Order</span>
        <span>Customer</span>
        <span>Status</span>
        <span>Total</span>
      </div>
      {rows.map((o) => (
        <div key={o.id}>
          <span>
            <b>{o.id}</b>
            <small>{o.time}</small>
          </span>
          <span>{o.customer}</span>
          <em className={o.status.toLowerCase()}>{o.status}</em>
          <b>{o.total}</b>
        </div>
      ))}
      {!rows.length && <p>No matching orders.</p>}
    </div>
  );
}
