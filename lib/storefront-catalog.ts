import africstyleCatalog from "@/public/vendor-imports/africstyle-fashion.json";

export type StorefrontProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  categories: string[];
  image: string;
  options: string[];
  sourceUrl?: string;
};

export type StorefrontDefinition = {
  slug: "blossom-collections" | "africstyle-fashion";
  publicName: string;
  ownerName: string;
  ownerLabel: string;
  tagline: string;
  story: string;
  primaryColor: string;
  secondaryColor: string;
  logo: string;
  websiteUrl?: string;
  fulfillment: string;
  products: StorefrontProduct[];
};

const blossomProducts: StorefrontProduct[] = [
  { id: "blossom-aurelia", name: "Aurelia Satin Midi", description: "A luminous occasion dress selected for the Blossom Collections signature edit.", price: 168, currency: "USD", category: "Dresses", categories: ["Dresses", "Occasion"], image: "/editorial/blossom-after-dark.png", options: ["Size 4", "Size 6", "Size 8", "Size 10", "Size 12"] },
  { id: "blossom-sloane", name: "Sloane Sculpted Blazer", description: "Polished tailoring with a confident waist and an evening ready wine finish.", price: 214, currency: "USD", category: "Tailoring", categories: ["Tailoring", "New arrivals"], image: "/editorial/african-designers-edit.png", options: ["Small", "Medium", "Large", "Extra large"] },
  { id: "blossom-mila", name: "Mila Gold Clutch", description: "A compact champagne gold evening bag made to complete celebration looks.", price: 86, currency: "USD", category: "Accessories", categories: ["Accessories", "Occasion"], image: "/og-v2.png", options: ["One size"] },
  { id: "blossom-noelle", name: "Noelle Silk Trousers", description: "Fluid black trousers with an elegant drape for work, dinner, and formal styling.", price: 142, currency: "USD", category: "Tailoring", categories: ["Tailoring", "Essentials"], image: "/editorial/blossom-after-dark.png", options: ["Size 4", "Size 6", "Size 8", "Size 10", "Size 12"] },
];

const africstyleProducts: StorefrontProduct[] = africstyleCatalog.products.map((product) => ({
  id: `africstyle-${product.sourceId}`,
  name: product.name.replaceAll("&#038;", "&").replaceAll("&amp;", "&"),
  description: product.description || `A distinctive ${product.categories[0]?.replaceAll("&amp;", "&").toLowerCase() || "fashion"} piece from Africstyle Fashion.`,
  price: product.price,
  currency: product.currency,
  category: product.categories[0]?.replaceAll("&amp;", "&") || "Collection",
  categories: product.categories.map((category) => category.replaceAll("&amp;", "&")),
  image: product.image,
  options: product.options.flatMap((option) => option.values.map((value) => `${option.name}: ${value}`)),
  sourceUrl: product.sourceUrl,
}));

export const storefronts: StorefrontDefinition[] = [
  {
    slug: "blossom-collections",
    publicName: "Blossom Collections",
    ownerName: "Delly",
    ownerLabel: "Delly’s house collection",
    tagline: "Modern occasionwear, polished essentials, and gifts chosen with care.",
    story: "Blossom Collections is Delly’s signature edit inside Blossom Royall, bringing together confident silhouettes, elegant finishing pieces, and personal service for every celebration.",
    primaryColor: "#6f2942",
    secondaryColor: "#f1d49d",
    logo: "/brand/blossom-seal.png",
    fulfillment: "Pickup at Blossom Royall",
    products: blossomProducts,
  },
  {
    slug: "africstyle-fashion",
    publicName: "Africstyle Fashion",
    ownerName: "Duplex",
    ownerLabel: "A Duplex brand",
    tagline: "Contemporary African fashion shaped by heritage, movement, and confidence.",
    story: "Africstyle Fashion is owned by Duplex and presented inside Blossom Royall as a complete destination for modern Toghu, activewear, formalwear, and expressive everyday style.",
    primaryColor: "#123d35",
    secondaryColor: "#e8b647",
    logo: "/vendor-logos/africstyle-fashion.png",
    websiteUrl: "https://africstylefashion.com/",
    fulfillment: "Pickup or vendor fulfilled delivery",
    products: africstyleProducts,
  },
];

export const getStorefront = (slug: string) => storefronts.find((storefront) => storefront.slug === slug);
