"use client";

import Link from "next/link";
import { useState } from "react";
import { useUser } from "@/lib/useUser";

const links = [
  { href: "/", label: "Home" },
  { href: "/plugins", label: "Plugins" },
  { href: "/docs", label: "Docs" },
];

export function SiteNav() {
  const { data: user } = useUser();
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-display text-lg font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
          Tech Love V
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-slate-900">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 sm:flex">
          {user ? (
            <Link href="/dashboard" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                Log in
              </Link>
              <Link href="/plugins" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          className="sm:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 text-sm font-medium text-slate-600 sm:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="hover:text-slate-900">
              {l.label}
            </Link>
          ))}
          {user ? (
            <Link href="/dashboard" onClick={() => setOpen(false)} className="hover:text-slate-900">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)} className="hover:text-slate-900">
                Log in
              </Link>
              <Link href="/plugins" onClick={() => setOpen(false)} className="hover:text-slate-900">
                Get started
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
