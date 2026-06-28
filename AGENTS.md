# arrowbox.co: best diagram editor in the world

## Rules

- when working with `.tsx` files $solid-js must be applied
- never start a dev server, it's already running
  [vite.config.ts](vite.config.ts)
- never run `task check` without sandbox escalation (because chrome & webkit)
- never run `bun oxfmt`, `task check` already does it

## Testing

- [playwright.config.ts](playwright.config.ts) ios safari specific tests:
  `*.ios.pw.ts`
