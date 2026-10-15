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
    icon: { url: "/maomao-bg.png", type: "image/png" },
    shortcut: "/maomao-bg.png",
    apple: [
      { url: "/maomao-icon-180.png", sizes: "180x180", type: "image/png" },
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
