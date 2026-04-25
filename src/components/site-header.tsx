import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

const navLinks = [
  { href: "/research", label: "מחקרים" },
  { href: "/researchers", label: "חוקרים" },
  { href: "/about", label: "אודות" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
      <div className="mx-auto w-full max-w-5xl flex items-center justify-between py-4 ps-6 pe-6">
        <Link
          href="/"
          className="font-serif text-2xl font-medium text-foreground"
        >
          זה עלינו
        </Link>
        <nav aria-label="ניווט ראשי" className="flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                כניסה
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </nav>
      </div>
    </header>
  );
}
