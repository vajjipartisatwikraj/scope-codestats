/**
 * Vite plugin: applies the brand chosen in frontend/.env to the build.
 *
 *   VITE_PLATFORM          folder in src/brand/platforms/     (default codestats)
 *   VITE_INSTITUTION       folder in src/brand/institutions/  (default mlrit)
 *   VITE_PLATFORM_NAME     the platform's name in all text    (default: the name in its brand.json)
 *   VITE_INSTITUTION_NAME  the institution's name in all text (default: the name in its brand.json)
 *
 * It does four things:
 *   1. Checks the chosen folders exist and hold every required file, and stops the build with a
 *      sentence that says what is missing (not a cryptic "failed to resolve import").
 *   2. Points the aliases @platform and @institution at those folders. src/brand/index.js imports
 *      them, so the pictures of the brands that were not chosen never reach the build.
 *   3. Fills index.html (title, description, theme colour) and adds the icon and manifest links.
 *   4. Writes the files that must sit at fixed addresses in the site root, because a browser asks for
 *      them by name: /favicon.ico, /favicon.png, /icon-192.png, /icon-512.png and /manifest.json. They
 *      are copied from the platform folder (the manifest is generated), in the build and the dev server.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from 'vite';
import { fill, namesOf } from './src/brand/fill.mjs';

const ID = /^[a-z0-9][a-z0-9-]*$/;
const DEFAULTS = { platform: 'codestats', institution: 'mlrit' };
const REQUIRED = {
  platform: ['index.js', 'brand.json', 'logo.png', 'favicon.ico', 'icon-192.png', 'icon-512.png'],
  institution: ['index.js', 'brand.json', 'logo.png', 'club-logo-dark.png', 'club-logo-light.png'],
};
const VARIABLE = { platform: 'VITE_PLATFORM', institution: 'VITE_INSTITUTION' };

const escapeHtml = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The folder of one brand, after checking it is complete */
function locate(kind, id, brandRoot) {
  const group = kind === 'platform' ? 'platforms' : 'institutions';
  if (!ID.test(id)) {
    throw new Error(`[brand] ${VARIABLE[kind]}="${id}" is not a valid folder name. Use lower-case letters, digits and dashes, for example "${DEFAULTS[kind]}".`);
  }
  const dir = path.join(brandRoot, group, id);
  if (!fs.existsSync(dir)) {
    const available = fs.existsSync(path.join(brandRoot, group))
      ? fs.readdirSync(path.join(brandRoot, group), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
      : [];
    throw new Error(`[brand] ${VARIABLE[kind]}="${id}" but there is no folder src/brand/${group}/${id}. Available: ${available.join(', ') || 'none'}.`);
  }
  const missing = REQUIRED[kind].filter((file) => !fs.existsSync(path.join(dir, file)));
  if (missing.length > 0) {
    throw new Error(`[brand] src/brand/${group}/${id} is missing: ${missing.join(', ')}. See the comment at the top of the folder's index.js.`);
  }
  const data = JSON.parse(fs.readFileSync(path.join(dir, 'brand.json'), 'utf8'));
  if (!data.name) throw new Error(`[brand] src/brand/${group}/${id}/brand.json needs a "name".`);
  return { id, dir, data };
}

export default function brandPlugin() {
  let brand;

  function resolveBrand(mode, root) {
    const env = loadEnv(mode, root, 'VITE_');
    const brandRoot = path.join(root, 'src', 'brand');
    const platform = locate('platform', (env.VITE_PLATFORM || DEFAULTS.platform).trim(), brandRoot);
    const institution = locate('institution', (env.VITE_INSTITUTION || DEFAULTS.institution).trim(), brandRoot);

    // Same rule as src/brand/index.js: a name from the environment wins, and the full name follows it
    const platformName = (env.VITE_PLATFORM_NAME || '').trim();
    const institutionName = (env.VITE_INSTITUTION_NAME || '').trim();
    const platformData = { ...platform.data, name: platformName || platform.data.name };
    const institutionData = { ...institution.data, name: institutionName || institution.data.name, fullName: institutionName || institution.data.fullName };
    const names = namesOf(platformData, institutionData);

    return { platform: { ...platform, data: platformData }, institution: { ...institution, data: institutionData }, names };
  }

  /** The files that must sit in the site root: name -> { source, type } */
  function rootFiles() {
    const { platform, names } = brand;
    const p = platform.data;
    const read = (file) => fs.readFileSync(path.join(platform.dir, file));
    const manifest = {
      short_name: p.name,
      name: fill(p.manifestName || '{platform}', names),
      icons: [
        { src: 'favicon.ico', sizes: '64x64 32x32 24x24 16x16', type: 'image/x-icon' },
        { src: 'icon-192.png', type: 'image/png', sizes: '192x192', purpose: 'any' },
        { src: 'icon-512.png', type: 'image/png', sizes: '512x512', purpose: 'any' },
      ],
      start_url: '.',
      display: 'standalone',
      theme_color: p.manifestThemeColor || p.themeColor || '#000000',
      background_color: p.manifestBackground || '#ffffff',
    };
    return new Map([
      ['favicon.ico', { source: read('favicon.ico'), type: 'image/x-icon' }],
      ['favicon.png', { source: read('logo.png'), type: 'image/png' }],
      ['icon-192.png', { source: read('icon-192.png'), type: 'image/png' }],
      ['icon-512.png', { source: read('icon-512.png'), type: 'image/png' }],
      ['manifest.json', { source: JSON.stringify(manifest, null, 2), type: 'application/manifest+json' }],
    ]);
  }

  return {
    name: 'codestats-brand',
    enforce: 'pre',

    config(config, { mode }) {
      brand = resolveBrand(mode, config.root ? path.resolve(config.root) : process.cwd());
      return {
        resolve: {
          alias: [
            { find: /^@platform$/, replacement: brand.platform.dir },
            { find: /^@institution$/, replacement: brand.institution.dir },
          ],
        },
      };
    },

    configResolved(resolved) {
      if (resolved.command === 'build') {
        console.log(`[brand] platform "${brand.platform.id}" (${brand.names.platform}), institution "${brand.institution.id}" (${brand.names.institution})`);
      }
    },

    // Fill the page title and description, and add the icon and manifest links
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const { platform, names } = brand;
        const title = fill(platform.data.title || '{platform}', names);
        const description = fill(platform.data.description || '', names);
        return {
          html: html
            .replace(/__BRAND_TITLE__/g, escapeHtml(title))
            .replace(/__BRAND_DESCRIPTION__/g, escapeHtml(description))
            .replace(/__BRAND_THEME_COLOR__/g, escapeHtml(platform.data.themeColor || '#000000')),
          tags: [
            { tag: 'link', attrs: { rel: 'icon', type: 'image/png', href: '/favicon.png' }, injectTo: 'head' },
            { tag: 'link', attrs: { rel: 'icon', href: '/favicon.ico', sizes: 'any' }, injectTo: 'head' },
            { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/icon-192.png' }, injectTo: 'head' },
            { tag: 'link', attrs: { rel: 'manifest', href: '/manifest.json' }, injectTo: 'head' },
          ],
        };
      },
    },

    // Build: write the root files into dist
    generateBundle() {
      for (const [fileName, file] of rootFiles()) {
        this.emitFile({ type: 'asset', fileName, source: file.source });
      }
    },

    // Dev server: answer the same addresses
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const name = (request.url || '').split('?')[0].replace(/^\//, '');
        const file = rootFiles().get(name);
        if (!file) return next();
        response.setHeader('Content-Type', file.type);
        response.end(file.source);
      });
    },
  };
}
