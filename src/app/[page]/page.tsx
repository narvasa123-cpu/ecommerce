import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { serviceContent } from '@/lib/service-content';
type Props = { params: Promise<{ page: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = serviceContent[(await params).page];
  return { title: p?.title || 'Client care', description: p?.intro };
}
export default async function ServicePage({ params }: Props) {
  const p = serviceContent[(await params).page];
  if (!p) notFound();
  return (
    <div className="page-container">
      <article className="service-page">
        <p className="eyebrow" style={{ marginBottom: 20 }}>
          {p.eyebrow}
        </p>
        <h1>{p.title}</h1>
        {p.legal && (
          <p className="legal-notice">Legal template · Review and adapt before public use.</p>
        )}
        <div className="prose">
          <p>{p.intro}</p>
          {p.sections.map((s) => (
            <section key={s.title}>
              <h2>{s.title}</h2>
              <p>{s.text}</p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
