import { defineCollection, reference, z } from "astro:content";
import { glob } from "astro/loaders";

const authors = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/authors" }),
  schema: ({ image }) =>
    z.object({
      firstName: z.string(),
      lastName: z.string(),
      middleName: z.string().optional(),
      titleBefore: z.string().optional(),
      titleAfter: z.string().optional(),
      website: z.string().optional(),
      facebook: z.string().optional(),
      linkedin: z.string().optional(),
      avatar: image().optional(),
      createdAt: z.coerce.date(),
    }),
});

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      author: reference("authors"),
      description: z.string(),          // Markdown string (lead)
      image: image().optional(),
      publishedAt: z.coerce.date(),
    }),
});

const publications = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/publications" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      shortDescription: z.string(),     // Markdown string
      image: image().optional(),
      gallery: z.array(image()).default([]),
      createdAt: z.coerce.date(),
    }),
});

export const collections = { authors, posts, publications };
