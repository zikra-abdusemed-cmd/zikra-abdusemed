import type { Metadata } from "next";
import { Lora, Playfair_Display } from "next/font/google";
import CustomCursor from "@/components/CustomCursor";
import NoiseBackground from "@/components/NoiseBackground";
import { site } from "@/lib/site";
import "./globals.css";

const display = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display-face",
  display: "swap",
});
const body = Lora({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-body-face", display: "swap" });

export const metadata: Metadata = {
  title: `${site.name} | Portfolio`,
  description: site.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        {/* Mark JS as available before first paint so reveal styles only apply when they can finish. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="min-h-screen overflow-x-clip">
        <NoiseBackground />
        <CustomCursor />
        {children}
      </body>
    </html>
  );
}
