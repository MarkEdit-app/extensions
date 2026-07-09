# MarkEdit Extension Registry

A curated index of extensions for [MarkEdit](https://github.com/MarkEdit-app/MarkEdit).

## What's here

- [entries/](/entries/)\<id\>.json: one entry per extension (the source of truth).
- [index.json](/index.json): the generated feed the app reads. Do not edit by hand.
- [site/](/site/): the generated gallery, published to [GitHub Pages](https://markedit-app.github.io/extensions/). Do not edit by hand.
- [schemas/](/schemas/): JSON Schemas for `entries` and `index.json`.

In most cases, adding or updating an entry only requires changes under `entries/`.

## Entry format

```json
{
  "$schema": "https://github.com/MarkEdit-app/extensions/raw/refs/heads/main/schemas/extension.schema.json",
  "id": "markedit-preview",
  "name": "MarkEdit Preview",
  "description": "A live preview pane for the current document.",
  "author": "MarkEdit-app",
  "homepage": "https://github.com/MarkEdit-app/MarkEdit-preview",
  "versions": [
    {
      "version": "1.8.1",
      "url": "https://raw.githubusercontent.com/MarkEdit-app/MarkEdit-preview/v1.8.1/dist/markedit-preview.js",
      "sha256": "1532295f78826ed78e161ffdc0c7fdcf307bf0ac4664fbf7eb50dc4c741be0c8"
    }
  ]
}
```

- `id` is kebab-case and must equal the filename.
- `versions` lists the newest build first; older entries are kept as compatibility fallbacks.
- `url` points at the `.js` file committed at a release tag (an immutable ref, served raw from GitHub).
- `sha256` pins the exact bytes at `url`.

## Contributing

1. Add or update [entries/](/entries/)\<id\>.json.
2. Compute the hash for each `url`:

   ```sh
   curl -fsSL -o file "<url>" && shasum -a 256 file
   ```

3. Open a pull request.

CI validates the schema, `id`/filename match, and that each `sha256` matches the fetched bytes. On merge, [index.json](/index.json) and the [site](/site/index.html) are regenerated.

### Building locally

```sh
yarn install --frozen-lockfile
yarn build # validate + fetch + hash-check, then write index.json and site/
CHECK_INTEGRITY=false yarn build # schema-only, no downloads
```

## Review criteria

We review provenance and integrity: the source is identifiable, the `url` is HTTPS and reachable, and `sha256` matches. We also do a basic quality pass: the extension should do what it claims and must not be malicious, but we don't judge taste or completeness.
