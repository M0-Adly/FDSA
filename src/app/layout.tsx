import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "National Crisis Management System",
  description: "Government-grade emergency response platform for citizens and officials.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased font-['Inter',sans-serif]">
        {children}
      </body>
    </html>
  );
}
