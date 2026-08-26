"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleDollarSign,
  CircleHelp,
  Clock3,
  FileSignature,
  Heart,
  LayoutDashboard,
  Menu,
  Moon,
  Package,
  Plus,
  ScanLine,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Sun,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

const nav = [
  ["Command Center", LayoutDashboard],
  ["Customer Shop", Sparkles],
  ["Checkout", CircleDollarSign],
  ["Orders", ShoppingBag],
  ["Products", Package],
  ["Vendors", Store],
  ["Staff", Users],
  ["Intelligence", BrainCircuit],
] as const;
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
  ["Mila Gold Clutch", "Champagne", "BR-MIL-CH-OS", 11, "$86"],
  ["Noelle Silk Trousers", "Black · 10", "BR-NOE-BK-10", 2, "$142"],
];
const vendors = [
  ["AO", "Atelier Omi", "Suite 102", "Paid", "$12,480"],
  ["NC", "Nia Collective", "Suite 107", "$800 due", "$8,920"],
  ["MH", "Maison Halo", "Suite 112", "Paid", "$7,610"],
];

export default function Home() {
  const [active, setActive] = useState("Command Center"),
    [menu, setMenu] = useState(false),
    [sale, setSale] = useState(false),
    [done, setDone] = useState(false),
    [query, setQuery] = useState(""),
    [theme, setTheme] = useState("light");
  useEffect(() => {
    const saved = localStorage.getItem("br-theme");
    const next =
      saved ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.documentElement.dataset.appReady = "true";
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
  return (
    <div className="shell">
      <aside className={menu ? "open" : ""} aria-label="Primary navigation">
        <div className="brand">
          <b>BR</b>
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
          <i>AR</i>
          <span>
            <b>Avery Royall</b>
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
        {active === "Customer Shop" && <CustomerShop />}
        {active === "Orders" && (
          <ListView
            eyebrow="FULFILLMENT"
            title="All orders"
            subtitle="Track every purchase from payment to pickup."
          >
            <OrderTable rows={filtered} />
          </ListView>
        )}
        {active === "Products" && (
          <ListView
            eyebrow="CATALOG"
            title="Products & inventory"
            subtitle="Live stock across every vendor and sales channel."
            action="Add product"
          >
            <div className="product-grid">
              {products.map((p) => (
                <article className="product" key={p[2] as string}>
                  <div>
                    <ShoppingBag />
                    <span>
                      {(p[3] as number) <= 3 ? "Low stock" : "In stock"}
                    </span>
                  </div>
                  <small>{p[2]}</small>
                  <h3>{p[0]}</h3>
                  <p>{p[1]}</p>
                  <footer>
                    <b>{p[4]}</b>
                    <span>{p[3]} available</span>
                  </footer>
                </article>
              ))}
            </div>
          </ListView>
        )}
        {active === "Vendors" && (
          <ListView
            eyebrow="MALL PARTNERS"
            title="Vendors"
            subtitle="Leases, rent, inventory, and performance in one place."
            action="Invite vendor"
          >
            <div className="vendors">
              {vendors.map((v) => (
                <article className="panel vendor" key={v[1]}>
                  <i>{v[0]}</i>
                  <span>
                    <h3>{v[1]}</h3>
                    <small>{v[2]}</small>
                  </span>
                  <span>
                    <small>30-day sales</small>
                    <b>{v[4]}</b>
                  </span>
                  <em
                    className={(v[3] as string).includes("due") ? "warn" : ""}
                  >
                    {v[3]}
                  </em>
                  <ChevronRight />
                </article>
              ))}
            </div>
          </ListView>
        )}
        {active === "Checkout" && (
          <div className="checkout">
            <section>
              <span className="eyebrow">POINT OF SALE</span>
              <h2>Ready when your customer is.</h2>
              <p>
                Scan products, split tenders, create layaway plans, and send
                beautiful receipts.
              </p>
              <button className="primary large" onClick={() => setSale(true)}>
                <ScanLine />
                Start checkout
              </button>
            </section>
            <div className="receipt">
              <i>BR</i>
              <h3>Blossom Royall</h3>
              <span />
              <span />
              <span />
              <b>$0.00</b>
            </div>
          </div>
        )}
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
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: string;
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
        {action && (
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

function CustomerShop() {
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
  const visiblePicks = picks.filter((pick) => !hidden.includes(pick[0]));
  const hidePick = (name: string) => setHidden((current) => [...current, name]);
  return (
    <div className="content shop">
      <section className="shop-hero">
        <span className="eyebrow">MADE FOR AMARA</span>
        <h2>Your style, beautifully understood.</h2>
        <p>
          Fresh pieces selected from your sizes, saved looks, purchases, and the
          brands you return to.
        </p>
        <button
          className="primary"
          onClick={() => setShowStyle((current) => !current)}
        >
          {showStyle ? "Save my style" : "Refine my style"}
        </button>
        {showStyle && (
          <div className="style-signals" aria-label="Style signals">
            <span>Emerald</span>
            <span>Occasionwear</span>
            <span>Size 8</span>
            <span>Atelier Omi</span>
          </div>
        )}
      </section>
      <section className="shop-head">
        <div>
          <span className="eyebrow">TOP PICKS FOR YOU</span>
          <h2>We think you will love these</h2>
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
          <span className="eyebrow">GOOD MORNING, AVERY</span>
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
