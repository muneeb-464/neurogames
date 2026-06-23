# NeuroFocus Trainer — Design Document

## 1. Product Vision

Cognitive training web app. Users play focus/reaction/math games, track progress over time, and improve specific mental skills. Target: daily 5–15 min sessions with measurable streak + accuracy trends.

---

## 2. Current State (Baseline)

| Area | Status |
|------|--------|
| Framework | Next.js 16 App Router, React 19, TypeScript strict |
| Styling | CSS Modules + design tokens in `globals.css` |
| Games live | ColorPattern, NumberSequence, QuickMath, MathTraining (voice), BoxingArena |
| Games broken | BoxingComboArena (missing video assets + filename mismatch) |
| Games stubbed | ReactionGrid, VisualTracking, MemorySpan, CognitiveSwitch |
| Pages stubbed | `/analytics`, `/profile`, `/admin` |
| Data layer | None — all stats hardcoded |
| Auth | None — user hardcoded as "edu" |

---

## 3. Design Language

### Color Tokens (`globals.css`)
```
--bg-deep:      #0a0a0f          dark base
--bg-panel:     rgba(22,22,32,0.72)
--bg-card:      gradient 145deg dark glass
--border-glass: rgba(255,255,255,0.08)
--border-glow:  rgba(168,144,254,0.35)
--text:         #f4f2ff
--text-muted:   #8b879c
--accent:       #a890fe          primary purple
--accent-teal:  #5ee7df
--accent-pink:  #ff7eb3
--accent-gold:  #f5d978
--accent-orange:#ff9b6b
--accent-mint:  #7cf5c4
```

### Typography
- Body/UI: Geist Sans (`--font-sans`)
- Display/headings: Playfair Display (`--font-serif`)
- Mono: Geist Mono (`--font-mono`)

### Radius + Shadow
```
--radius-lg:   22px
--radius-md:   16px
--radius-pill: 999px
--shadow-glow: 0 0 40px rgba(168,144,254,0.12)
```

### Theme
Dark glass-morphism. Sidebar on desktop, bottom nav on mobile. No light mode planned.

---

## 4. Scalable Architecture

### 4.1 Directory Structure (Target)

```
src/
├── app/
│   ├── layout.tsx                  # root — fonts, metadata
│   ├── globals.css                 # design tokens only
│   ├── (auth)/                     # future: login, signup
│   │   └── login/page.tsx
│   └── (main)/                     # authenticated shell
│       ├── layout.tsx              # AppShell wrapper
│       ├── page.tsx                # dashboard
│       ├── train/
│       │   ├── page.tsx            # game catalog
│       │   └── [slug]/page.tsx     # dynamic game route
│       ├── analytics/page.tsx
│       ├── profile/page.tsx
│       └── admin/page.tsx
│
├── components/
│   ├── shell/
│   │   ├── AppShell.tsx
│   │   └── AppShell.module.css
│   ├── ui/                         # reusable primitives
│   │   ├── Button/
│   │   ├── Card/
│   │   ├── StatCard/
│   │   ├── Badge/
│   │   └── ErrorBoundary/
│   └── games/                      # game components (self-contained)
│       ├── _shared/
│       │   ├── useGameTimer.ts
│       │   ├── useGameState.ts     # generic phase machine
│       │   └── GameShell.tsx       # shared game chrome (score, quit btn)
│       ├── ColorPatternGame/
│       │   ├── index.tsx
│       │   └── ColorPatternGame.module.css
│       ├── NumberSequenceGame/
│       ├── QuickMathGame/
│       ├── MathTrainingGame/
│       ├── BoxingArenaGame/
│       └── BoxingComboArena/
│
├── lib/
│   ├── games/
│   │   └── registry.ts             # game catalog config (slug → component)
│   ├── db/                         # future: data access
│   │   ├── sessions.ts
│   │   └── user.ts
│   └── hooks/
│       └── useArenaCrowdSound.ts
│
└── types/
    ├── game.ts                     # GameResult, GameConfig, Phase
    └── user.ts                     # UserProfile, SessionRecord
```

### 4.2 Game Registry Pattern

All game metadata lives in one place. Adding a game = add entry here + drop component.

```ts
// src/lib/games/registry.ts
export interface GameEntry {
  slug: string;
  title: string;
  description: string;
  accent: string;          // CSS variable string
  category: GameCategory;
  component: React.ComponentType<GameProps>;
  status: "live" | "stub" | "broken";
}

export type GameCategory = "focus" | "memory" | "math" | "reaction" | "coordination";

export const GAMES: GameEntry[] = [
  { slug: "color-pattern", title: "Color Pattern Moving", ... },
  { slug: "organization",  title: "Number Sequence", ... },
  // ...
];
```

`/train/page.tsx` reads from registry — no hardcoded game arrays.  
`/train/[slug]/page.tsx` dynamic route resolves component from registry.

### 4.3 Shared Game Interface

Every game component receives + emits the same contract:

