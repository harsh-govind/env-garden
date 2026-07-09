import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { APP_NAME } from "@/constants/app";
import AuthenticatedLayout from "@/layouts/Authenticated";
import UnauthenticatedLayout from "@/layouts/Unauthenticated";
import AuthenticatedProvider from "@/provider/authenticated";
import ProtectedRouteProvider from "@/provider/protected-route";
import type { LayoutSwitcherProps, RootLayoutProps } from "@/types/layouts";
import { cn } from "@/utils";
import { ThemeProvider } from "@/provider/theme";

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
  title: APP_NAME,
  description: "Envs, simplified",
};

function LayoutSwitcher({ isAuthenticated, children }: LayoutSwitcherProps) {
  return (
    <ProtectedRouteProvider isAuthenticated={isAuthenticated}>
      {isAuthenticated ? (
        <AuthenticatedLayout>{children}</AuthenticatedLayout>
      ) : (
        <UnauthenticatedLayout>{children}</UnauthenticatedLayout>
      )}
    </ProtectedRouteProvider>
  );
}

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
            {({ isAuthenticated }) => (
              <LayoutSwitcher isAuthenticated={isAuthenticated}>{children}</LayoutSwitcher>
            )}
          </AuthenticatedProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
