# DrawThis

DrawThis is a fast drawing-reference practice tool. It brings a reference image to the user immediately so they can practice visual replication without searching, curating, or deciding what to draw next.

The app always includes a small local fallback reference set. It can also use Openverse as a server-side external image provider when enabled with environment variables.

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

### External image provider setup

Openverse is disabled by default so local development and tests never spend public API quota accidentally. To try real external references locally, enable it server-side:

```sh
DRAWTHIS_OPENVERSE_ENABLED=true pnpm dev
```

Optional override for tests against a local/mock Openverse-compatible endpoint:

```sh
DRAWTHIS_OPENVERSE_ENABLED=true DRAWTHIS_OPENVERSE_API_BASE_URL=http://localhost:8788/v1 pnpm dev
```

Openverse anonymous API limits are low; keep local fallback enabled and avoid committing secrets or provider credentials to the browser.

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
