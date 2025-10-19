import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "../styles/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ToastContainer } from "@/components/ui/toast";

const inter = Inter({ subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Raiken - AI-Powered Test Automation",
  description: "Modern AI-powered test automation platform with DOM context, intelligent test generation, and comprehensive reporting",
  keywords: ["test automation", "AI testing", "Playwright", "DOM inspection", "test generation"],
  authors: [{ name: "Raiken Team" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={jakarta.variable}>
      <head />
      <body className={`${inter.className} ${jakarta.variable} font-sans antialiased`}>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
              {children}
              <ToastContainer />
            </div>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
