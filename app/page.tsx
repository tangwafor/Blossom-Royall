"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Banknote,
  Bell,
  BookOpen,
  BrainCircuit,
  Check,
  ClipboardList,
  ChevronRight,
  CircleDollarSign,
  CircleHelp,
  Clock3,
  Download,
  FileSignature,
  Heart,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Menu,
  Moon,
  Package,
  Plus,
  Printer,
  RotateCcw,
  Ruler,
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
  Trash2,
  Truck,
  Upload,
  Users,
  X,
} from "lucide-react";
import BrandMark from "./brand-mark";
import Link from "next/link";
import {
  loadAccountFitProfile,
  loadTenantVendors,
  loadTenantOrders,
  loadTenantProducts,
  removeTenantVendor,
  resolveTenantContext,
  removeAccountFitProfiles,
  saveAccountFitProfile,
  saveTenantVendor,
  type TenantContext,
  type TenantProductSummary,
} from "../lib/supabase/tenant-runtime";
import {
  useCommerceSettings,
  useDeliverySettings,
  useRetailPolicy,
  useStoreSettings,
  type CommerceSettings,
  type DeliverySettings,
  type RetailPolicy,
} from "../lib/tenant-config";

const nav = [
  ["Command Center", LayoutDashboard],
  ["Customer Shop", Sparkles],
  ["My Fit", Ruler],
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
  ["Business Setup", Store],
  ["Help", BookOpen],
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
  [
    "Mila Gold Clutch",
    "Champagne",
    "BR-MIL-CH-OS",
    0,
    "$86",
    14,
    "Online only, vendor fulfilled",
  ],
  ["Noelle Silk Trousers", "Black · 10", "BR-NOE-BK-10", 2, "$142"],
];
const vendors = [
  [
    "BC",
    "Blossom Collections",
    "House collection",
    "Launch ready",
    "Confirmed",
  ],
  ["JK", "Jose Kako", "Men’s formalwear", "Onboarding", "Confirmed"],
  [
    "AF",
    "Africstyle Fashion",
    "African heritage fashion",
    "Launch ready",
    "Confirmed",
  ],
  [
    "SI",
    "Sapologie Italiano",
    "Suits and accessories",
    "Onboarding",
    "Confirmed",
  ],
];

type VendorRecord = {
  id: string;
  name: string;
  category: string;
  contactName: string;
  email: string;
  phone: string;
  status: "Invited" | "Onboarding" | "Launch ready" | "Suspended";
  roster: "Confirmed" | "Prospect";
  createdAt: string;
};

type VendorImportProduct = {
  sourceId: string;
  name: string;
  price: number;
  currency: string;
  categories: string[];
  options: { name: string; values: string[] }[];
  image: string;
  sourceUrl: string;
  sourceAvailability: string;
};

type VendorImportDraft = {
  vendor: {
    publicName: string;
    website: string;
    email: string;
    phone: string;
    description: string;
  };
  provenance: {
    retrievedAt: string;
    publicCatalogTotal: number;
    note: string;
    confirmation?: {
      status: string;
      confirmedBy: string;
      confirmedAt: string;
      scope: string;
    };
  };
  categories: string[];
  products: VendorImportProduct[];
};

type VendorAuditEvent = {
  id: string;
  vendorName: string;
  action: string;
  at: string;
};

type VendorAgreement = {
  id: string;
  vendorId: string;
  monthlyRent: number;
  deposit: number;
  commissionPercent: number;
  dueDay: number;
  startDate: string;
  endDate: string;
  status: "Draft" | "Ready for legal review" | "Sent for signature" | "Signed";
};

type VendorPayment = {
  id: string;
  agreementId: string;
  vendorName: string;
  type: "Deposit" | "Rent" | "Adjustment";
  amount: number;
  method: "Card" | "ACH" | "Cash" | "Check";
  receiptNumber: string;
  paidAt: string;
};

type StaffRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  job: string;
  department: string;
  hourlyRate: number;
  status: "Invited" | "Active" | "On leave" | "Inactive";
  shiftStart: string;
  shiftEnd: string;
  scheduledDays: string[];
  clockedInAt: string | null;
  breakMinutes: number;
};

type LeaveRequest = {
  id: string;
  staffId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "Pending" | "Approved" | "Declined";
  createdAt: string;
};

type StaffAuditEvent = {
  id: string;
  staffName: string;
  action: string;
  at: string;
};

