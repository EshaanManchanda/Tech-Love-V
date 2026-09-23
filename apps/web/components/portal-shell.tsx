"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  Download,
  Flag,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Package,
  ShieldCheck,
  ScrollText,
  Settings,
  Ticket,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { usePortalUiStore } from "@/lib/store";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export interface PortalNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Defined here (client component) rather than passed in as props — icon
// component references can't cross a Server → Client Component boundary
// (admin/layout.tsx is a server component; RSC can't serialize functions).
const CUSTOMER_NAV: PortalNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/licenses", label: "Licenses", icon: KeyRound },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/downloads", label: "Downloads", icon: Download },
  { href: "/dashboard/support", label: "Support", icon: LifeBuoy },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const ADMIN_NAV: PortalNavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/licenses", label: "Licenses", icon: KeyRound },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
  { href: "/admin/feature-flags", label: "Feature Flags", icon: Flag },
  { href: "/admin/logs", label: "Logs", icon: ScrollText },
];

interface PortalShellProps {
  portal: "customer" | "admin";
  user: { name: string; email: string; role?: "customer" | "admin" };
  children: React.ReactNode;
}

export function PortalShell({ portal, user, children }: PortalShellProps) {
  const portalName = portal === "admin" ? "Admin Portal" : "Customer Portal";
  const navItems = portal === "admin" ? ADMIN_NAV : CUSTOMER_NAV;
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mobileNavOpen, setMobileNavOpen } = usePortalUiStore();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    queryClient.setQueryData(["me"], null);
    router.push("/");
  }

  function isActive(href: string) {
    // The portal root (e.g. "/dashboard") must match exactly — otherwise every
    // subpage's path starts with it and both "Overview" and the subpage light up.
    const isPortalRoot = href.split("/").filter(Boolean).length <= 1;
    if (isPortalRoot) return href === pathname;
    return href === pathname || pathname.startsWith(`${href}/`);
  }

  function NavLinks() {
    return (
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileNavOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-background p-4 sm:block">
        <Link href="/" className="mb-6 block font-display text-lg font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
          Tech Love V
        </Link>
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{portalName}</p>
        <NavLinks />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{portalName}</p>
          <NavLinks />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b border-border bg-background px-4">
          <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setMobileNavOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-sm font-medium sm:hidden">{portalName}</span>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  {user.name}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-normal text-muted-foreground">{user.email}</DropdownMenuLabel>
                {user.role === "admin" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push(portal === "admin" ? "/dashboard" : "/admin")}>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      {portal === "admin" ? "Switch to customer portal" : "Switch to admin portal"}
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
