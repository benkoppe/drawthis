# DrawThis

DrawThis is a fast drawing-reference practice tool. It brings a reference image to the user immediately so they can practice visual replication without searching, curating, or deciding what to draw next.

Reference providers are configured server-side through private environment variables. Pexels is the preferred external provider when enabled, Openverse can be enabled as an optional fallback, and local references are a dev/mock provider that should be disabled for production if you do not want users to see them.

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

### Reference provider setup

Create a local environment file:

```sh
cp .env.example .env
```

Every reference provider is explicitly toggleable through private server env vars. When multiple providers are enabled, DrawThis tries them in this order: Pexels, Openverse, then local.

Pexels-only production-style setup:

```sh
DRAWTHIS_PEXELS_ENABLED=true
DRAWTHIS_PEXELS_API_KEY=your-pexels-api-key
DRAWTHIS_OPENVERSE_ENABLED=false
DRAWTHIS_LOCAL_REFERENCES_ENABLED=false
```

Local development without API keys:

```sh
DRAWTHIS_LOCAL_REFERENCES_ENABLED=true
```

Optional Pexels override for tests against a local/mock Pexels-compatible endpoint:

```sh
DRAWTHIS_PEXELS_ENABLED=true DRAWTHIS_PEXELS_API_KEY=test DRAWTHIS_PEXELS_API_BASE_URL=http://localhost:8788/v1 pnpm dev
```

Optional Openverse fallback:

```sh
DRAWTHIS_OPENVERSE_ENABLED=true pnpm dev
```

Optional Openverse override for tests against a local/mock Openverse-compatible endpoint:

```sh
DRAWTHIS_OPENVERSE_ENABLED=true DRAWTHIS_OPENVERSE_API_BASE_URL=http://localhost:8788/v1 pnpm dev
```

At least one provider must be enabled. Local references are mock/dev assets, not a production-quality fallback. Keep provider credentials server-side and never commit secrets or expose them to the browser.

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
