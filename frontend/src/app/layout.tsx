import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AppContainer from "@/components/AppContainer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Access GOC KL Gala Dinner",
  description: "Retro disco-themed event management system for the Access GOC KL Gala Dinner: registration, QR check-in, live dashboard, lucky draw, best dress voting, mini game, and Wootric-powered feedback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <AppContainer>{children}</AppContainer>
      </body>
    </html>
  );
}
