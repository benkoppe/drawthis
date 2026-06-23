# DrawThis

DrawThis is a fast drawing-reference practice tool. It brings a reference image to the user immediately so they can practice visual replication without searching, curating, or deciding what to draw next.

The current app uses a small local mock reference set. External image provider integration, attribution rules, caching, and stronger variety selection belong to later milestones.

## Development

Development commands assume the Nix dev shell from this repository. If `direnv` is not active, enter it manually:

```sh
nix develop
```

Install dependencies:

```sh
pnpm install
```

Start the development server:

```sh
pnpm dev
```

Run type and Svelte checks:

```sh
pnpm check
```

Run linting and formatting checks:

```sh
pnpm lint
```

Run unit tests once:

```sh
pnpm test:unit -- --run
```

Run end-to-end tests:

```sh
pnpm test:e2e
```

Playwright uses the Nix-provided browser binaries from the dev shell. Do not run `playwright install` on Nix; those downloaded generic Linux binaries will not run reliably here.

Build for production:

```sh
pnpm build
```

Preview the Cloudflare worker build:

```sh
pnpm preview
```

## Product Direction

The early interface should stay plain, utilitarian, and focused on the practice loop: see a reference, draw it, advance to the next reference. Decorative UI work is intentionally deferred unless it directly improves clarity, accessibility, or practice speed.
