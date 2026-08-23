import fs from 'fs';
import path from 'path';
import type { Express } from 'express';

const OPENAPI_PATH = path.join(process.cwd(), 'openapi.yaml');

function swaggerUiHtml(specUrl: string): string {
	return `<!doctype html>
<html>
  <head>
    <title>ShopPal API Docs</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
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
 * Mounts /openapi.yaml (raw spec) and /docs (Swagger UI) on the given app.
 * The spec is read from disk on every request so edits during local dev
 * show up without a restart; the file is tiny so this is not a concern.
 */
export function mountApiDocs(app: Express) {
	app.get('/openapi.yaml', (_req, res) => {
		res.type('text/yaml').send(fs.readFileSync(OPENAPI_PATH, 'utf-8'));
	});

	app.get('/docs', (_req, res) => {
		res.type('html').send(swaggerUiHtml('/openapi.yaml'));
	});
}
