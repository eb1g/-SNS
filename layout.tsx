import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://kitsunesns.f5.si"),
  title: { default: "きつねSNS | こんこん！", template: "%s | きつねSNS" },
  description: "きつね好きが集まる、あたたかなSNS。日々のこんこん！を届けよう。",
  openGraph: { title: "きつねSNS", description: "きつね好きが集まる、あたたかなSNS。", url: "https://kitsunesns.f5.si", siteName: "きつねSNS", locale: "ja_JP", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body><SiteHeader />{children}<footer className="site-footer page-wrap"><span>© 2026 きつねSNS</span><span>こんこん！🦊</span></footer></body></html>;
}
