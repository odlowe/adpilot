import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "AdPilot — Get Local Customers on Autopilot",
  description:
    "Your automated AI marketing agent. Set a budget, describe your customer in plain English, and launch ads on Google, Instagram, and Reddit — no tech skills required.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-slate-50 text-navy-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
