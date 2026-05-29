import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import AuthenticatedLayout from "@/layouts/Authenticated";
import AuthenticatedProvider from "@/provider/authenticated-provider";
import type { RootLayoutProps } from "@/types/layouts";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/provider/theme-provider";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Env Garden",
  description: "Envs, simplified",
};

export default async function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthenticatedProvider>
            <AuthenticatedLayout>{children}</AuthenticatedLayout>
          </AuthenticatedProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
