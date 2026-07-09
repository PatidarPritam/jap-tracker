import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, Tiro_Devanagari_Hindi } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "./components/ui/Toast";
import { ServiceWorkerRegistrar } from "./components/ServiceWorkerRegistrar";
import { InstallPrompt } from "./components/InstallPrompt";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const tiro = Tiro_Devanagari_Hindi({
  subsets: ["devanagari", "latin"],
  weight: "400",
  variable: "--font-tiro",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Jap Tracker",
    template: "%s · Jap Tracker",
  },
  description: "Devotee jap tracking and sankalp management for spiritual organisations",
  applicationName: "Jap Tracker",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Jap Tracker",
  },
};

export const viewport: Viewport = {
  themeColor: "#e87d1e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${inter.variable} ${fraunces.variable} ${tiro.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorkerRegistrar />
        <InstallPrompt />
      </body>
    </html>
  );
}