const defaultVendorRecords: VendorRecord[] = [
  {
    id: "blossom-collections",
    name: "Blossom Collections",
    category: "House collection",
    contactName: "Delly",
    email: "",
    phone: "",
    status: "Launch ready",
    roster: "Confirmed",
    createdAt: "2026-08-26T09:00:00.000Z",
  },
  {
    id: "jose-kako",
    name: "Jose Kako",
    category: "Men’s formalwear",
    contactName: "",
    email: "",
    phone: "",
    status: "Onboarding",
    roster: "Confirmed",
    createdAt: "2026-08-26T09:00:00.000Z",
  },
  {
    id: "africstyle-fashion",
    name: "Africstyle Fashion",
    category: "African heritage fashion",
    contactName: "",
    email: "africstyle@yahoo.ca",
    phone: "+1 647 677 9440",
    status: "Onboarding",
    roster: "Confirmed",
    createdAt: "2026-08-26T09:00:00.000Z",
  },
  {
    id: "sapologie-italiano",
    name: "Sapologie Italiano",
    category: "Suits and accessories",
    contactName: "",
    email: "",
    phone: "",
    status: "Onboarding",
    roster: "Confirmed",
    createdAt: "2026-08-26T09:00:00.000Z",
  },
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
    [notificationsOpen, setNotificationsOpen] = useState(false),
    [readNotifications, setReadNotifications] = useState<string[]>([]),
    [assistantOpen, setAssistantOpen] = useState(false),
    [assistantName, setAssistantName] = useState("Blossom"),
    [assistantNameDraft, setAssistantNameDraft] = useState("Blossom"),
    [assistantQuestion, setAssistantQuestion] = useState(""),
    [assistantAnswer, setAssistantAnswer] = useState(""),
    [tourStep, setTourStep] = useState<number | null>(null);
  const { value: storeSettings } = useStoreSettings();
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null);
  const [visibleOrders, setVisibleOrders] = useState<Order[]>(orders);
  useEffect(() => {
    const saved = localStorage.getItem("br-theme");
    const next =
      saved ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.documentElement.dataset.appReady = "true";
    const savedNotifications = localStorage.getItem(
      "br-reviewed-notifications:blossom-royall",
    );
    if (savedNotifications)
      setReadNotifications(JSON.parse(savedNotifications));
    const savedAssistantName = localStorage.getItem(
      "br-assistant-name:blossom-royall",
    );
    if (savedAssistantName) {
      setAssistantName(savedAssistantName);
      setAssistantNameDraft(savedAssistantName);
    }
    if (!localStorage.getItem("br-tour-complete")) setTourStep(0);
    void resolveTenantContext().then(async (context) => {
      setTenantContext(context);
      if (context.mode === "production") {
        try {
          setVisibleOrders((await loadTenantOrders(context)) as Order[]);
        } catch {
          setVisibleOrders([]);
        }
      }
    });
  }, []);
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("br-theme", next);
    document.documentElement.dataset.theme = next;
  };
  const filtered = useMemo(
    () =>
      visibleOrders.filter((o) =>
        (o.id + o.customer).toLowerCase().includes(query.toLowerCase()),
      ),
    [query, visibleOrders],
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
  const reviewNotifications = (ids: string[]) => {
    const next = Array.from(new Set([...readNotifications, ...ids]));
    setReadNotifications(next);
    localStorage.setItem(
      "br-reviewed-notifications:blossom-royall",
      JSON.stringify(next),
    );
  };
  const askAssistant = (question: string) => {
    const value = question.trim();
    if (!value) return;
    const lower = value.toLowerCase();
    const response =
      lower.includes("return") || lower.includes("exchange")
        ? "Returns follow the tenant policy saved in Policies. Open Aftercare to verify the original policy snapshot, item eligibility, seller attribution, inspection, and resolution before approving money or inventory movement."
        : lower.includes("vendor") ||
            lower.includes("rent") ||
            lower.includes("lease")
          ? "Vendor records, onboarding links, brand packages, agreements, rent, deposits, and receipts are managed in Vendors. Production signatures and payment transfers remain approval controlled."
          : lower.includes("staff") ||
              lower.includes("schedule") ||
              lower.includes("payroll") ||
              lower.includes("leave")
            ? "Staff contains the roster, schedules, clock activity, leave review, and gross pay estimates. Real payroll requires approved employee data, wage rules, permissions, and a configured provider."
            : lower.includes("deliver") ||
                lower.includes("pickup") ||
                lower.includes("ship")
              ? "Delivery coordinates store pickup, local delivery, and carrier shipping. Confirm every vendor item and custody scan before releasing a consolidated order."
              : lower.includes("stock") ||
                  lower.includes("inventory") ||
                  lower.includes("product")
                ? "Products shows onsite and online inventory by vendor. Use the collection studio for one item or bulk photographs, then review names and seller attribution before publishing."
                : lower.includes("sale") ||
                    lower.includes("checkout") ||
                    lower.includes("cashier")
                  ? "Checkout accepts products from multiple vendors in one sale while preserving seller attribution for inventory, receipts, returns, and the vendor ledger."
                  : "I can guide you through sales, vendors, inventory, delivery, returns, policies, staff, and customer orders. I use the current Blossom Royall operating rules and never initiate a protected production action on your behalf.";
    setAssistantAnswer(response);
  };
  return (
    <div className="shell">
      <aside className={menu ? "open" : ""} aria-label="Primary navigation">
        <div className="brand">
          <BrandMark className="brand-nav-mark" />
          <span>
            <strong>{storeSettings.publicName}</strong>
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
              {label === "Orders" && visibleOrders.length > 0 && <em>{visibleOrders.length}</em>}
            </button>
          ))}
        </nav>
        <a className="profile" href="/auth">
          <i>D</i>
          <span>
            <b>{storeSettings.ownerDisplayName}</b>
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
            <button
              className="bell notification-toggle"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              onClick={() => setNotificationsOpen((value) => !value)}
            >
              <Bell />
              {readNotifications.length < 3 && (
                <i className="notification-count">
                  {3 - readNotifications.length}
                </i>
              )}
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
        {tenantContext?.mode === "preview" && (
          <aside className="preview-data-banner" aria-label="Data source">
            <ShieldCheck />
            <span><b>Preview data</b><small>{tenantContext.reason} Figures and names on operating screens are examples until production records are connected.</small></span>
            <Link href="/auth">Open secure workspace</Link>
          </aside>
        )}
        {tenantContext?.mode === "production" && (
          <aside className="production-data-banner" aria-label="Data source">
            <ShieldCheck />
            <span><b>Live tenant records</b><small>Only records authorized for this store membership appear here.</small></span>
          </aside>
        )}
        {notificationsOpen && (
          <section
            className="notification-center"
            role="dialog"
            aria-label="Notifications"
          >
            <header>
              <span>
                <small className="eyebrow">OWNER INBOX</small>
                <h2>Needs your attention</h2>
              </span>
              <button
                aria-label="Close notifications"
                onClick={() => setNotificationsOpen(false)}
              >
                <X />
              </button>
            </header>
            {[
              {
                id: "stock",
                title: "12 low stock variants",
                detail: "Reorder before the weekend",
                destination: "Products",
              },
              {
                id: "rent",
                title: "Vendor rent due today",
                detail: "Nia Collective · $800",
                destination: "Vendors",
              },
              {
                id: "leave",
                title: "Leave request awaiting review",
                detail: "Open the staff decision queue",
                destination: "Staff",
              },
            ].map((item) => (
              <article
                className={readNotifications.includes(item.id) ? "read" : ""}
                key={item.id}
              >
                <span>
                  <b>{item.title}</b>
                  <small>{item.detail}</small>
                </span>
                <button
                  onClick={() => {
                    reviewNotifications([item.id]);
                    setNotificationsOpen(false);
                    go(item.destination);
                  }}
                >
                  Review
                </button>
              </article>
            ))}
            <footer>
              <button
                onClick={() => reviewNotifications(["stock", "rent", "leave"])}
              >
                <Check />
                Mark all reviewed
              </button>
            </footer>
          </section>
        )}
        {active === "Command Center" && (
          <Dashboard go={go} orders={filtered} openSale={() => setSale(true)} preview={tenantContext?.mode !== "production"} />
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
              <div
                className="tour-progress"
                aria-label={`Step ${tourStep + 1} of ${tourSteps.length}`}
              >
                {tourSteps.map((_, index) => (
                  <i
                    key={index}
                    className={index <= tourStep ? "active" : ""}
                  />
                ))}
              </div>
              <small>
                GUIDED TOUR · {tourStep + 1} OF {tourSteps.length}
              </small>
              <h2 id="tour-title">{tourSteps[tourStep].title}</h2>
              <p>{tourSteps[tourStep].body}</p>
              <footer>
                <button className="tour-skip" onClick={closeTour}>
                  Skip tour
                </button>
                <div>
                  {tourStep > 0 && (
                    <button onClick={() => showTourStep(tourStep - 1)}>
                      Back
                    </button>
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
        {active === "My Fit" && <MyFit go={go} />}
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
          >
            <VendorOperations />
          </ListView>
        )}
        {active === "Shared Commerce" && <SharedCommerceCenter />}
        {active === "Delivery" && <DeliveryCenter />}
        {active === "Checkout" && (
          <CheckoutCenter openSale={() => setSale(true)} />
        )}
        {active === "Staff" && (
          <ListView
            eyebrow="TODAY'S TEAM"
            title="Staff & payroll"
            subtitle="Schedules, clock activity, leave, and payroll estimates in one accountable workspace."
          >
            <StaffOperations />
          </ListView>
        )}
        {active === "Intelligence" && <IntelligenceHub />}
        {active === "Policies" && <PolicyCenter />}
        {active === "Business Setup" && <BusinessSetup />}
        {active === "Help" && (
          <HelpCenter go={go} startTour={() => showTourStep(0)} />
        )}
      </main>
      <button
        className="assistant-launcher"
        aria-label={`Open ${assistantName} assistant`}
        onClick={() => setAssistantOpen(true)}
      >
        <MessageCircle />
        <span>{assistantName}</span>
      </button>
      {assistantOpen && (
        <section
          className="assistant-panel"
          role="dialog"
          aria-modal="true"
          aria-label={`${assistantName} assistant`}
        >
          <header>
            <span>
              <i>
                <Sparkles />
              </i>
              <span>
                <small>TENANT ASSISTANT</small>
                <b>{assistantName}</b>
              </span>
            </span>
            <button
              aria-label="Close assistant"
              onClick={() => setAssistantOpen(false)}
            >
              <X />
            </button>
          </header>
          <p>
            Ask about the work on this screen or choose a common task. Answers
            stay within your role and Blossom Royall policies.
          </p>
          <div className="assistant-context">
            <small>CURRENT WORKSPACE</small>
            <b>{active}</b>
          </div>
          <div className="assistant-prompts">
            {[
              "How do returns work?",
              "How do I onboard a vendor?",
              "Explain shared checkout",
              "What needs production approval?",
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => {
                  setAssistantQuestion(prompt);
                  askAssistant(prompt);
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
          {assistantAnswer && (
            <output className="assistant-answer" role="status">
              <Sparkles />
              <span>
                <b>{assistantName}</b>
                <p>{assistantAnswer}</p>
              </span>
            </output>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              askAssistant(assistantQuestion);
            }}
          >
            <label>
              <span>Ask {assistantName}</span>
              <textarea
                aria-label={`Ask ${assistantName}`}
                value={assistantQuestion}
                onChange={(event) => setAssistantQuestion(event.target.value)}
                placeholder="How do I..."
              />
            </label>
            <button className="primary" type="submit">
              Ask
            </button>
          </form>
          <details>
            <summary>Assistant settings</summary>
            <label>
              Assistant name
              <input
                aria-label="Assistant name"
                value={assistantNameDraft}
                onChange={(event) => setAssistantNameDraft(event.target.value)}
              />
            </label>
            <button
              onClick={() => {
                const next = assistantNameDraft.trim() || "Blossom";
                setAssistantName(next);
                setAssistantNameDraft(next);
                localStorage.setItem("br-assistant-name:blossom-royall", next);
              }}
            >
              Save assistant name
            </button>
          </details>
          <footer>
            <ShieldCheck />
            <span>
              <b>Protected actions stay protected</b>
              <small>
                No payment, payroll, permission, legal, or production database
                action happens from an answer.
              </small>
            </span>
          </footer>
        </section>
      )}
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
      candidate.onerror = () =>
        reject(
          new Error(
            "This image format cannot be read by your browser. Please export it as PNG, JPG, WebP, or SVG.",
          ),
        );
      candidate.src = sourceUrl;
    });
    const maxEdge = 1600;
    const scale = Math.min(
      1,
      maxEdge / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this image.");
    context.drawImage(image, 0, 0, width, height);
    const logoDataUrl = canvas.toDataURL("image/webp", 0.88);
    if (logoDataUrl.length > 1_350_000)
      throw new Error(
        "The optimized logo is still too large. Choose an image with less detail or a smaller resolution.",
      );
    const safeBase =
      file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase() || "vendor-logo";
    return {
      logoDataUrl,
      fileName: `${safeBase}.webp`,
      originalFileName: file.name,
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

type ProductDraft = {
  id: string;
  name: string;
  vendor: string;
  imageDataUrl: string;
  fileName: string;
  originalFileName: string;
  width: number;
  height: number;
  status: "Draft" | "Published";
};

function productNameFromFile(fileName: string) {
  return (
    fileName
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .trim() || "Untitled item"
  );
}

async function normalizeProductImage(file: File) {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const candidate = new Image();
      candidate.onload = () => resolve(candidate);
      candidate.onerror = () =>
        reject(
          new Error(
            `${file.name} cannot be read. Export it as PNG, JPG, or WebP and try again.`,
          ),
        );
      candidate.src = sourceUrl;
    });
    const scale = Math.min(
      1,
      1800 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Your browser could not prepare this item image.");
    context.fillStyle = "#f7f3ef";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const imageDataUrl = canvas.toDataURL("image/webp", 0.86);
    if (imageDataUrl.length > 1_750_000)
      throw new Error(`${file.name} is still too large after formatting.`);
    const safeBase =
      file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase() || "product";
    return {
      imageDataUrl,
      fileName: `${safeBase}.webp`,
      originalFileName: file.name,
      width,
      height,
    };
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
  const [tenantContext, setTenantContext] = useState<TenantContext>({ mode: "preview", storeId: null, userId: null, role: null, reason: "Checking production access." });
  const [tenantProducts, setTenantProducts] = useState<TenantProductSummary[]>([]);
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) setDrafts(JSON.parse(stored));
    void resolveTenantContext().then(async (context) => {
      setTenantContext(context);
      if (context.mode === "production") {
        try {
          setTenantProducts(await loadTenantProducts(context));
        } catch {
          setTenantProducts([]);
        }
      }
    });
  }, []);
  const persist = (next: ProductDraft[]) => {
    setDrafts(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };
  const importItems = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const files = Array.from(
      (form.elements.namedItem("itemImages") as HTMLInputElement).files || [],
    );
    if (!files.length)
      return setMessage("Choose one item photo or an entire collection.");
    if (files.length > 40)
      return setMessage("Import up to 40 item photos at a time.");
    if (files.some((file) => file.size > 20_000_000))
      return setMessage("Each original photo must be smaller than 20 MB.");
    setProcessing(true);
    setMessage(
      `Formatting ${files.length} ${files.length === 1 ? "item" : "items"}...`,
    );
    try {
      const normalized = await Promise.all(files.map(normalizeProductImage));
      const next = normalized.map<ProductDraft>((item) => ({
        id: crypto.randomUUID(),
        name: productNameFromFile(item.originalFileName),
        vendor: String(data.get("vendor")),
        ...item,
        status: "Draft",
      }));
      persist([...next, ...drafts]);
      form.reset();
      setOpen(false);
      setMessage(
        `${next.length} ${next.length === 1 ? "item was" : "items were"} formatted as WebP and added to the collection studio.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The collection could not be formatted.",
      );
    } finally {
      setProcessing(false);
    }
  };
  const updateName = (id: string, name: string) =>
    persist(drafts.map((item) => (item.id === id ? { ...item, name } : item)));
  const publish = (id: string) =>
    persist(
      drafts.map((item) =>
        item.id === id ? { ...item, status: "Published" } : item,
      ),
    );
  const publishAll = () =>
    persist(drafts.map((item) => ({ ...item, status: "Published" })));
  return (
    <>
      <section className="panel collection-studio">
        <div className={`tenant-runtime ${tenantContext.mode}`}><ShieldCheck /><span><b>{tenantContext.mode === "production" ? "Tenant catalog active" : "Private preview mode"}</b><small>{tenantContext.reason}</small></span></div>
        <div className="panel-head">
          <span>
            <small className="eyebrow">COLLECTION STUDIO</small>
            <h3>Luxury item exposure</h3>
          </span>
          {tenantContext.mode === "preview" && <div>
            <button onClick={() => setOpen((value) => !value)}>
              <Upload />
              {open ? "Close importer" : "Add one or bulk upload"}
            </button>
            {drafts.some((item) => item.status === "Draft") && (
              <button className="primary" onClick={publishAll}>
                <Sparkles />
                Publish all
              </button>
            )}
          </div>}
        </div>
        <p>
          Drop in one hero item or a complete collection. Every photograph is
          resized, renamed, and converted to a storefront ready WebP asset
          automatically.
        </p>
        {tenantContext.mode === "production" && <p className="control-note"><ShieldCheck />Production displays only tenant catalog records. New product publishing activates after private media storage and the mandatory fresh database snapshot are available.</p>}
        {tenantContext.mode === "preview" && open && (
          <form className="collection-importer" onSubmit={importItems}>
            <label>
              Vendor
              <select name="vendor" required defaultValue="">
                <option value="" disabled>
                  Choose the owning vendor
                </option>
                {vendors.map((vendor) => (
                  <option key={vendor[1]}>{vendor[1]}</option>
                ))}
              </select>
            </label>
            <label className="collection-file">
              Item photographs
              <input
                name="itemImages"
                aria-label="Item photographs"
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                required
              />
              <small>
                Select one image or up to 40 at once. Filenames become editable
                item names.
              </small>
            </label>
            <button className="primary" disabled={processing}>
              <Upload />
              {processing ? "Formatting collection" : "Format and stage items"}
            </button>
          </form>
        )}
        {message && (
          <output className="policy-saved" aria-live="polite">
            {message}
          </output>
        )}
        {drafts.length > 0 && (
          <div className="collection-preview">
            {drafts.map((item) => (
              <article key={item.id}>
                <div className="collection-image">
                  <img src={item.imageDataUrl} alt={item.name} />
                  <em className={item.status === "Draft" ? "warn" : ""}>
                    {item.status}
                  </em>
                </div>
                <small>{item.vendor}</small>
                <input
                  aria-label={`Item name for ${item.originalFileName}`}
                  value={item.name}
                  onChange={(event) => updateName(item.id, event.target.value)}
                />
                <p>
                  {item.width} × {item.height} pixels · {item.fileName}
                </p>
                {item.status === "Draft" ? (
                  <button onClick={() => publish(item.id)}>
                    <Sparkles />
                    Publish item
                  </button>
                ) : (
                  <span>
                    <Check />
                    Live in storefront
                  </span>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      {tenantContext.mode === "production" ? <div className="product-grid">
        {tenantProducts.map((product) => {
          const quantity = product.variants.reduce((sum, variant) => sum + variant.quantity, 0);
          const price = product.variants[0]?.price || 0;
          return <article className="product" key={product.id}><div><ShoppingBag /><span>{product.status}</span></div><small>{product.variants[0]?.sku || "No SKU"}</small><h3>{product.name}</h3><p>{product.category}</p><footer><b>${price.toFixed(2)}</b><span>{quantity} available</span></footer></article>;
        })}
        {!tenantProducts.length && <section className="panel help-empty"><Package /><h3>No production products yet</h3><p>Vendor and product records will appear here after approved catalog data is added.</p></section>}
      </div> : <div className="product-grid">
        {products.map((p) => (
          <article className="product" key={p[2] as string}>
            <div>
              <ShoppingBag />
              <span>
                {(p[3] as number) === 0
                  ? "Online only"
                  : (p[3] as number) <= 3
                    ? "Low stock"
                    : "In stock"}
              </span>
            </div>
            <small>{p[2]}</small>
            <h3>{p[0]}</h3>
            <p>{p[1]}</p>
            <footer>
              <b>{p[4]}</b>
              <span>
                {p[3]} onsite{p[5] !== undefined ? ` · ${p[5]} online` : ""}
              </span>
            </footer>
            {p[6] && <small className="channel-source">{p[6]}</small>}
          </article>
        ))}
      </div>}
    </>
  );
}

function VendorOperations() {
  const storageKey = "br-vendors:blossom-royall";
  const auditKey = "br-vendor-audit:blossom-royall";
  const [records, setRecords] = useState<VendorRecord[]>(defaultVendorRecords);
  const [audits, setAudits] = useState<VendorAuditEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VendorRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [invitationLink, setInvitationLink] = useState("");
  const [tenantContext, setTenantContext] = useState<TenantContext>({
    mode: "preview",
    storeId: null,
    userId: null,
    role: null,
    reason: "Checking production access.",
  });
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    const storedAudits = localStorage.getItem(auditKey);
    if (stored) setRecords(JSON.parse(stored));
    if (storedAudits) setAudits(JSON.parse(storedAudits));
    void resolveTenantContext().then(async (context) => {
      setTenantContext(context);
      if (context.mode !== "production") return;
      try {
        const productionVendors = await loadTenantVendors(context);
        setRecords(
          productionVendors.map((vendor) => ({
            id: vendor.id,
            name: vendor.name,
            category: "Tenant vendor",
            contactName: "",
            email: "",
            phone: "",
            status:
              vendor.status === "suspended"
                ? "Suspended"
                : vendor.status === "active"
                  ? "Launch ready"
                  : "Onboarding",
            roster: "Confirmed",
            createdAt: vendor.created_at,
          })),
        );
      } catch {
        setTenantContext({
          ...context,
          mode: "preview",
          reason:
            "Production vendor records could not be loaded. Changes remain in this device preview.",
        });
      }
    });
  }, []);
  const persist = (
    next: VendorRecord[],
    vendorName: string,
    action: string,
  ) => {
    const event: VendorAuditEvent = {
      id: crypto.randomUUID(),
      vendorName,
      action,
      at: new Date().toISOString(),
    };
    const nextAudits = [event, ...audits].slice(0, 20);
    setRecords(next);
    setAudits(nextAudits);
    localStorage.setItem(storageKey, JSON.stringify(next));
    localStorage.setItem(auditKey, JSON.stringify(nextAudits));
  };
  const closeForm = () => {
    setOpen(false);
    setEditing(null);
  };
  const startEdit = (vendor: VendorRecord) => {
    setEditing(vendor);
    setOpen(true);
    setNotice("");
  };
  const saveVendor = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const record: VendorRecord = {
      id: editing?.id || crypto.randomUUID(),
      name,
      category: String(data.get("category") || "").trim(),
      contactName: String(data.get("contactName") || "").trim(),
      email: String(data.get("email") || "")
        .trim()
        .toLowerCase(),
      phone: String(data.get("phone") || "").trim(),
      status: String(data.get("status") || "Invited") as VendorRecord["status"],
      roster: String(
        data.get("roster") || "Prospect",
      ) as VendorRecord["roster"],
      createdAt: editing?.createdAt || new Date().toISOString(),
    };
    const next = editing
      ? records.map((vendor) => (vendor.id === editing.id ? record : vendor))
      : [record, ...records];
    persist(next, name, editing ? "Vendor profile updated" : "Vendor invited");
    if (tenantContext.mode === "production")
      void saveTenantVendor(tenantContext, {
        id: record.id,
        name: record.name,
        status:
          record.status === "Suspended"
            ? "suspended"
            : record.status === "Launch ready"
              ? "active"
              : "onboarding",
      }).catch(() =>
        setNotice(
          "The vendor remains saved on this device, but production synchronization needs attention.",
        ),
      );
    if (!editing) {
      const query = new URLSearchParams({
        role: "vendor",
        brandName: name,
        contactName: record.contactName,
        email: record.email,
      });
      setInvitationLink(
        `${window.location.origin}/readiness?${query.toString()}`,
      );
    }
    setNotice(
      editing
        ? `${name} was updated.`
        : `${name} was added. Share the private onboarding link below.`,
    );
    closeForm();
  };
  const toggleStatus = (vendor: VendorRecord) => {
    const status = vendor.status === "Suspended" ? "Onboarding" : "Suspended";
    persist(
      records.map((item) =>
        item.id === vendor.id ? { ...item, status } : item,
      ),
      vendor.name,
      status === "Suspended" ? "Vendor suspended" : "Vendor restored",
    );
    if (tenantContext.mode === "production")
      void saveTenantVendor(tenantContext, {
        id: vendor.id,
        name: vendor.name,
        status: status === "Suspended" ? "suspended" : "onboarding",
      }).catch(() =>
        setNotice(
          "The status changed on this device, but production synchronization needs attention.",
        ),
      );
    setNotice(
      status === "Suspended"
        ? `${vendor.name} was suspended. Selling access should be revoked by production authorization.`
        : `${vendor.name} was restored to onboarding.`,
    );
  };
  const removeVendor = (vendor: VendorRecord) => {
    if (deleteId !== vendor.id) {
      setDeleteId(vendor.id);
      setNotice(`Select remove again to confirm deleting ${vendor.name}.`);
      return;
    }
    persist(
      records.filter((item) => item.id !== vendor.id),
      vendor.name,
      "Vendor removed",
    );
    if (tenantContext.mode === "production")
      void removeTenantVendor(tenantContext, vendor.id).catch(() =>
        setNotice(
          "The local record was removed, but production removal needs attention.",
        ),
      );
    setDeleteId(null);
    setNotice(`${vendor.name} was removed from this tenant roster.`);
  };
  return (
    <>
      <section className="panel vendor-operations">
        <div className="panel-head">
          <span>
            <small className="eyebrow">TENANT VENDOR DIRECTORY</small>
            <h3>{records.length} managed brands</h3>
          </span>
          <button
            className="primary"
            onClick={() => {
              setEditing(null);
              setOpen((value) => !value);
              setNotice("");
            }}
          >
            <Plus />
            {open && !editing ? "Close invitation" : "Invite vendor"}
          </button>
        </div>
        <p>
          Add and maintain vendors without engineering work. Each change stays
          attached to the Blossom Royall tenant and creates an accountable
          history entry.
        </p>
        <div className={`tenant-runtime ${tenantContext.mode}`} role="status">
          <ShieldCheck />
          <span>
            <b>
              {tenantContext.mode === "production"
                ? "Production tenant connected"
                : "Private preview mode"}
            </b>
            <small>{tenantContext.reason}</small>
          </span>
        </div>
        {open && (
          <form
            className="vendor-operations-form"
            onSubmit={saveVendor}
            key={editing?.id || "new-vendor"}
          >
            <div>
              <span className="eyebrow">
                {editing ? "EDIT VENDOR" : "NEW VENDOR"}
              </span>
              <h3>
                {editing
                  ? `Update ${editing.name}`
                  : "Prepare a vendor invitation"}
              </h3>
            </div>
            <label>
              Public brand name
              <input
                name="name"
                required
                defaultValue={editing?.name}
                autoComplete="organization"
              />
            </label>
            <label>
              Category
              <input
                name="category"
                required
                defaultValue={editing?.category}
                placeholder="Fashion, beauty, accessories, services"
              />
            </label>
            <label>
              Contact person
              <input
                name="contactName"
                required
                defaultValue={editing?.contactName}
                autoComplete="name"
              />
            </label>
            <label>
              Email
              <input
                name="email"
                type="email"
                required
                defaultValue={editing?.email}
                autoComplete="email"
              />
            </label>
            <label>
              Phone
              <input
                name="phone"
                type="tel"
                defaultValue={editing?.phone}
                autoComplete="tel"
              />
            </label>
            <label>
              Onboarding status
              <select name="status" defaultValue={editing?.status || "Invited"}>
                <option>Invited</option>
                <option>Onboarding</option>
                <option>Launch ready</option>
                <option>Suspended</option>
              </select>
            </label>
            <label>
              Opening roster
              <select
                name="roster"
                defaultValue={editing?.roster || "Prospect"}
              >
                <option>Prospect</option>
                <option>Confirmed</option>
              </select>
            </label>
            <footer>
              <button type="button" onClick={closeForm}>
                Cancel
              </button>
              <button className="primary" type="submit">
                <Check />
                {editing ? "Save vendor" : "Create invitation"}
              </button>
            </footer>
          </form>
        )}
        {notice && (
          <output className="policy-saved" role="status">
            {notice}
          </output>
        )}
        {invitationLink && (
          <div className="vendor-invitation-link">
            <span>
              <small>VENDOR ONBOARDING LINK</small>
              <a href={invitationLink}>{invitationLink}</a>
            </span>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(invitationLink);
                setNotice("Vendor onboarding link copied.");
              }}
            >
              Copy link
            </button>
          </div>
        )}
        <div className="vendor-directory">
          {records.map((vendor) => (
            <article className="panel vendor" key={vendor.id}>
              <i>
                {vendor.name
                  .split(/\s+/)
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </i>
              <span>
                <h3>{vendor.name}</h3>
                <small>{vendor.category}</small>
                {vendor.email && (
                  <a href={`mailto:${vendor.email}`}>{vendor.email}</a>
                )}
              </span>
              <span>
                <small>Opening roster</small>
                <b>{vendor.roster}</b>
              </span>
              <em
                className={
                  vendor.status === "Onboarding" ||
                  vendor.status === "Invited" ||
                  vendor.status === "Suspended"
                    ? "warn"
                    : ""
                }
              >
                {vendor.status}
              </em>
              <div className="vendor-row-actions">
                <button onClick={() => startEdit(vendor)}>Edit</button>
                <button onClick={() => toggleStatus(vendor)}>
                  {vendor.status === "Suspended" ? "Restore" : "Suspend"}
                </button>
                <button
                  className={deleteId === vendor.id ? "danger" : ""}
                  onClick={() => removeVendor(vendor)}
                >
                  {deleteId === vendor.id ? "Confirm remove" : "Remove"}
                </button>
              </div>
            </article>
          ))}
        </div>
        {audits.length > 0 && (
          <details className="vendor-audit">
            <summary>View vendor change history</summary>
            <ol>
              {audits.map((event) => (
                <li key={event.id}>
                  <span>
                    <b>{event.action}</b>
                    <small>{event.vendorName}</small>
                  </span>
                  <time>{new Date(event.at).toLocaleString()}</time>
                </li>
              ))}
            </ol>
          </details>
        )}
      </section>
      <AfricstylePilotImport />
      <VendorLeaseRentCenter vendors={records} />
      <VendorBrandManager />
    </>
  );
}

function AfricstylePilotImport() {
  const storageKey = "br-import-draft:africstyle-fashion";
  const [draft, setDraft] = useState<VendorImportDraft | null>(null);
  const [category, setCategory] = useState("All categories");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void fetch("/vendor-imports/africstyle-fashion.json")
      .then((response) => {
        if (!response.ok) throw new Error("Catalog draft is unavailable");
        return response.json() as Promise<VendorImportDraft>;
      })
      .then(setDraft)
      .catch(() => setNotice("The Africstyle research draft could not be loaded."));
    const saved = localStorage.getItem(storageKey);
    if (saved) setSelected(JSON.parse(saved));
  }, []);

  const visible = useMemo(() => {
    if (!draft) return [];
    const search = query.trim().toLowerCase();
    return draft.products.filter(
      (product) =>
        (category === "All categories" || product.categories.includes(category)) &&
        (!search ||
          product.name.toLowerCase().includes(search) ||
          product.categories.some((item) => item.toLowerCase().includes(search))),
    );
  }, [category, draft, query]);

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );

  const saveDraft = () => {
    localStorage.setItem(storageKey, JSON.stringify(selected));
    setNotice(
      `${selected.length} verbally confirmed products are staged for Blossom Royall review. Nothing has been published.`,
    );
  };

  return (
    <section className="panel vendor-pilot-import">
      <div className="panel-head">
        <span>
          <small className="eyebrow">CONFIRMED CATALOG STAGING</small>
          <h3>Delly catalog staging</h3>
        </span>
        <a href="https://africstylefashion.com/" target="_blank" rel="noreferrer">
          Visit official website
          <ArrowUpRight />
        </a>
      </div>
      <p>
        Delly verbally confirmed that the public Africstyle catalog may be
        staged for Blossom Royall review. Inventory, fulfillment, and final
        publication remain pending.
      </p>
      {draft && (
        <>
          <div className="pilot-facts">
            <span><b>{draft.products.length}</b><small>staged products</small></span>
            <span><b>{draft.categories.length}</b><small>source categories</small></span>
            <span><b>{selected.length}</b><small>selected for staging</small></span>
            <span><b>Staged</b><small>publication status</small></span>
          </div>
          <div className="pilot-contact">
            <a href={`mailto:${draft.vendor.email}`}>{draft.vendor.email}</a>
            <a href={`tel:${draft.vendor.phone.replace(/\s/g, "")}`}>{draft.vendor.phone}</a>
            <time>
              Researched {new Date(draft.provenance.retrievedAt).toLocaleDateString()}
            </time>
          </div>
          <div className="pilot-controls">
            <label>
              Search catalog
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Toghu, Kente, activewear"
              />
            </label>
            <label>
              Catalog filter
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option>All categories</option>
                {draft.categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={() =>
                setSelected((current) => [
                  ...new Set([...current, ...visible.map((product) => product.sourceId)]),
                ])
              }
            >
              Select visible
            </button>
          </div>
          <div className="pilot-product-list">
            {visible.slice(0, 24).map((product) => (
              <article key={product.sourceId}>
                <label>
                  <input
                    type="checkbox"
                    checked={selected.includes(product.sourceId)}
                    onChange={() => toggle(product.sourceId)}
                  />
                  <span>
                    <b>{product.name}</b>
                    <small>{product.categories.join(", ") || "Uncategorized"}</small>
                    <small>
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: product.currency,
                      }).format(product.price)}
                      {product.options.length
                        ? `, ${product.options.map((option) => `${option.name}: ${option.values.join(", ")}`).join("; ")}`
                        : ""}
                    </small>
                  </span>
                </label>
                <a href={product.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Open ${product.name} on Africstyle`}>
                  <ArrowUpRight />
                </a>
              </article>
            ))}
          </div>
          {visible.length > 24 && (
            <small className="pilot-result-note">
              Showing 24 of {visible.length}. Refine the search or select all visible results.
            </small>
          )}
          <footer>
            <button type="button" onClick={() => setSelected([])}>Clear selection</button>
            <button className="primary" type="button" onClick={saveDraft}>
              <Check /> Save staged selection
            </button>
          </footer>
        </>
      )}
      {notice && <output className="policy-saved" role="status">{notice}</output>}
    </section>
  );
}

