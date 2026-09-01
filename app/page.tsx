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
import MallLanding from "./mall-landing";
import {
  loadAccountFitProfile,
  loadTenantVendors,
  loadVendorRentWorkspace,
  loadVendorLedger,
  loadVendorOperatingSnapshots,
  submitVendorRentPayment,
  reviewVendorRentPayment,
  loadTenantOrders,
  loadCustomerOrderHistory,
  requestOrderItemReturn,
  loadTenantReturnRequests,
  reviewTenantReturnRequest,
  advanceTenantOrderFulfillment,
  loadCustomerPickupCode,
  loadTenantPendingPayments,
  createPaymentEvidenceUrl,
  reviewTenantPendingPayment,
  loadTenantProducts,
  loadTenantVendorStorefronts,
  loadCashDrawerWorkspace,
  saveCashRegister,
  removeCashRegister,
  openCashDrawer,
  recordCashDrawerAdjustment,
  closeCashDrawer,
  removeTenantVendor,
  removeTenantVendorStorefront,
  resolveTenantContext,
  removeAccountFitProfiles,
  saveAccountFitProfile,
  saveTenantVendor,
  saveTenantVendorStorefront,
  saveTenantCommerceSettings,
  signOutTenant,
  placeTenantOrder,
  type TenantContext,
  type TenantProductSummary,
  type TenantVendorStorefront,
  type ReturnRequestRecord,
  type PendingPaymentReview,
  type CashRegisterRecord,
  type CashDrawerSessionRecord,
  type VendorRentRecord,
  type VendorLedgerEntry,
  type VendorOperatingSnapshot,
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

type WorkspaceRole = TenantContext["role"];
type NavItem = { label: string; destination: string; icon: typeof LayoutDashboard; roles: WorkspaceRole[] };
const operatorRoles: WorkspaceRole[] = ["owner", "manager", "staff"];
const nav: NavItem[] = [
  { label: "Command Center", destination: "Command Center", icon: LayoutDashboard, roles: ["owner", "manager", "staff"] },
  { label: "Vendor Board", destination: "Vendor Board", icon: LayoutDashboard, roles: ["vendor"] },
  { label: "Customer Shop", destination: "Customer Shop", icon: Sparkles, roles: ["customer", "owner", "manager", "staff"] },
  { label: "My Fit", destination: "My Fit", icon: Ruler, roles: ["customer"] },
  { label: "Checkout", destination: "Checkout", icon: CircleDollarSign, roles: [...operatorRoles, "customer"] },
  { label: "Cash Drawer", destination: "Cash Drawer", icon: Banknote, roles: operatorRoles },
  { label: "Orders", destination: "Orders", icon: ShoppingBag, roles: [...operatorRoles, "vendor"] },
  { label: "My Orders", destination: "My Orders", icon: ClipboardList, roles: ["customer"] },
  { label: "Aftercare", destination: "Aftercare", icon: RotateCcw, roles: ["customer", "owner", "manager", "staff"] },
  { label: "My Products", destination: "Products", icon: Package, roles: ["vendor"] },
  { label: "Rent", destination: "Rent", icon: Banknote, roles: ["owner", "manager", "vendor"] },
  { label: "Products", destination: "Products", icon: Package, roles: operatorRoles },
  { label: "Vendors", destination: "Vendors", icon: Store, roles: ["owner", "manager"] },
  { label: "Shared Commerce", destination: "Shared Commerce", icon: RefreshCw, roles: ["owner", "manager"] },
  { label: "Delivery", destination: "Delivery", icon: Truck, roles: operatorRoles },
  { label: "Staff", destination: "Staff", icon: Users, roles: ["owner", "manager"] },
  { label: "Intelligence", destination: "Intelligence", icon: BrainCircuit, roles: ["owner", "manager"] },
  { label: "Policies", destination: "Policies", icon: Settings, roles: ["owner", "manager"] },
  { label: "Business Setup", destination: "Business Setup", icon: Store, roles: ["owner"] },
  { label: "Help", destination: "Help", icon: BookOpen, roles: ["owner", "manager", "staff", "vendor", "customer"] },
];

const defaultDestination = (role: WorkspaceRole) => role === "vendor" ? "Vendor Board" : role === "customer" ? "Customer Shop" : "Command Center";
const allowedNavigation = (role: WorkspaceRole) => role ? nav.filter((item) => item.roles.includes(role)) : nav.filter((item) => !["Vendor Board", "My Products"].includes(item.label));

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
type Order = {
  id: string;
  customer: string;
  total: string;
  status: string;
  time: string;
  rawId?: string;
  fulfillmentMethod?: string;
  fulfillmentStatus?: string;
  paymentStatus?: string;
};
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
    ownerName: string;
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
    contactName: "Duplex",
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
  const [showOperatingSystem, setShowOperatingSystem] = useState(false);
  useEffect(() => {
    const hostname = window.location.hostname;
    const publicPreview = new URLSearchParams(window.location.search).get("public") === "1";
    setShowOperatingSystem(!publicPreview && (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "app.blossomroyall.com"));
  }, []);
  return showOperatingSystem ? <OperatingSystem /> : <MallLanding />;
}