```ts
// src/types/game.ts
export interface GameProps {
  onComplete: (result: GameResult) => void;
  onQuit: () => void;
}

export interface GameResult {
  gameSlug: string;
  score: number;
  accuracy: number;        // 0–1
  durationMs: number;
  difficulty: number;
  completedAt: Date;
  metadata?: Record<string, unknown>;  // game-specific extras
}
```

`GameShell` wraps each game, handles the quit button, and calls `onComplete` / `onQuit` uniformly.

### 4.4 State Management

No external state library needed at current scale. Three tiers:

| Tier | Mechanism | Scope |
|------|-----------|-------|
| Game-local | `useState` + `useRef` (existing pattern) | component lifetime |
| Session cache | `React.createContext` + `useReducer` | dashboard stats, recent sessions |
| Persistent | `localStorage` (phase 1) → API/DB (phase 2) | cross-session history |

Phase 1: save `GameResult[]` to `localStorage` under key `nf:sessions`.  
Phase 2: POST to `/api/sessions` → database when auth is added.

### 4.5 Data Flow (Phase 1 — No Backend)

```
Game completes
  → onComplete(result)
    → SessionContext.dispatch(ADD_SESSION)
      → localStorage.setItem(...)
        → Dashboard reads context → shows real stats
```

### 4.6 Error Boundaries

Wrap every game route in an `ErrorBoundary` so crashes stay contained:

```tsx
// src/app/(main)/train/[slug]/page.tsx
<ErrorBoundary fallback={<GameErrorFallback />}>
  <DynamicGame />
</ErrorBoundary>
```

Global boundary in `(main)/layout.tsx` catches shell-level errors.

---

## 5. Page Designs

### 5.1 Dashboard (`/`)
- Hero: greeting + CTA
- Stats row: 4 cards — total time, streak, best combo, accuracy (dynamic from SessionContext)
- Activity chart: real sparkline from last 7 days session data
- Recent sessions list: last 5 from SessionContext

### 5.2 Train (`/train`)
- Game catalog grid, data from GAMES registry
- Live games: clickable card → `/train/[slug]`
- Stub games: disabled card with "Coming soon" badge
- Category filter pills (focus / memory / math / reaction)

### 5.3 Analytics (`/analytics`)
- Per-game accuracy trend (line chart, 30 days)
- Heatmap: sessions per day (GitHub-style)
- Best scores table per game
- Export CSV button

### 5.4 Profile (`/profile`)
- Avatar, display name (editable)
- Streak history
- Total sessions, total time
- Notification preferences

### 5.5 Admin (`/admin`)
- Game enable/disable toggles (writes to registry or config)
- Session log viewer
- User list (future, multi-user)

---

## 6. Known Flaws → Fix Plan

| Flaw | Fix |
|------|-----|
| BoxingComboArena filenames wrong | Rename clips OR update constants to match README |
| No error boundaries | Add `ErrorBoundary` in `(main)/layout.tsx` + game route |
| All stats hardcoded | Implement SessionContext + localStorage persistence |
| Hardcoded user "edu" | Add UserContext; wire to profile page |
| Ref/state dual sync fragility | Extract `useGamePhase()` hook with single source of truth |
| No game registry | Create `src/lib/games/registry.ts`; refactor train page |
| Stub pages empty | Implement Analytics + Profile with real SessionContext data |
| No loading timeout on video | Add `AbortController` + 10s timeout on initial video load |
| Empty catch blocks | Add `console.error` at minimum; surface to Sentry later |
| Missing aria-labels | Audit all icon-only buttons; add labels |

---

## 7. Scalability Checkpoints

### When to add a backend
- Multiple users need isolated data
- Sessions must survive browser clear
- Leaderboards or social features

Recommended: Next.js Route Handlers (`/api/*`) + SQLite (single-server) or Postgres (cloud).

### When to add auth
- Any user-specific persistent data
- Admin access control

Recommended: NextAuth.js (supports credentials + OAuth, integrates with Next.js App Router).

### When to add state library
- 3+ contexts sharing overlapping data
- Frequent cross-route state sync bugs

Recommended: Zustand (minimal, no provider boilerplate).

---

## 8. CSS Conventions

- Design tokens in `globals.css` only — no tokens duplicated in module files
- Module files scope component layout/variants only
- Responsive: sidebar visible `≥ 768px`, mobile nav `< 768px`
- New components: CSS Module per component, named `ComponentName.module.css`
- No inline styles except token references (`style={{ color: g.accent }}` is acceptable)

---

## 9. Game Development Checklist

Adding a new game:

- [ ] Create `src/components/games/MyGame/index.tsx` accepting `GameProps`
- [ ] Add entry to `src/lib/games/registry.ts`
- [ ] Call `onComplete(result)` with accurate `score`, `accuracy`, `durationMs`
- [ ] Call `onQuit()` on user-initiated exit
- [ ] Cleanup all timers/intervals/observers in `useEffect` return
- [ ] Handle unmount mid-game (guard with `mounted` ref)
- [ ] Test at mobile viewport (360px wide minimum)
