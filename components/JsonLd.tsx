export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  // Escape "<" so a value containing "</script>" can't break out of the tag.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