function VendorLeaseRentCenter({ vendors }: { vendors: VendorRecord[] }) {
  const agreementKey = "br-vendor-agreements:blossom-royall";
  const paymentKey = "br-vendor-payments:blossom-royall";
  const [agreements, setAgreements] = useState<VendorAgreement[]>([]);
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VendorAgreement | null>(null);
  const [notice, setNotice] = useState("");
  const [receipt, setReceipt] = useState<VendorPayment | null>(null);
  useEffect(() => {
    const savedAgreements = localStorage.getItem(agreementKey);
    const savedPayments = localStorage.getItem(paymentKey);
    if (savedAgreements) setAgreements(JSON.parse(savedAgreements));
    if (savedPayments) setPayments(JSON.parse(savedPayments));
  }, []);
  const persistAgreements = (next: VendorAgreement[]) => {
    setAgreements(next);
    localStorage.setItem(agreementKey, JSON.stringify(next));
  };
  const persistPayments = (next: VendorPayment[]) => {
    setPayments(next);
    localStorage.setItem(paymentKey, JSON.stringify(next));
  };
  const saveAgreement = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const agreement: VendorAgreement = {
      id: editing?.id || crypto.randomUUID(),
      vendorId: String(data.get("vendorId")),
      monthlyRent: Number(data.get("monthlyRent")),
      deposit: Number(data.get("deposit")),
      commissionPercent: Number(data.get("commissionPercent")),
      dueDay: Number(data.get("dueDay")),
      startDate: String(data.get("startDate")),
      endDate: String(data.get("endDate")),
      status: String(data.get("status")) as VendorAgreement["status"],
    };
    persistAgreements(
      editing
        ? agreements.map((item) => (item.id === editing.id ? agreement : item))
        : [agreement, ...agreements],
    );
    setNotice(
      editing
        ? "Agreement terms updated and recorded."
        : "Agreement draft created and recorded.",
    );
    setEditing(null);
    setOpen(false);
  };
  const recordPayment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const agreementId = String(data.get("agreementId"));
    const agreement = agreements.find((item) => item.id === agreementId);
    const vendor = vendors.find((item) => item.id === agreement?.vendorId);
    if (!agreement || !vendor) return;
    const next: VendorPayment = {
      id: crypto.randomUUID(),
      agreementId,
      vendorName: vendor.name,
      type: String(data.get("type")) as VendorPayment["type"],
      amount: Number(data.get("amount")),
      method: String(data.get("method")) as VendorPayment["method"],
      receiptNumber: `BRR-${String(payments.length + 1).padStart(5, "0")}`,
      paidAt: new Date().toISOString(),
    };
    persistPayments([next, ...payments]);
    setReceipt(next);
    setNotice(
      `${next.type} payment recorded with receipt ${next.receiptNumber}.`,
    );
    event.currentTarget.reset();
  };
  const vendorName = (vendorId: string) =>
    vendors.find((vendor) => vendor.id === vendorId)?.name || "Former vendor";
  return (
    <section className="panel vendor-finance">
      <div className="panel-head">
        <span>
          <small className="eyebrow">LEASES AND RENT</small>
          <h3>Vendor agreements and payments</h3>
        </span>
        <button
          onClick={() => {
            setEditing(null);
            setOpen((value) => !value);
          }}
        >
          <FileSignature />
          {open && !editing ? "Close draft" : "New agreement"}
        </button>
      </div>
      <p>
        Configure commercial terms in the interface, record payments, and issue
        branded receipts. Legal wording and electronic signature activation
        remain blocked until the owner approves the lease template and signature
        provider.
      </p>
      {open && (
        <form
          className="vendor-agreement-form"
          onSubmit={saveAgreement}
          key={editing?.id || "new-agreement"}
        >
          <label>
            Vendor
            <select
              name="vendorId"
              required
              defaultValue={editing?.vendorId || ""}
            >
              <option value="" disabled>
                Choose vendor
              </option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Monthly rent
            <span>
              <b>$</b>
              <input
                name="monthlyRent"
                type="number"
                min="0"
                step=".01"
                required
                defaultValue={editing?.monthlyRent || ""}
              />
            </span>
          </label>
          <label>
            Security deposit
            <span>
              <b>$</b>
              <input
                name="deposit"
                type="number"
                min="0"
                step=".01"
                required
                defaultValue={editing?.deposit || ""}
              />
            </span>
          </label>
          <label>
            Sales commission
            <span>
              <input
                name="commissionPercent"
                type="number"
                min="0"
                max="100"
                step=".1"
                required
                defaultValue={editing?.commissionPercent || 0}
              />
              <b>%</b>
            </span>
          </label>
          <label>
            Rent due day
            <input
              name="dueDay"
              type="number"
              min="1"
              max="28"
              required
              defaultValue={editing?.dueDay || 1}
            />
          </label>
          <label>
            Start date
            <input
              name="startDate"
              type="date"
              required
              defaultValue={editing?.startDate}
            />
          </label>
          <label>
            End date
            <input
              name="endDate"
              type="date"
              required
              defaultValue={editing?.endDate}
            />
          </label>
          <label>
            Agreement status
            <select name="status" defaultValue={editing?.status || "Draft"}>
              <option>Draft</option>
              <option>Ready for legal review</option>
              <option>Sent for signature</option>
              <option>Signed</option>
            </select>
          </label>
          <footer>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
            >
              Cancel
            </button>
            <button className="primary" type="submit">
              <Check />
              Save agreement
            </button>
          </footer>
        </form>
      )}
      {notice && (
        <output className="policy-saved" role="status">
          {notice}
        </output>
      )}
      {agreements.length > 0 && (
        <div className="agreement-ledger">
          {agreements.map((agreement) => (
            <article key={agreement.id}>
              <span>
                <b>{vendorName(agreement.vendorId)}</b>
                <small>
                  {agreement.startDate} to {agreement.endDate}
                </small>
              </span>
              <span>
                <small>Monthly rent</small>
                <b>${agreement.monthlyRent.toFixed(2)}</b>
              </span>
              <span>
                <small>Deposit</small>
                <b>${agreement.deposit.toFixed(2)}</b>
              </span>
              <span>
                <small>Commission</small>
                <b>{agreement.commissionPercent}%</b>
              </span>
              <em>{agreement.status}</em>
              <button
                onClick={() => {
                  setEditing(agreement);
                  setOpen(true);
                }}
              >
                Edit terms
              </button>
            </article>
          ))}
        </div>
      )}
      {agreements.length > 0 && (
        <form className="vendor-payment-form" onSubmit={recordPayment}>
          <div>
            <span className="eyebrow">RECORD PAYMENT</span>
            <h3>Create an accountable rent receipt</h3>
          </div>
          <label>
            Agreement
            <select name="agreementId" required defaultValue="">
              <option value="" disabled>
                Choose vendor agreement
              </option>
              {agreements.map((agreement) => (
                <option key={agreement.id} value={agreement.id}>
                  {vendorName(agreement.vendorId)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Payment type
            <select name="type">
              <option>Rent</option>
              <option>Deposit</option>
              <option>Adjustment</option>
            </select>
          </label>
          <label>
            Amount
            <span>
              <b>$</b>
              <input
                name="amount"
                type="number"
                min=".01"
                step=".01"
                required
              />
            </span>
          </label>
          <label>
            Method
            <select name="method">
              <option>Card</option>
              <option>ACH</option>
              <option>Cash</option>
              <option>Check</option>
            </select>
          </label>
          <button className="primary" type="submit">
            <Banknote />
            Record and receipt
          </button>
        </form>
      )}
      {receipt && (
        <article
          className="vendor-rent-receipt"
          aria-label={`Receipt ${receipt.receiptNumber}`}
        >
          <header>
            <BrandMark />
            <span>
              <b>Blossom Royall</b>
              <small>Vendor payment receipt</small>
            </span>
          </header>
          <dl>
            <div>
              <dt>Receipt</dt>
              <dd>{receipt.receiptNumber}</dd>
            </div>
            <div>
              <dt>Vendor</dt>
              <dd>{receipt.vendorName}</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>{receipt.type}</dd>
            </div>
            <div>
              <dt>Method</dt>
              <dd>{receipt.method}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{new Date(receipt.paidAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt>Amount paid</dt>
              <dd>${receipt.amount.toFixed(2)}</dd>
            </div>
          </dl>
          <footer>
            <span>
              <b>Powered by TA Tech</b>
              <small>Is not where you have been but where you are going.</small>
            </span>
            <button onClick={() => window.print()}>
              <Printer />
              Print receipt
            </button>
          </footer>
        </article>
      )}
      {payments.length > 0 && (
        <details className="vendor-audit">
          <summary>View payment ledger</summary>
          <ol>
            {payments.map((payment) => (
              <li key={payment.id}>
                <span>
                  <b>
                    {payment.receiptNumber} · {payment.type}
                  </b>
                  <small>
                    {payment.vendorName} · {payment.method}
                  </small>
                </span>
                <time>
                  ${payment.amount.toFixed(2)} ·{" "}
                  {new Date(payment.paidAt).toLocaleDateString()}
                </time>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
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
    if (!file || !file.size)
      return setMessage("Choose the official logo file.");
    if (!file.type.startsWith("image/") && !file.name.match(/\.(heic|heif)$/i))
      return setMessage(
        "Choose an image file. We will format it automatically.",
      );
    if (file.size > 15_000_000)
      return setMessage("Choose an original image smaller than 15 MB.");
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
      setMessage(
        error instanceof Error
          ? error.message
          : "We could not format this logo.",
      );
    }
  };
  const approve = (id: string) =>
    persist(
      submissions.map((item) =>
        item.id === id ? { ...item, status: "Approved" } : item,
      ),
    );
  return (
    <section className="panel vendor-brand-manager">
      <div className="panel-head">
        <span>
          <small className="eyebrow">BRAND ASSET QUEUE</small>
          <h3>Vendor supplied logos</h3>
        </span>
        <button onClick={() => setOpen((value) => !value)}>
          <Upload />
          {open ? "Close submission" : "Submit brand package"}
        </button>
      </div>
      <p>
        Vendors provide their official artwork and confirm permission. Owners
        approve what appears in the mall without a code change.
      </p>
      {open && (
        <form className="vendor-brand-form" onSubmit={submit}>
          <label>
            Brand name
            <input
              name="brandName"
              required
              placeholder="Official customer facing name"
            />
          </label>
          <label>
            Vendor contact email
            <input
              name="contactEmail"
              type="email"
              required
              placeholder="brand@example.com"
            />
          </label>
          <label>
            Official logo file
            <input
              name="logo"
              type="file"
              accept="image/*,.heic,.heif"
              required
            />
            <small>
              PNG, JPG, WebP, SVG, and browser readable images are automatically
              normalized.
            </small>
          </label>
          <label className="brand-rights">
            <input name="rights" type="checkbox" required />
            <span>
              I confirm that I own this logo or am authorized to provide it to
              Blossom Royall for marketplace use.
            </span>
          </label>
          <button className="primary">
            <Upload />
            Send for owner review
          </button>
        </form>
      )}
      {message && <output className="policy-saved">{message}</output>}
      {submissions.length > 0 && (
        <div className="brand-submission-list">
          {submissions.map((item) => (
            <article key={item.id}>
              <img
                src={item.logoDataUrl}
                alt={`${item.brandName} submitted logo`}
              />
              <span>
                <b>{item.brandName}</b>
                <small>
                  {item.contactEmail} · {item.originalFileName || item.fileName}{" "}
                  → {item.fileName}
                </small>
                <small>
                  {item.width && item.height
                    ? `${item.width} × ${item.height} pixels · `
                    : ""}
                  WebP marketplace asset
                </small>
              </span>
              <em className={item.status === "Awaiting review" ? "warn" : ""}>
                {item.status}
              </em>
              {item.status === "Awaiting review" && (
                <button onClick={() => approve(item.id)}>
                  <Check />
                  Approve logo
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      <small className="control-note">
        <ShieldCheck />
        Preview submissions stay in this browser. Production uses tenant scoped
        private object storage, malware checks, version history, approval audit
        records, and reversible publishing.
      </small>
    </section>
  );
}

function BusinessSetup() {
  const { value: settings, update, save, saved } = useStoreSettings();
  return (
    <div className="content inner policy-center">
      <div className="view-head">
        <div>
          <span className="eyebrow">OWNER CONTROL</span>
          <h2>Business setup</h2>
          <p>
            Manage the identity and operating details used throughout the mall,
            checkout, customer messages, and printed receipts.
          </p>
        </div>
        <button className="primary" onClick={save}>
          <Check />
          {saved ? "Business settings saved" : "Save business settings"}
        </button>
      </div>
      {saved && (
        <div className="policy-saved" role="status">
          <Check />
          Changes are active throughout this tenant preview.
        </div>
      )}
      <section className="policy-grid">
        <article className="panel policy-form">
          <header>
            <span className="eyebrow">IDENTITY</span>
            <h3>Public and legal details</h3>
          </header>
          <div className="field-grid">
            <label>
              Public store name
              <input
                aria-label="Public store name"
                value={settings.publicName}
                onChange={(event) => update("publicName", event.target.value)}
              />
            </label>
            <label>
              Legal business name
              <input
                aria-label="Legal business name"
                value={settings.legalName}
                onChange={(event) => update("legalName", event.target.value)}
              />
            </label>
            <label>
              Owner display name
              <input
                aria-label="Owner display name"
                value={settings.ownerDisplayName}
                onChange={(event) =>
                  update("ownerDisplayName", event.target.value)
                }
              />
            </label>
            <label>
              Order prefix
              <input
                aria-label="Order prefix"
                maxLength={8}
                value={settings.orderPrefix}
                onChange={(event) =>
                  update(
                    "orderPrefix",
                    event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                  )
                }
              />
            </label>
          </div>
          <label className="wide-field">
            Store address
            <textarea
              aria-label="Store address"
              value={settings.address}
              onChange={(event) => update("address", event.target.value)}
            />
          </label>
        </article>
        <article className="panel policy-form">
          <header>
            <span className="eyebrow">RECEIPTS AND TAX</span>
            <h3>Customer facing details</h3>
          </header>
          <div className="field-grid">
            <label>
              Receipt phone
              <input
                aria-label="Receipt phone"
                type="tel"
                value={settings.receiptPhone}
                onChange={(event) => update("receiptPhone", event.target.value)}
              />
            </label>
            <label>
              Receipt email
              <input
                aria-label="Receipt email"
                type="email"
                value={settings.receiptEmail}
                onChange={(event) => update("receiptEmail", event.target.value)}
              />
            </label>
            <label>
              Currency
              <select
                aria-label="Currency"
                value={settings.currency}
                onChange={(event) => update("currency", event.target.value)}
              >
                <option value="USD">USD</option>
                <option value="CAD">CAD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
                <option value="XAF">XAF</option>
                <option value="NGN">NGN</option>
                <option value="GHS">GHS</option>
              </select>
            </label>
            <label>
              Tax rate
              <input
                aria-label="Tax rate percent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={settings.taxRatePercent}
                onChange={(event) =>
                  update("taxRatePercent", Number(event.target.value))
                }
              />
              <small>Percent</small>
            </label>
            <label>
              Locale
              <input
                aria-label="Locale"
                value={settings.locale}
                onChange={(event) => update("locale", event.target.value)}
              />
            </label>
            <label>
              Timezone
              <input
                aria-label="Timezone"
                value={settings.timezone}
                onChange={(event) => update("timezone", event.target.value)}
              />
            </label>
          </div>
          <div className="policy-checks">
            <label>
              <input
                type="checkbox"
                checked={settings.taxInclusive}
                onChange={(event) =>
                  update("taxInclusive", event.target.checked)
                }
              />
              Displayed prices already include tax
            </label>
          </div>
        </article>
      </section>
      <p className="control-note">
        <ShieldCheck />
        Preview settings stay on this device. Once Delly submits the production
        identity and the database snapshot is available, the same controls save
        tenant scoped records with permission checks and audit history.
      </p>
    </div>
  );
}

function SharedCommerceCenter() {
  const { value: settings, update, save, saved } = useCommerceSettings();
  const [tenantContext, setTenantContext] = useState<TenantContext>({ mode: "preview", storeId: null, userId: null, role: null, reason: "Checking production access." });
  useEffect(() => { void resolveTenantContext().then(setTenantContext); }, []);
  const payouts = tenantContext.mode === "production" ? [] : [
    ["Africstyle Fashion", "$6,842.20", "$547.38", "$6,294.82", "Ready"],
    ["Blossom Collections", "$4,118.00", "$329.44", "$3,788.56", "Ready"],
    ["Jose Kako", "$3,764.50", "$301.16", "$3,463.34", "Review"],
    ["Sapologie Italiano", "$2,986.00", "$238.88", "$2,747.12", "Ready"],
  ];
  return (
    <div className="content inner commerce-center">
      <div className="view-head">
        <div>
          <span className="eyebrow">ONE REGISTER · EVERY BRAND</span>
          <h2>Shared commerce control</h2>
          <p>
            Attribute every scan, balance every shelf, and pay every vendor from
            one accountable ledger.
          </p>
        </div>
        <button className="primary" onClick={save}>
          <Check />
          {saved ? "Settings saved" : "Save controls"}
        </button>
      </div>
      <section className="commerce-flow" aria-label="Shared checkout flow">
        <article>
          <ScanLine />
          <span>
            <small>1 · IDENTIFY</small>
            <b>Scan resolves the exact item and vendor</b>
          </span>
        </article>
        <article>
          <CircleDollarSign />
          <span>
            <small>2 · COLLECT</small>
            <b>Customer pays once at the shared cashier</b>
          </span>
        </article>
        <article>
          <RefreshCw />
          <span>
            <small>3 · POST</small>
            <b>Stock and vendor ledger update together</b>
          </span>
        </article>
        <article>
          <Banknote />
          <span>
            <small>4 · SETTLE</small>
            <b>Approved balances pay on schedule</b>
          </span>
        </article>
      </section>
      <section className="commerce-grid">
        <article className="panel commerce-controls">
          <div className="panel-head">
            <span>
              <small className="eyebrow">TENANT CONTROLS</small>
              <h3>Payout and inventory rules</h3>
            </span>
            <Settings />
          </div>
          <div className="policy-grid">
            <label>
              Payout cadence
              <select
                value={settings.payoutCadence}
                onChange={(e) =>
                  update(
                    "payoutCadence",
                    e.target.value as CommerceSettings["payoutCadence"],
                  )
                }
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every two weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <label>
              Payout day
              <select
                value={settings.payoutDay}
                onChange={(e) => update("payoutDay", e.target.value)}
              >
                <option>Monday</option>
                <option>Tuesday</option>
                <option>Wednesday</option>
                <option>Thursday</option>
                <option>Friday</option>
              </select>
            </label>
            <label>
              Return reserve
              <input
                type="number"
                min="0"
                max="100"
                value={settings.returnReservePercent}
                onChange={(e) =>
                  update("returnReservePercent", Number(e.target.value))
                }
              />
              <span>%</span>
            </label>
            <label>
              Minimum payout
              <input
                type="number"
                min="0"
                value={settings.minimumPayout}
                onChange={(e) =>
                  update("minimumPayout", Number(e.target.value))
                }
              />
              <span>$</span>
            </label>
            <label>
              Target stock cover
              <input
                type="number"
                min="1"
                value={settings.targetCoverDays}
                onChange={(e) =>
                  update("targetCoverDays", Number(e.target.value))
                }
              />
              <span>days</span>
            </label>
          </div>
          <div className="policy-checks">
            <label>
              <input
                type="checkbox"
                checked={settings.autoRebalance}
                onChange={(e) => update("autoRebalance", e.target.checked)}
              />
              Automatically prepare stock rebalance proposals
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.requireScanMatch}
                onChange={(e) => update("requireScanMatch", e.target.checked)}
              />
              Block checkout when an item cannot resolve to one vendor
            </label>
          </div>
          <p className="control-note">
            <ShieldCheck />
            Proposals never move stock or money silently. A manager approves
            transfers, exceptions, and payout batches with a permanent audit
            record.
          </p>
        </article>
        {tenantContext.mode === "preview" ? <article className="panel rebalance-card">
          <div className="panel-head">
            <span>
              <small className="eyebrow">SMART REBALANCE</small>
              <h3>Three actions recommended</h3>
            </span>
            <Sparkles />
          </div>
          <ol>
            <li>
              <i>12</i>
              <span>
                <b>Move Kente occasion pieces to the front edit</b>
                <small>
                  Africstyle Fashion · 9 days of cover · demand up 31%
                </small>
              </span>
              <button>Review</button>
            </li>
            <li>
              <i>6</i>
              <span>
                <b>Replenish navy ceremony jackets</b>
                <small>
                  Jose Kako · weekend appointments exceed available sizes
                </small>
              </span>
              <button>Review</button>
            </li>
            <li>
              <i>4</i>
              <span>
                <b>Return slow accessories to vendor shelf</b>
                <small>
                  Sapologie Italiano · 64 days of cover · no sale in 21 days
                </small>
              </span>
              <button>Review</button>
            </li>
          </ol>
        </article> : <article className="panel help-empty"><RefreshCw /><h3>No live rebalance proposals</h3><p>Recommendations will use this tenant's real inventory and demand history when those records are available.</p></article>}
      </section>
      <section className="panel payout-ledger">
        <div className="panel-head">
          <span>
            <small className="eyebrow">
              NEXT PAYOUT · {settings.payoutDay.toUpperCase()}
            </small>
            <h3>Vendor settlement preview</h3>
          </span>
          <button>Open reconciliation</button>
        </div>
        <div className="payout-table">
          <div>
            <span>Vendor</span>
            <span>Eligible sales</span>
            <span>Reserve</span>
            <span>Expected payout</span>
            <span>Status</span>
          </div>
          {payouts.map((row) => (
            <div key={row[0]}>
              {row.map((cell, index) =>
                index === 4 ? (
                  <em className={cell === "Review" ? "warn" : ""} key={cell}>
                    {cell}
                  </em>
                ) : (
                  <span key={cell}>{cell}</span>
                ),
              )}
            </div>
          ))}
          {!payouts.length && <div><span>No vendor settlements recorded</span><span>0</span><span>0</span><span>0</span><em>Waiting</em></div>}
        </div>
        <footer>
          <span>Customer tender</span>
          <b>$17,710.70</b>
          <span>Return reserve</span>
          <b>$1,416.86</b>
          <span>Vendor liability</span>
          <b>$16,293.84</b>
        </footer>
      </section>
    </div>
  );
}

function DeliveryCenter() {
  const { value: settings, update, save, saved } = useDeliverySettings();
  const [tenantContext, setTenantContext] = useState<TenantContext>({ mode: "preview", storeId: null, userId: null, role: null, reason: "Checking production access." });
  useEffect(() => { void resolveTenantContext().then(setTenantContext); }, []);
  const routes = tenantContext.mode === "production" ? [] : [
    [
      "#BR-2052",
      "Amara N.",
      "3 vendors · 5 items",
      "Consolidating",
      "Local delivery",
      "Today, 4:00 PM",
    ],
    [
      "#BR-2051",
      "Olivia P.",
      "1 vendor · 2 items",
      "Ready",
      "Store pickup",
      "Today, 2:30 PM",
    ],
    [
      "#BR-2050",
      "Nia Carter",
      "2 vendors · 3 items",
      "Label created",
      "UPS Ground",
      "Aug 29",
    ],
  ];
  return (
    <div className="content inner delivery-center">
      <div className="view-head">
        <div>
          <span className="eyebrow">ONLINE TO DOORSTEP</span>
          <h2>Delivery operations</h2>
          <p>
            Route every item, consolidate multi vendor orders, and keep the
            customer informed through one Blossom Royall experience.
          </p>
        </div>
        <button className="primary" onClick={save}>
          <Check />
          {saved ? "Delivery saved" : "Save delivery"}
        </button>
      </div>
      <section className="delivery-modes">
        <label className={settings.pickupEnabled ? "enabled" : ""}>
          <input
            type="checkbox"
            checked={settings.pickupEnabled}
            onChange={(e) => update("pickupEnabled", e.target.checked)}
          />
          <Store />
          <span>
            <b>Store pickup</b>
            <small>Reserve, pick, verify, and hand off with a code</small>
          </span>
        </label>
        <label className={settings.localDeliveryEnabled ? "enabled" : ""}>
          <input
            type="checkbox"
            checked={settings.localDeliveryEnabled}
            onChange={(e) => update("localDeliveryEnabled", e.target.checked)}
          />
          <MapPin />
          <span>
            <b>Local delivery</b>
            <small>Scheduled or same day courier within configured zones</small>
          </span>
        </label>
        <label className={settings.shippingEnabled ? "enabled" : ""}>
          <input
            type="checkbox"
            checked={settings.shippingEnabled}
            onChange={(e) => update("shippingEnabled", e.target.checked)}
          />
          <Truck />
          <span>
            <b>Carrier shipping</b>
            <small>Rate, label, tracking, delivery, and exception events</small>
          </span>
        </label>
      </section>
      <section className="commerce-grid delivery-grid">
        <article className="panel commerce-controls">
          <div className="panel-head">
            <span>
              <small className="eyebrow">TENANT RULES</small>
              <h3>Promise and routing</h3>
            </span>
            <Settings />
          </div>
          <div className="policy-grid">
            <label>
              Local radius
              <input
                aria-label="Local radius"
                type="number"
                min="1"
                value={settings.localRadiusMiles}
                onChange={(e) =>
                  update("localRadiusMiles", Number(e.target.value))
                }
              />
              <span>miles</span>
            </label>
            <label>
              Local delivery fee
              <input
                aria-label="Local delivery fee"
                type="number"
                min="0"
                value={settings.localFee}
                onChange={(e) => update("localFee", Number(e.target.value))}
              />
              <span>$</span>
            </label>
            <label>
              Free local minimum
              <input
                aria-label="Free local minimum"
                type="number"
                min="0"
                value={settings.freeLocalMinimum}
                onChange={(e) =>
                  update("freeLocalMinimum", Number(e.target.value))
                }
              />
              <span>$</span>
            </label>
            <label>
              Carrier shipping fee
              <input
                aria-label="Carrier shipping fee"
                type="number"
                min="0"
                value={settings.shippingFee}
                onChange={(e) => update("shippingFee", Number(e.target.value))}
              />
              <span>$</span>
            </label>
            <label>
              Handling time
              <input
                aria-label="Handling time"
                type="number"
                min="0"
                value={settings.handlingDays}
                onChange={(e) => update("handlingDays", Number(e.target.value))}
              />
              <span>days</span>
            </label>
            <label>
              Consolidation window
              <input
                aria-label="Consolidation window"
                type="number"
                min="0"
                value={settings.consolidationHours}
                onChange={(e) =>
                  update("consolidationHours", Number(e.target.value))
                }
              />
              <span>hours</span>
            </label>
            <label>
              Signature threshold
              <input
                aria-label="Signature threshold"
                type="number"
                min="0"
                value={settings.signatureThreshold}
                onChange={(e) =>
                  update("signatureThreshold", Number(e.target.value))
                }
              />
              <span>$</span>
            </label>
            <label>
              Routing priority
              <select
                aria-label="Routing priority"
                value={settings.routingPriority}
                onChange={(e) =>
                  update(
                    "routingPriority",
                    e.target.value as DeliverySettings["routingPriority"],
                  )
                }
              >
                <option value="fewest_packages">Fewest packages</option>
                <option value="fastest">Fastest promise</option>
                <option value="lowest_cost">Lowest cost</option>
              </select>
            </label>
          </div>
          <div className="policy-checks">
            <label>
              <input
                type="checkbox"
                checked={settings.vendorFulfillmentEnabled}
                onChange={(e) =>
                  update("vendorFulfillmentEnabled", e.target.checked)
                }
              />
              Allow approved vendors to fulfill online only inventory
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.allowOnlineBackorders}
                onChange={(e) =>
                  update("allowOnlineBackorders", e.target.checked)
                }
              />
              Allow online backorders only when a dated supply promise exists
            </label>
          </div>
          <p className="control-note">
            <ShieldCheck />
            The checkout promise uses inventory reservations and validated
            addresses. It never offers a speed or method that the assigned
            location and items cannot support.
          </p>
        </article>
        <article className="panel delivery-journey">
          <div className="panel-head">
            <span>
              <small className="eyebrow">MULTI VENDOR ORDER</small>
              <h3>One package when possible</h3>
            </span>
            <Package />
          </div>
          <ol>
            <li>
              <i>1</i>
              <span>
                <b>Reserve every item</b>
                <small>Inventory is protected before payment capture.</small>
              </span>
            </li>
            <li>
              <i>2</i>
              <span>
                <b>Route to Blossom Royall</b>
                <small>
                  Vendor shelves feed one controlled packing station.
                </small>
              </span>
            </li>
            <li>
              <i>3</i>
              <span>
                <b>Scan into one parcel</b>
                <small>
                  Every item and seller remain visible on the packing record.
                </small>
              </span>
            </li>
            <li>
              <i>4</i>
              <span>
                <b>Handoff with proof</b>
                <small>
                  Pickup code, carrier scan, or courier confirmation closes
                  custody.
                </small>
              </span>
            </li>
          </ol>
        </article>
      </section>
      {tenantContext.mode === "preview" ? <section className="panel channel-board">
        <div className="panel-head">
          <span>
            <small className="eyebrow">CHANNEL AVAILABILITY</small>
            <h3>Sellable does not always mean onsite</h3>
          </span>
          <button>Manage inventory pools</button>
        </div>
        <div className="channel-table">
          <div>
            <span>Product</span>
            <span>Onsite</span>
            <span>Online</span>
            <span>Online source</span>
            <span>Customer promise</span>
          </div>
          <div>
            <b>Mila Gold Clutch</b>
            <em className="none">Not onsite</em>
            <em>14 available</em>
            <span>Vendor fulfilled</span>
            <span>Ships in 2 to 3 days</span>
          </div>
          <div>
            <b>Aurelia Satin Midi</b>
            <em>3 available</em>
            <em>9 available</em>
            <span>Store plus reserved vendor stock</span>
            <span>Pickup today or shipping</span>
          </div>
          <div>
            <b>Kente Ceremony Coat</b>
            <em className="none">Not onsite</em>
            <em>Preorder</em>
            <span>Dated production allocation</span>
            <span>Ships September 18</span>
          </div>
        </div>
      </section> : <section className="panel help-empty"><Package /><h3>No live channel inventory yet</h3><p>Onsite, online, preorder, and vendor fulfilled availability will appear only from authorized tenant product records.</p></section>}
      <section className="panel route-board">
        <div className="panel-head">
          <span>
            <small className="eyebrow">ACTIVE FULFILLMENT</small>
            <h3>Today’s handoffs</h3>
          </span>
          <button>Open all orders</button>
        </div>
        <div className="route-table">
          <div>
            <span>Order</span>
            <span>Customer</span>
            <span>Contents</span>
            <span>Status</span>
            <span>Method</span>
            <span>Promise</span>
          </div>
          {routes.map((row) => (
            <div key={row[0]}>
              {row.map((cell, index) =>
                index === 3 ? (
                  <em key={cell}>{cell}</em>
                ) : (
                  <span key={cell}>{cell}</span>
                ),
              )}
            </div>
          ))}
          {!routes.length && <div><span>No active fulfillment</span><span /><span /><em>Waiting</em><span /><span /></div>}
        </div>
      </section>
    </div>
  );
}

function PolicyCenter() {
  const { value: policy, update, save: savePolicy, saved } = useRetailPolicy();
  const [previewAge, setPreviewAge] = useState(12);
  const eligible = previewAge <= policy.returnWindowDays;
  return (
    <div className="content policy-center">
      <div className="view-head">
        <div>
          <span className="eyebrow">TENANT POLICY ENGINE</span>
          <h2>Retail policies you control</h2>
          <p>
            Configure customer promises once, then apply them consistently at
            checkout, online, and at every store.
          </p>
        </div>
        <button className="primary" onClick={savePolicy}>
          <Check />
          Save and publish
        </button>
      </div>
      {saved && (
        <div className="policy-saved" role="status">
          <Check />
          Policy published for Blossom Royall. Future orders use this version.
        </div>
      )}
      <section className="policy-grid">
        <article className="panel policy-form">
          <header>
            <span className="eyebrow">RETURNS AND EXCHANGES</span>
            <h3>Eligibility rules</h3>
          </header>
          <div className="field-grid">
            <label>
              Return window
              <input
                aria-label="Return window in days"
                type="number"
                min="0"
                value={policy.returnWindowDays}
                onChange={(event) =>
                  update("returnWindowDays", Number(event.target.value))
                }
              />
              <small>Days</small>
            </label>
            <label>
              Window begins
              <select
                aria-label="Return window begins"
                value={policy.windowStarts}
                onChange={(event) =>
                  update(
                    "windowStarts",
                    event.target.value as RetailPolicy["windowStarts"],
                  )
                }
              >
                <option value="purchase">Purchase</option>
                <option value="delivery">Item delivery</option>
                <option value="last_delivery">Last item delivery</option>
              </select>
            </label>
            <label>
              Refund destination
              <select
                aria-label="Refund destination"
                value={policy.refundMethod}
                onChange={(event) =>
                  update(
                    "refundMethod",
                    event.target.value as RetailPolicy["refundMethod"],
                  )
                }
              >
                <option value="choice">Customer choice</option>
                <option value="original">Original payment</option>
                <option value="store_credit">Store credit</option>
              </select>
            </label>
            <label>
              Return shipping
              <select
                aria-label="Return shipping"
                value={policy.returnShipping}
                onChange={(event) =>
                  update(
                    "returnShipping",
                    event.target.value as RetailPolicy["returnShipping"],
                  )
                }
              >
                <option value="free">Complimentary</option>
                <option value="flat">Flat fee</option>
                <option value="customer">Customer arranged</option>
              </select>
            </label>
            <label>
              Restocking fee
              <input
                aria-label="Restocking fee percent"
                type="number"
                min="0"
                max="100"
                value={policy.restockingFeePercent}
                onChange={(event) =>
                  update("restockingFeePercent", Number(event.target.value))
                }
              />
              <small>Percent</small>
            </label>
            <label>
              Flat shipping fee
              <input
                aria-label="Flat return shipping fee"
                type="number"
                min="0"
                value={policy.returnShippingFee}
                disabled={policy.returnShipping !== "flat"}
                onChange={(event) =>
                  update("returnShippingFee", Number(event.target.value))
                }
              />
              <small>USD</small>
            </label>
          </div>
          <div className="policy-checks">
            <label>
              <input
                type="checkbox"
                checked={policy.receiptRequired}
                onChange={(event) =>
                  update("receiptRequired", event.target.checked)
                }
              />
              Require receipt or order lookup
            </label>
            <label>
              <input
                type="checkbox"
                checked={policy.allowExchange}
                onChange={(event) =>
                  update("allowExchange", event.target.checked)
                }
              />
              Allow exchanges
            </label>
            <label>
              <input
                type="checkbox"
                checked={policy.allowStoreCredit}
                onChange={(event) =>
                  update("allowStoreCredit", event.target.checked)
                }
              />
              Allow store credit
            </label>
          </div>
          <label className="wide-field">
            Final sale product tags
            <textarea
              aria-label="Final sale product tags"
              value={policy.finalSaleTags}
              onChange={(event) => update("finalSaleTags", event.target.value)}
            />
            <small>Editable tags replace coded product exceptions.</small>
          </label>
        </article>
        <aside className="panel eligibility-preview">
          <span className="eyebrow">LIVE RULE PREVIEW</span>
          <h3>Would this return qualify?</h3>
          <label>
            Days since{" "}
            {policy.windowStarts === "purchase" ? "purchase" : "delivery"}
            <input
              aria-label="Preview days since purchase or delivery"
              type="range"
              min="0"
              max="120"
              value={previewAge}
              onChange={(event) => setPreviewAge(Number(event.target.value))}
            />
            <b>{previewAge} days</b>
          </label>
          <div className={eligible ? "eligible" : "ineligible"}>
            <Check />
            <span>
              <b>{eligible ? "Eligible" : "Outside return window"}</b>
              <small>
                {eligible
                  ? `${policy.returnWindowDays - previewAge} days remaining`
                  : `Window closed ${previewAge - policy.returnWindowDays} days ago`}
              </small>
            </span>
          </div>
          <p>
            Final sale tags, fulfillment status, item condition, receipt rules,
            and market overrides are also evaluated before approval.
          </p>
        </aside>
      </section>
      <article className="panel policy-form layaway-policy">
        <header>
          <span className="eyebrow">LAYAWAY</span>
          <h3>Flexible payments without surprises</h3>
        </header>
        <div className="policy-checks">
          <label>
            <input
              type="checkbox"
              checked={policy.layawayEnabled}
              onChange={(event) =>
                update("layawayEnabled", event.target.checked)
              }
            />
            Offer layaway
          </label>
          <label>
            <input
              type="checkbox"
              checked={policy.holdInventory}
              onChange={(event) =>
                update("holdInventory", event.target.checked)
              }
            />
            Reserve inventory immediately
          </label>
        </div>
        <div className="field-grid">
          <label>
            Minimum deposit
            <input
              aria-label="Layaway deposit percent"
              type="number"
              min="0"
              max="100"
              value={policy.layawayDepositPercent}
              onChange={(event) =>
                update("layawayDepositPercent", Number(event.target.value))
              }
            />
            <small>Percent</small>
          </label>
          <label>
            Plan duration
            <input
              aria-label="Layaway term in days"
              type="number"
              min="1"
              value={policy.layawayTermDays}
              onChange={(event) =>
                update("layawayTermDays", Number(event.target.value))
              }
            />
            <small>Days</small>
          </label>
          <label>
            Payment rhythm
            <select
              aria-label="Layaway payment frequency"
              value={policy.layawayPaymentFrequency}
              onChange={(event) =>
                update(
                  "layawayPaymentFrequency",
                  event.target.value as RetailPolicy["layawayPaymentFrequency"],
                )
              }
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every two weeks</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <label>
            Grace period
            <input
              aria-label="Layaway grace period in days"
              type="number"
              min="0"
              value={policy.layawayGraceDays}
              onChange={(event) =>
                update("layawayGraceDays", Number(event.target.value))
              }
            />
            <small>Days</small>
          </label>
          <label>
            Cancellation fee
            <input
              aria-label="Layaway cancellation fee"
              type="number"
              min="0"
              value={policy.layawayCancellationFee}
              onChange={(event) =>
                update("layawayCancellationFee", Number(event.target.value))
              }
            />
            <small>USD</small>
          </label>
        </div>
      </article>
      <section className="policy-opportunities">
        {[
          [
            "Market overrides",
            "Adapt rules for local consumer rights without changing the tenant default.",
          ],
          [
            "Reason intelligence",
            "Track fit, quality, damage, and preference reasons to reduce preventable returns.",
          ],
          [
            "Exception approvals",
            "Give managers a visible, audited path for compassionate exceptions.",
          ],
          [
            "Policy snapshots",
            "Keep the exact policy attached to every order even after future changes.",
          ],
        ].map(([title, body]) => (
          <article className="panel" key={title}>
            <Sparkles />
            <b>{title}</b>
            <p>{body}</p>
          </article>
        ))}
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
          <p>
            Protect the customer relationship while keeping inventory, payments,
            and vendor attribution correct.
          </p>
        </div>
      </div>
      {notice && (
        <div className="policy-saved" role="status">
          <Check />
          {notice}
        </div>
      )}
      <section className="aftercare-metrics">
        {[
          ["Open returns", "6", "2 need review"],
          ["Exchange value", "$684", "Revenue retained"],
          ["Active layaways", "14", "$4,260 remaining"],
          ["Due this week", "5", "1 grace period"],
        ].map(([label, value, note]) => (
          <article className="panel" key={label}>
            <small>{label}</small>
            <b>{value}</b>
            <span>{note}</span>
          </article>
        ))}
      </section>
      <section className="aftercare-grid">
        <article className="panel care-card">
          <header>
            <div>
              <span className="eyebrow">RETURN BR 2046</span>
              <h3>Nia Carter</h3>
            </div>
            <em>{returnStatus}</em>
          </header>
          <div className="care-product">
            <i>
              <ShoppingBag />
            </i>
            <span>
              <b>Aurelia Satin Midi</b>
              <small>Emerald · Size 8 · $168</small>
            </span>
          </div>
          <dl>
            <div>
              <dt>Reason</dt>
              <dd>Fit · Too small</dd>
            </div>
            <div>
              <dt>Received</dt>
              <dd>12 days ago</dd>
            </div>
            <div>
              <dt>Policy result</dt>
              <dd className="positive">Eligible · 18 days remain</dd>
            </div>
            <div>
              <dt>Resolution</dt>
              <dd>Exchange for size 10</dd>
            </div>
          </dl>
          <div className="care-actions">
            <button
              onClick={() => {
                setReturnStatus("Approved for exchange");
                setNotice(
                  "Exchange approved and inventory reserved for Nia Carter.",
                );
              }}
            >
              Approve exchange
            </button>
            <button
              onClick={() =>
                setNotice(
                  "Manager review opened with the policy snapshot attached.",
                )
              }
            >
              Review exception
            </button>
          </div>
        </article>
        <article className="panel care-card">
          <header>
            <div>
              <span className="eyebrow">LAYAWAY BR L104</span>
              <h3>Amara Nelson</h3>
            </div>
            <em>{layawayStatus}</em>
          </header>
          <div className="layaway-progress">
            <i style={{ width: "60%" }} />
            <span>60% paid</span>
          </div>
          <dl>
            <div>
              <dt>Original total</dt>
              <dd>$420</dd>
            </div>
            <div>
              <dt>Paid</dt>
              <dd>$252</dd>
            </div>
            <div>
              <dt>Remaining</dt>
              <dd>$168</dd>
            </div>
            <div>
              <dt>Next payment</dt>
              <dd>$84 · August 27</dd>
            </div>
          </dl>
          <div className="care-actions">
            <button
              onClick={() => {
                setLayawayStatus("Reminder sent");
                setNotice(
                  "A friendly payment reminder was sent to Amara Nelson.",
                );
              }}
            >
              Send reminder
            </button>
            <button
              onClick={() => {
                setLayawayStatus("Grace period applied");
                setNotice("Five day grace period applied and recorded.");
              }}
            >
              Apply grace period
            </button>
          </div>
        </article>
      </section>
      <section className="panel care-timeline">
        <div>
          <span className="eyebrow">ACCOUNTABLE HISTORY</span>
          <h3>Every decision leaves a clear trail</h3>
        </div>
        <ol>
          <li>
            <i>
              <Check />
            </i>
            <span>
              <b>Return requested</b>
              <small>Customer portal · Today, 9:42 AM</small>
            </span>
          </li>
          <li>
            <i>
              <Package />
            </i>
            <span>
              <b>Item expected at Suite 102</b>
              <small>Vendor inventory destination preserved</small>
            </span>
          </li>
          <li>
            <i>
              <Clock3 />
            </i>
            <span>
              <b>Inspection awaiting staff</b>
              <small>Condition and disposition required before refund</small>
            </span>
          </li>
        </ol>
      </section>
    </div>
  );
}

type BagItem = {
  name: string;
  vendor: string;
  price: number;
  fulfillment: string;
};

function CheckoutCenter({ openSale }: { openSale: () => void }) {
  const { value: policy } = useRetailPolicy();
  const { value: delivery } = useDeliverySettings();
  const { value: store } = useStoreSettings();
  const [bag, setBag] = useState<BagItem[]>([]);
  const [method, setMethod] = useState<"pickup" | "delivery" | "shipping">(
    "pickup",
  );
  const [payment, setPayment] = useState<"pay_now" | "layaway">("pay_now");
  const [placed, setPlaced] = useState(false);
  const [orderId] = useState(
    () => `${store.orderPrefix || "ORDER"}-${Date.now().toString().slice(-6)}`,
  );
  useEffect(() => {
    const stored = localStorage.getItem("br-customer-bag:blossom-royall");
    if (stored) setBag(JSON.parse(stored));
  }, []);
  const subtotal = bag.reduce((sum, item) => sum + item.price, 0);
  const deliveryFee =
    method === "delivery" && subtotal < delivery.freeLocalMinimum
      ? delivery.localFee
      : method === "shipping"
        ? delivery.shippingFee
        : 0;
  const tax = store.taxInclusive
    ? 0
    : Math.round(subtotal * store.taxRatePercent) / 100;
  const total = subtotal + deliveryFee + tax;
  const deposit = Math.round(total * policy.layawayDepositPercent) / 100;
  const money = (amount: number) =>
    new Intl.NumberFormat(store.locale, {
      style: "currency",
      currency: store.currency,
    }).format(amount);
  const placeOrder = () => {
    const order = {
      id: `#${orderId}`,
      items: bag,
      method,
      payment,
      total,
      deposit,
      policySnapshot: policy,
      placedAt: new Date().toISOString(),
    };
    localStorage.setItem(
      "br-latest-order:blossom-royall",
      JSON.stringify(order),
    );
    localStorage.removeItem("br-customer-bag:blossom-royall");
    setPlaced(true);
  };
  if (!bag.length && !placed)
    return (
      <div className="checkout empty-checkout">
        <section>
          <span className="eyebrow">POINT OF SALE</span>
          <h2>Ready when your customer is.</h2>
          <p>
            Scan products, split tenders, create layaway plans, and send
            beautiful receipts.
          </p>
          <button className="primary large" onClick={openSale}>
            <ScanLine />
            Start checkout
          </button>
        </section>
        <div className="receipt">
          <BrandMark className="receipt-mark" />
          <h3>{store.publicName}</h3>
          <span />
          <span />
          <span />
          <b>{money(0)}</b>
          <footer>
            <strong>Powered by TA Tech</strong>
            <small>Is not where you have been but where you are going.</small>
          </footer>
        </div>
      </div>
    );
  if (placed)
    return (
      <div className="checkout-success receipt-ready">
        <section className="order-confirmation">
          <i>
            <Check />
          </i>
          <span className="eyebrow">ORDER CONFIRMED</span>
          <h2>Your complete look is reserved.</h2>
          <p>
            Order {orderId} is coordinated across every seller. You will receive
            one update when it is ready for {method}.
          </p>
          <div>
            <b>{money(total)}</b>
            <small>
              {payment === "layaway"
                ? `${money(deposit)} deposit collected, balance scheduled`
                : "Paid in full"}
            </small>
          </div>
          <div className="receipt-actions">
            <button className="primary" onClick={() => window.print()}>
              <Printer />
              Print receipt
            </button>
            <button
              onClick={() => {
                setBag([]);
                setPlaced(false);
              }}
            >
              Done
            </button>
          </div>
        </section>
        <article
          className="sale-receipt"
          aria-label={`Receipt for order ${orderId}`}
        >
          <header>
            <BrandMark className="receipt-mark" />
            <h3>{store.publicName}</h3>
            <small>
              {store.receiptPhone || store.receiptEmail || "Fashion Mall OS"}
            </small>
          </header>
          <div className="receipt-meta">
            <span>
              <b>Order</b>
              {orderId}
            </span>
            <span>
              <b>Date</b>
              {new Date().toLocaleDateString(store.locale)}
            </span>
            <span>
              <b>Fulfillment</b>
              {method}
            </span>
          </div>
          <section>
            {bag.map((item) => (
              <div className="receipt-line" key={item.name}>
                <span>
                  <b>{item.name}</b>
                  <small>Sold by {item.vendor}</small>
                  <small>
                    Return eligible for {policy.returnWindowDays} days after
                    handoff
                  </small>
                </span>
                <strong>{money(item.price)}</strong>
              </div>
            ))}
          </section>
          <dl>
            <div>
              <dt>Merchandise</dt>
              <dd>{money(subtotal)}</dd>
            </div>
            {deliveryFee > 0 && (
              <div>
                <dt>Delivery</dt>
                <dd>{money(deliveryFee)}</dd>
              </div>
            )}
            {tax > 0 && (
              <div>
                <dt>Tax</dt>
                <dd>{money(tax)}</dd>
              </div>
            )}
            <div className="receipt-total">
              <dt>{payment === "layaway" ? "Deposit paid" : "Total paid"}</dt>
              <dd>{money(payment === "layaway" ? deposit : total)}</dd>
            </div>
            {payment === "layaway" && (
              <div>
                <dt>Remaining balance</dt>
                <dd>{money(total - deposit)}</dd>
              </div>
            )}
          </dl>
          <footer>
            <strong>Powered by TA Tech</strong>
            <small>Is not where you have been but where you are going.</small>
          </footer>
        </article>
      </div>
    );
  return (
    <div className="customer-checkout content inner">
      <div className="view-head">
        <div>
          <span className="eyebrow">ONE BAG · EVERY BRAND</span>
          <h2>Your complete edit</h2>
          <p>
            Review the sellers, arrival promise, and customer protections before
            paying once.
          </p>
        </div>
      </div>
      <div className="customer-checkout-grid">
        <section className="panel bag-lines">
          <div className="panel-head">
            <span>
              <small className="eyebrow">{bag.length} ITEMS</small>
              <h3>Seller attributed bag</h3>
            </span>
            <ShieldCheck />
          </div>
          {bag.map((item) => (
            <article key={item.name}>
              <i>
                <ShoppingBag />
              </i>
              <span>
                <b>{item.name}</b>
                <small>Sold by {item.vendor}</small>
                <em>{item.fulfillment}</em>
              </span>
              <strong>{money(item.price)}</strong>
            </article>
          ))}
          <p>
            <ShieldCheck />
            Every product is tied to its seller, policy snapshot, and inventory
            reservation.
          </p>
        </section>
        <aside className="panel checkout-summary">
          <span className="eyebrow">FULFILLMENT</span>
          <h3>How would you like it?</h3>
          <div className="fulfillment-choices">
            {delivery.pickupEnabled && (
              <button
                className={method === "pickup" ? "active" : ""}
                onClick={() => setMethod("pickup")}
              >
                <Store />
                <b>Pickup</b>
                <small>Free</small>
              </button>
            )}
            {delivery.localDeliveryEnabled && (
              <button
                className={method === "delivery" ? "active" : ""}
                onClick={() => setMethod("delivery")}
              >
                <MapPin />
                <b>Local delivery</b>
                <small>
                  {subtotal >= delivery.freeLocalMinimum
                    ? "Free"
                    : money(delivery.localFee)}
                </small>
              </button>
            )}
            {delivery.shippingEnabled && (
              <button
                className={method === "shipping" ? "active" : ""}
                onClick={() => setMethod("shipping")}
              >
                <Truck />
                <b>Shipping</b>
                <small>
                  {delivery.handlingDays} handling days ·{" "}
                  {money(delivery.shippingFee)}
                </small>
              </button>
            )}
          </div>
          <span className="eyebrow payment-title">PAYMENT</span>
          <div className="payment-choices">
            <button
              className={payment === "pay_now" ? "active" : ""}
              onClick={() => setPayment("pay_now")}
            >
              <b>Pay in full</b>
              <small>{money(total)} today</small>
            </button>
            {policy.layawayEnabled && (
              <button
                className={payment === "layaway" ? "active" : ""}
                onClick={() => setPayment("layaway")}
              >
                <b>Layaway</b>
                <small>
                  {money(deposit)} today · {policy.layawayTermDays} days
                </small>
              </button>
            )}
          </div>
          <dl>
            <div>
              <dt>Merchandise</dt>
              <dd>{money(subtotal)}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{deliveryFee ? money(deliveryFee) : "Free"}</dd>
            </div>
            {tax > 0 && (
              <div>
                <dt>Tax</dt>
                <dd>{money(tax)}</dd>
              </div>
            )}
            <div>
              <dt>{payment === "layaway" ? "Deposit due" : "Total"}</dt>
              <dd>{money(payment === "layaway" ? deposit : total)}</dd>
            </div>
          </dl>
          <button className="primary place-order" onClick={placeOrder}>
            {payment === "layaway" ? "Start secure layaway" : "Place order"}
            <ArrowUpRight />
          </button>
          <p>
            Returns use the saved {policy.returnWindowDays} day policy. Final
            sale exceptions are shown before payment.
          </p>
        </aside>
      </div>
    </div>
  );
}

function CustomerOrders() {
  const { value: currentPolicy } = useRetailPolicy();
  const [order, setOrder] = useState<{
    id: string;
    items: BagItem[];
    method: string;
    payment: string;
    total: number;
    deposit?: number;
    policySnapshot?: RetailPolicy;
  } | null>(null);
  const [returnItem, setReturnItem] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState("Fit was not right");
  const [returnStarted, setReturnStarted] = useState(false);
  const [paymentMade, setPaymentMade] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("br-latest-order:blossom-royall");
    if (stored) setOrder(JSON.parse(stored));
  }, []);
  if (!order)
    return (
      <ListView
        eyebrow="YOUR PURCHASES"
        title="No orders yet"
        subtitle="Completed purchases, pickup credentials, delivery tracking, layaway, and returns will appear here."
      >
        {null}
      </ListView>
    );
  const orderPolicy = order.policySnapshot || currentPolicy;
  const deposit =
    order.deposit ??
    Math.round(order.total * orderPolicy.layawayDepositPercent) / 100;
  const balance = order.total - deposit;
  const startReturn = () => {
    if (!returnItem) return;
    localStorage.setItem(
      "br-latest-return:blossom-royall",
      JSON.stringify({
        orderId: order.id,
        item: returnItem,
        reason: returnReason,
        status: "Requested",
        requestedAt: new Date().toISOString(),
      }),
    );
    setReturnStarted(true);
  };
  return (
    <div className="content inner customer-orders">
      <div className="view-head">
        <div>
          <span className="eyebrow">YOUR PURCHASES</span>
          <h2>One order. Every detail.</h2>
          <p>
            Follow fulfillment, payments, protections, and returns across every
            participating seller.
          </p>
        </div>
      </div>
      <section className="customer-order-hero panel">
        <div>
          <span className="eyebrow">ORDER {order.id.replace("#", "")}</span>
          <h3>
            {order.method === "pickup"
              ? "Preparing your coordinated pickup"
              : "Preparing your delivery"}
          </h3>
          <p>
            All sellers have confirmed their items. Blossom Royall is bringing
            the order together before handoff.
          </p>
        </div>
        <div className="pickup-pass">
          <small>PICKUP CREDENTIAL</small>
          <b>482 915</b>
          <span>Show only when the team asks</span>
        </div>
      </section>
      <section className="order-progress panel" aria-label="Order progress">
        <div className="complete">
          <i>
            <Check />
          </i>
          <b>Order confirmed</b>
          <small>Payment and inventory secured</small>
        </div>
        <div className="complete">
          <i>
            <Check />
          </i>
          <b>Seller items located</b>
          <small>Every item scanned</small>
        </div>
        <div className="active">
          <i>
            <Package />
          </i>
          <b>Consolidating</b>
          <small>Quality and packing check</small>
        </div>
        <div>
          <i>
            <Store />
          </i>
          <b>Ready for pickup</b>
          <small>We will notify you</small>
        </div>
      </section>
      <div className="customer-order-grid">
        <section className="panel order-items">
          <div className="panel-head">
            <span>
              <small className="eyebrow">ITEM PROTECTION</small>
              <h3>Products and sellers</h3>
            </span>
            <ShieldCheck />
          </div>
          {order.items.map((item) => (
            <article key={item.name}>
              <span>
                <b>{item.name}</b>
                <small>Sold by {item.vendor}</small>
                <em>
                  Return eligible · {orderPolicy.returnWindowDays} days after
                  handoff
                </em>
              </span>
              <strong>${item.price.toFixed(2)}</strong>
              <button
                onClick={() => {
                  setReturnItem(item.name);
                  setReturnStarted(false);
                }}
              >
                Return or exchange
              </button>
            </article>
          ))}
        </section>
        {order.payment === "layaway" && (
          <aside className="panel layaway-account">
            <span className="eyebrow">LAYAWAY PLAN</span>
            <h3>
              {paymentMade
                ? "Payment recorded"
                : `$${balance.toFixed(2)} remaining`}
            </h3>
            <p>
              {orderPolicy.layawayPaymentFrequency} payments with a{" "}
              {orderPolicy.layawayGraceDays} day grace period apply under the
              saved agreement.
            </p>
            <dl>
              <div>
                <dt>Order total</dt>
                <dd>${order.total.toFixed(2)}</dd>
              </div>
              <div>
                <dt>Deposit paid</dt>
                <dd>${deposit.toFixed(2)}</dd>
              </div>
              <div>
                <dt>Remaining</dt>
                <dd>${balance.toFixed(2)}</dd>
              </div>
            </dl>
            <button className="primary" onClick={() => setPaymentMade(true)}>
              {paymentMade ? "Payment complete" : "Record plan payment"}
            </button>
            <small>
              Cancellation fee: ${orderPolicy.layawayCancellationFee.toFixed(2)}
              . The complete policy remains attached to this plan.
            </small>
          </aside>
        )}
      </div>
      {returnItem && (
        <section className="return-sheet panel" aria-live="polite">
          <div>
            <span className="eyebrow">RETURN OR EXCHANGE</span>
            <h3>{returnItem}</h3>
            <p>
              This item uses the {orderPolicy.returnWindowDays} day policy saved
              at purchase. The original seller remains attached automatically.
            </p>
          </div>
          {returnStarted ? (
            <div className="return-confirmed">
              <Check />
              <span>
                <b>Request received</b>
                <small>
                  Bring the item to Blossom Royall or wait for return
                  instructions. Refunds begin after inspection.
                </small>
              </span>
            </div>
          ) : (
            <div>
              <label>
                What can we help with?
                <select
                  aria-label="Return reason"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                >
                  <option>Fit was not right</option>
                  <option>Prefer a different color</option>
                  <option>Item arrived damaged</option>
                  <option>Item was not as described</option>
                  <option>Changed my mind</option>
                </select>
              </label>
              <button className="primary" onClick={startReturn}>
                Start request
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

type FitUnit = "imperial" | "metric";

type FitProfile = {
  unit: FitUnit;
  measurements: Record<"bust" | "waist" | "hips" | "inseam" | "shoulder", number>;
  recommendedSize: string;
  consent: boolean;
  shareWithVendors: boolean;
  updatedAt: string;
};

const fitStorageKey = "br-my-fit:blossom-royall";
const fitQueueKey = "br-offline-writes:blossom-royall";

const fitCopy = {
  en: {
    eyebrow: "PRIVATE FIT PROFILE",
    title: "Measure once. Shop with confidence.",
    intro: "A calm guided fitting creates your private profile and explains how each measurement improves a recommendation.",
    unit: "Measurement unit",
    imperial: "Inches",
    metric: "Centimeters",
    guide: "Guided self measurement",
    step: "Step",
    of: "of",
    previous: "Previous",
    next: "Next measurement",
    consent: "I consent to saving this private fit profile on this device.",
    vendor: "Allow approved vendors to receive only the measurements needed for an order.",
    save: "Save My Fit",
    saved: "My Fit saved",
    queued: "Saved offline. My Fit will sync after reconnecting.",
    synced: "My Fit synced after reconnecting.",
    shop: "Shop with My Fit",
    privacy: "Your measurements stay private. Vendor sharing is off unless you choose it.",
    recommended: "Recommended starting size",
    language: "Language",
    accountSaved: "My Fit saved securely to your account.",
    deviceSaved: "My Fit saved privately on this device.",
    accountLoaded: "Your latest account profile is ready.",
    syncFailed: "Account sync could not finish. Sign in securely before retrying.",
    export: "Export My Fit",
    remove: "Delete My Fit",
    removeConfirm: "Delete My Fit from this device and your account? This cannot be undone.",
    removed: "My Fit was deleted from this device and your account.",
    updated: "Last measured",
    fields: {
      bust: ["Bust", "Wrap the tape around the fullest part, level across your back."],
      waist: ["Natural waist", "Measure where your body bends naturally without pulling the tape tight."],
      hips: ["Hips", "Stand with feet together and measure the fullest part of your hips."],
      inseam: ["Inseam", "Measure from the top of the inner leg to the desired trouser hem."],
      shoulder: ["Shoulder width", "Measure straight across your back from shoulder point to shoulder point."],
    },
  },
  fr: {
    eyebrow: "PROFIL DE TAILLE PRIVÉ",
    title: "Mesurez une fois. Achetez en confiance.",
    intro: "Un guide calme crée votre profil privé et explique comment chaque mesure améliore les recommandations.",
    unit: "Unité de mesure",
    imperial: "Pouces",
    metric: "Centimètres",
    guide: "Prise de mesures guidée",
    step: "Étape",
    of: "sur",
    previous: "Précédent",
    next: "Mesure suivante",
    consent: "J’accepte d’enregistrer ce profil privé sur cet appareil.",
    vendor: "Autoriser les vendeurs approuvés à recevoir uniquement les mesures nécessaires à une commande.",
    save: "Enregistrer Mon Ajustement",
    saved: "Profil enregistré",
    queued: "Enregistré hors ligne. La synchronisation suivra la reconnexion.",
    synced: "Profil synchronisé après la reconnexion.",
    shop: "Acheter avec Mon Ajustement",
    privacy: "Vos mesures restent privées. Le partage vendeur est désactivé sauf si vous le choisissez.",
    recommended: "Taille de départ recommandée",
    language: "Langue",
    accountSaved: "Votre profil a été enregistré en toute sécurité dans votre compte.",
    deviceSaved: "Votre profil a été enregistré en privé sur cet appareil.",
    accountLoaded: "Le dernier profil de votre compte est prêt.",
    syncFailed: "La synchronisation du compte n’a pas abouti. Reconnectez votre session sécurisée avant de réessayer.",
    export: "Exporter Mon Ajustement",
    remove: "Supprimer Mon Ajustement",
    removeConfirm: "Supprimer ce profil de cet appareil et de votre compte ? Cette action est irréversible.",
    removed: "Le profil a été supprimé de cet appareil et de votre compte.",
    updated: "Dernière mesure",
    fields: {
      bust: ["Poitrine", "Passez le ruban autour de la partie la plus forte, bien horizontal dans le dos."],
      waist: ["Taille naturelle", "Mesurez là où le corps se plie naturellement sans serrer le ruban."],
      hips: ["Hanches", "Pieds joints, mesurez la partie la plus forte des hanches."],
      inseam: ["Entrejambe", "Mesurez du haut de la jambe intérieure jusqu’à l’ourlet souhaité."],
      shoulder: ["Largeur des épaules", "Mesurez droit dans le dos d’une pointe d’épaule à l’autre."],
    },
  },
  es: {
    eyebrow: "PERFIL DE TALLA PRIVADO",
    title: "Mídete una vez. Compra con confianza.",
    intro: "Una guía tranquila crea tu perfil privado y explica cómo cada medida mejora las recomendaciones.",
    unit: "Unidad de medida",
    imperial: "Pulgadas",
    metric: "Centímetros",
    guide: "Automedición guiada",
    step: "Paso",
    of: "de",
    previous: "Anterior",
    next: "Siguiente medida",
    consent: "Acepto guardar este perfil privado en este dispositivo.",
    vendor: "Permitir que vendedores aprobados reciban solo las medidas necesarias para un pedido.",
    save: "Guardar Mi Talla",
    saved: "Perfil guardado",
    queued: "Guardado sin conexión. Se sincronizará al reconectar.",
    synced: "Perfil sincronizado después de reconectar.",
    shop: "Comprar con Mi Talla",
    privacy: "Tus medidas son privadas. No se comparten con vendedores salvo que lo elijas.",
    recommended: "Talla inicial recomendada",
    language: "Idioma",
    accountSaved: "Tu perfil se guardó de forma segura en tu cuenta.",
    deviceSaved: "Tu perfil se guardó de forma privada en este dispositivo.",
    accountLoaded: "El perfil más reciente de tu cuenta está listo.",
    syncFailed: "No se pudo completar la sincronización. Vuelve a iniciar tu sesión segura antes de intentarlo de nuevo.",
    export: "Exportar Mi Talla",
    remove: "Eliminar Mi Talla",
    removeConfirm: "¿Eliminar Mi Talla de este dispositivo y de tu cuenta? Esta acción no se puede deshacer.",
    removed: "Mi Talla se eliminó de este dispositivo y de tu cuenta.",
    updated: "Última medición",
    fields: {
      bust: ["Busto", "Rodea la parte más llena con la cinta nivelada en la espalda."],
      waist: ["Cintura natural", "Mide donde el cuerpo se dobla naturalmente sin apretar la cinta."],
      hips: ["Caderas", "Con los pies juntos, mide la parte más llena de las caderas."],
      inseam: ["Entrepierna", "Mide desde la parte superior de la pierna interior hasta el bajo deseado."],
      shoulder: ["Ancho de hombros", "Mide recto por la espalda de un hombro al otro."],
    },
  },
} as const;

const fitFields = ["bust", "waist", "hips", "inseam", "shoulder"] as const;

const convertFitValue = (value: number, from: FitUnit, to: FitUnit) => {
  if (!value || from === to) return value;
  return Number((to === "metric" ? value * 2.54 : value / 2.54).toFixed(1));
};

const recommendFitSize = (waist: number, unit: FitUnit) => {
  const inches = unit === "metric" ? waist / 2.54 : waist;
  if (inches <= 27) return "4";
  if (inches <= 29) return "6";
  if (inches <= 31) return "8";
  if (inches <= 33) return "10";
  if (inches <= 35) return "12";
  return "Custom fit review";
};

function MyFit({ go }: { go: (destination: string) => void }) {
  const [locale, setLocale] = useState<keyof typeof fitCopy>("en");
  const [unit, setUnit] = useState<FitUnit>("imperial");
  const [measurements, setMeasurements] = useState<FitProfile["measurements"]>({
    bust: 0,
    waist: 0,
    hips: 0,
    inseam: 0,
    shoulder: 0,
  });
  const [step, setStep] = useState(0);
  const [consent, setConsent] = useState(false);
  const [shareWithVendors, setShareWithVendors] = useState(false);
  const [notice, setNotice] = useState("");
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null);
  const [savedAt, setSavedAt] = useState("");
  const copy = fitCopy[locale];
  const field = fitFields[step];
  const recommendedSize = recommendFitSize(measurements.waist, unit);

  useEffect(() => {
    const saved = localStorage.getItem(fitStorageKey);
    if (saved) {
      const profile = JSON.parse(saved) as FitProfile;
      setUnit(profile.unit);
      setMeasurements(profile.measurements);
      setConsent(profile.consent);
      setShareWithVendors(profile.shareWithVendors);
      setSavedAt(profile.updatedAt);
    }
    void resolveTenantContext().then(async (context) => {
      setTenantContext(context);
      if (context.mode !== "production") return;
      try {
        const profile = await loadAccountFitProfile(context);
        if (!profile) return;
        localStorage.setItem(fitStorageKey, JSON.stringify(profile));
        setUnit(profile.unit);
        setMeasurements(profile.measurements);
        setConsent(profile.consent);
        setShareWithVendors(profile.shareWithVendors);
        setSavedAt(profile.updatedAt);
        setNotice(fitCopy.en.accountLoaded);
      } catch {
        setNotice(fitCopy.en.syncFailed);
      }
    });
  }, []);

  useEffect(() => {
    const sync = async () => {
      const queued = localStorage.getItem(fitQueueKey);
      if (!queued) return;
      try {
        const { profile } = JSON.parse(queued) as { profile: FitProfile };
        const context = tenantContext || await resolveTenantContext();
        if (context.mode === "production") await saveAccountFitProfile(context, profile);
        localStorage.removeItem(fitQueueKey);
        setNotice(copy.synced);
      } catch {
        setNotice(copy.syncFailed);
      }
    };
    const handleOnline = () => void sync();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [copy.synced, copy.syncFailed, tenantContext]);

  const changeUnit = (next: FitUnit) => {
    setMeasurements((current) =>
      Object.fromEntries(
        fitFields.map((key) => [key, convertFitValue(current[key], unit, next)]),
      ) as FitProfile["measurements"],
    );
    setUnit(next);
  };

  const save = async () => {
    if (!consent || fitFields.some((key) => measurements[key] <= 0)) return;
    const profile: FitProfile = {
      unit,
      measurements,
      recommendedSize,
      consent,
      shareWithVendors,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(fitStorageKey, JSON.stringify(profile));
    setSavedAt(profile.updatedAt);
    if (!navigator.onLine) {
      localStorage.setItem(fitQueueKey, JSON.stringify({ type: "fit_profile", profile }));
      setNotice(copy.queued);
    } else {
      try {
        const savedToAccount = tenantContext ? await saveAccountFitProfile(tenantContext, profile) : false;
        setNotice(`${savedToAccount ? copy.accountSaved : copy.deviceSaved} ${copy.recommended}: ${recommendedSize}.`);
      } catch {
        localStorage.setItem(fitQueueKey, JSON.stringify({ type: "fit_profile", profile }));
        setNotice(copy.syncFailed);
      }
    }
  };

  const exportProfile = () => {
    const saved = localStorage.getItem(fitStorageKey);
    if (!saved) return;
    const url = URL.createObjectURL(new Blob([saved], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "blossom-royall-my-fit.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const deleteProfile = async () => {
    if (!confirm(copy.removeConfirm)) return;
    try {
      if (tenantContext) await removeAccountFitProfiles(tenantContext);
      localStorage.removeItem(fitStorageKey);
      localStorage.removeItem(fitQueueKey);
      setMeasurements({ bust: 0, waist: 0, hips: 0, inseam: 0, shoulder: 0 });
      setConsent(false);
      setShareWithVendors(false);
      setSavedAt("");
      setNotice(copy.removed);
    } catch {
      setNotice(copy.syncFailed);
    }
  };

  return (
    <div className="content my-fit">
      <section className="fit-hero panel">
        <div>
          <small className="eyebrow">{copy.eyebrow}</small>
          <h2>{copy.title}</h2>
          <p>{copy.intro}</p>
        </div>
        <label>
          {copy.language}
          <select aria-label="My Fit language" value={locale} onChange={(event) => setLocale(event.target.value as keyof typeof fitCopy)}>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
          </select>
        </label>
      </section>
      <section className="fit-workspace panel">
        <header>
          <span>
            <small className="eyebrow">{copy.guide}</small>
            <h3>{copy.fields[field][0]}</h3>
          </span>
          <b>{copy.step} {step + 1} {copy.of} {fitFields.length}</b>
        </header>
        <div className="fit-progress" aria-label={`${copy.step} ${step + 1} ${copy.of} ${fitFields.length}`}>
          {fitFields.map((item, index) => <i key={item} className={index <= step ? "active" : ""} />)}
        </div>
        <div className="fit-measure-card">
          <div className={`fit-figure fit-${field}`} aria-hidden="true"><Ruler /></div>
          <div>
            <p>{copy.fields[field][1]}</p>
            <label>
              {copy.fields[field][0]}
              <span>
                <input
                  aria-label={copy.fields[field][0]}
                  type="number"
                  min="1"
                  step="0.1"
                  value={measurements[field] || ""}
                  onChange={(event) => setMeasurements((current) => ({ ...current, [field]: Number(event.target.value) }))}
                />
                <b>{unit === "metric" ? "cm" : "in"}</b>
              </span>
            </label>
            <fieldset>
              <legend>{copy.unit}</legend>
              <button type="button" className={unit === "imperial" ? "active" : ""} onClick={() => changeUnit("imperial")}>{copy.imperial}</button>
              <button type="button" className={unit === "metric" ? "active" : ""} onClick={() => changeUnit("metric")}>{copy.metric}</button>
            </fieldset>
          </div>
        </div>
        <footer>
          <button type="button" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>{copy.previous}</button>
          <button type="button" disabled={!measurements[field] || step === fitFields.length - 1} onClick={() => setStep((current) => Math.min(fitFields.length - 1, current + 1))}>{copy.next}</button>
        </footer>
      </section>
      <section className="fit-summary panel">
        <div className="fit-values">
          {fitFields.map((item) => <span key={item}><small>{copy.fields[item][0]}</small><b>{measurements[item] || "—"} {measurements[item] ? unit === "metric" ? "cm" : "in" : ""}</b></span>)}
        </div>
        <div className="fit-size"><small>{copy.recommended}</small><b>{measurements.waist ? recommendedSize : "—"}</b></div>
        <label><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />{copy.consent}</label>
        <label><input type="checkbox" checked={shareWithVendors} onChange={(event) => setShareWithVendors(event.target.checked)} />{copy.vendor}</label>
        <p className="fit-privacy"><ShieldCheck />{copy.privacy}</p>
        {savedAt && <p className="fit-updated"><Clock3 />{copy.updated}: {new Date(savedAt).toLocaleString(locale)}</p>}
        <footer>
          <button className="primary" type="button" disabled={!consent || fitFields.some((item) => measurements[item] <= 0)} onClick={() => void save()}><Check />{copy.save}</button>
          <button type="button" disabled={!notice} onClick={() => go("Customer Shop")}>{copy.shop}<ArrowUpRight /></button>
          <button type="button" disabled={!savedAt} onClick={exportProfile}><Download />{copy.export}</button>
          <button type="button" disabled={!savedAt} onClick={() => void deleteProfile()}><Trash2 />{copy.remove}</button>
        </footer>
        {notice && <output className="policy-saved" role="status">{notice}</output>}
      </section>
    </div>
  );
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
  const [fitProfile, setFitProfile] = useState<FitProfile | null>(null);
  useEffect(() => {
    const savedFit = localStorage.getItem(fitStorageKey);
    if (savedFit) setFitProfile(JSON.parse(savedFit) as FitProfile);
  }, []);
  const visiblePicks = picks.filter((pick) => !hidden.includes(pick[0]));
  const missionSavings = budget - 312;
  const hidePick = (name: string) => setHidden((current) => [...current, name]);
  const openBag = () => {
    const bag = completeLookAdded
      ? [
          {
            name: "Aurelia Satin Midi",
            vendor: "Africstyle Fashion",
            price: 168,
            fulfillment: "Pickup today",
          },
          {
            name: "Mila Gold Clutch",
            vendor: "Blossom Collections",
            price: 86,
            fulfillment: "Vendor transfer to store",
          },
          {
            name: "Sculpted Gold Earring",
            vendor: "Nia Collective",
            price: 58,
            fulfillment: "Pickup today",
          },
        ]
      : saved.map((name) => ({
          name,
          vendor: "Blossom Royall partner",
          price:
            name === "Mila Gold Clutch"
              ? 86
              : name === "Aurelia Satin Midi"
                ? 168
                : 142,
          fulfillment: "Pickup today",
        }));
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
      <section className="shop-fit-bridge panel" aria-label="My Fit shopping status">
        <span>
          <Ruler />
          <span>
            <small className="eyebrow">MY FIT</small>
            <b>{fitProfile ? `Size ${fitProfile.recommendedSize} is ready for matching` : "Add your private fit profile"}</b>
            <small>{fitProfile ? "Recommendations now use your saved measurements without exposing them to vendors." : "Follow a calm self measurement guide before choosing a size."}</small>
          </span>
        </span>
        <button onClick={() => go("My Fit")}>{fitProfile ? "Review My Fit" : "Start My Fit"}<ArrowUpRight /></button>
      </section>
      <section className="shopping-mission panel">
        <div className="mission-copy">
          <Sparkles />
          <span>
            <small className="eyebrow">SHOP BY YOUR REAL LIFE</small>
            <h2>Tell us the moment. We will build the answer.</h2>
            <p>
              Blossom considers fit, budget, timing, delivery, cultural
              preferences, and the pieces you already own before recommending
              anything.
            </p>
          </span>
        </div>
        <div className="mission-fields">
          <label>
            What are you dressing for?
            <select
              aria-label="Shopping occasion"
              value={occasion}
              onChange={(e) => {
                setOccasion(e.target.value);
                setMissionReady(false);
              }}
            >
              <option>Wedding guest</option>
              <option>Traditional ceremony</option>
              <option>Work and leadership</option>
              <option>Date night</option>
              <option>Vacation</option>
              <option>Everyday refresh</option>
              <option>A gift</option>
            </select>
          </label>
          <label>
            Complete look budget
            <input
              aria-label="Complete look budget"
              type="number"
              min="50"
              step="25"
              value={budget}
              onChange={(e) => {
                setBudget(Number(e.target.value));
                setMissionReady(false);
              }}
            />
          </label>
          <label>
            When do you need it?
            <select
              aria-label="Need by"
              value={needBy}
              onChange={(e) => {
                setNeedBy(e.target.value);
                setMissionReady(false);
              }}
            >
              <option>Today</option>
              <option>Tomorrow</option>
              <option>Saturday</option>
              <option>Next week</option>
              <option>No rush</option>
            </select>
          </label>
          <button className="primary" onClick={() => setMissionReady(true)}>
            Build my edit <ArrowUpRight />
          </button>
        </div>
        {missionReady && (
          <div className="mission-result" role="status">
            <div>
              <span className="eyebrow">YOUR COMPLETE EDIT</span>
              <h3>
                {occasion}, ready by {needBy.toLowerCase()}
              </h3>
              <p>
                Three pieces from three independent brands. All available in
                your fit. One checkout and one pickup.
              </p>
            </div>
            <div className="mission-items">
              <span>
                <b>Aurelia Satin Midi</b>
                <small>Africstyle Fashion · Size {fitProfile?.recommendedSize || "8"}{fitProfile ? " from My Fit" : ""}</small>
                <em>$168</em>
              </span>
              <span>
                <b>Mila Gold Clutch</b>
                <small>Blossom Collections · Champagne</small>
                <em>$86</em>
              </span>
              <span>
                <b>Sculpted Gold Earring</b>
                <small>Nia Collective · Verified maker</small>
                <em>$58</em>
              </span>
            </div>
            <footer>
              <span>
                <b>$312</b>
                <small>
                  ${missionSavings} under your ${budget} budget
                </small>
              </span>
              <button onClick={() => setCompleteLookAdded(true)}>
                {completeLookAdded
                  ? "Complete look added"
                  : "Add complete look"}{" "}
                {completeLookAdded ? <Check /> : <ShoppingBag />}
              </button>
            </footer>
          </div>
        )}
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
            <button className="concierge-action">
              Book a styling appointment
            </button>
          </div>
          {showStyle && (
            <div className="style-signals" aria-label="Style signals">
              <span>Emerald</span>
              <span>Occasionwear</span>
              <span>Size {fitProfile?.recommendedSize || "8"}</span>
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
        <div
          className="heritage-image"
          role="img"
          aria-label="Contemporary African designers in tailored textile looks"
        />
        <div className="heritage-copy">
          <span className="eyebrow">THE AFRICAN DESIGNERS EDIT</span>
          <h2>Craft carried forward.</h2>
          <p>
            Contemporary tailoring meets richly woven cloth and expressive
            print, selected from designers shaping a new language of African
            luxury.
          </p>
          <button onClick={() => setShowHeritage((current) => !current)}>
            {showHeritage ? "Close collection notes" : "Explore the collection"}
            <ArrowUpRight />
          </button>
          {showHeritage && (
            <div className="heritage-notes" aria-live="polite">
              <b>Designed with provenance in view</b>
              <p>
                Each listing can carry its designer story, textile origin, maker
                attribution, care guidance, and limited production details.
              </p>
              <div>
                <span>Textile story</span>
                <span>Designer profile</span>
                <span>Made in</span>
                <span>Care and repair</span>
              </div>
            </div>
          )}
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
            {fitProfile && index !== 1 && <span className="fit-match"><Ruler />My Fit recommends size {fitProfile.recommendedSize}</span>}
            <div className="pick-confidence">
              <span>
                <ShieldCheck />
                Verified seller
              </span>
              <span>
                <Truck />
                {index === 1 ? "Ships in 2 to 3 days" : "Pickup today"}
              </span>
            </div>
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
      {(saved.length > 0 || completeLookAdded) && (
        <section className="smart-bag-bar" aria-label="Shopping bag summary">
          <span>
            <ShoppingBag />
            <b>
              {completeLookAdded ? 3 : saved.length}{" "}
              {completeLookAdded || saved.length !== 1 ? "pieces" : "piece"}
            </b>
            <small>
              {completeLookAdded
                ? "$312 · Three brands · One coordinated pickup"
                : "Your private edit is ready"}
            </small>
          </span>
          <button onClick={openBag}>
            Review bag <ArrowUpRight />
          </button>
        </section>
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

const defaultStaffRecords: StaffRecord[] = [
  {
    id: "maya-chen",
    name: "Maya Chen",
    email: "maya@example.com",
    phone: "",
    job: "Store manager",
    department: "Operations",
    hourlyRate: 28,
    status: "Active",
    shiftStart: "09:00",
    shiftEnd: "17:00",
    scheduledDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    clockedInAt: null,
    breakMinutes: 30,
  },
  {
    id: "jordan-ellis",
    name: "Jordan Ellis",
    email: "jordan@example.com",
    phone: "",
    job: "Client stylist",
    department: "Sales floor",
    hourlyRate: 22,
    status: "Active",
    shiftStart: "10:00",
    shiftEnd: "18:00",
    scheduledDays: ["Wed", "Thu", "Fri", "Sat", "Sun"],
    clockedInAt: null,
    breakMinutes: 30,
  },
  {
    id: "elena-ruiz",
    name: "Elena Ruiz",
    email: "elena@example.com",
    phone: "",
    job: "Fulfillment associate",
    department: "Fulfillment",
    hourlyRate: 20,
    status: "Invited",
    shiftStart: "11:00",
    shiftEnd: "19:00",
    scheduledDays: ["Tue", "Wed", "Thu", "Fri", "Sat"],
    clockedInAt: null,
    breakMinutes: 30,
  },
];

function StaffOperations() {
  const staffKey = "br-staff:blossom-royall";
  const leaveKey = "br-staff-leave:blossom-royall";
  const auditKey = "br-staff-audit:blossom-royall";
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const [staff, setStaff] = useState<StaffRecord[]>(defaultStaffRecords);
  const [leave, setLeave] = useState<LeaveRequest[]>([]);
  const [audits, setAudits] = useState<StaffAuditEvent[]>([]);
  const [editing, setEditing] = useState<StaffRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [tenantContext, setTenantContext] = useState<TenantContext>({
    mode: "preview",
    storeId: null,
    userId: null,
    role: null,
    reason: "Checking production access.",
  });
  useEffect(() => {
    const savedStaff = localStorage.getItem(staffKey);
    const savedLeave = localStorage.getItem(leaveKey);
    const savedAudits = localStorage.getItem(auditKey);
    if (savedStaff) setStaff(JSON.parse(savedStaff));
    if (savedLeave) setLeave(JSON.parse(savedLeave));
    if (savedAudits) setAudits(JSON.parse(savedAudits));
    void resolveTenantContext().then((context) =>
      setTenantContext(
        context.mode === "production"
          ? {
              ...context,
              reason:
                "Tenant identity is connected. Staff writes remain in preview until real employee identities and wage rules are approved.",
            }
          : context,
      ),
    );
  }, []);
  const addAudit = (staffName: string, action: string) => {
    const next = [
      {
        id: crypto.randomUUID(),
        staffName,
        action,
        at: new Date().toISOString(),
      },
      ...audits,
    ].slice(0, 30);
    setAudits(next);
    localStorage.setItem(auditKey, JSON.stringify(next));
  };
  const saveStaffState = (
    next: StaffRecord[],
    staffName: string,
    action: string,
  ) => {
    setStaff(next);
    localStorage.setItem(staffKey, JSON.stringify(next));
    addAudit(staffName, action);
  };
  const saveStaff = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const record: StaffRecord = {
      id: editing?.id || crypto.randomUUID(),
      name,
      email: String(data.get("email") || "")
        .trim()
        .toLowerCase(),
      phone: String(data.get("phone") || "").trim(),
      job: String(data.get("job") || "").trim(),
      department: String(data.get("department") || ""),
      hourlyRate: Number(data.get("hourlyRate")),
      status: String(data.get("status")) as StaffRecord["status"],
      shiftStart: String(data.get("shiftStart")),
      shiftEnd: String(data.get("shiftEnd")),
      scheduledDays: data.getAll("scheduledDays").map(String),
      clockedInAt: editing?.clockedInAt || null,
      breakMinutes: Number(data.get("breakMinutes")),
    };
    const next = editing
      ? staff.map((person) => (person.id === editing.id ? record : person))
      : [record, ...staff];
    saveStaffState(
      next,
      name,
      editing
        ? "Staff profile and schedule updated"
        : "Staff invitation prepared",
    );
    setNotice(
      editing
        ? `${name} was updated.`
        : `${name} was added to the staff roster.`,
    );
    setEditing(null);
    setOpen(false);
  };
  const toggleClock = (person: StaffRecord) => {
    const clockedInAt = person.clockedInAt ? null : new Date().toISOString();
    saveStaffState(
      staff.map((item) =>
        item.id === person.id ? { ...item, clockedInAt } : item,
      ),
      person.name,
      clockedInAt ? "Clocked in" : "Clocked out",
    );
    setNotice(`${person.name} ${clockedInAt ? "clocked in" : "clocked out"}.`);
  };
  const toggleStatus = (person: StaffRecord) => {
    const status = person.status === "Inactive" ? "Active" : "Inactive";
    saveStaffState(
      staff.map((item) => (item.id === person.id ? { ...item, status } : item)),
      person.name,
      status === "Inactive"
        ? "Staff access deactivated"
        : "Staff access restored",
    );
  };
  const removeStaff = (person: StaffRecord) => {
    if (removeId !== person.id) {
      setRemoveId(person.id);
      setNotice(`Select remove again to confirm removing ${person.name}.`);
      return;
    }
    saveStaffState(
      staff.filter((item) => item.id !== person.id),
      person.name,
      "Staff record removed",
    );
    setRemoveId(null);
    setNotice(`${person.name} was removed.`);
  };
  const saveLeave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const staffId = String(data.get("staffId"));
    const person = staff.find((item) => item.id === staffId);
    if (!person) return;
    const request: LeaveRequest = {
      id: crypto.randomUUID(),
      staffId,
      startDate: String(data.get("startDate")),
      endDate: String(data.get("endDate")),
      reason: String(data.get("reason")),
      status: "Pending",
      createdAt: new Date().toISOString(),
    };
    const next = [request, ...leave];
    setLeave(next);
    localStorage.setItem(leaveKey, JSON.stringify(next));
    addAudit(person.name, "Leave request submitted");
    setLeaveOpen(false);
    setNotice(`${person.name}'s leave request is ready for review.`);
  };
  const decideLeave = (
    request: LeaveRequest,
    status: LeaveRequest["status"],
  ) => {
    const next = leave.map((item) =>
      item.id === request.id ? { ...item, status } : item,
    );
    setLeave(next);
    localStorage.setItem(leaveKey, JSON.stringify(next));
    const person = staff.find((item) => item.id === request.staffId);
    if (person) addAudit(person.name, `Leave request ${status.toLowerCase()}`);
  };
  const hoursFor = (person: StaffRecord) => {
    const [startHour, startMinute] = person.shiftStart.split(":").map(Number);
    const [endHour, endMinute] = person.shiftEnd.split(":").map(Number);
    return (
      Math.max(
        0,
        endHour +
          endMinute / 60 -
          startHour -
          startMinute / 60 -
          person.breakMinutes / 60,
      ) * person.scheduledDays.length
    );
  };
  const weeklyPayroll = staff
    .filter((person) => person.status === "Active")
    .reduce((sum, person) => sum + hoursFor(person) * person.hourlyRate, 0);
  return (
    <div className="staff-operations">
      <section className="staff-summary">
        <article>
          <small>ACTIVE TEAM</small>
          <b>{staff.filter((person) => person.status === "Active").length}</b>
          <span>{staff.length} roster records</span>
        </article>
        <article>
          <small>ON SHIFT NOW</small>
          <b>{staff.filter((person) => person.clockedInAt).length}</b>
          <span>Live clock activity</span>
        </article>
        <article>
          <small>WEEKLY ESTIMATE</small>
          <b>
            $
            {weeklyPayroll.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </b>
          <span>Before taxes and adjustments</span>
        </article>
        <article>
          <small>LEAVE TO REVIEW</small>
          <b>
            {leave.filter((request) => request.status === "Pending").length}
          </b>
          <span>Pending owner decision</span>
        </article>
      </section>
      <section className="panel staff-center">
        <div className="panel-head">
          <span>
            <small className="eyebrow">PEOPLE AND SCHEDULES</small>
            <h3>One accountable team workspace</h3>
          </span>
          <div>
            <button onClick={() => setLeaveOpen((value) => !value)}>
              Request leave
            </button>
            <button
              className="primary"
              onClick={() => {
                setEditing(null);
                setOpen((value) => !value);
              }}
            >
              <Plus />
              Invite staff
            </button>
          </div>
        </div>
        <p>
          Manage roles, schedules, time activity, leave, and pay estimates
          without engineering intervention.
        </p>
        <div className={`tenant-runtime ${tenantContext.mode}`} role="status">
          <ShieldCheck />
          <span>
            <b>
              {tenantContext.mode === "production"
                ? "Production tenant identified"
                : "Private preview mode"}
            </b>
            <small>{tenantContext.reason}</small>
          </span>
        </div>
        {notice && (
          <output className="policy-saved" role="status">
            {notice}
          </output>
        )}
        {open && (
          <form
            className="staff-form"
            onSubmit={saveStaff}
            key={editing?.id || "new-staff"}
          >
            <label>
              Full name
              <input
                name="name"
                required
                defaultValue={editing?.name}
                autoComplete="name"
              />
            </label>
            <label>
              Email
              <input
                name="email"
                type="email"
                required
                defaultValue={editing?.email}
                autoComplete="email"
              />
            </label>
            <label>
              Phone
              <input
                name="phone"
                type="tel"
                defaultValue={editing?.phone}
                autoComplete="tel"
              />
            </label>
            <label>
              Job title
              <input name="job" required defaultValue={editing?.job} />
            </label>
            <label>
              Department
              <select
                name="department"
                defaultValue={editing?.department || "Sales floor"}
              >
                <option>Operations</option>
                <option>Sales floor</option>
                <option>Checkout</option>
                <option>Fulfillment</option>
                <option>Inventory</option>
                <option>Administration</option>
              </select>
            </label>
            <label>
              Employment status
              <select name="status" defaultValue={editing?.status || "Invited"}>
                <option>Invited</option>
                <option>Active</option>
                <option>On leave</option>
                <option>Inactive</option>
              </select>
            </label>
            <label>
              Hourly rate
              <span>
                <b>$</b>
                <input
                  name="hourlyRate"
                  type="number"
                  min="0"
                  step=".01"
                  required
                  defaultValue={editing?.hourlyRate || ""}
                />
              </span>
            </label>
            <label>
              Unpaid break minutes
              <input
                name="breakMinutes"
                type="number"
                min="0"
                step="5"
                required
                defaultValue={editing?.breakMinutes ?? 30}
              />
            </label>
            <label>
              Shift starts
              <input
                name="shiftStart"
                type="time"
                required
                defaultValue={editing?.shiftStart || "09:00"}
              />
            </label>
            <label>
              Shift ends
              <input
                name="shiftEnd"
                type="time"
                required
                defaultValue={editing?.shiftEnd || "17:00"}
              />
            </label>
            <fieldset>
              <legend>Scheduled days</legend>
              {days.map((day) => (
                <label key={day}>
                  <input
                    type="checkbox"
                    name="scheduledDays"
                    value={day}
                    defaultChecked={
                      editing?.scheduledDays.includes(day) ??
                      ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(day)
                    }
                  />
                  {day}
                </label>
              ))}
            </fieldset>
            <footer>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setEditing(null);
                }}
              >
                Cancel
              </button>
              <button className="primary" type="submit">
                <Check />
                Save staff record
              </button>
            </footer>
          </form>
        )}
        {leaveOpen && (
          <form className="staff-leave-form" onSubmit={saveLeave}>
            <label>
              Team member
              <select name="staffId" required defaultValue="">
                <option value="" disabled>
                  Choose team member
                </option>
                {staff.map((person) => (
                  <option value={person.id} key={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              First day
              <input name="startDate" type="date" required />
            </label>
            <label>
              Return date
              <input name="endDate" type="date" required />
            </label>
            <label>
              Reason
              <select name="reason">
                <option>Vacation</option>
                <option>Medical</option>
                <option>Personal</option>
                <option>Family care</option>
                <option>Other approved leave</option>
              </select>
            </label>
            <button className="primary" type="submit">
              Submit for review
            </button>
          </form>
        )}
        <div className="staff-roster">
          {staff.map((person) => (
            <article key={person.id}>
              <i>
                {person.name
                  .split(/\s+/)
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </i>
              <span>
                <b>{person.name}</b>
                <small>
                  {person.job} · {person.department}
                </small>
                <a href={`mailto:${person.email}`}>{person.email}</a>
              </span>
              <span>
                <small>Schedule</small>
                <b>{person.scheduledDays.join(", ") || "Not scheduled"}</b>
                <small>
                  {person.shiftStart} to {person.shiftEnd} ·{" "}
                  {person.breakMinutes} min break
                </small>
              </span>
              <span>
                <small>Weekly estimate</small>
                <b>
                  {hoursFor(person).toFixed(1)} hours · $
                  {(hoursFor(person) * person.hourlyRate).toFixed(2)}
                </b>
                <em>{person.status}</em>
              </span>
              <div>
                <button
                  className={person.clockedInAt ? "active" : ""}
                  onClick={() => toggleClock(person)}
                >
                  <Clock3 />
                  {person.clockedInAt ? "Clock out" : "Clock in"}
                </button>
                <button
                  onClick={() => {
                    setEditing(person);
                    setOpen(true);
                  }}
                >
                  Edit
                </button>
                <button onClick={() => toggleStatus(person)}>
                  {person.status === "Inactive" ? "Restore" : "Deactivate"}
                </button>
                <button
                  className={removeId === person.id ? "danger" : ""}
                  onClick={() => removeStaff(person)}
                >
                  {removeId === person.id ? "Confirm remove" : "Remove"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      {leave.length > 0 && (
        <section className="panel staff-leave">
          <div className="panel-head">
            <span>
              <small className="eyebrow">LEAVE REVIEW</small>
              <h3>Requests and decisions</h3>
            </span>
          </div>
          {leave.map((request) => {
            const person = staff.find((item) => item.id === request.staffId);
            return (
              <article key={request.id}>
                <span>
                  <b>{person?.name || "Former staff member"}</b>
                  <small>
                    {request.reason} · {request.startDate} to {request.endDate}
                  </small>
                </span>
                <em>{request.status}</em>
                {request.status === "Pending" && (
                  <div>
                    <button onClick={() => decideLeave(request, "Declined")}>
                      Decline
                    </button>
                    <button
                      className="primary"
                      onClick={() => decideLeave(request, "Approved")}
                    >
                      <Check />
                      Approve
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
      <section className="panel staff-payroll-note">
        <ShieldCheck />
        <span>
          <b>Payroll safe by design</b>
          <p>
            Figures shown are planning estimates only. Production payroll, tax
            withholding, identity verification, and wage payments will activate
            only after Delly approves the provider, employee records,
            permissions, and legal settings.
          </p>
        </span>
      </section>
      {audits.length > 0 && (
        <details className="vendor-audit staff-audit">
          <summary>View staff change history</summary>
          <ol>
            {audits.map((event) => (
              <li key={event.id}>
                <span>
                  <b>{event.action}</b>
                  <small>{event.staffName}</small>
                </span>
                <time>{new Date(event.at).toLocaleString()}</time>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

function HelpCenter({
  go,
  startTour,
}: {
  go: (destination: string) => void;
  startTour: () => void;
}) {
  const [role, setRole] = useState("Owner");
  const [search, setSearch] = useState("");
  const guides = [
    {
      title: "Open and close a sale",
      summary:
        "Scan seller attributed products, take one payment, and produce a complete receipt.",
      destination: "Checkout",
      roles: ["Owner", "Manager", "Staff"],
      steps: [
        "Open Checkout and start a sale.",
        "Scan or locate each item and confirm its vendor.",
        "Confirm tender, fulfillment, and receipt delivery before completing payment.",
      ],
    },
    {
      title: "Invite and launch a vendor",
      summary:
        "Create a vendor record, share onboarding, review branding, and prepare commercial terms.",
      destination: "Vendors",
      roles: ["Owner", "Manager", "Vendor"],
      steps: [
        "Invite the vendor from the tenant directory.",
        "Share the generated readiness link with the authorized contact.",
        "Review submitted details, brand assets, agreement terms, and selling status.",
      ],
    },
    {
      title: "Add one item or a collection",
      summary:
        "Format photographs, preserve vendor ownership, and publish inventory without engineering help.",
      destination: "Products",
      roles: ["Owner", "Manager", "Staff", "Vendor"],
      steps: [
        "Choose the owning vendor.",
        "Upload one photograph or a complete collection.",
        "Review generated names and publish approved items.",
      ],
    },
    {
      title: "Handle a return or exchange",
      summary:
        "Check the saved policy snapshot, inspect the item, and preserve the seller ledger.",
      destination: "Aftercare",
      roles: ["Owner", "Manager", "Staff"],
      steps: [
        "Open the customer request and verify eligibility.",
        "Record condition and selected resolution.",
        "Approve the inventory and financial disposition with an audit entry.",
      ],
    },
    {
      title: "Coordinate online fulfillment",
      summary:
        "Consolidate vendor items for pickup, local delivery, or carrier shipping.",
      destination: "Delivery",
      roles: ["Owner", "Manager", "Staff", "Vendor"],
      steps: [
        "Open the active fulfillment board.",
        "Confirm each seller item and custody scan.",
        "Release the complete order only after every required item passes the packing check.",
      ],
    },
    {
      title: "Schedule and support the team",
      summary:
        "Maintain staff access, shifts, time activity, leave, and gross pay estimates.",
      destination: "Staff",
      roles: ["Owner", "Manager", "Staff"],
      steps: [
        "Invite or select the team member.",
        "Set role, schedule, break, and pay planning information.",
        "Review clock activity and leave decisions before payroll export.",
      ],
    },
    {
      title: "Set returns and layaway rules",
      summary:
        "Publish tenant controlled promises without hardcoded engineering changes.",
      destination: "Policies",
      roles: ["Owner", "Manager"],
      steps: [
        "Review the current return and exchange window.",
        "Configure final sale, fees, layaway, grace, and inventory holding rules.",
        "Publish only after confirming the customer facing preview.",
      ],
    },
    {
      title: "Create and use My Fit",
      summary:
        "Follow private self measurement guidance, save your preferred unit, and shop with a fit recommendation.",
      destination: "My Fit",
      roles: ["Customer"],
      steps: [
        "Choose inches or centimeters and follow each measurement illustration.",
        "Review privacy choices before saving the fit profile.",
        "Return to Customer Shop and review the size recommendation before adding an item.",
      ],
    },
    {
      title: "Shop across every brand",
      summary:
        "Build a complete look, pay once, and follow one coordinated order.",
      destination: "Customer Shop",
      roles: ["Customer"],
      steps: [
        "Tell Blossom the occasion, budget, and timing.",
        "Review why each product was selected and who sells it.",
        "Choose fulfillment, pay once, and track every item from My Orders.",
      ],
    },
  ];
  const visible = guides.filter(
    (guide) =>
      guide.roles.includes(role) &&
      `${guide.title} ${guide.summary} ${guide.steps.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="content inner help-center">
      <div className="view-head">
        <div>
          <span className="eyebrow">BLOSSOM GUIDE</span>
          <h2>Answers at the moment of work.</h2>
          <p>
            Choose your role, find the task, and go directly to the right
            operating surface.
          </p>
        </div>
        <button className="primary" onClick={startTour}>
          <Sparkles />
          Start guided tour
        </button>
      </div>
      <section className="panel help-controls">
        <label>
          <Search />
          <input
            aria-label="Search help"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search sales, vendors, returns, delivery..."
          />
        </label>
        <fieldset>
          <legend>Show guidance for</legend>
          {["Owner", "Manager", "Staff", "Vendor", "Customer"].map((item) => (
            <button
              className={role === item ? "active" : ""}
              onClick={() => setRole(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </fieldset>
      </section>
      <section className="help-grid" aria-live="polite">
        {visible.map((guide) => (
          <details className="panel" key={guide.title}>
            <summary>
              <span>
                <small>{guide.destination.toUpperCase()}</small>
                <b>{guide.title}</b>
                <p>{guide.summary}</p>
              </span>
              <ChevronRight />
            </summary>
            <ol>
              {guide.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <button className="primary" onClick={() => go(guide.destination)}>
              Open {guide.destination}
              <ArrowUpRight />
            </button>
          </details>
        ))}
      </section>
      {visible.length === 0 && (
        <section className="panel help-empty">
          <CircleHelp />
          <h3>No matching guide yet</h3>
          <p>
            Try a broader word or choose another role. This result is also a
            documentation gap for the product team to address.
          </p>
          <button onClick={() => setSearch("")}>Clear search</button>
        </section>
      )}
      <section className="panel help-safety">
        <ShieldCheck />
        <span>
          <b>Know what the preview will not do</b>
          <p>
            Payroll, legal signatures, production identity invitations, payment
            transfers, database changes, and permission grants require approved
            providers, authenticated roles, real business data, and production
            authorization.
          </p>
        </span>
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
  preview,
}: {
  go: (x: string) => void;
  orders: Order[];
  openSale: () => void;
  preview: boolean;
}) {
  if (!preview) {
    const netSales = orders.reduce((sum, order) => sum + Number(order.total.replace(/[^0-9.-]/g, "")), 0);
    const averageOrder = orders.length ? netSales / orders.length : 0;
    return <div className="content">
      <section className="welcome"><div><span className="eyebrow">WELCOME, DELLY</span><h2>Your live command center is ready.</h2><p>{orders.length ? "Current tenant orders are shown below." : "No production orders have been recorded yet. Preview sales never appear in this workspace."}</p></div><button onClick={openSale}>Open checkout <ArrowUpRight /></button></section>
      <section className="metrics">
        {[['Net sales', `$${netSales.toFixed(2)}`, 'Recorded'], ['Orders', String(orders.length), 'Recorded'], ['Avg. order', `$${averageOrder.toFixed(2)}`, 'Calculated'], ['Mall traffic', 'Not connected', 'Awaiting source']].map((metric, index) => <article key={metric[0]}><i className={`m${index}`}>{index === 0 ? '$' : index === 1 ? '↗' : index === 2 ? '◌' : '◇'}</i><span><small>{metric[0]}</small><b>{metric[1]}</b><em>{metric[2]}</em></span></article>)}
      </section>
      <section className="dashboard-grid lower"><article className="panel orders"><div className="panel-head"><span><small className="eyebrow">LIVE TENANT DATA</small><h3>Recent orders</h3></span><button onClick={() => go("Orders")}>View all <ChevronRight /></button></div><OrderTable rows={orders} /></article><article className="panel intelligence"><div className="panel-head"><span><small className="eyebrow">INTELLIGENCE</small><h3>Waiting for operating history</h3></span><Sparkles /></div><div><p>Recommendations activate after real sales, inventory, fitting, and fulfillment events are available.</p><button onClick={() => go("Products")}>Prepare inventory <ArrowUpRight /></button></div></article></section>
    </div>;
  }
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
