import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  metadataBase: new URL("https://outreach-saas-lio-8f66.vercel.app"),
  title: { default: "L.I.O. — Business Lead Discovery", template: "%s | L.I.O." },
  description: "Find and organize businesses worth contacting with L.I.O. business lead discovery.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "L.I.O.", images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "L.I.O. business lead discovery" }] },
  twitter: { card: "summary_large_image", images: ["/og-image.svg"] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 pt-14 lg:pt-0">
            <div className="page-reveal mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
