import { Logo } from "@/components/brand/logo";
import { AuthNav } from "@/components/auth-nav";
import { MainNav } from "@/components/main-nav";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-white/10 bg-brand-navy">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/">
          <Logo
            size="sm"
            className="[&_p:first-of-type]:text-white [&_p:last-of-type]:text-amber-300/90"
          />
        </Link>
        <nav className="flex items-center gap-4">
          <MainNav />
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
