import fs from 'fs';
import path from 'path';
import express from 'express';
import type { Express } from 'express';
// swagger-ui-dist ships its own type-less JS entrypoint that exposes the
// on-disk path to its static assets (css/js bundle).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const swaggerUiAssetPath: string = require('swagger-ui-dist').absolutePath();

const OPENAPI_PATH = path.join(process.cwd(), 'openapi.yaml');

// Assets are served from the vendored swagger-ui-dist package (not a CDN)
// so /docs works with no outbound network access.
function swaggerUiHtml(specUrl: string): string {
	return `<!doctype html>
<html>
  <head>
    <title>ShopPal API Docs</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="/docs/assets/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/docs/assets/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '${specUrl}',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis],
      });
    </script>
  </body>
</html>`;
}

/**
 * Mounts /openapi.yaml (raw spec), /docs (Swagger UI) and /docs/assets
 * (the Swagger UI JS/CSS bundle) on the given app. The spec is read from
 * disk on every request so edits during local dev show up without a
 * restart; the file is tiny so this is not a concern.
 */
export function mountApiDocs(app: Express) {
	app.get('/openapi.yaml', (_req, res) => {
		res.type('text/yaml').send(fs.readFileSync(OPENAPI_PATH, 'utf-8'));
	});

	app.get('/docs', (_req, res) => {
		res.type('html').send(swaggerUiHtml('/openapi.yaml'));
	});

	app.use('/docs/assets', express.static(swaggerUiAssetPath));
}
