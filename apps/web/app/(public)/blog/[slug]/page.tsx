import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog";
import { FOUNDER_URL, OG_IMAGE, SITE_URL, breadcrumbLd } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getBlogPost(params.slug);
  if (!p) return {};
  const path = `/blog/${p.slug}`;
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: path },
    openGraph: { images: [OG_IMAGE], title: p.title, description: p.description, url: path, type: "article", publishedTime: p.datePublished },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const p = getBlogPost(params.slug);
  if (!p) return notFound();
  const path = `/blog/${p.slug}`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: p.title,
          description: p.description,
          datePublished: p.datePublished,
          mainEntityOfPage: `${SITE_URL}${path}`,
          author: { "@type": "Person", name: "Eshaan Manchanda", url: FOUNDER_URL },
          publisher: { "@id": `${SITE_URL}/#organization` },
        }}
      />
      <JsonLd data={breadcrumbLd([{ name: "Blog", path: "/blog" }, { name: p.title, path }])} />

      <nav className="text-sm text-slate-500">
        <Link href="/blog" className="hover:text-slate-900">Blog</Link>
      </nav>
      <h1 className="mt-4 font-display text-3xl font-bold text-slate-900 sm:text-4xl">{p.title}</h1>
      <p className="mt-2 text-sm text-slate-400">
        By <a href={FOUNDER_URL} className="hover:underline">Eshaan Manchanda</a> · <time dateTime={p.datePublished}>{p.datePublished}</time>
      </p>
      <p className="mt-6 text-lg text-slate-700">{p.intro}</p>

      {p.sections.map((s) => (
        <section key={s.h2} className="mt-10">
          <h2 className="font-display text-2xl font-bold text-slate-900">{s.h2}</h2>
          {s.paragraphs.map((para) => (
            <p key={para} className="mt-3 text-slate-600">{para}</p>
          ))}
        </section>
      ))}

      <section className="mt-12 rounded-lg bg-slate-50 p-6 ring-1 ring-slate-200">
        <h2 className="font-display text-lg font-bold text-slate-900">Read next</h2>
        <ul className="mt-3 space-y-2">
          {p.links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-brand-600 hover:underline">{l.label}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
