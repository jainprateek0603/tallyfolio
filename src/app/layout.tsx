import type { Metadata } from "next";
import { Fraunces, Public_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Tallyfolio",
    template: "%s · Tallyfolio",
  },
  description: "A ledger for independent work: clients, projects, and the invoices that are still unpaid.",
};

const themeScript = `(function(){try{var k="tallyfolio-theme";var s=localStorage.getItem(k);var d=s==="dark"||(s!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${publicSans.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
