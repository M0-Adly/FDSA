import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "National Crisis Management System",
  description: "Government-grade emergency response platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
