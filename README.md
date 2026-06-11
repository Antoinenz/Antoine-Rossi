<div align="center">

<img src="icon.svg" alt="A" width="72" />

# Antoine Rossi
Website for [rossi.nz](https://rossi.nz)
</div>

## Development

The source lives in [`site/`](site/) (Vite + React). The production build is committed at the repo root (`index.html`, `assets/`, `icon.svg`, `og.png`) because the host serves the repo root as-is.

```sh
npm install     # once
npm run dev     # local dev server with hot reload
npm run build   # build into the repo root — run this before committing site changes
```
