# Settlement Map — Render staging branch

This isolated branch contains the V8 Settlement Map static atlas build. It does **not** alter the Flow of Funds `main` branch or any production site.

Build: `mkdir -p public && tar -xzf settlement-map-site.tar.gz -C public`
Publish: `public`

The archive includes 116 HTML pages and research/QA documentation; some coverage remains incomplete and should not be described as a fully verified global atlas. Source-of-truth working package is the V8 staging-ready project.
