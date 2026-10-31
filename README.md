# Settlement Map

Static atlas of who operates, owns, holds and settles in money movement. A Fintech North project.

**Source** is `site/`. Edit pages there, or edit the participant function model in `tools/apply_model.py`.

**Build** with `python3 -I tools/build.py`. It applies the function model and the verified copy fixes, regenerates `layers/index.html` from the homepage, adds skip links, then repacks `settlement-map-site.tar.gz` and syncs `v9-overrides/`, so the existing Render build (unpack the tarball, overlay the overrides) publishes exactly `site/`.

**Check** with `python3 -I tools/check.py` before every push. It fails on the false claims found in the V9 review, on participant pages showing functions the participant does not perform, on broken internal links, on content hidden at mobile widths, on failing text contrast, and on a stale tarball.

Coverage is partial. Written so far for Canada, the US, the UK, Brazil, Mexico, India and Ecuador. The euro area (T2), CLS and CIPS are not written yet. Not cleared for broad factual publication.
