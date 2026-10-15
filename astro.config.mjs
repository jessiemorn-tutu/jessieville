import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { readFileSync, existsSync } from 'node:fs';

// GitHub Actions supplies the preview URL and repository base automatically.
// For fantasticjs.com, set the repository variable SITE_URL to that URL.
const site = process.env.SITE_URL || 'https://fantasticjs.com';
const base = process.env.BASE_PATH || '/';
const dimensionFile = new URL('./migration/image-dimensions.json', import.meta.url);
const dimensions = existsSync(dimensionFile) ? JSON.parse(readFileSync(dimensionFile, 'utf8')) : {};

function localLinks() {
  return (tree) => {
    const visit = (node) => {
      // Native video and other retained HTML blocks are raw Markdown nodes.
      if (node.type === 'raw') {
        node.value = node.value.replace(/(\s(?:href|src|poster)=["'])(\/(?!\/)[^"']*)(["'])/g,
          (_match, open, value, close) => `${open}${base.replace(/\/$/, '')}${value}${close}`);
      }
      if (node.tagName === 'img') {
        const size = dimensions[node.properties?.src];
        node.properties = { ...node.properties, ...size, loading: 'lazy', decoding: 'async' };
      }
      for (const key of ['href', 'src', 'poster']) {
        const value = node.properties?.[key];
        if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
          node.properties[key] = `${base.replace(/\/$/, '')}${value}`;
        }
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !page.endsWith('/404/') })],
  markdown: { processor: unified({ rehypePlugins: [localLinks], smartypants: false }) },
  devToolbar: { enabled: false },
});
