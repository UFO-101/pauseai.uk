import { groq } from "next-sanity";

export const incidentsQuery = groq`
  *[_type == "incident"] | order(date desc) {
    _id,
    title,
    "slug": slug.current,
    date,
    summary,
    severity,
    pullQuote{ text, attribution, "imageUrl": image.asset->url },
    featured,
    "companies": companies[]->{ _id, name, "slug": slug.current, swatch },
    "categories": categories[]->{ _id, name, "slug": slug.current },
    sources
  }
`;

export const companiesQuery = groq`
  *[_type == "company"] | order(name asc) {
    _id, name, "slug": slug.current, swatch,
    "count": count(*[_type == "incident" && references(^._id)])
  }
`;

export const incidentBySlugQuery = groq`
  *[_type == "incident" && slug.current == $slug][0]{
    ...,
    "companies": companies[]->{ _id, name, "slug": slug.current, swatch },
    "categories": categories[]->{ _id, name, "slug": slug.current }
  }
`;
