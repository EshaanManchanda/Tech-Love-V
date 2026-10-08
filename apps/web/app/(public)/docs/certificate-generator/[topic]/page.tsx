import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { CG_DOCS, getCgDoc } from "@/lib/cg-docs";
import { getCgFeature } from "@/lib/cg-features";
import { CG_TUTORIAL, OG_IMAGE, YOUTUBE_PLAYLIST, breadcrumbLd } from "@/lib/site";
import { YouTubeVideo } from "@/components/youtube-video";

export const dynamicParams = false;

export function generateStaticParams() {
  return CG_DOCS.map((d) => ({ topic: d.slug }));
}

export function generateMetadata({ params }: { params: { topic: string } }): Metadata {
  const d = getCgDoc(params.topic);
  if (!d) return {};
  const path = `/docs/certificate-generator/${d.slug}`;
  return {
    title: `${d.title} — Certificate Generator Docs`,
    description: d.description,
    alternates: { canonical: path },
    openGraph: { images: [OG_IMAGE], title: d.title, description: d.description, url: path, type: "article" },
  };
}

export default function DocTopicPage({ params }: { params: { topic: string } }) {
  const d = getCgDoc(params.topic);
  if (!d) return notFound();
  const i = CG_DOCS.indexOf(d);
  const prev = CG_DOCS[i - 1];
  const next = CG_DOCS[i + 1];
  const feature = d.feature ? getCgFeature(d.feature) : undefined;

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <JsonLd
        data={breadcrumbLd([
          { name: "Docs", path: "/docs" },
          { name: "Certificate Generator", path: "/docs" },
          { name: d.title, path: `/docs/certificate-generator/${d.slug}` },
        ])}
      />
      <nav className="text-sm text-slate-500">
        <Link href="/docs" className="hover:text-slate-900">Docs</Link> / Certificate Generator
      </nav>
      <h1 className="mt-4 font-display text-3xl font-bold text-slate-900">{d.title}</h1>
      <p className="mt-4 text-lg text-slate-700">{d.intro}</p>
      {d.slug === "getting-started" && (
        <div className="mt-8">
          <YouTubeVideo video={CG_TUTORIAL} />
          <a href={YOUTUBE_PLAYLIST} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline">
            ▶ See the whole tutorial series
          </a>
        </div>
      )}

      {d.blocks.map((b) => {
        const ListTag = b.ordered ? "ol" : "ul";
        return (
          <section key={b.h2} className="mt-10">
            <h2 className="font-display text-xl font-bold text-slate-900">{b.h2}</h2>
            {b.paragraphs?.map((p) => (
              <p key={p} className="mt-3 text-slate-600">{p}</p>
            ))}
            {b.list && (
              <ListTag className={`mt-3 space-y-2 pl-5 text-slate-700 ${b.ordered ? "list-decimal" : "list-disc"}`}>
                {b.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ListTag>
            )}
            {b.table && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-slate-500">
                      {b.table.head.map((h) => (
                        <th key={h} className="py-2 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.table.rows.map((row) => (
                      <tr key={row[0] + row[1]} className="border-b last:border-0">
                        {row.map((c, j) => (
                          <td key={j} className={`py-2 pr-4 ${j === 0 ? "font-mono text-xs text-slate-800" : "text-slate-600"}`}>{c}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {b.code && <pre className="mt-4 overflow-x-auto rounded-md bg-slate-900 p-4 text-xs text-slate-100"><code>{b.code}</code></pre>}
          </section>
        );
      })}

      {feature && (
        <p className="mt-12 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
          Overview:{" "}
          <Link href={`/certificate-generator/${feature.slug}`} className="font-medium text-brand-600 hover:underline">{feature.h1}</Link>
        </p>
      )}

      <nav className="mt-12 flex justify-between gap-4 border-t pt-6 text-sm">
        {prev ? <Link href={`/docs/certificate-generator/${prev.slug}`} className="text-brand-600 hover:underline">← {prev.title}</Link> : <span />}
        {next && <Link href={`/docs/certificate-generator/${next.slug}`} className="text-right text-brand-600 hover:underline">{next.title} →</Link>}
      </nav>
    </main>
  );
}
