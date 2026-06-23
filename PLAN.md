# DrawThis Plan

This document is a high-level project plan for DrawThis.

It is intentionally an outline, not a strict specification. Future agents should use this as context for the product idea, user motivation, major milestones, and completion direction. They should still make their own engineering and product decisions based on the current codebase, current constraints, and better information discovered during implementation.

If a better choice is clearly available, prefer the better choice over anything written here. Update this document only when the project direction, milestone structure, or major assumptions change. Do not churn this file for routine implementation details.

## Core Idea

DrawThis is a practice tool for learning to draw through high-velocity visual replication.

The app should bring drawing references to the user automatically. The user should not need to search, curate, organize, or decide what to draw. They should be able to open the app and immediately start drawing from varied images.

The intended user wants to improve visual perception and drawing skill by repeatedly copying what they see. The app exists to remove friction from that repetition.

## Product Motivation

The motivating problem:

- The user wants to learn drawing primarily to perceive the visible world better.
- The user learns best through many fast repetitions.
- Searching for references creates enough friction that practice stops.
- The app should bring images to the user rather than making the user seek them out.
- Variety is essential. The feed should not collapse into one narrow style of image.

The product should optimize for:

- Immediate practice.
- High repetition rate.
- Broad visual variety.
- Low decision fatigue.
- Reliable access to reference images.
- Simple, focused interaction.
- Long-term usefulness as a personal practice tool.

## Product Shape

At its center, DrawThis is a reference-image practice loop:

1. The user opens the app.
2. A drawing reference appears.
3. The user draws it.
4. The user advances to the next reference.
5. The loop repeats with minimal friction.

The app may eventually support timers, sessions, saved references, history, filters, and adaptive selection, but the core loop should remain simple.

## Variety Goal

"Random images" should not mean naive randomness. The feed should intentionally cover a wide range of visual subjects and practice demands.

Important reference categories include:

- Everyday scenes.
- Rooms and interiors.
- Streets and city environments.
- Landscapes and nature.
- Objects and still-life subjects.
- Human figures.
- Faces and expressions.
- Hands and body parts.
- Animals and plants.
- Vehicles and machines.
- Architecture and perspective.
- Food, tools, clothing, and household items.
- Visual fundamentals such as shape, value, gesture, texture, light, and material.

The app should also include mundane images: desks, kitchens, sidewalks, shops, transit, waiting rooms, cluttered rooms, parking lots, and other ordinary scenes. These are important because the goal is better perception of normal lived reality, not only polished stock photography.

## Guiding Principles

- Reduce friction before adding features.
- Prefer one excellent practice loop over many mediocre modes.
- Prefer variety and surprise over user micromanagement.
- Keep the interface calm and fast.
- Make the next image easy to get.
- Respect image licensing and provider terms.
- Keep provider-specific logic isolated.
- Avoid exposing private API keys to the browser.
- Prefer simple persistence until stronger persistence is clearly needed.
- Treat this plan as guidance, not authority.

## Early UI Direction

Early DrawThis UI should be intentionally plain, utilitarian, and tool-like. The interface should prioritize reference visibility, immediate practice, clear controls, attribution, responsiveness, and accessibility over decorative visual design.

Avoid fancy styling, animation, gradients, complex cards, or ornamental layout unless they directly improve practice speed, clarity, or usability.

## Non-Goals For Early Development

Avoid starting with:

- A drawing canvas.
- Social sharing.
- User accounts.
- AI critique.
- AI-generated references.
- Complex recommendation systems.
- Heavy analytics.
- Mobile app wrappers.
- Large database schemas.
- Premature personalization.

These ideas may become useful later, but they should not distract from proving the reference-feed practice loop.

## Current Technical Context

The initial codebase is a SvelteKit project using TypeScript, Svelte 5, Tailwind CSS, Vitest, Playwright, and Cloudflare deployment tooling.

This context should guide implementation choices, but it is not a permanent constraint. If future agents discover a clearly better architecture, they should choose it and update this plan only if the project direction changes meaningfully.

Server-side code should remain compatible with the Cloudflare Workers runtime unless the deployment direction changes. Avoid Node-only SDKs, filesystem-dependent caching, or runtime APIs that are unavailable in Workers unless the deployment target is intentionally changed.

## Architectural Direction

A likely architecture is:

- A SvelteKit frontend for the practice interface.
- Server-side image provider adapters.
- A normalized internal image/reference model.
- A variety-selection layer that chooses categories, queries, and providers.
- Lightweight caching to reduce API calls and improve speed.
- Local browser persistence for early user history and preferences.
- Cloudflare storage only when it becomes clearly useful.

Provider integrations should be replaceable. The product should not depend on one image API being perfect.

## Image Source Strategy

The project should use legitimate image sources with clear terms.

Possible providers include:

- Pexels.
- Unsplash.
- Pixabay.
- Openverse.
- Wikimedia Commons.
- Curated public-domain or openly licensed datasets.

Provider choice should consider:

- Licensing.
- Attribution requirements.
- API limits.
- Image quality.
- Subject variety.
- Hotlinking rules.
- Caching rules.
- Download tracking or usage-reporting requirements.
- Ease of integration.
- Long-term reliability.

Agents should not use scraped Google Images, Pinterest, or other sources with unclear rights.

## Milestone 1: Project Foundation

Goal: turn the blank starter app into a clean foundation for DrawThis.

Expected outcomes:

- Remove irrelevant starter/demo content.
- Establish the basic app shell.
- Replace starter README content with project-specific DrawThis context and correct local commands.
- Ensure linting, formatting, type checking, and tests are runnable.
- Keep the architecture simple enough for future agents to understand.

This milestone is complete when the repo clearly looks like DrawThis rather than a generated starter app.

