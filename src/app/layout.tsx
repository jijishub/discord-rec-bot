import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#fbcfe8",
};

export const metadata: Metadata = {
  title: "Jasmine 🌸 ┆ Rec Studio",
  description: "Aesthetic recommendation creator for ◜― ✿ Jizelle's Space ✿",
  manifest: "/manifest.json",
  icons: {
    icon: "/maomao-bg.png",
    shortcut: "/maomao-bg.png",
    apple: [
      { url: "/maomao-bg.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Jasmine 🌸",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/maomao-bg.png" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
