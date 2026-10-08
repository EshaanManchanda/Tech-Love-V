import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description: "Guides on creating, issuing and verifying certificates with WordPress, from Tech Love V.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-3xl font-bold text-slate-900">Blog</h1>
      <ul className="mt-10 space-y-6">
        {BLOG_POSTS.map((p) => (
          <li key={p.slug}>
            <Link href={`/blog/${p.slug}`} className="block rounded-lg p-5 ring-1 ring-slate-200 hover:bg-slate-50">
              <h2 className="font-display text-xl font-semibold text-slate-900">{p.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{p.description}</p>
              <time dateTime={p.datePublished} className="mt-3 block text-xs text-slate-400">{p.datePublished}</time>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
