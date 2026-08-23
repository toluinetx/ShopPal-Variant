package internal

import (
	"embed"
	_ "embed"
	"io/fs"
	"net/http"
)

//go:embed openapi.yaml
var openAPISpec string

//go:embed swagger-ui/swagger-ui-bundle.js swagger-ui/swagger-ui.css
var swaggerUIAssetsRaw embed.FS

// swaggerUIAssets is rooted at swagger-ui/ so file paths in the FS match
// the URLs we serve them at (no "swagger-ui/" prefix leaking through).
var swaggerUIAssets, _ = fs.Sub(swaggerUIAssetsRaw, "swagger-ui")

// Assets are vendored (not CDN-loaded) so /docs works with no outbound
// network access — important for air-gapped or egress-locked clusters.
const swaggerUIHTML = `<!doctype html>
<html>
  <head>
    <title>ShopPal Notifications API Docs</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="/docs/assets/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/docs/assets/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/openapi.yaml',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis],
      });
    </script>
  </body>
</html>`

func (h *Handler) openAPISpecHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/yaml; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(openAPISpec))
}

func (h *Handler) docsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(swaggerUIHTML))
}

func docsAssetsHandler() http.Handler {
	return http.StripPrefix("/docs/assets/", http.FileServer(http.FS(swaggerUIAssets)))
}
