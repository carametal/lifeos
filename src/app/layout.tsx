import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Life OS",
  description: "日々を記録し、自分のペースで暮らしを整える。",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ja" className="h-full antialiased"><body className="min-h-full">{children}</body></html>;
}
