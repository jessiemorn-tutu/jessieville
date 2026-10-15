import { getCollection, type CollectionEntry } from 'astro:content';

export const site = {
  name: 'Jessieville',
  tagline: 'Like a river that keeps flowing.',
  description: 'Jessie 的個人書寫空間：讀書筆記、影劇評論，以及生活與旅行。',
  instagram: 'https://www.instagram.com/zezesi/',
  art: 'https://uncoverimages.wordpress.com/',
};

export const groups = [
  { id: 'all', label: '全部文章', en: 'All writing' },
  { id: 'books', label: '讀書筆記', en: 'Books & ideas' },
  { id: 'screen', label: '影劇評論', en: 'On screen' },
  { id: 'life', label: '生活與旅行', en: 'Life & elsewhere' },
];

export const href = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`;
export const groupLabel = (group: string) => groups.find((item) => item.id === group)?.label || group;
export const allPosts = async () => (await getCollection('posts', ({ data }) => !data.draft))
  .sort((a, b) => b.data.date.localeCompare(a.data.date));

export const dateLabel = (date: string) => date.slice(0, 10).replaceAll('-', '.');
export const yearOf = (post: CollectionEntry<'posts'>) => post.data.date.slice(0, 4);
export const termSlug = (term: string) => term.toLowerCase().replaceAll('&', '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
