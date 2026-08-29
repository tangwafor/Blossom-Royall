import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStorefront, storefronts } from "@/lib/storefront-catalog";
import StorefrontExperience from "./storefront-experience";

export const dynamicParams = false;

export function generateStaticParams() {
  return storefronts.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const storefront = getStorefront(slug);
  if (!storefront) return {};
  return {
    title: `${storefront.publicName} | Blossom Royall`,
    description: storefront.tagline,
    openGraph: { title: storefront.publicName, description: storefront.tagline, images: [storefront.products[0]?.image || storefront.logo] },
    twitter: { card: "summary_large_image", title: storefront.publicName, description: storefront.tagline, images: [storefront.products[0]?.image || storefront.logo] },
  };
}

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const storefront = getStorefront(slug);
  if (!storefront) notFound();
  return <StorefrontExperience storefront={storefront} siblingStores={storefronts.map(({ slug: storeSlug, publicName }) => ({ slug: storeSlug, publicName }))} />;
}
