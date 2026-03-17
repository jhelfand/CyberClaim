import type { Metadata } from "next";
import { Cormorant_Garamond, IBM_Plex_Sans } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "GAIG Security Claims",
  description: "Standalone GAIG specialty security claims intake and workflow application powered by the UiPath TypeScript SDK.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
