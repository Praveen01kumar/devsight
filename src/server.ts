import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import { CATEGORIES, TOOLS } from './app/constants/constant';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Robots.txt handling. Serves crawler policy.
 */
app.get('/robots.txt', (req, res) => {
  const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const origin = `${protocol}://${req.headers.host}`;
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Sitemap: ${origin}/sitemap.xml
`);
});

/**
 * Sitemap.xml handling. Dynamically outputs all tool pages.
 */
app.get('/sitemap.xml', (req, res) => {
  const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const origin = `${protocol}://${req.headers.host}`;
  
  const staticUrls = ['', 'about', 'contact', 'privacy-policy', 'terms', 'faq'];
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Add static pages
  staticUrls.forEach((route) => {
    xml += `  <url>\n`;
    xml += `    <loc>${origin}/${route}</loc>\n`;
    xml += `    <changefreq>${route === '' ? 'daily' : 'weekly'}</changefreq>\n`;
    xml += `    <priority>${route === '' ? '1.0' : '0.6'}</priority>\n`;
    xml += `  </url>\n`;
  });

  // Add category routes
  CATEGORIES.forEach((cat) => {
    xml += `  <url>\n`;
    xml += `    <loc>${origin}/category/${cat.slug}</loc>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  });

  // Add tools routes
  TOOLS.forEach((tool) => {
    xml += `  <url>\n`;
    xml += `    <loc>${origin}/tools/${tool.slug}</loc>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.9</priority>\n`;
    xml += `  </url>\n`;
  });

  xml += `</urlset>`;

  res.type('application/xml');
  res.send(xml);
});


/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
