import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const endpoint = "https://africstylefashion.com/wp-json/wc/store/v1/products";
const output = path.join(
  process.cwd(),
  "public",
  "vendor-imports",
  "africstyle-fashion.json",
);

const stripHtml = (value = "") =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

async function getPage(page) {
  const response = await fetch(`${endpoint}?per_page=100&page=${page}`);
  if (!response.ok) throw new Error(`Africstyle catalog returned ${response.status}`);
  return {
    products: await response.json(),
    pages: Number(response.headers.get("x-wp-totalpages") || 1),
    total: Number(response.headers.get("x-wp-total") || 0),
  };
}

const first = await getPage(1);
const remaining = await Promise.all(
  Array.from({ length: Math.max(first.pages - 1, 0) }, (_, index) =>
    getPage(index + 2),
  ),
);
const sourceProducts = [first, ...remaining].flatMap((page) => page.products);
const products = sourceProducts.map((product) => ({
  sourceId: String(product.id),
  name: product.name,
  slug: product.slug,
  sku: product.sku || "",
  description: stripHtml(product.description || product.short_description),
  price: Number(product.prices?.price || 0) / 10 ** Number(product.prices?.currency_minor_unit || 2),
  regularPrice:
    Number(product.prices?.regular_price || 0) /
    10 ** Number(product.prices?.currency_minor_unit || 2),
  currency: product.prices?.currency_code || "USD",
  categories: (product.categories || []).map((category) => category.name),
  tags: (product.tags || []).map((tag) => tag.name),
  options: (product.attributes || []).map((attribute) => ({
    name: attribute.name,
    values: (attribute.terms || []).map((term) => term.name),
  })),
  image: product.images?.[0]?.src || "",
  gallery: (product.images || []).slice(1).map((image) => image.src),
  sourceUrl: product.permalink,
  sourceAvailability: product.is_in_stock ? "in_stock" : "out_of_stock",
  sourcePurchasable: Boolean(product.is_purchasable),
  requiresVendorConfirmation: false,
  publishStatus: "staged",
  blossomOnsiteQuantity: null,
  blossomOnlineQuantity: null,
  fulfillment: null,
}));

const categories = [...new Set(products.flatMap((product) => product.categories))].sort();
const payload = {
  schemaVersion: 1,
  vendor: {
    publicName: "Africstyle Fashion",
    website: "https://africstylefashion.com/",
    email: "africstyle@yahoo.ca",
    phone: "+1 647 677 9440",
    description: "Home of contemporary African fashion",
    facebook: "https://www.facebook.com/africstyefashion/",
    instagram: "https://www.instagram.com/africstyle_fashion/",
    linkedPlatform: "https://sabi.style/",
  },
  provenance: {
    source: endpoint,
    retrievedAt: new Date().toISOString(),
    publicCatalogTotal: first.total,
    note: "Delly verbally confirmed that the public Africstyle catalog may be staged for Blossom Royall review. Inventory, fulfillment, and final publication remain pending.",
    confirmation: {
      status: "verbally_confirmed",
      confirmedBy: "Delly",
      confirmedAt: "2026-08-28",
      scope: "Stage the public Africstyle catalog for Blossom Royall review",
    },
  },
  categories,
  products,
};

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Prepared ${products.length} staged Africstyle products at ${output}`);
