import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Secure Workspace | Blossom Royall",
  robots: { index: false, follow: false },
};

export default function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
