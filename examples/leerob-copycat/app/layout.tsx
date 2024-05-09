import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lee Robinson - notion-rsc example",
  description: "Copycat of Lee Robinson blog, as a notion-rsc example",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`bg-[#111010] text-white ${inter.className}`}>
        {children}
      </body>
    </html>
  );
}