## Milestone 2: First Practice Loop

Goal: make the core experience work without depending on external APIs.

Expected outcomes:

- A user can open the app and see a reference image.
- A user can advance to another image.
- The interface is usable on desktop and mobile.
- Core navigation and advance controls have baseline accessibility, including semantic controls, visible focus states, keyboard access, and adequate contrast.
- Keyboard navigation is considered where useful.
- A small local/mock reference set may be used.
- The app communicates the product direction visually and behaviorally.

This milestone is complete when the app demonstrates the intended practice loop, even if the image source is temporary.

## Milestone 3: Reference Model And Variety Taxonomy

Goal: define the internal concepts needed to produce useful variety.

Expected outcomes:

- A normalized reference/image type exists.
- Categories and subject buckets are represented clearly.
- Selection logic can choose among categories and queries.
- The feed avoids obvious repetition.
- The taxonomy is easy to extend.

This milestone is complete when image selection is driven by an intentional variety model rather than hardcoded one-off choices.

## Milestone 4: External Image Provider Integration

Goal: fetch real references from at least one legitimate provider.

Expected outcomes:

- Provider API credentials stay server-side.
- Provider responses are normalized into the internal reference model.
- Attribution, source links, and provider-required display, tracking, hotlinking, caching, or usage behavior are implemented wherever required by the chosen provider.
- Provider failures are handled gracefully.
- The UI can continue to function when an upstream API is slow or unavailable.

This milestone is complete when at least one provider works with required attribution, terms compliance, and basic failure handling. Dependable caching, rate-limit handling, and broader resilience belong to Milestone 5.

## Milestone 5: Caching And Reliability

Goal: make image fetching fast, respectful of provider limits, and resilient.

Expected outcomes:

- Provider responses are cached where appropriate.
- Cache behavior respects provider terms.
- The user usually gets the next image quickly.
- The app has reasonable fallback behavior.
- Rate limits and provider errors do not break the practice loop unnecessarily.

This milestone is complete when external image loading feels dependable enough for regular practice.

## Milestone 6: Session Features

Goal: support focused drawing practice sessions.

Possible features:

- Timed prompts.
- Session length selection.
- Auto-advance.
- Pause/resume.
- Quick skip.
- Saved references.
- Recent history.
- Simple post-session summary.

This milestone is complete when a user can sit down for a defined practice block and complete many reps without managing the app manually.

## Milestone 7: User Preference And Feedback Loop

Goal: let the app adapt lightly without becoming complex.

Possible signals:

- Save.
- Skip.
- Too easy.
- Too hard.
- Show more like this.
- Show less like this.
- Exclude a broad category temporarily.

Expected outcomes:

- Preferences can influence future selection.
- Early feedback can be session-only or local-storage-backed.
- Durable feedback persistence is deferred to Milestone 8 unless it is clearly needed sooner.
- The app preserves broad variety.
- Personalization does not trap the user in a narrow feed.

This milestone is complete when basic feedback improves the feed without requiring the user to curate it.

## Milestone 8: Persistence

Goal: persist useful user state when local-only storage becomes insufficient.

Possible persisted data:

- Seen references.
- Saved references.
- Session history.
- Preferences.
- Lightweight practice stats.

Start with local storage if it is enough. Add a database only when persistence needs exceed what local browser storage can reasonably provide.

This milestone is complete when the app preserves the right amount of continuity across sessions without adding unnecessary backend weight.

## Milestone 9: Quality, Accessibility, And Performance

Goal: make the app pleasant and robust.

Expected outcomes:

- Responsive layout works well on desktop and mobile.
- Images load efficiently.
- Controls are keyboard accessible.
- Color, contrast, focus states, and semantics are handled well.
- Error states are understandable.
- Tests cover critical logic and core user flows.
- The production build is healthy.

This milestone is complete when the app feels reliable enough to use repeatedly, not just demo once.

## Milestone 10: Deployment And Operations

Goal: make the app easy to run and maintain in production.

Expected outcomes:

- Cloudflare deployment works.
- Required environment variables are documented.
- Provider limits and operational assumptions are documented.
- Basic error logging or diagnostics exist if useful.
- The app can be redeployed by a future agent without rediscovering everything.

This milestone is complete when the project can be maintained as a real deployed app.

## Later Possibilities

Only consider these after the core practice loop is strong:

- Curated image packs.
- Public-domain dataset ingestion.
- Spaced repetition for saved references.
- Daily practice goals.
- Gesture drawing mode.
- Value-study mode.
- Cropping, grayscale, blur, upside-down, or silhouette transforms.
- User-uploaded references.
- Account sync.
- AI-assisted image tagging.
- AI critique of user drawings.
- Mobile app packaging.

These are optional directions, not required milestones.

## Completion Definition

The project is meaningfully complete when:

- A user can open the app and immediately draw from a useful reference.
- The feed provides broad, sustained visual variety.
- The app minimizes obvious repetition within a session and recent local history, within the limits of available providers and storage.
- The practice loop is fast and low-friction.
- Image sourcing is legal, attributed where required, and reliable.
- The app can support repeated real practice sessions.
- The implementation is maintainable by future agents.

The product does not need to become large to be successful. A small, fast, reliable practice machine is the target.

## Guidance For Future Agents

Use this document to understand intent, not to avoid judgment.

When working on a milestone:

- Inspect the current codebase before making decisions.
- Prefer the best current design over preserving early assumptions.
- Keep implementation choices local unless they change the product direction.
- Update this plan only for meaningful directional changes.
- Preserve the core idea: the app brings varied things to draw to the user.
- Avoid adding friction in the name of adding features.
- Leave the project easier for the next agent to understand.
