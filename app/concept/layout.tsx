import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Internal Marketplace Concept | Blossom Royall",
  description: "Confidential internal strategy for the Blossom Royall marketplace.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  referrer: "no-referrer",
};

export default function ConceptLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
