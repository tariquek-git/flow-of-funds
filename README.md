# Who Holds the Money

An open Fintech North project that maps how money moves in nine markets. It runs from the app a customer uses down to the central bank, and shows who holds the money at each step.

## How it is built

- `data/source.json` holds all the data: markets, rails, players, layers and sources.
- `build.py` turns the data into a static site in `dist/`. It is plain Python with no dependencies.
- `assets/site.css` holds the design tokens (colour, type, spacing, motion) and the components. `assets/site.js` adds search, the market switcher, compare and the motion.
- `research/` holds the research and review notes the site is built from. That includes China, Korea, the Philippines, Kenya and Japan, which are not on the site yet.

## Run it locally

```
python3 build.py
cd dist && python3 -m http.server 8000
```

## Deploy

Vercel builds it with `python3 build.py` and serves `dist/`. The settings are in `vercel.json`.

## Corrections

Open a pull request against `data/source.json` with a primary source, or email tarique@fintechnorth.ca.
