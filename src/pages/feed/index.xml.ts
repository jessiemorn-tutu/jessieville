import rss from '@astrojs/rss';
import { allPosts, href, site } from '../../lib/site';
export async function GET(context) {
  return rss({
    title: site.name,
    description: site.description,
    site: context.site,
    items: (await allPosts()).map(({ data }) => ({ title: data.title, pubDate: new Date(data.date), description: data.description, link: href(data.permalink) })),
    customData: '<language>zh-Hant</language>',
  });
}
