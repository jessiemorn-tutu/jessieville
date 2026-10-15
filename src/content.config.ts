import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const shared = {
  title: z.string(),
  permalink: z.string().startsWith('/').endsWith('/'),
  description: z.string().default(''),
  sourceId: z.number().optional(),
  sourceUrl: z.string().optional(),
};

export const collections = {
  posts: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
    schema: z.object({
      ...shared,
      date: z.string(),
      categories: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([]),
      group: z.enum(['books', 'screen', 'life']).default('life'),
      cover: z.string().default(''),
      readingMinutes: z.number().default(3),
      draft: z.boolean().default(false),
    }),
  }),
  pages: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/pages' }),
    schema: z.object(shared),
  }),
};