export function OperatingSystem() {
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
    const requestedView = new URLSearchParams(window.location.search).get("view");
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
      const available = allowedNavigation(context.role);
      const requested = requestedView ? available.find((item) => item.destination === requestedView || item.label === requestedView) : undefined;
      setActive(requested?.destination || defaultDestination(context.role));
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
  const notificationItems = tenantContext?.mode === "production" ? [] : [
    { id: "stock", title: "12 low stock variants", detail: "Reorder before the weekend", destination: "Products" },
    { id: "rent", title: "Vendor rent due today", detail: "Nia Collective · $800", destination: "Vendors" },
    { id: "leave", title: "Leave request awaiting review", detail: "Open the staff decision queue", destination: "Staff" },
  ];
  const unreadNotificationCount = notificationItems.filter((item) => !readNotifications.includes(item.id)).length;
  const go = (v: string) => {
    if (tenantContext?.role && !allowedNavigation(tenantContext.role).some((item) => item.destination === v)) return;
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
          {allowedNavigation(tenantContext?.role || null).map(({ label, destination, icon: Icon }) => (
            <button
              key={label}
              className={active === destination ? "active" : ""}
              onClick={() => go(destination)}
            >
              <Icon />
              {label}
              {destination === "Orders" && visibleOrders.length > 0 && <em>{visibleOrders.length}</em>}
            </button>
          ))}
        </nav>
        <div className="profile">
          <i>{(tenantContext?.mode === "production" ? tenantContext.displayName || "Store member" : storeSettings.ownerDisplayName).slice(0, 1).toUpperCase()}</i>
          <span>
            <b>{tenantContext?.mode === "production" ? tenantContext.displayName || "Store member" : storeSettings.ownerDisplayName}</b>
            <small>{tenantContext?.role ? tenantContext.role[0].toUpperCase() + tenantContext.role.slice(1) : "Preview owner"}</small>
          </span>
          {tenantContext?.mode === "production" ? <button onClick={() => void signOutTenant().then(() => { window.location.href = "/auth"; })}>Sign out</button> : <Link href="/auth">Sign in</Link>}
        </div>
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
            {(!tenantContext?.role || ["owner", "manager"].includes(tenantContext.role)) && <button
              className="bell notification-toggle"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              onClick={() => setNotificationsOpen((value) => !value)}
            >
              <Bell />
              {unreadNotificationCount > 0 && (
                <i className="notification-count">
                  {unreadNotificationCount}
                </i>
              )}
            </button>}
            {(!tenantContext?.role || ["owner", "manager"].includes(tenantContext.role)) && <button
              className="bell tour-toggle"
              aria-label="Open guided tour"
              onClick={() => showTourStep(0)}
            >
              <CircleHelp />
            </button>}
            <button
              className="bell theme-toggle"
              aria-label={`Use ${theme === "light" ? "dark" : "light"} theme`}
              onClick={toggleTheme}
            >
              {theme === "light" ? <Moon /> : <Sun />}
            </button>
            {(!tenantContext?.role || operatorRoles.includes(tenantContext.role)) && <button
              className="primary"
              onClick={() => {
                setDone(false);
                setSale(true);
              }}
            >
              <Plus />
              New sale
            </button>}
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
        {notificationsOpen && (!tenantContext?.role || ["owner", "manager"].includes(tenantContext.role)) && (
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
            {!notificationItems.length && <p className="notification-empty">No live alerts are connected yet. Production alert automation is still in development.</p>}
            {notificationItems.map((item) => (
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
            {!!notificationItems.length && <footer>
              <button
                onClick={() => reviewNotifications(["stock", "rent", "leave"])}
              >
                <Check />
                Mark all reviewed
              </button>
            </footer>}
          </section>
        )}
        {active === "Command Center" && (
          <><Dashboard go={go} orders={filtered} openSale={() => setSale(true)} preview={tenantContext?.mode !== "production"} displayName={tenantContext?.displayName || storeSettings.ownerDisplayName} role={tenantContext?.role || "owner"} />{tenantContext?.mode === "production" && ["owner", "manager"].includes(tenantContext.role || "") && <OwnerVendorReconciliation context={tenantContext} go={go} />}</>
        )}
        {active === "Vendor Board" && tenantContext && <VendorBoard context={tenantContext} go={go} />}
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
            <>
              <PaymentReviewQueue context={tenantContext} />
              <OrderTable rows={filtered} context={tenantContext} />
            </>
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
            {tenantContext && <ProductCatalogManager context={tenantContext} />}
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
        {active === "Rent" && tenantContext && <VendorRentWorkspace context={tenantContext} />}
        {active === "Shared Commerce" && <SharedCommerceCenter />}
        {active === "Delivery" && <DeliveryCenter />}
        {active === "Checkout" && (
          <CheckoutCenter openSale={() => setSale(true)} />
        )}
        {active === "Cash Drawer" && <CashDrawerCenter go={go} />}
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

function ProductCatalogManager({ context }: { context: TenantContext }) {
  const storageKey = "br-product-drafts:blossom-royall";
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<ProductDraft[]>([]);
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState(false);
  const [tenantProducts, setTenantProducts] = useState<TenantProductSummary[]>([]);
  useEffect(() => {
    if (context.mode === "preview") {
      const stored = localStorage.getItem(storageKey);
      if (stored) setDrafts(JSON.parse(stored));
      setTenantProducts([]);
      return;
    }
    setDrafts([]);
    void loadTenantProducts(context).then(setTenantProducts).catch(() => setTenantProducts([]));
  }, [context]);
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
  const addTenantProductToBag = (product: TenantProductSummary) => {
    const variant = product.variants.find((item) => item.quantity > 0);
    if (!variant) { setMessage(`${product.name} has no available variant.`); return; }
    const storageKey = "br-customer-bag:blossom-royall";
    const stored = localStorage.getItem(storageKey);
    const current: BagItem[] = stored ? JSON.parse(stored) : [];
    if (current.some((item) => item.variantId === variant.id)) { setMessage(`${product.name} is already in the checkout bag.`); return; }
    const next: BagItem[] = [...current, { variantId: variant.id, name: product.name, vendor: product.vendorName, price: variant.price, quantity: 1, fulfillment: "Tenant inventory" }];
    localStorage.setItem(storageKey, JSON.stringify(next));
    setMessage(`${product.name} was added to the production checkout bag.`);
  };
  return (
    <>
      <section className="panel collection-studio">
        <div className={`tenant-runtime ${context.mode}`}><ShieldCheck /><span><b>{context.mode === "production" ? "Tenant catalog active" : "Private preview mode"}</b><small>{context.reason}</small></span></div>
        <div className="panel-head">
          <span>
            <small className="eyebrow">COLLECTION STUDIO</small>
            <h3>Luxury item exposure</h3>
          </span>
          {context.mode === "preview" && <div>
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
        {context.mode === "production" && <p className="control-note"><ShieldCheck />Production displays only tenant catalog records. New product publishing activates after private media storage and the mandatory fresh database snapshot are available.</p>}
        {context.mode === "preview" && open && (
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
        {context.mode === "preview" && drafts.length > 0 && (
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
      {context.mode === "production" ? <div className="product-grid">
        {tenantProducts.map((product) => {
          const quantity = product.variants.reduce((sum, variant) => sum + variant.quantity, 0);
          const price = product.variants[0]?.price || 0;
          return <article className="product" key={product.id}><div><ShoppingBag /><span>{product.status}</span></div><small>{product.variants[0]?.sku || "No SKU"}</small><h3>{product.name}</h3><p>{product.category}</p><footer><b>${price.toFixed(2)}</b><span>{quantity} available</span></footer>{operatorRoles.includes(context.role) ? <button disabled={!quantity} onClick={() => addTenantProductToBag(product)}>{quantity ? "Add to checkout" : "Unavailable"}</button> : <small className="channel-source">Vendor catalog editing is still in development. Only your authorized products appear here.</small>}</article>;
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
      <VendorStorefrontStudio vendors={records} tenantContext={tenantContext} />
      <AfricstylePilotImport />
      <VendorLeaseRentCenter vendors={records} />
      <VendorBrandManager />
    </>
  );
}

function VendorStorefrontStudio({ vendors, tenantContext }: { vendors: VendorRecord[]; tenantContext: TenantContext }) {
  const storageKey = "br-vendor-storefronts:blossom-royall";
  const [profiles, setProfiles] = useState<TenantVendorStorefront[]>([]);
  const [editing, setEditing] = useState<TenantVendorStorefront | null>(null);
  const [notice, setNotice] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) setProfiles(JSON.parse(stored));
    else {
      const blossom = vendors.find((vendor) => vendor.id === "blossom-collections" || vendor.name.toLowerCase() === "blossom collections");
      const africstyle = vendors.find((vendor) => vendor.id === "africstyle-fashion");
      const seeded: TenantVendorStorefront[] = [];
      if (blossom) seeded.push({ id: "preview-blossom-collections", vendorId: blossom.id, slug: "blossom-collections", publicName: "Blossom Collections", ownerDisplayName: "Delly", tagline: "Modern occasionwear, polished essentials, and gifts chosen with care.", story: "Blossom Collections is Delly’s signature edit inside Blossom Royall.", categories: ["Women’s fashion", "Accessories", "Gifting"], facebookUrl: "", websiteUrl: "", contactEmail: blossom.email, contactPhone: blossom.phone, primaryColor: "#6f2942", secondaryColor: "#f1d49d", fulfillmentMethods: ["Store pickup"], mediaRightsStatus: "confirmed", status: "published" });
      if (africstyle) seeded.push({ id: "preview-africstyle-fashion", vendorId: africstyle.id, slug: "africstyle-fashion", publicName: "Africstyle Fashion", ownerDisplayName: "Duplex", tagline: "Contemporary African fashion shaped by heritage, movement, and confidence.", story: "Africstyle Fashion is owned by Duplex and presented inside Blossom Royall.", categories: ["African heritage fashion", "Activewear", "Formalwear"], facebookUrl: "https://www.facebook.com/africstyefashion/", websiteUrl: "https://africstylefashion.com/", contactEmail: africstyle.email, contactPhone: africstyle.phone, primaryColor: "#123d35", secondaryColor: "#e8b647", fulfillmentMethods: ["Store pickup", "Shipping", "Vendor fulfilled"], mediaRightsStatus: "confirmed", status: "published" });
      setProfiles(seeded);
    }
    if (tenantContext.mode === "production") void loadTenantVendorStorefronts(tenantContext).then((rows) => { if (rows.length) setProfiles(rows); }).catch(() => setNotice("Production storefront profiles could not be loaded. The studio remains in private preview mode."));
  }, [tenantContext.mode, tenantContext.storeId, vendors]);
  const persist = (next: TenantVendorStorefront[]) => { setProfiles(next); localStorage.setItem(storageKey, JSON.stringify(next)); };
  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const requestedStatus = String(data.get("status")) as TenantVendorStorefront["status"];
    const mediaRightsStatus = String(data.get("mediaRightsStatus")) as TenantVendorStorefront["mediaRightsStatus"];
    if (requestedStatus === "published" && mediaRightsStatus !== "confirmed") { setNotice("Confirm media rights before publishing this storefront."); return; }
    const vendorId = String(data.get("vendorId"));
    const current = editing || profiles.find((profile) => profile.vendorId === vendorId);
    const profile: TenantVendorStorefront = {
      id: current?.id && !current.id.startsWith("preview") ? current.id : crypto.randomUUID(), vendorId,
      slug: String(data.get("slug")).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      publicName: String(data.get("publicName")).trim(), ownerDisplayName: String(data.get("ownerDisplayName")).trim(),
      tagline: String(data.get("tagline")).trim(), story: String(data.get("story")).trim(),
      categories: String(data.get("categories")).split(",").map((item) => item.trim()).filter(Boolean),
      facebookUrl: String(data.get("facebookUrl")).trim(), websiteUrl: String(data.get("websiteUrl")).trim(),
      contactEmail: String(data.get("contactEmail")).trim().toLowerCase(), contactPhone: String(data.get("contactPhone")).trim(),
      primaryColor: String(data.get("primaryColor")), secondaryColor: String(data.get("secondaryColor")),
      fulfillmentMethods: data.getAll("fulfillmentMethods").map(String), mediaRightsStatus, status: requestedStatus,
    };
    const next = current ? profiles.map((item) => item.vendorId === vendorId ? profile : item) : [profile, ...profiles];
    persist(next); setEditing(null); setNotice(`${profile.publicName} storefront saved as ${profile.status}.`);
    if (tenantContext.mode === "production") void saveTenantVendorStorefront(tenantContext, profile).catch(() => setNotice("The storefront remains saved on this device, but production synchronization needs attention."));
  };
  const remove = (profile: TenantVendorStorefront) => {
    if (deleteId !== profile.id) { setDeleteId(profile.id); setNotice(`Select remove again to confirm deleting ${profile.publicName} storefront.`); return; }
    persist(profiles.filter((item) => item.id !== profile.id)); setDeleteId(null); setNotice(`${profile.publicName} storefront removed.`);
    if (tenantContext.mode === "production" && !profile.id.startsWith("preview")) void removeTenantVendorStorefront(tenantContext, profile.id).catch(() => setNotice("The local storefront was removed, but production removal needs attention."));
  };
  const selected = editing || profiles[0];
  const blankProfile = (): TenantVendorStorefront => ({
    id: `preview-${crypto.randomUUID()}`, vendorId: vendors[0]?.id || "", slug: "", publicName: vendors[0]?.name || "",
    ownerDisplayName: "", tagline: "", story: "", categories: [], facebookUrl: "", websiteUrl: "",
    contactEmail: vendors[0]?.email || "", contactPhone: vendors[0]?.phone || "", primaryColor: "#5a1830",
    secondaryColor: "#f1d49d", fulfillmentMethods: [], mediaRightsStatus: "pending", status: "draft",
  });
  return <section className="panel storefront-studio">
    <div className="panel-head"><span><small className="eyebrow">VENDOR STOREFRONT STUDIO</small><h3>Independent brand homes inside Blossom Royall</h3></span><button className="primary" onClick={() => setEditing(selected || blankProfile())}><Sparkles />{selected ? "Edit storefront" : "Create storefront"}</button></div>
    <p>Each vendor controls an isolated public identity, catalog story, fulfillment promise, and policy presentation while Blossom Royall remains the mall brand.</p>
    {editing && <form className="storefront-form" onSubmit={save}>
      <label>Vendor<select name="vendorId" required defaultValue={editing.vendorId}>{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
      <label>Public store name<input name="publicName" required maxLength={120} defaultValue={editing.publicName} /></label>
      <label>Store address slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={editing.slug} /></label>
      <label>Owner display name<input name="ownerDisplayName" maxLength={120} defaultValue={editing.ownerDisplayName} /></label>
      <label>Tagline<input name="tagline" maxLength={180} defaultValue={editing.tagline} /></label>
      <label className="wide">Brand story<textarea name="story" maxLength={4000} defaultValue={editing.story} placeholder="What the store sells, who it serves, and what makes it distinct" /></label>
      <label className="wide">Categories<input name="categories" required defaultValue={editing.categories.join(", ")} placeholder="Women’s fashion, accessories, gifting" /><small>Separate editable categories with commas.</small></label>
      <label>Official Facebook page<input name="facebookUrl" type="url" pattern="https://.*" defaultValue={editing.facebookUrl} placeholder="https://facebook.com/..." /></label>
      <label>Official website<input name="websiteUrl" type="url" pattern="https://.*" defaultValue={editing.websiteUrl} placeholder="https://..." /></label>
      <label>Public email<input name="contactEmail" type="email" defaultValue={editing.contactEmail} /></label>
      <label>Public phone<input name="contactPhone" type="tel" defaultValue={editing.contactPhone} /></label>
      <label>Primary brand color<input name="primaryColor" type="color" defaultValue={editing.primaryColor} /></label>
      <label>Secondary brand color<input name="secondaryColor" type="color" defaultValue={editing.secondaryColor} /></label>
      <fieldset className="wide"><legend>Fulfillment methods</legend>{["Store pickup", "Local delivery", "Shipping", "Vendor fulfilled", "Appointment"].map((method) => <label key={method}><input type="checkbox" name="fulfillmentMethods" value={method} defaultChecked={editing.fulfillmentMethods.includes(method)} />{method}</label>)}</fieldset>
      <label>Media rights<select name="mediaRightsStatus" defaultValue={editing.mediaRightsStatus}><option value="pending">Pending confirmation</option><option value="confirmed">Confirmed</option><option value="restricted">Restricted</option></select></label>
      <label>Publication status<select name="status" defaultValue={editing.status}><option value="draft">Draft</option><option value="review">Ready for review</option><option value="published">Published</option><option value="suspended">Suspended</option></select></label>
      <footer className="wide"><button type="button" onClick={() => setEditing(null)}>Cancel</button><button className="primary"><Check />Save storefront</button></footer>
    </form>}
    {notice && <output className="policy-saved" role="status">{notice}</output>}
    <div className="storefront-cards">{profiles.map((profile) => <article key={profile.id} style={{ "--storefront-primary": profile.primaryColor, "--storefront-secondary": profile.secondaryColor } as React.CSSProperties}><header><span>{profile.ownerDisplayName || "Independent vendor"}</span><em>{profile.status}</em></header><h4>{profile.publicName}</h4><p>{profile.tagline || "Store story being prepared."}</p><small>{profile.categories.join(" · ") || "Categories pending"}</small><footer><Link className="storefront-view-link" href={`/stores/${profile.slug}`}>View storefront<ArrowUpRight /></Link><button onClick={() => setEditing(profile)}>Edit</button><button className={deleteId === profile.id ? "danger" : ""} onClick={() => remove(profile)}>{deleteId === profile.id ? "Confirm remove" : "Remove"}</button></footer></article>)}</div>
  </section>;
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
        staged for Blossom Royall review. {draft?.vendor.ownerName || "Duplex"}{" "}
        owns this existing brand. Inventory, fulfillment, and final publication
        remain pending.
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

function VendorRentWorkspace({ context }: { context: TenantContext }) {
  const [rows, setRows] = useState<VendorRentRecord[]>([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    setLoading(true);
    try { setRows(await loadVendorRentWorkspace(context)); setNotice(""); }
    catch { setNotice("Rent records could not be loaded. No payment was changed."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, [context.mode, context.role, context.storeId]);
  const submitPayment = async (event: React.FormEvent<HTMLFormElement>, row: VendorRentRecord) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await submitVendorRentPayment(context, { leaseId: row.leaseId, dueOn: row.dueOn, amount: row.monthlyRent, method: String(data.get("method")), providerReference: String(data.get("reference")) });
      setNotice("Payment submitted for owner verification. It is not marked paid until the owner approves it.");
      await refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Payment submission failed."); }
  };
  const review = async (row: VendorRentRecord, decision: "paid" | "rejected") => {
    if (!row.paymentId) return;
    try { await reviewVendorRentPayment(context, row.paymentId, decision, "Reviewed in the rent workspace"); await refresh(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Payment review failed."); }
  };
  return <ListView eyebrow="VENDOR FINANCE" title="Rent" subtitle="Due dates, payment verification, and receipts in one accountable record.">
    <section className="panel vendor-finance">
      {context.mode !== "production" && <div className="policy-saved" role="status">Production rent records require an authorized account. Online card and bank processing are still in development.</div>}
      {notice && <output className="policy-saved" role="status">{notice}</output>}
      {loading ? <p>Loading authorized rent records…</p> : rows.length === 0 ? <p>No signed lease with a current rent obligation was found for this account.</p> : <div className="agreement-ledger">
        {rows.map((row) => <article key={row.leaseId}>
          <span><b>{row.vendorName}</b><small>Due {new Date(`${row.dueOn}T00:00:00`).toLocaleDateString()}</small></span>
          <span><small>Monthly rent</small><b>${row.monthlyRent.toFixed(2)}</b></span>
          <span><small>Status</small><b>{row.status.toUpperCase()}</b></span>
          {row.receiptNumber && <span><small>Receipt</small><b>{row.receiptNumber}</b></span>}
          {context.role === "vendor" && ["due", "late", "rejected", "failed"].includes(row.status) && <form onSubmit={(event) => void submitPayment(event, row)}>
            <label>Payment method<input name="method" required minLength={2} placeholder="Bank transfer, Zelle, check" /></label>
            <label>Confirmation reference<input name="reference" required minLength={3} placeholder="Confirmation or check number" /></label>
            <button className="primary" type="submit"><Banknote /> Submit payment</button>
            <small>Submission requires owner verification. Direct online processing is still in development.</small>
          </form>}
          {context.role === "vendor" && row.status === "pending" && <p>Submitted and waiting for owner verification.</p>}
          {["owner", "manager"].includes(context.role || "") && row.status === "pending" && <span>
            <button className="primary" onClick={() => void review(row, "paid")}><Check /> Confirm paid</button>
            <button onClick={() => void review(row, "rejected")}><X /> Reject</button>
          </span>}
        </article>)}
      </div>}
    </section>
  </ListView>;
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
  const { value: delivery } = useDeliverySettings();
  const [tenantContext, setTenantContext] = useState<TenantContext>({ mode: "preview", storeId: null, userId: null, role: null, reason: "Checking production access." });
  const [productionNotice, setProductionNotice] = useState("");
  useEffect(() => { void resolveTenantContext().then(setTenantContext); }, []);
  const saveSettings = async () => {
    save();
    if (tenantContext.mode !== "production") { setProductionNotice("Settings remain in the private device preview until an authorized production account signs in."); return; }
    try {
      await saveTenantCommerceSettings(tenantContext, { currency: settings.currency, taxRatePercent: settings.taxRatePercent, taxInclusive: settings.taxInclusive, deliveryTaxable: delivery.deliveryTaxable, pickupEnabled: delivery.pickupEnabled, localDeliveryEnabled: delivery.localDeliveryEnabled, localFee: delivery.localFee, freeLocalMinimum: delivery.freeLocalMinimum, shippingEnabled: delivery.shippingEnabled, shippingFee: delivery.shippingFee });
      setProductionNotice("Authoritative tenant tax and delivery settings were saved with an audit record.");
    } catch (error) { setProductionNotice(error instanceof Error ? error.message : "Production settings were not saved."); }
  };
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
        <button className="primary" onClick={() => void saveSettings()}>
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
      {productionNotice && <p className="policy-saved" aria-live="polite">{productionNotice}</p>}
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
  const { value: storeSettings } = useStoreSettings();
  const [tenantContext, setTenantContext] = useState<TenantContext>({ mode: "preview", storeId: null, userId: null, role: null, reason: "Checking production access." });
  const [productionNotice, setProductionNotice] = useState("");
  useEffect(() => { void resolveTenantContext().then(setTenantContext); }, []);
  const saveSettings = async () => {
    save();
    if (tenantContext.mode !== "production") { setProductionNotice("Delivery settings remain in the private device preview."); return; }
    try {
      await saveTenantCommerceSettings(tenantContext, { currency: storeSettings.currency, taxRatePercent: storeSettings.taxRatePercent, taxInclusive: storeSettings.taxInclusive, deliveryTaxable: settings.deliveryTaxable, pickupEnabled: settings.pickupEnabled, localDeliveryEnabled: settings.localDeliveryEnabled, localFee: settings.localFee, freeLocalMinimum: settings.freeLocalMinimum, shippingEnabled: settings.shippingEnabled, shippingFee: settings.shippingFee });
      setProductionNotice("Authoritative delivery and tax settings were saved with an audit record.");
    } catch (error) { setProductionNotice(error instanceof Error ? error.message : "Production delivery settings were not saved."); }
  };
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
        <button className="primary" onClick={() => void saveSettings()}>
          <Check />
          {saved ? "Delivery saved" : "Save delivery"}
        </button>
      </div>
      {productionNotice && <p className="policy-saved" aria-live="polite">{productionNotice}</p>}
      <section className="delivery-modes">
        <label className={settings.deliveryTaxable ? "enabled" : ""}>
          <input type="checkbox" checked={settings.deliveryTaxable} onChange={(event) => update("deliveryTaxable", event.target.checked)} />
          <CircleDollarSign />
          <span><b>Tax delivery fees</b><small>Include eligible delivery charges in the configured tax base</small></span>
        </label>
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
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null);
  const [productionReturns, setProductionReturns] = useState<ReturnRequestRecord[]>([]);
  const [returnLoading, setReturnLoading] = useState(true);
  useEffect(() => {
    void resolveTenantContext().then(async (context) => {
      setTenantContext(context);
      if (context.mode === "production" && ["owner", "manager", "staff"].includes(context.role || "")) {
        try {
          setProductionReturns(await loadTenantReturnRequests(context));
        } catch {
          setNotice("The production return queue could not be loaded.");
        }
      }
      setReturnLoading(false);
    });
  }, []);
  const productionMode = tenantContext?.mode === "production" && ["owner", "manager", "staff"].includes(tenantContext.role || "");
  const advanceReturn = async (request: ReturnRequestRecord, status: "reviewing" | "approved" | "rejected" | "received" | "completed") => {
    if (!tenantContext) return;
    try {
      const updated = await reviewTenantReturnRequest(tenantContext, request.id, status);
      setProductionReturns((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(`Return ${request.id.slice(0, 8).toUpperCase()} is now ${status}.`);
    } catch (error) {
      setNotice(error instanceof Error ? `The return was not updated: ${error.message}` : "The return was not updated.");
    }
  };
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
      {!productionMode && <section className="aftercare-metrics">
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
      </section>}
      {productionMode && (
        <section className="panel care-timeline" aria-label="Production return queue">
          <div>
            <span className="eyebrow">PRODUCTION RETURN QUEUE</span>
            <h3>{returnLoading ? "Loading return requests" : `${productionReturns.length} return requests`}</h3>
          </div>
          {!returnLoading && !productionReturns.length && <p>No customer return requests need attention.</p>}
          <ol>
            {productionReturns.map((request) => (
              <li key={request.id}>
                <i><RotateCcw /></i>
                <span>
                  <b>{request.reason.replaceAll("_", " ")} for {request.requestedResolution.replaceAll("_", " ")}</b>
                  <small>{request.id.slice(0, 8).toUpperCase()} · {request.status} · {new Date(request.createdAt).toLocaleString()}</small>
                  <span className="care-actions">
                    {request.status === "requested" && <button onClick={() => void advanceReturn(request, "reviewing")}>Start review</button>}
                    {["requested", "reviewing"].includes(request.status) && <button onClick={() => void advanceReturn(request, "approved")}>Approve</button>}
                    {["requested", "reviewing"].includes(request.status) && <button onClick={() => void advanceReturn(request, "rejected")}>Reject</button>}
                    {request.status === "approved" && <button onClick={() => void advanceReturn(request, "received")}>Mark received</button>}
                    {request.status === "received" && <button onClick={() => void advanceReturn(request, "completed")}>Complete</button>}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {!productionMode && <section className="aftercare-grid">
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
      </section>}
      {!productionMode && <section className="panel care-timeline">
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
      </section>}
    </div>
  );
}

type BagItem = {
  orderItemId?: string;
  variantId?: string;
  name: string;
  vendor: string;
  price: number;
  fulfillment: string;
  quantity?: number;
};

type CheckoutTender = "Cash" | "Card" | "Bank transfer" | "Zelle" | "Venmo" | "PayPal" | "Cash App" | "Mobile money" | "Check";
type PaymentProof = { name: string; type: string; size: number };

const drawerCopy = {
  en: { title: "Cash drawer", subtitle: "Open with a counted float, record every cash movement, then close against the system total.", register: "Register", location: "Location", create: "Add register", opening: "Opening float", open: "Open drawer", paidIn: "Paid in", paidOut: "Paid out", reason: "Reason", record: "Record movement", counted: "Counted cash", close: "Close and reconcile", expected: "Expected", variance: "Variance", noDrawer: "No open drawer", checkout: "Go to checkout", history: "Recent drawer history", note: "Note", production: "Sign in as an owner, manager, or staff member to use production drawers." },
  fr: { title: "Caisse", subtitle: "Ouvrez avec un fonds compté, enregistrez chaque mouvement, puis clôturez selon le total du système.", register: "Caisse", location: "Emplacement", create: "Ajouter une caisse", opening: "Fonds initial", open: "Ouvrir la caisse", paidIn: "Entrée", paidOut: "Sortie", reason: "Motif", record: "Enregistrer le mouvement", counted: "Espèces comptées", close: "Clôturer et rapprocher", expected: "Attendu", variance: "Écart", noDrawer: "Aucune caisse ouverte", checkout: "Aller au paiement", history: "Historique récent", note: "Note", production: "Connectez vous comme propriétaire, responsable ou membre du personnel pour utiliser les caisses de production." },
  es: { title: "Caja de efectivo", subtitle: "Abra con un fondo contado, registre cada movimiento y cierre contra el total del sistema.", register: "Caja", location: "Ubicación", create: "Agregar caja", opening: "Fondo inicial", open: "Abrir caja", paidIn: "Entrada", paidOut: "Salida", reason: "Motivo", record: "Registrar movimiento", counted: "Efectivo contado", close: "Cerrar y conciliar", expected: "Esperado", variance: "Diferencia", noDrawer: "No hay caja abierta", checkout: "Ir al cobro", history: "Historial reciente", note: "Nota", production: "Inicie sesión como propietario, gerente o empleado para usar las cajas de producción." },
} as const;

function CashDrawerCenter({ go }: { go: (destination: string) => void }) {
  const { value: store } = useStoreSettings();
  const locale = (store.locale || "en").slice(0, 2) as keyof typeof drawerCopy;
  const copy = drawerCopy[locale] || drawerCopy.en;
  const [context, setContext] = useState<TenantContext>({ mode: "preview", storeId: null, userId: null, role: null, reason: copy.production });
  const [registers, setRegisters] = useState<CashRegisterRecord[]>([]);
  const [sessions, setSessions] = useState<CashDrawerSessionRecord[]>([]);
  const [registerName, setRegisterName] = useState("");
  const [registerLocation, setRegisterLocation] = useState("");
  const [registerId, setRegisterId] = useState("");
  const [openingFloat, setOpeningFloat] = useState("");
  const [note, setNote] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"paid_in" | "paid_out">("paid_in");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [reason, setReason] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const money = (amount: number) => new Intl.NumberFormat(store.locale, { style: "currency", currency: store.currency }).format(amount);
  const activeSession = sessions.find((session) => session.status === "open") || null;
  const refresh = async (nextContext: TenantContext) => {
    if (nextContext.mode !== "production" || !["owner", "manager", "staff"].includes(nextContext.role || "")) return;
    const workspace = await loadCashDrawerWorkspace(nextContext);
    setRegisters(workspace.registers);
    setSessions(workspace.sessions);
    if (!registerId && workspace.registers[0]) setRegisterId(workspace.registers[0].id);
  };
  useEffect(() => { void resolveTenantContext().then(async (next) => { setContext(next); try { await refresh(next); } catch (error) { setMessage(error instanceof Error ? error.message : copy.production); } }); }, []);
  const perform = async (work: () => Promise<void>, success: string) => {
    setBusy(true); setMessage("");
    try { await work(); await refresh(context); setMessage(success); }
    catch (error) { setMessage(error instanceof Error ? error.message : "The cash drawer action was not completed."); }
    finally { setBusy(false); }
  };
  if (context.mode !== "production" || !["owner", "manager", "staff"].includes(context.role || "")) return <div className="content inner"><div className="view-head"><div><span className="eyebrow">CASH CONTROL</span><h2>{copy.title}</h2><p>{copy.production}</p></div></div><section className="panel drawer-empty"><ShieldCheck /><p>{context.reason}</p><Link className="primary" href="/auth">Open secure workspace</Link></section></div>;
  return <div className="content inner cash-drawer-center">
    <div className="view-head"><div><span className="eyebrow">CASH CONTROL</span><h2>{copy.title}</h2><p>{copy.subtitle}</p></div><button onClick={() => go("Checkout")}>{copy.checkout}<ArrowUpRight /></button></div>
    {message && <output className="production-notice">{message}</output>}
    {(context.role === "owner" || context.role === "manager") && <section className="panel drawer-registers"><div className="panel-head"><span><small className="eyebrow">SETUP</small><h3>{copy.register}</h3></span></div><form onSubmit={(event) => { event.preventDefault(); void perform(async () => { await saveCashRegister(context, { name: registerName, location: registerLocation }); setRegisterName(""); setRegisterLocation(""); }, "Register saved."); }}><label>{copy.register}<input required value={registerName} onChange={(event) => setRegisterName(event.target.value)} /></label><label>{copy.location}<input value={registerLocation} onChange={(event) => setRegisterLocation(event.target.value)} /></label><button className="primary" disabled={busy}>{copy.create}</button></form><div className="drawer-register-list">{registers.map((register) => <article key={register.id}><span><b>{register.name}</b><small>{register.location || copy.location}</small></span>{context.role === "owner" && <button aria-label={`Remove ${register.name}`} onClick={() => void perform(() => removeCashRegister(context, register.id), "Register removed.")}><Trash2 /></button>}</article>)}</div></section>}
    {!activeSession ? <section className="panel drawer-open"><div className="panel-head"><span><small className="eyebrow">START SHIFT</small><h3>{copy.noDrawer}</h3></span><Banknote /></div><form onSubmit={(event) => { event.preventDefault(); void perform(async () => { await openCashDrawer(context, registerId, Number(openingFloat), note); setOpeningFloat(""); setNote(""); }, "Cash drawer opened."); }}><label>{copy.register}<select required value={registerId} onChange={(event) => setRegisterId(event.target.value)}><option value="" disabled>{copy.register}</option>{registers.filter((register) => register.active).map((register) => <option key={register.id} value={register.id}>{register.name}</option>)}</select></label><label>{copy.opening}<input required min="0" step="0.01" inputMode="decimal" type="number" value={openingFloat} onChange={(event) => setOpeningFloat(event.target.value)} /></label><label>{copy.note}<input value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} /></label><button className="primary" disabled={busy || !registers.length}>{copy.open}</button></form></section>
    : <section className="panel drawer-active"><div className="panel-head"><span><small className="eyebrow">OPEN DRAWER</small><h3>{activeSession.registerName}</h3></span><b>{money(activeSession.openingFloat)}</b></div><div className="drawer-actions"><form onSubmit={(event) => { event.preventDefault(); void perform(async () => { await recordCashDrawerAdjustment(context, activeSession.id, adjustmentType, Number(adjustmentAmount), reason); setAdjustmentAmount(""); setReason(""); }, "Cash movement recorded."); }}><select aria-label="Cash movement" value={adjustmentType} onChange={(event) => setAdjustmentType(event.target.value as "paid_in" | "paid_out")}><option value="paid_in">{copy.paidIn}</option><option value="paid_out">{copy.paidOut}</option></select><input aria-label="Movement amount" required min="0.01" step="0.01" type="number" inputMode="decimal" value={adjustmentAmount} onChange={(event) => setAdjustmentAmount(event.target.value)} /><input aria-label={copy.reason} required minLength={3} maxLength={240} placeholder={copy.reason} value={reason} onChange={(event) => setReason(event.target.value)} /><button disabled={busy}>{copy.record}</button></form><form onSubmit={(event) => { event.preventDefault(); void perform(async () => { await closeCashDrawer(context, activeSession.id, Number(countedCash), note); setCountedCash(""); setNote(""); }, "Cash drawer closed and reconciled."); }}><input aria-label={copy.counted} required min="0" step="0.01" type="number" inputMode="decimal" placeholder={copy.counted} value={countedCash} onChange={(event) => setCountedCash(event.target.value)} /><input aria-label={copy.note} maxLength={500} placeholder={copy.note} value={note} onChange={(event) => setNote(event.target.value)} /><button className="primary" disabled={busy}>{copy.close}</button></form></div></section>}
    <section className="panel drawer-history"><div className="panel-head"><span><small className="eyebrow">ACCOUNTABLE HISTORY</small><h3>{copy.history}</h3></span></div>{sessions.filter((session) => session.status === "closed").map((session) => <article key={session.id}><span><b>{session.registerName}</b><small>{new Date(session.openedAt).toLocaleString(store.locale)}</small></span><dl><div><dt>{copy.expected}</dt><dd>{money(session.expectedCash || 0)}</dd></div><div><dt>{copy.counted}</dt><dd>{money(session.countedCash || 0)}</dd></div><div><dt>{copy.variance}</dt><dd>{money(session.variance || 0)}</dd></div></dl></article>)}</section>
  </div>;
}

const checkoutCashCopy = {
  en: {
    unavailable: "Cash can only be collected by a signed in owner, manager, or staff member at onsite checkout.",
    counted: "Count the cash before recording it. The signed in cashier and server time are saved with the payment.",
    exact: "Use exact amount",
    recorded: "Recorded by signed in cashier",
    confirmed: "Cash payment recorded",
  },
  fr: {
    unavailable: "Les espèces peuvent uniquement être encaissées sur place par un propriétaire, responsable ou membre du personnel connecté.",
    counted: "Comptez les espèces avant de les enregistrer. Le caissier connecté et l’heure du serveur sont conservés avec le paiement.",
    exact: "Utiliser le montant exact",
    recorded: "Enregistré par le caissier connecté",
    confirmed: "Paiement en espèces enregistré",
  },
  es: {
    unavailable: "El efectivo solo puede cobrarlo en la caja física un propietario, gerente o empleado que haya iniciado sesión.",
    counted: "Cuente el efectivo antes de registrarlo. El cajero y la hora del servidor quedan guardados con el pago.",
    exact: "Usar importe exacto",
    recorded: "Registrado por el cajero conectado",
    confirmed: "Pago en efectivo registrado",
  },
} as const;

function CheckoutCenter({ openSale }: { openSale: () => void }) {
  const { value: policy } = useRetailPolicy();
  const { value: delivery } = useDeliverySettings();
  const { value: store } = useStoreSettings();
  const [bag, setBag] = useState<BagItem[]>([]);
  const [method, setMethod] = useState<"pickup" | "delivery" | "shipping">(
    "pickup",
  );
  const [payment, setPayment] = useState<"pay_now" | "layaway">("pay_now");
  const [tender, setTender] = useState<CheckoutTender>("Card");
  const [cashReceived, setCashReceived] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentProof, setPaymentProof] = useState<PaymentProof | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tenantContext, setTenantContext] = useState<TenantContext>({ mode: "preview", storeId: null, userId: null, role: null, reason: "Checking production access." });
  const [authoritativeAmounts, setAuthoritativeAmounts] = useState<{ subtotal: number; deliveryFee: number; tax: number; total: number; paymentStatus: string } | null>(null);
  const [placed, setPlaced] = useState(false);
  const [orderId, setOrderId] = useState(
    () => `${store.orderPrefix || "ORDER"}-${Date.now().toString().slice(-6)}`,
  );
  useEffect(() => {
    const stored = localStorage.getItem("br-customer-bag:blossom-royall");
    if (stored) setBag(JSON.parse(stored));
    void resolveTenantContext().then((context) => {
      setTenantContext(context);
      if (context.mode === "production" && ["owner", "manager", "staff"].includes(context.role || "")) setTender("Cash");
      if (context.mode === "production" && context.role === "customer") setTender("Bank transfer");
    });
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
  const amountDue = payment === "layaway" ? deposit : total;
  const received = Number(cashReceived || 0);
  const canCollectCash = tenantContext.mode === "preview" || ["owner", "manager", "staff"].includes(tenantContext.role || "");
  const cashLocale = (store.locale || "en").slice(0, 2) as keyof typeof checkoutCashCopy;
  const cashText = checkoutCashCopy[cashLocale] || checkoutCashCopy.en;
  const changeDue = tender === "Cash" ? Math.max(0, received - amountDue) : 0;
  const requiresEvidence = tender !== "Cash" && tender !== "Card";
  const money = (amount: number) =>
    new Intl.NumberFormat(store.locale, {
      style: "currency",
      currency: store.currency,
    }).format(amount);
  const receiptSubtotal = authoritativeAmounts?.subtotal ?? subtotal;
  const receiptDeliveryFee = authoritativeAmounts?.deliveryFee ?? deliveryFee;
  const receiptTax = authoritativeAmounts?.tax ?? tax;
  const receiptTotal = authoritativeAmounts?.total ?? total;
  const receiptChange = tender === "Cash" ? Math.max(0, received - receiptTotal) : 0;
  const placeOrder = async () => {
    if (tender === "Cash" && !canCollectCash) {
      setPaymentMessage(cashText.unavailable);
      return;
    }
    if (tender === "Cash" && received < amountDue) {
      setPaymentMessage(`Enter at least ${money(amountDue)} received in cash.`);
      return;
    }
    if (requiresEvidence && !paymentReference && !paymentProof) {
      setPaymentMessage("Add a payment reference or proof of payment before placing the order.");
      return;
    }
    let finalizedOrderId = orderId;
    let finalizedAmounts = { subtotal, deliveryFee, tax, total, paymentStatus: requiresEvidence ? "pending_verification" : "recorded" };
    if (tenantContext.mode === "production") {
      if (payment === "layaway") { setPaymentMessage("Production layaway activation is pending its schedule and balance transaction contract."); return; }
      if (tender === "Card") { setPaymentMessage("Card authorization is not connected yet. Use cash or a reference based payment during the controlled pilot."); return; }
      if (bag.some((item) => !item.variantId)) { setPaymentMessage("Production checkout accepts only products loaded from the tenant catalog."); return; }
      setSubmitting(true);
      try {
        const tenderMethod = ({ Cash: "cash", Card: "card", "Bank transfer": "bank_transfer", Zelle: "zelle", Venmo: "venmo", PayPal: "paypal", "Cash App": "cash_app", "Mobile money": "mobile_money", Check: "check" } as const)[tender];
        const result = await placeTenantOrder(tenantContext, {
          channel: tenantContext.role === "customer" ? "online" : "onsite", fulfillmentMethod: method, tenderMethod,
          items: bag.map((item) => ({ variantId: item.variantId!, quantity: item.quantity || 1 })),
          cashReceived: tender === "Cash" ? received : undefined, providerReference: paymentReference || undefined,
          proof: paymentProofFile || undefined, policySnapshot: policy as unknown as Record<string, unknown>,
        });
        finalizedOrderId = result.receiptNo;
        finalizedAmounts = { subtotal: result.subtotal, deliveryFee: result.deliveryFee, tax: result.tax, total: result.total, paymentStatus: result.paymentStatus };
        setOrderId(result.receiptNo);
        setAuthoritativeAmounts(finalizedAmounts);
      } catch (error) {
        setPaymentMessage(error instanceof Error ? `Production checkout was not completed: ${error.message}` : "Production checkout was not completed.");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
    }
    const verificationStatus = finalizedAmounts.paymentStatus === "pending_verification" ? "Pending staff verification" : "Recorded at checkout";
    const order = {
      id: `#${finalizedOrderId}`,
      items: bag,
      method,
      payment,
      total: finalizedAmounts.total,
      deposit,
      tender,
      cashReceived: tender === "Cash" ? received : undefined,
      changeDue: tender === "Cash" ? Math.max(0, received - finalizedAmounts.total) : undefined,
      paymentReference: paymentReference || undefined,
      paymentProof,
      verificationStatus,
      policySnapshot: policy,
      placedAt: new Date().toISOString(),
    };
    localStorage.setItem(
      "br-latest-order:blossom-royall",
      JSON.stringify(order),
    );
    localStorage.removeItem("br-customer-bag:blossom-royall");
    localStorage.setItem("br-payment-audit:blossom-royall", JSON.stringify({ orderId: finalizedOrderId, tender, amount: finalizedAmounts.total, verificationStatus, recordedAt: new Date().toISOString() }));
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
          <h2>{tender === "Cash" ? cashText.confirmed : "Your complete look is reserved."}</h2>
          <p>
            Order {orderId} is coordinated across every seller. You will receive
            one update when it is ready for {method}.
          </p>
          <div>
            <b>{money(receiptTotal)}</b>
            <small>
              {payment === "layaway"
                ? `${money(deposit)} deposit collected, balance scheduled`
                : `Paid in full by ${tender}`}
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
            <span>
              <b>Payment</b>
              {tender}
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
              <dd>{money(receiptSubtotal)}</dd>
            </div>
            {receiptDeliveryFee > 0 && (
              <div>
                <dt>Delivery</dt>
                <dd>{money(receiptDeliveryFee)}</dd>
              </div>
            )}
            {receiptTax > 0 && (
              <div>
                <dt>Tax</dt>
                <dd>{money(receiptTax)}</dd>
              </div>
            )}
            <div className="receipt-total">
              <dt>{payment === "layaway" ? "Deposit paid" : "Total paid"}</dt>
              <dd>{money(payment === "layaway" ? deposit : receiptTotal)}</dd>
            </div>
            {payment === "layaway" && (
              <div>
                <dt>Remaining balance</dt>
                <dd>{money(total - deposit)}</dd>
              </div>
            )}
            {tender === "Cash" && (
              <>
                <div><dt>Cash received</dt><dd>{money(received)}</dd></div>
                <div><dt>Change given</dt><dd>{money(receiptChange)}</dd></div>
                <div><dt>Cashier record</dt><dd>{cashText.recorded}</dd></div>
              </>
            )}
            {paymentReference && <div><dt>Payment reference</dt><dd>{paymentReference}</dd></div>}
            {paymentProof && <div><dt>Proof of payment</dt><dd>{paymentProof.name}</dd></div>}
            <div><dt>Verification</dt><dd>{requiresEvidence ? "Pending staff verification" : "Recorded at checkout"}</dd></div>
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
          <label className="tender-field">
            Payment method
            <select aria-label="Payment method" value={tender} onChange={(event) => { setTender(event.target.value as CheckoutTender); setPaymentMessage(""); }}>
              {canCollectCash && <option>Cash</option>}
              <option>Card</option>
              <option>Bank transfer</option>
              <option>Zelle</option>
              <option>Venmo</option>
              <option>PayPal</option>
              <option>Cash App</option>
              <option>Mobile money</option>
              <option>Check</option>
            </select>
          </label>
          {tender === "Cash" && <div className="cash-collection">
            <label className="tender-field">
              Cash received
              <input aria-label="Cash received" inputMode="decimal" type="number" min={amountDue} step="0.01" value={cashReceived} onChange={(event) => { setCashReceived(event.target.value); setPaymentMessage(""); }} placeholder={money(amountDue)} />
              {received >= amountDue && <small className="change-due">Change due: {money(changeDue)}</small>}
            </label>
            <button type="button" className="cash-exact" onClick={() => { setCashReceived(amountDue.toFixed(2)); setPaymentMessage(""); }}>{cashText.exact}</button>
            <small className="verification-note"><ShieldCheck />{cashText.counted}</small>
          </div>}
          {requiresEvidence && <div className="payment-evidence">
            <p className="evidence-choice">Provide either a transaction reference or upload proof of payment.</p>
            <label className="tender-field">Payment reference<input aria-label="Payment reference" value={paymentReference} onChange={(event) => { setPaymentReference(event.target.value); setPaymentMessage(""); }} placeholder="Bank, check, or transaction reference" /></label>
            <label className="proof-upload"><Upload /><span><b>{paymentProof ? paymentProof.name : "Add proof of payment"}</b><small>Photo or PDF, up to 5 MB</small></span><input aria-label="Proof of payment" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 5 * 1024 * 1024) { setPaymentMessage("Proof of payment must be 5 MB or smaller."); event.target.value = ""; return; }
              setPaymentProof({ name: file.name, type: file.type, size: file.size });
              setPaymentProofFile(file);
              setPaymentMessage("");
            }} /></label>
            <small className="verification-note"><ShieldCheck />Evidence remains pending until an authorized staff member verifies it.</small>
          </div>}
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
          {paymentMessage && <output className="payment-warning">{paymentMessage}</output>}
          <button className="primary place-order" onClick={placeOrder} disabled={submitting}>
            {submitting ? "Recording secure order" : payment === "layaway" ? "Start secure layaway" : "Place order"}
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
    rawId?: string;
    id: string;
    items: BagItem[];
    method: string;
    payment: string;
    total: number;
    deposit?: number;
    policySnapshot?: RetailPolicy;
    status?: string;
    paymentStatus?: string;
    placedAt?: string;
    source?: "device" | "production";
    fulfillmentEvents?: Array<{ id: string; eventType: string; note: string; createdAt: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [returnItem, setReturnItem] = useState<BagItem | null>(null);
  const [returnReason, setReturnReason] = useState("Fit was not right");
  const [returnResolution, setReturnResolution] = useState<"refund" | "exchange" | "store_credit">("exchange");
  const [returnStarted, setReturnStarted] = useState(false);
  const [returnMessage, setReturnMessage] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null);
  const [pickupCredential, setPickupCredential] = useState<{ code: string; expiresAt: string } | null>(null);
  const [paymentMade, setPaymentMade] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("br-latest-order:blossom-royall");
    if (stored) setOrder({ ...JSON.parse(stored), source: "device" });
    void resolveTenantContext().then(async (context) => {
      setTenantContext(context);
      if (context.mode === "production" && context.role === "customer") {
        try {
          const [latest] = await loadCustomerOrderHistory(context);
          if (latest) {
            setOrder({
              rawId: latest.id,
              id: latest.receiptNo,
              items: latest.items,
              method: latest.fulfillmentMethod,
              payment: "pay_now",
              total: latest.total,
              policySnapshot: latest.policySnapshot as unknown as RetailPolicy,
              status: latest.status,
              paymentStatus: latest.paymentStatus,
              placedAt: latest.placedAt,
              source: "production",
              fulfillmentEvents: latest.fulfillmentEvents,
            });
            if (latest.fulfillmentMethod === "pickup") {
              setPickupCredential(await loadCustomerPickupCode(context, latest.id));
            }
          }
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
  }, []);
  if (loading && !order)
    return (
      <ListView
        eyebrow="YOUR PURCHASES"
        title="Loading your orders"
        subtitle="Your secure Blossom Royall purchase history is being prepared."
      >
        {null}
      </ListView>
    );
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
  const orderStage = order.status === "completed" || order.status === "fulfilled"
    ? 3
    : order.status === "ready"
      ? 2
      : order.status === "confirmed"
        ? 1
        : 0;
  const deposit =
    order.deposit ??
    Math.round(order.total * orderPolicy.layawayDepositPercent) / 100;
  const balance = order.total - deposit;
  const startReturn = async () => {
    if (!returnItem) return;
    const reason = ({
      "Fit was not right": "fit",
      "Prefer a different color": "color",
      "Item arrived damaged": "damaged",
      "Item was not as described": "not_as_described",
      "Changed my mind": "changed_mind",
    } as const)[returnReason as "Fit was not right" | "Prefer a different color" | "Item arrived damaged" | "Item was not as described" | "Changed my mind"] || "other";
    if (tenantContext?.mode === "production" && tenantContext.role === "customer") {
      if (!returnItem.orderItemId) {
        setReturnMessage("This production item does not have a secure order item reference.");
        return;
      }
      setReturnSubmitting(true);
      setReturnMessage("");
      try {
        await requestOrderItemReturn(tenantContext, {
          orderItemId: returnItem.orderItemId,
          reason,
          requestedResolution: returnResolution,
        });
      } catch (error) {
        setReturnMessage(error instanceof Error ? `The return request was not recorded: ${error.message}` : "The return request was not recorded.");
        setReturnSubmitting(false);
        return;
      }
      setReturnSubmitting(false);
    }
    localStorage.setItem(
      "br-latest-return:blossom-royall",
      JSON.stringify({
        orderId: order.id,
        item: returnItem.name,
        reason: returnReason,
        resolution: returnResolution,
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
            {order.status === "confirmed"
              ? "Your order is confirmed"
              : order.paymentStatus === "pending_verification"
                ? "Payment verification is pending"
                : order.method === "pickup"
                  ? "Preparing your coordinated pickup"
                  : "Preparing your delivery"}
          </h3>
          <p>
            {order.source === "production"
              ? `Recorded ${order.placedAt ? new Date(order.placedAt).toLocaleString() : "in your account"}. Current status: ${order.status || "open"}.`
              : "This device has your latest checkout receipt. Sign in to keep order history available across devices."}
          </p>
        </div>
        <div className="pickup-pass">
          <small>{pickupCredential ? "PICKUP CREDENTIAL" : "SECURE RECEIPT"}</small>
          <b>{pickupCredential?.code || order.id.replace("#", "")}</b>
          <span>{pickupCredential ? `Expires ${new Date(pickupCredential.expiresAt).toLocaleString()}` : "Use this reference when contacting the team"}</span>
        </div>
      </section>
      <section className="order-progress panel" aria-label="Order progress">
        <div className={orderStage >= 0 ? "complete" : ""}>
          <i>
            <Check />
          </i>
          <b>Order recorded</b>
          <small>Your secure receipt is available</small>
        </div>
        <div className={orderStage > 1 ? "complete" : orderStage === 1 ? "active" : ""}>
          <i>
            {orderStage > 1 ? <Check /> : <Clock3 />}
          </i>
          <b>Payment confirmed</b>
          <small>{orderStage >= 1 ? "The order is cleared for preparation" : "Verification may still be required"}</small>
        </div>
        <div className={orderStage > 2 ? "complete" : orderStage === 2 ? "active" : ""}>
          <i>
            <Package />
          </i>
          <b>Ready for handoff</b>
          <small>{orderStage >= 2 ? "The team has marked this order ready" : "Preparation status has not been recorded yet"}</small>
        </div>
        <div className={orderStage === 3 ? "complete" : ""}>
          <i>
            {orderStage === 3 ? <Check /> : <Store />}
          </i>
          <b>Handoff completed</b>
          <small>{orderStage === 3 ? "Fulfillment is complete" : "Awaiting a recorded customer handoff"}</small>
        </div>
      </section>
      {!!order.fulfillmentEvents?.length && (
        <section className="panel care-timeline" aria-label="Recorded fulfillment history">
          <div>
            <span className="eyebrow">RECORDED FULFILLMENT HISTORY</span>
            <h3>Updates from the Blossom Royall team</h3>
          </div>
          <ol>
            {order.fulfillmentEvents.map((event) => (
              <li key={event.id}>
                <i><Check /></i>
                <span>
                  <b>{event.eventType.replaceAll("_", " ")}</b>
                  <small>{new Date(event.createdAt).toLocaleString()}{event.note ? ` · ${event.note}` : ""}</small>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
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
                  setReturnItem(item);
                  setReturnStarted(false);
                  setReturnMessage("");
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
            <h3>{returnItem.name}</h3>
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
              <label>
                Preferred resolution
                <select
                  aria-label="Preferred return resolution"
                  value={returnResolution}
                  onChange={(event) => setReturnResolution(event.target.value as "refund" | "exchange" | "store_credit")}
                >
                  <option value="exchange">Exchange</option>
                  <option value="refund">Refund</option>
                  <option value="store_credit">Store credit</option>
                </select>
              </label>
              {returnMessage && <output className="payment-warning">{returnMessage}</output>}
              <button className="primary" onClick={startReturn} disabled={returnSubmitting}>
                {returnSubmitting ? "Recording request" : "Start request"}
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
  measurements: Record<"bust" | "waist" | "hips" | "inseam" | "shoulder" | "finger" | "wrist" | "neck", number>;
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
    photoTitle: "AI photo fitting, guided preview",
    photoEyebrow: "PRIVATE PHOTO GUIDE",
    development: "IN DEVELOPMENT",
    photoIntro: "Use a plain background, fitted clothing, natural light, and keep your full body inside the frame. Photos stay on this device during this preview.",
    photoViews: ["Front view", "Side view", "Back view"],
    photoReady: "Photo set ready. Automatic AI sizing is still in development, so continue with the verified tape measurements below.",
    photoWaiting: "Add all three guided views to prepare a future AI assisted fit check.",
    fields: {
      bust: ["Bust", "Wrap the tape around the fullest part, level across your back."],
      waist: ["Natural waist", "Measure where your body bends naturally without pulling the tape tight."],
      hips: ["Hips", "Stand with feet together and measure the fullest part of your hips."],
      inseam: ["Inseam", "Measure from the top of the inner leg to the desired trouser hem."],
      shoulder: ["Shoulder width", "Measure straight across your back from shoulder point to shoulder point."],
      finger: ["Ring size in millimeters", "Use a calibrated ring gauge, or measure a well fitting ring with the verified printable guide. Check that it passes the knuckle without forcing. Paper, string, and body photos are not reliable enough for a final ring size."],
      wrist: ["Wrist circumference", "Wrap the tape just below the wrist bone. Add comfort allowance only when the bracelet style requires it."],
      neck: ["Neck circumference", "Measure comfortably around the base of the neck. Necklace length preference is separate from body circumference."],
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
    photoTitle: "Essayage photo IA, aperçu guidé",
    photoEyebrow: "GUIDE PHOTO PRIVÉ",
    development: "EN DÉVELOPPEMENT",
    photoIntro: "Utilisez un fond uni, des vêtements ajustés et une lumière naturelle. Gardez tout le corps dans le cadre. Les photos restent sur cet appareil pendant cet aperçu.",
    photoViews: ["Vue de face", "Vue de côté", "Vue de dos"],
    photoReady: "Les trois photos sont prêtes. L’estimation automatique par IA est encore en développement. Continuez avec les mesures au ruban vérifiées ci dessous.",
    photoWaiting: "Ajoutez les trois vues guidées pour préparer une future vérification de taille assistée par IA.",
    fields: {
      bust: ["Poitrine", "Passez le ruban autour de la partie la plus forte, bien horizontal dans le dos."],
      waist: ["Taille naturelle", "Mesurez là où le corps se plie naturellement sans serrer le ruban."],
      hips: ["Hanches", "Pieds joints, mesurez la partie la plus forte des hanches."],
      inseam: ["Entrejambe", "Mesurez du haut de la jambe intérieure jusqu’à l’ourlet souhaité."],
      shoulder: ["Largeur des épaules", "Mesurez droit dans le dos d’une pointe d’épaule à l’autre."],
      finger: ["Taille de bague en millimètres", "Utilisez un baguier calibré ou une bague adaptée avec le guide imprimable vérifié. Vérifiez le passage de l’articulation sans forcer. Le papier, la ficelle et les photos du corps ne suffisent pas pour une taille finale."],
      wrist: ["Tour de poignet", "Mesurez juste sous l’os du poignet. Ajoutez une aisance seulement si le style du bracelet l’exige."],
      neck: ["Tour de cou", "Mesurez confortablement à la base du cou. La longueur souhaitée du collier est distincte du tour de cou."],
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
    photoTitle: "Ajuste fotográfico con IA, vista guiada",
    photoEyebrow: "GUÍA FOTOGRÁFICA PRIVADA",
    development: "EN DESARROLLO",
    photoIntro: "Usa un fondo liso, ropa ajustada y luz natural. Mantén todo el cuerpo dentro del encuadre. Las fotos permanecen en este dispositivo durante esta vista previa.",
    photoViews: ["Vista frontal", "Vista lateral", "Vista posterior"],
    photoReady: "Las tres fotos están listas. El cálculo automático con IA sigue en desarrollo. Continúa con las medidas verificadas con cinta.",
    photoWaiting: "Añade las tres vistas guiadas para preparar una futura verificación de talla asistida por IA.",
    fields: {
      bust: ["Busto", "Rodea la parte más llena con la cinta nivelada en la espalda."],
      waist: ["Cintura natural", "Mide donde el cuerpo se dobla naturalmente sin apretar la cinta."],
      hips: ["Caderas", "Con los pies juntos, mide la parte más llena de las caderas."],
      inseam: ["Entrepierna", "Mide desde la parte superior de la pierna interior hasta el bajo deseado."],
      shoulder: ["Ancho de hombros", "Mide recto por la espalda de un hombro al otro."],
      finger: ["Talla de anillo en milímetros", "Usa un medidor calibrado o un anillo que ajuste bien con la guía imprimible verificada. Comprueba que pase el nudillo sin forzarlo. El papel, el hilo y las fotos corporales no bastan para una talla final."],
      wrist: ["Circunferencia de la muñeca", "Mide justo debajo del hueso de la muñeca. Añade holgura solo cuando el estilo de pulsera lo requiera."],
      neck: ["Circunferencia del cuello", "Mide cómodamente la base del cuello. La longitud preferida del collar se calcula por separado."],
    },
  },
} as const;

const fitFields = ["bust", "waist", "hips", "inseam", "shoulder", "finger", "wrist", "neck"] as const;
const requiredFitFields = ["bust", "waist", "hips", "inseam", "shoulder"] as const;

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

const recommendRingSize = (millimeters: number, wideBand: boolean) => {
  if (!millimeters) return "Ring size not measured";
  const sizes = [[44.2, 3], [46.8, 4], [49.3, 5], [51.9, 6], [54.4, 7], [57, 8], [59.5, 9], [62.1, 10], [64.6, 11], [67.2, 12], [69.7, 13]] as const;
  const closest = sizes.reduce((best, item) => Math.abs(item[0] - millimeters) < Math.abs(best[0] - millimeters) ? item : best);
  return millimeters < 43 || millimeters > 71 ? "Jeweler fitting recommended" : `Approximate US ring size ${closest[1] + (wideBand ? 0.5 : 0)} · ISO ${Math.round(millimeters)}`;
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
    finger: 0,
    wrist: 0,
    neck: 0,
  });
  const [step, setStep] = useState(0);
  const [consent, setConsent] = useState(false);
  const [shareWithVendors, setShareWithVendors] = useState(false);
  const [notice, setNotice] = useState("");
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null);
  const [savedAt, setSavedAt] = useState("");
  const [fitPhotos, setFitPhotos] = useState<Record<string, string>>({});
  const [ringMethod, setRingMethod] = useState<"gauge" | "existing_ring" | "estimate">("gauge");
  const [ringCheck, setRingCheck] = useState(0);
  const [wideBand, setWideBand] = useState(false);
  const copy = fitCopy[locale];
  const field = fitFields[step];
  const recommendedSize = recommendFitSize(measurements.waist, unit);
  const recommendedRingSize = recommendRingSize(measurements.finger, wideBand);
  const ringDifference = Math.abs(measurements.finger - ringCheck);
  const ringConfidence = !measurements.finger || !ringCheck ? "Incomplete" : ringDifference > 1.5 ? "Measure again" : ringMethod === "estimate" ? "Estimated" : "Verified at home";

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
        fitFields.map((key) => [key, key === "finger" ? current[key] : convertFitValue(current[key], unit, next)]),
      ) as FitProfile["measurements"],
    );
    setUnit(next);
  };

  const save = async () => {
    if (!consent || requiredFitFields.some((key) => measurements[key] <= 0)) return;
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
      setMeasurements({ bust: 0, waist: 0, hips: 0, inseam: 0, shoulder: 0, finger: 0, wrist: 0, neck: 0 });
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
          <div className={`fit-figure fit-${field}`} aria-label={`${copy.fields[field][0]} mannequin demonstration`}>
            <div className="fit-mannequin" aria-hidden="true">
              <i className="fit-head" /><i className="fit-torso" /><i className="fit-arm left" /><i className="fit-arm right" /><i className="fit-leg left" /><i className="fit-leg right" />
              <span className={`fit-guide-line ${field}`} />
            </div>
            <small>{copy.fields[field][0]}</small>
          </div>
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
                <b>{field === "finger" ? "mm" : unit === "metric" ? "cm" : "in"}</b>
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
          <button type="button" disabled={(step < requiredFitFields.length && !measurements[field]) || step === fitFields.length - 1} onClick={() => setStep((current) => Math.min(fitFields.length - 1, current + 1))}>{copy.next}</button>
        </footer>
      </section>
      <section className="fit-photo-assistant panel" aria-labelledby="fit-photo-title">
        <header>
          <span><small className="eyebrow">{copy.photoEyebrow}</small><h3 id="fit-photo-title">{copy.photoTitle}</h3></span>
          <em>{copy.development}</em>
        </header>
        <p>{copy.photoIntro}</p>
        <div>
          {copy.photoViews.map((view, index) => {
            const key = ["front", "side", "back"][index];
            return <label key={key} className={fitPhotos[key] ? "ready" : ""}>
              <span><ScanLine /><b>{view}</b><small>{fitPhotos[key] || `${index + 1} of 3`}</small></span>
              <input type="file" accept="image/*" capture="environment" aria-label={view} onChange={(event) => setFitPhotos((current) => ({ ...current, [key]: event.target.files?.[0]?.name || "" }))} />
            </label>;
          })}
        </div>
        <output role="status">{Object.keys(fitPhotos).filter((key) => fitPhotos[key]).length === 3 ? copy.photoReady : copy.photoWaiting}</output>
      </section>
      <section className="fit-jewelry-lab panel" aria-labelledby="jewelry-fit-title">
        <header><span><small className="eyebrow">JEWELRY FIT LAB</small><h3 id="jewelry-fit-title">A ring recommendation that explains its confidence</h3></span><em>{ringConfidence}</em></header>
        <p>Ring size is stored in millimeters so each seller can translate it to the sizing system used by that exact item. For the best result, measure twice at different times and confirm wide or valuable rings in store.</p>
        <div className="jewelry-methods">
          <label><input type="radio" name="ringMethod" checked={ringMethod === "gauge"} onChange={() => setRingMethod("gauge")} /><span><b>Calibrated ring gauge</b><small>Preferred home method</small></span></label>
          <label><input type="radio" name="ringMethod" checked={ringMethod === "existing_ring"} onChange={() => setRingMethod("existing_ring")} /><span><b>Well fitting ring</b><small>Use a scale checked printable guide</small></span></label>
          <label><input type="radio" name="ringMethod" checked={ringMethod === "estimate"} onChange={() => setRingMethod("estimate")} /><span><b>Estimate only</b><small>Requires seller confirmation</small></span></label>
        </div>
        <div className="jewelry-checks">
          <label>Second measurement<input aria-label="Second ring measurement" type="number" min="40" max="75" step="0.1" value={ringCheck || ""} onChange={(event) => setRingCheck(Number(event.target.value))} /><small>millimeters</small></label>
          <label className="wide-band"><input type="checkbox" checked={wideBand} onChange={(event) => setWideBand(event.target.checked)} /><span><b>Band is wider than 4 mm</b><small>Wider bands often need extra room.</small></span></label>
        </div>
        <output className={`ring-confidence ${ringConfidence.toLowerCase().replaceAll(" ", "-")}`}><b>{recommendedRingSize}</b><span>{ringDifference > 1.5 ? `Measurements differ by ${ringDifference.toFixed(1)} mm. Repeat before shopping.` : ringCheck ? `Two measurements are within ${ringDifference.toFixed(1)} mm.` : "Add a second measurement to calculate confidence."}</span></output>
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
          <p className="fit-jewelry-result"><b>{recommendedRingSize}</b><small>Ring fit varies by band width, knuckle shape, temperature, and regional sizing. Confirm valuable or custom rings with the seller or a jeweler.</small></p>
          <button className="primary" type="button" disabled={!consent || requiredFitFields.some((item) => measurements[item] <= 0)} onClick={() => void save()}><Check />{copy.save}</button>
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
      "Fit check ready",
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
      "Seller chart required",
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
  const [activeCollection, setActiveCollection] = useState("New arrivals");
  const [fitProfile, setFitProfile] = useState<FitProfile | null>(null);
  useEffect(() => {
    const savedFit = localStorage.getItem(fitStorageKey);
    if (savedFit) setFitProfile(JSON.parse(savedFit) as FitProfile);
  }, []);
  const visiblePicks = picks.filter((pick) => !hidden.includes(pick[0]));
  const jewelrySize = fitProfile?.measurements.finger ? recommendRingSize(fitProfile.measurements.finger, false) : "Jewelry sizing not added";
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
      <section className="customer-glance" aria-label="Customer dashboard">
        <div className="customer-glance-hero">
          <span className="eyebrow">YOUR BLOSSOM WORLD</span>
          <h2>Everything beautiful, one glance away.</h2>
          <p>Your fit, private edit, bag, orders, pickup, and aftercare stay together.</p>
          <button onClick={() => go("My Fit")}><Ruler />{fitProfile ? "Review My Fit" : "Create My Fit"}</button>
        </div>
        <div className="customer-glance-grid">
          <button onClick={() => go("My Fit")}><Ruler /><span><small>MY FIT</small><b>{fitProfile ? `Starting size ${fitProfile.recommendedSize}` : "Not created"}</b><em>{fitProfile ? "Private passport ready" : "Guided setup"}</em></span></button>
          <button onClick={() => go("Checkout")}><ShoppingBag /><span><small>MY BAG</small><b>{saved.length + (completeLookAdded ? 3 : 0)} pieces</b><em>Review checkout</em></span></button>
          <button onClick={() => go("My Orders")}><ClipboardList /><span><small>MY ORDERS</small><b>Track every purchase</b><em>Pickup and delivery</em></span></button>
          <button onClick={() => go("Aftercare")}><RotateCcw /><span><small>AFTERCARE</small><b>Returns and exchanges</b><em>Policy aware help</em></span></button>
        </div>
      </section>
      <nav className="collection-nav" aria-label="Shop collections">
        {[
          "New arrivals",
          "Dresses",
          "Tailoring",
          "Accessories",
          "Occasion",
        ].map((collection) => (
          <button key={collection} className={activeCollection === collection ? "active" : ""} aria-pressed={activeCollection === collection} onClick={() => setActiveCollection(collection)}>{collection}</button>
        ))}
      </nav>
      <output className="collection-focus" aria-live="polite"><Sparkles /><span><small>NOW EXPLORING</small><b>{activeCollection}</b></span></output>
      <section className="shop-fit-bridge panel" aria-label="My Fit shopping status">
        <span>
          <Ruler />
          <span>
            <small className="eyebrow">MY FIT</small>
            <b>{fitProfile ? `Your fit passport is ready` : "Add your private fit profile"}</b>
            <small>{fitProfile ? `Private apparel passport ready · ${jewelrySize}. Exact matches appear only after each seller chart is connected.` : "Follow a calm self measurement guide before choosing a size."}</small>
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
                Three pieces from three independent brands. Exact apparel fit and
                jewelry availability remain pending until each seller chart and live variant are connected.
              </p>
            </div>
            <div className="mission-items">
              <span>
                <b>Aurelia Satin Midi</b>
                <small>Africstyle Fashion · My Fit starting size {fitProfile?.recommendedSize || "8"} · Seller chart confirmation required</small>
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
            finishing pieces selected for your style. Exact sizing is confirmed
            against each seller chart before purchase.
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
            {fitProfile && index !== 1 && <span className="fit-match"><Ruler />Starting size {fitProfile.recommendedSize} · Seller chart pending</span>}
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
      <section className="panel help-safety">
        <ShieldCheck />
        <span><b>Privacy and account control</b><p>Review how information is handled, manage privacy choices, or initiate complete account deletion without contacting support.</p><Link href="/privacy">Open privacy policy</Link><Link href="/account/delete">Manage or delete account</Link></span>
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
  displayName,
  role,
}: {
  go: (x: string) => void;
  orders: Order[];
  openSale: () => void;
  preview: boolean;
  displayName: string;
  role: WorkspaceRole;
}) {
  if (!preview) {
    const netSales = orders.reduce((sum, order) => sum + Number(order.total.replace(/[^0-9.-]/g, "")), 0);
    const averageOrder = orders.length ? netSales / orders.length : 0;
    const roleTitle = role === "owner" ? "Your entire mall is in view." : role === "manager" ? "Today’s operation is under control." : "Your shift command board is ready.";
    return <div className="content">
      <section className={`welcome role-welcome role-${role}`}><div><span className="eyebrow">{role?.toUpperCase()} BOARD · LIVE</span><h2>{roleTitle}</h2><p>{orders.length ? `${orders.length} current tenant orders are ready for attention.` : "No production orders have been recorded yet. Preview sales never appear in this workspace."}</p></div><button onClick={openSale}>Open checkout <ArrowUpRight /></button></section>
      <RoleOperationsMap go={go} role={role} />
      <RolePulse role={role} orders={orders} go={go} />
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
      <RoleOperationsMap go={go} role="owner" />
      <RolePulse role="owner" orders={orders} go={go} preview />
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

const operatingAreas = [
  ["Checkout", "Sales and payment capture", CircleDollarSign],
  ["Cash Drawer", "Registers and reconciliation", Banknote],
  ["Orders", "Payment, fulfillment, and returns", ShoppingBag],
  ["Products", "Catalog and channel inventory", Package],
  ["Vendors", "Onboarding, leases, brands, and access", Store],
  ["Rent", "Due dates, submissions, and approval", Banknote],
  ["Shared Commerce", "Seller attribution and settlement", RefreshCw],
  ["Delivery", "Pickup, local delivery, and shipping", Truck],
  ["Staff", "People, schedules, leave, and payroll", Users],
  ["Policies", "Editable operating rules", Settings],
  ["Business Setup", "Tenant identity and configuration", Store],
  ["Intelligence", "Explainable operating signals", BrainCircuit],
] as const;

function RoleOperationsMap({ go, role }: { go: (destination: string) => void; role: WorkspaceRole }) {
  const availableDestinations = new Set(allowedNavigation(role).map((item) => item.destination));
  const title = role === "owner" ? "Owner operating board" : role === "manager" ? "Manager operating board" : "Staff shift board";
  const eyebrow = role === "owner" ? "RUN THE ENTIRE MALL" : role === "manager" ? "RUN TODAY’S OPERATION" : "RUN YOUR SHIFT";
  return <section className={`panel operating-map role-map role-${role}`} aria-label={`${role?.[0].toUpperCase()}${role?.slice(1)} operating controls`}>
    <div className="panel-head"><span><small className="eyebrow">{eyebrow}</small><h3>{title}</h3></span><ShieldCheck /></div>
    <p>Every control shown here is available to this role. Protected decisions remain tenant isolated and auditable.</p>
    <div className="operating-map-grid">
      {operatingAreas.filter(([destination]) => availableDestinations.has(destination)).map(([destination, description, Icon]) => <button key={destination} onClick={() => go(destination)}>
        <i><Icon /></i><span><b>{destination}</b><small>{description}</small></span><ChevronRight />
      </button>)}
    </div>
  </section>;
}

function RolePulse({ role, orders, go, preview = false }: { role: WorkspaceRole; orders: Order[]; go: (destination: string) => void; preview?: boolean }) {
  const [period, setPeriod] = useState<"Today" | "Week" | "Month">("Today");
  const scale = period === "Today" ? 1 : period === "Week" ? 4.8 : 18.5;
  const sales = orders.reduce((sum, order) => sum + Number(order.total.replace(/[^0-9.-]/g, "")), 0) * scale;
  const lanes = role === "staff"
    ? [["Checkout", "Serve the next customer", "Checkout", 82], ["Fulfillment", "Prepare open orders", "Orders", 61], ["Stock", "Resolve shelf exceptions", "Products", 38]]
    : [["Revenue", `$${sales.toFixed(0)} recorded`, "Orders", 86], ["Fulfillment", `${orders.length} orders in view`, "Delivery", 64], ["Operations", "Review today’s exceptions", role === "owner" ? "Vendors" : "Staff", 43]];
  const bars = [35, 52, 44, 68, 58, 84, 72, 96, 79, 88, 67, 92].map((value) => Math.min(100, Math.round(value * (period === "Today" ? .86 : period === "Week" ? .94 : 1))));
  return <section className={`command-pulse role-${role}`} aria-label={`${role} live pulse`}>
    <div className="pulse-main">
      <header><span><small className="eyebrow">{preview ? "INTERACTIVE PREVIEW" : "LIVE OPERATING PULSE"}</small><h3>See the rhythm of the business.</h3></span><div className="pulse-period" aria-label="Dashboard period">{(["Today", "Week", "Month"] as const).map((value) => <button key={value} className={period === value ? "active" : ""} aria-pressed={period === value} onClick={() => setPeriod(value)}>{value}</button>)}</div></header>
      <div className="pulse-total"><span><small>{period} sales</small><b>${sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</b></span><em><TrendingUp />Current view</em></div>
      <div className="pulse-chart" aria-label={`${period} activity chart`}>{bars.map((height, index) => <button key={index} style={{ height: `${height}%` }} aria-label={`Activity point ${index + 1}, ${height} percent`} title={`${height}% activity`} />)}</div>
    </div>
    <div className="pulse-lanes">{lanes.map(([title, detail, destination, strength]) => <button key={title} onClick={() => go(String(destination))}><span><small>{title}</small><b>{detail}</b></span><i><span style={{ width: `${strength}%` }} /></i><ChevronRight /></button>)}</div>
  </section>;
}

function VendorBoard({ context, go }: { context: TenantContext; go: (destination: string) => void }) {
  const [products, setProducts] = useState<TenantProductSummary[]>([]);
  const [vendorOrders, setVendorOrders] = useState<Order[]>([]);
  const [rent, setRent] = useState<VendorRentRecord[]>([]);
  const [ledger, setLedger] = useState<VendorLedgerEntry[]>([]);
  const [snapshot, setSnapshot] = useState<VendorOperatingSnapshot | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const refresh = async () => {
    if (context.mode !== "production" || context.role !== "vendor") return;
    setLoading(true);
    try {
      const [nextProducts, nextOrders, nextRent, nextLedger, nextSnapshots] = await Promise.all([
        loadTenantProducts(context),
        loadTenantOrders(context),
        loadVendorRentWorkspace(context),
        loadVendorLedger(context),
        loadVendorOperatingSnapshots(context),
      ]);
      setProducts(nextProducts);
      setVendorOrders(nextOrders as Order[]);
      setRent(nextRent);
      setLedger(nextLedger);
      setSnapshot(nextSnapshots[0] || null);
      setLastUpdated(new Date());
      setNotice("");
    } catch {
      setNotice("Live vendor records could not be refreshed. No preview records were substituted.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    if (context.mode !== "production" || context.role !== "vendor") return;
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(timer);
  }, [context.mode, context.role, context.storeId, context.userId]);

  const stock = products.reduce((sum, product) => sum + product.variants.reduce((variantSum, variant) => variantSum + variant.quantity, 0), 0);
  const revenue = vendorOrders.reduce((sum, order) => sum + Number(order.total.replace(/[^0-9.-]/g, "")), 0);
  const rentAttention = rent.filter((item) => ["due", "late", "pending", "rejected", "failed"].includes(item.status)).length;
  const credits = ledger.filter((entry) => ["sale_credit", "adjustment_credit"].includes(entry.type)).reduce((sum, entry) => sum + entry.amount, 0);
  const deductions = ledger.filter((entry) => ["refund_debit", "fee_debit", "adjustment_debit"].includes(entry.type)).reduce((sum, entry) => sum + entry.amount, 0);
  const paid = ledger.filter((entry) => entry.type === "payout_debit").reduce((sum, entry) => sum + entry.amount, 0);
  const recordedBalance = snapshot?.recordedBalance ?? credits - deductions - paid;
  const lowStock = products.flatMap((product) => product.variants.map((variant) => ({ ...variant, productName: product.name }))).filter((variant) => variant.quantity <= 3);
  const vendorName = snapshot?.vendorName || rent[0]?.vendorName || products[0]?.vendorName || "Your store";

  return <div className="content vendor-board">
    <section className="welcome vendor-board-welcome"><div><span className="eyebrow">YOUR STORE OPERATIONS</span><h2>Run your store from one board.</h2><p>Only orders, products, inventory, rent, and approvals authorized for your vendor membership are loaded.</p></div><button onClick={() => void refresh()} disabled={loading}><RefreshCw />{loading ? "Refreshing" : "Refresh live data"}</button></section>
    <section className={`tenant-runtime ${context.mode}`}><ShieldCheck /><span><b>{context.mode === "production" ? "Vendor isolation active" : "Vendor preview"}</b><small>{context.mode === "production" ? `Automatic refresh every 15 seconds${lastUpdated ? ` · Updated ${lastUpdated.toLocaleTimeString()}` : ""}` : context.reason}</small></span></section>
    {notice && <output className="policy-saved" role="status">{notice}</output>}
    <section className="metrics">
      {[["Attributed sales", `$${revenue.toFixed(2)}`, `${vendorOrders.length} authorized orders`], ["Recorded balance", `$${recordedBalance.toFixed(2)}`, "Shared owner and vendor ledger"], ["Stock", String(snapshot?.stockUnits ?? stock), `${snapshot?.lowStockVariants ?? lowStock.length} low stock variants`], ["Rent status", snapshot?.rentStatus || (rentAttention ? "Attention" : "Current"), snapshot?.rentDueOn ? `Due ${new Date(`${snapshot.rentDueOn}T00:00:00`).toLocaleDateString()}` : "Shared rent record"]].map((metric, index) => <article key={metric[0]}><i className={`m${index}`}>{index === 0 ? "$" : index === 1 ? "↗" : index === 2 ? "#" : "R"}</i><span><small>{metric[0]}</small><b>{metric[1]}</b><em>{metric[2]}</em></span></article>)}
    </section>
    <section className="vendor-insight-grid">
      <article className="panel vendor-stock-glance"><div className="panel-head"><span><small className="eyebrow">STOCK RIGHT NOW</small><h3>What {vendorName} can sell</h3></span><button onClick={() => go("Products")}>Manage <ChevronRight /></button></div><div>{products.slice(0, 5).map((product) => { const quantity = product.variants.reduce((sum, variant) => sum + variant.quantity, 0); return <button key={product.id} onClick={() => go("Products")}><span><b>{product.name}</b><small>{product.variants.length} variants</small></span><em className={quantity <= 3 ? "danger" : ""}>{quantity} in stock</em></button>; })}{!products.length && <p>No authorized production products yet.</p>}</div></article>
      <article className="panel vendor-sales-glance"><div className="panel-head"><span><small className="eyebrow">WHAT SOLD, WHEN</small><h3>Recent attributed sales</h3></span><button onClick={() => go("Orders")}>All orders <ChevronRight /></button></div><div>{vendorOrders.slice(0, 5).map((order) => <button key={order.id} onClick={() => go("Orders")}><span><b>{order.id}</b><small>{order.time}</small></span><span><b>{order.total}</b><small>{order.fulfillmentStatus}</small></span></button>)}{!vendorOrders.length && <p>No attributed production sales yet.</p>}</div></article>
    </section>
    <section className="panel vendor-money-center"><div className="panel-head"><span><small className="eyebrow">MONEY EXPECTED</small><h3>From sale to payout</h3></span><ShieldCheck /></div><div className="money-waterfall"><span><small>Credits</small><b>${credits.toFixed(2)}</b></span><i>−</i><span><small>Refunds and fees</small><b>${deductions.toFixed(2)}</b></span><i>−</i><span><small>Paid already</small><b>${paid.toFixed(2)}</b></span><i>=</i><span className="money-due"><small>Recorded balance</small><b>${recordedBalance.toFixed(2)}</b></span></div><p>This is the seller ledger balance, not a promised bank date. Available, reserved, scheduled, and paid payout states activate only after the approved payment provider and settlement workflow are connected.</p><div className="ledger-mini">{ledger.slice(0, 4).map((entry) => <span key={entry.id}><small>{new Date(entry.createdAt).toLocaleDateString()} · {entry.type.replaceAll("_", " ")}</small><b>{entry.type.endsWith("credit") ? "+" : "−"}${entry.amount.toFixed(2)}</b></span>)}</div></section>
    <section className="panel vendor-control-center" aria-label="Vendor store controls">
      <div className="panel-head"><span><small className="eyebrow">STORE BACKEND</small><h3>What you can manage</h3></span></div>
      <div className="vendor-control-grid">
        <button onClick={() => go("Products")}><Package /><span><b>Catalog and inventory</b><small>See isolated products and stock. Production editing remains in development.</small></span><ChevronRight /></button>
        <button onClick={() => go("Orders")}><ShoppingBag /><span><b>Store orders</b><small>See orders containing your items. Mall controlled payment actions remain protected.</small></span><ChevronRight /></button>
        <button onClick={() => go("Rent")}><Banknote /><span><b>Lease and rent</b><small>See due dates, submit payment evidence, and follow owner review.</small></span><ChevronRight /></button>
      </div>
    </section>
    <section className="panel approval-boundary">
      <div><ShieldCheck /><span><small className="eyebrow">OWNER CONSENT</small><h3>Clear approval boundaries</h3></span></div>
      <p>Vendors control their product information, stock proposals, fulfillment updates, and store profile drafts. The owner controls activation, mall policies, lease terms, rent confirmation, public brand approval, refunds, payouts, suspensions, and permission changes.</p>
    </section>
  </div>;
}

function OwnerVendorReconciliation({ context, go }: { context: TenantContext; go: (destination: string) => void }) {
  const [snapshots, setSnapshots] = useState<VendorOperatingSnapshot[]>([]);
  const [notice, setNotice] = useState("");
  const refresh = async () => {
    try {
      setSnapshots(await loadVendorOperatingSnapshots(context));
      setNotice("");
    } catch {
      setNotice("Vendor reconciliation could not refresh. No preview values were substituted.");
    }
  };
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(timer);
  }, [context.storeId, context.userId]);
  return <section className="content owner-vendor-reconciliation" aria-label="Owner vendor reconciliation">
    <div className="panel">
      <div className="panel-head"><span><small className="eyebrow">ONE SHARED TRUTH</small><h3>What each vendor sees</h3></span><button onClick={() => void refresh()}><RefreshCw />Refresh</button></div>
      <p>These stock, ledger, payout, and rent values come from the same snapshot used by each vendor board. The owner sees every authorized vendor. Each vendor sees only its own row.</p>
      {notice && <output className="policy-saved" role="status">{notice}</output>}
      <div className="reconciliation-table" role="table" aria-label="Matching owner and vendor figures">
        <header role="row"><span role="columnheader">Vendor</span><span role="columnheader">Stock</span><span role="columnheader">Low stock</span><span role="columnheader">Credits</span><span role="columnheader">Deductions</span><span role="columnheader">Paid</span><span role="columnheader">Balance</span><span role="columnheader">Rent</span></header>
        {snapshots.map((item) => <button role="row" key={item.vendorId} onClick={() => go("Vendors")}><b role="cell">{item.vendorName}</b><span role="cell">{item.stockUnits}</span><span role="cell">{item.lowStockVariants}</span><span role="cell">${item.credits.toFixed(2)}</span><span role="cell">${item.deductions.toFixed(2)}</span><span role="cell">${item.paid.toFixed(2)}</span><strong role="cell">${item.recordedBalance.toFixed(2)}</strong><em role="cell">{item.rentStatus}</em></button>)}
        {!snapshots.length && !notice && <p>No production vendor snapshots are available yet.</p>}
      </div>
    </div>
  </section>;
}
function OrderTable({ rows, context }: { rows: Order[]; context?: TenantContext | null }) {
  const [displayRows, setDisplayRows] = useState(rows);
  const [notice, setNotice] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  useEffect(() => setDisplayRows(rows), [rows]);
  const nextAction = (order: Order): { event: "preparing" | "ready_for_pickup" | "out_for_delivery" | "picked_up" | "delivered"; label: string } | null => {
    if (!order.rawId || order.paymentStatus !== "succeeded") return null;
    if (order.fulfillmentStatus === "pending" && order.status === "confirmed") return { event: "preparing", label: "Start preparation" };
    if (order.fulfillmentStatus === "preparing" && order.fulfillmentMethod === "pickup") return { event: "ready_for_pickup", label: "Mark ready" };
    if (order.fulfillmentStatus === "preparing" && ["delivery", "shipping"].includes(order.fulfillmentMethod || "")) return { event: "out_for_delivery", label: "Send for delivery" };
    if (order.fulfillmentStatus === "ready_for_pickup") return { event: "picked_up", label: "Confirm pickup" };
    if (order.fulfillmentStatus === "out_for_delivery") return { event: "delivered", label: "Confirm delivery" };
    return null;
  };
  const advance = async (order: Order) => {
    const action = nextAction(order);
    if (!action || !context || !order.rawId) return;
    setUpdating(order.rawId);
    setNotice("");
    try {
      const result = await advanceTenantOrderFulfillment(context, order.rawId, action.event);
      setDisplayRows((current) => current.map((item) => item.rawId === order.rawId ? {
        ...item,
        status: result.orderStatus,
        fulfillmentStatus: result.fulfillmentStatus,
      } : item));
      setNotice(result.pickupCode && action.event === "ready_for_pickup"
        ? `Order ${order.id} is ready. Pickup credential ${result.pickupCode} is available to its customer.`
        : `Order ${order.id} is now ${result.fulfillmentStatus.replaceAll("_", " ")}.`);
    } catch (error) {
      setNotice(error instanceof Error ? `The fulfillment update failed: ${error.message}` : "The fulfillment update failed.");
    } finally {
      setUpdating(null);
    }
  };
  return (
    <div>
      {notice && <output className="policy-saved">{notice}</output>}
      <div className="table">
      <div>
        <span>Order</span>
        <span>Customer</span>
        <span>Status</span>
        <span>Total</span>
      </div>
      {displayRows.map((o) => (
        <div key={o.id}>
          <span>
            <b>{o.id}</b>
            <small>{o.time}</small>
          </span>
          <span>{o.customer}</span>
          <span>
            <em className={o.status.toLowerCase()}>{o.status}</em>
            {nextAction(o) && context?.mode === "production" && (
              <button onClick={() => void advance(o)} disabled={updating === o.rawId}>
                {updating === o.rawId ? "Recording" : nextAction(o)?.label}
              </button>
            )}
          </span>
          <b>{o.total}</b>
        </div>
      ))}
      {!displayRows.length && <p>No matching orders.</p>}
      </div>
    </div>
  );
}

function PaymentReviewQueue({ context }: { context?: TenantContext | null }) {
  const [payments, setPayments] = useState<PendingPaymentReview[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);
  useEffect(() => {
    if (!context || context.mode !== "production" || !["owner", "manager", "staff"].includes(context.role || "")) {
      setLoading(false);
      return;
    }
    void loadTenantPendingPayments(context)
      .then(setPayments)
      .catch(() => setNotice("The pending payment queue could not be loaded."))
      .finally(() => setLoading(false));
  }, [context]);
  if (!context || context.mode !== "production" || !["owner", "manager", "staff"].includes(context.role || "")) return null;
  const openProof = async (payment: PendingPaymentReview) => {
    if (!payment.proofObjectPath) return;
    try {
      const url = await createPaymentEvidenceUrl(context, payment.proofObjectPath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setNotice(error instanceof Error ? `The private proof could not be opened: ${error.message}` : "The private proof could not be opened.");
    }
  };
  const review = async (payment: PendingPaymentReview, decision: "verified" | "rejected") => {
    const note = notes[payment.id]?.trim() || "";
    if (decision === "rejected" && !note) {
      setNotice("Add a rejection reason before rejecting this payment.");
      return;
    }
    setReviewing(payment.id);
    setNotice("");
    try {
      await reviewTenantPendingPayment(context, payment.id, decision, note);
      setPayments((current) => current.filter((item) => item.id !== payment.id));
      setNotice(`${payment.receiptNo} payment ${decision}.`);
    } catch (error) {
      setNotice(error instanceof Error ? `The payment review failed: ${error.message}` : "The payment review failed.");
    } finally {
      setReviewing(null);
    }
  };
  return (
    <section className="panel care-timeline" aria-label="Pending payment verification">
      <div>
        <span className="eyebrow">PAYMENT VERIFICATION</span>
        <h3>{loading ? "Loading pending payments" : `${payments.length} payments awaiting review`}</h3>
      </div>
      {notice && <output className="policy-saved">{notice}</output>}
      {!loading && !payments.length && <p>No electronic payments are waiting for verification.</p>}
      <ol>
        {payments.map((payment) => (
          <li key={payment.id}>
            <i><ShieldCheck /></i>
            <span>
              <b>{payment.receiptNo} · {payment.method.replaceAll("_", " ")} · ${payment.amount.toFixed(2)}</b>
              <small>{payment.providerReference ? `Reference ${payment.providerReference}` : `Private proof ${payment.proofFileName}`} · {new Date(payment.createdAt).toLocaleString()}</small>
              <label>
                Verification note
                <input
                  aria-label={`Verification note for ${payment.receiptNo}`}
                  value={notes[payment.id] || ""}
                  onChange={(event) => setNotes((current) => ({ ...current, [payment.id]: event.target.value }))}
                  maxLength={2000}
                />
              </label>
              <span className="care-actions">
                {payment.proofObjectPath && <button onClick={() => void openProof(payment)}>Open private proof</button>}
                <button onClick={() => void review(payment, "verified")} disabled={reviewing === payment.id}>{reviewing === payment.id ? "Recording" : "Verify"}</button>
                <button onClick={() => void review(payment, "rejected")} disabled={reviewing === payment.id}>Reject</button>
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
