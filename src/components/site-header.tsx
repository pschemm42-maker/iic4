import { Logo } from "@/components/brand/logo";
import { AuthNav } from "@/components/auth-nav";
import { MainNav } from "@/components/main-nav";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/">
          <Logo size="sm" />
        </Link>
        <nav className="flex items-center gap-4">
          <MainNav />
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
