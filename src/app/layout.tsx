import type { Metadata } from "next";
import { Frank_Ruhl_Libre, Assistant } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { heIL } from "@clerk/localizations";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "@/lib/utils";

const frankRuhlLibre = Frank_Ruhl_Libre({
  variable: "--font-serif",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

const assistant = Assistant({
  variable: "--font-sans",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "זה עלינו — מחקרי מדיניות ופעילות שטח",
    template: "%s · זה עלינו",
  },
  description:
    "פלטפורמה ציבורית למחקרי מדיניות ופעילות שטח של עמותת זה עלינו.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={heIL} signInUrl="/sign-in" signUpUrl="/sign-up">
      <html
        lang="he"
        dir="rtl"
        className={cn(
          "h-full antialiased",
          frankRuhlLibre.variable,
          assistant.variable,
        )}
      >
        <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
          <SiteHeader />
          <main className="flex-1 flex flex-col">{children}</main>
          <SiteFooter />
        </body>
      </html>
    </ClerkProvider>
  );
}
