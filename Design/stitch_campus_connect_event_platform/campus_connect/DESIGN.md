---
name: Campus Connect
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464555'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#712ae2'
  on-secondary: '#ffffff'
  secondary-container: '#8a4cfc'
  on-secondary-container: '#fffbff'
  tertiary: '#7f0091'
  on-tertiary: '#ffffff'
  tertiary-container: '#a500bd'
  on-tertiary-container: '#ffcafe'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#eaddff'
  secondary-fixed-dim: '#d2bbff'
  on-secondary-fixed: '#25005a'
  on-secondary-fixed-variant: '#5a00c6'
  tertiary-fixed: '#ffd6fd'
  tertiary-fixed-dim: '#fbabff'
  on-tertiary-fixed: '#36003e'
  on-tertiary-fixed-variant: '#7c008e'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
  display-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 38px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system powers a modern collegiate event management SaaS platform, catering to university administrators, student club leaders, campus event coordinators, and students. The brand persona is dynamic, organized, institutional yet spirited, and exceptionally polished. 

The aesthetic synthesizes high-utility SaaS clarity with energetic, vibrant accents. It pairs an airy, clean white background architecture with radiant indigo-to-violet energetic spectrums, conveying reliability alongside active campus life. Visual depth is established through refined modern techniques: subtle glassmorphic navigation bars, frosted control surfaces, soft diffused ambient drop shadows, and high-legibility slate typography. The platform balances institutional governance with an inviting, social-first student experience.

## Colors

The palette establishes an energetic visual hierarchy while maintaining strict WCAG AAA / AA accessible contrast standards against clean white surfaces:

- **Primary (`#4F46E5` - Indigo 600):** Anchors primary actions, navigation indicators, active tabs, and primary button fills. Represents structure, institutional trust, and clarity.
- **Secondary (`#7C3AED` - Violet 600):** Highlights campus organizations, active event tags, featured interactive components, and secondary actions.
- **Tertiary (`#D946EF` - Fuchsia 500):** Serves as an expressive accent reserved for celebratory states, live status indicators, key highlight badges, and promotional event flags.
- **Neutral (`#0F172A` - Deep Slate 900):** Provides razor-sharp legibility across all typography and structural iconography. Light slate variations (`#334155` for body, `#64748B` for secondary labels, `#E2E8F0` for structural borders, and `#F8FAFC` for base canvas fills) compose the foundational layout.
- **Semantic Badges:**
  - Open / Active: Emerald 600 (`#059669`) with Emerald 50 (`#ECFDF5`) container fill.
  - Closed / Waitlist: Rose 600 (`#E11D48`) or Slate 500 (`#64748B`) with matching low-saturation tinted surfaces.

## Typography

The typography pairs **Plus Jakarta Sans** for headlines and high-level metric summaries with **Inter** for data tables, form fields, and body text. 

Plus Jakarta Sans brings a contemporary, friendly geometry with confident geometric roundness, ideal for campus engagement and event titles. Inter ensures high-density legibility in management dashboards, tabular analytics, schedule grids, and form inputs. Metric counters inside metric stat cards utilize `headline-lg` in Plus Jakarta Sans with tabular figures enabled (`font-variant-numeric: tabular-nums`) to prevent layout shifts during live participant count updates.

## Layout & Spacing

This design system uses a responsive fluid grid structure with strict bounds:
- **Desktop (1024px+):** 12-column grid, max-width 1440px centered, 24px (`1.5rem`) gutters, and 32px (`2rem`) outer canvas margins. Side navigation occupies a persistent 260px drawer or 72px collapsed rail.
- **Tablet (768px - 1023px):** 8-column grid with 20px gutters and 24px margins. Navigation shifts to a slim drawer or collapsible side rail.
- **Mobile (Below 768px):** 4-column fluid layout with 16px (`1rem`) gutters and 16px (`1rem`) outer canvas margins. Sticky bottom bar replaces top navigation tabs for core actions.

Component spacing obeys an 8-point base grid rhythm (`0.25rem`, `0.5rem`, `1rem`, `1.5rem`, `2rem`), ensuring consistency between dashboard widgets, metric clusters, and card listings.

## Elevation & Depth

Visual hierarchy leverages light-refracting glassmorphism and multi-layered, tinted drop shadows against pristine `#FFFFFF` and `#F8FAFC` base canvases:

- **Glassmorphic Navigation & Overlays:** Persistent top bars, filter panels, and floating navigation pills feature a semi-transparent surface (`rgba(255, 255, 255, 0.82)`) with a `12px` backdrop blur (`backdrop-filter: blur(12px)`) and a `1px` crisp border (`rgba(226, 232, 240, 0.8)`).
- **Surface Elevation (Cards & Stat Modules):** Rather than flat single shadows, cards employ dual-layer ambient shadows tinted with deep slate and faint indigo:
  - Default Tier: `0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(79, 70, 229, 0.03)` with a structural border (`1px solid #F1F5F9`).
  - Interactive Hover Tier: `0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 12px 24px -4px rgba(79, 70, 229, 0.08)` accompanied by a `transform: translateY(-2px)` transition.
  - Floating Overlays & Modals: `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)`.

## Shapes

The design system maintains a modern, balanced shape language centered on `roundedness: 2`:
- Base inputs, buttons, chips, and small alert banners utilize `0.5rem` (8px).
- Larger layout surfaces, including primary metric stat cards, schedule containers, and event listing cards, strictly implement `rounded-2xl` (`1rem` / 16px) to maintain a soft, approachable SaaS look.
- Modals, dropdown popovers, and segmented role switcher tracks employ `rounded-xl` (`0.75rem` / 12px).
- Status badges and avatar pills use fully rounded circular hulls (`9999px`).

## Components

### Buttons
- **Primary:** Filled `#4F46E5` background, white bold text, subtle inner top-border highlight (`inset 0 1px 0 rgba(255, 255, 255, 0.2)`), hover state `#4338CA`.
- **Secondary / Soft:** Indigo 50 (`#EEF2FF`) background, Indigo 600 text, hover state `#E0E7FF`.
- **Outline:** Crisp `1px solid #E2E8F0` border, deep slate text, white background, hover state `#F8FAFC`.

### Segmented Role Switch Controls
- Pill track container styled with `#F1F5F9` background, `4px` internal padding, and `12px` roundedness.
- Active state displays a pure white pill segment backed by a soft drop shadow (`0 2px 4px rgba(15, 23, 42, 0.06)`), transitioning smoothly between Student, Club Lead, and Admin perspectives.

### Metric Stat Cards
- `rounded-2xl` surface with white background and `1px solid #F1F5F9` frame.
- Contains an upper row with metric label (`label-md`, `#64748B`) and a soft-tinted circular icon container (`40x40px`, colored by semantic context).
- Prominent numerical value (`headline-lg`, `#0F172A`) paired with a micro trend pill (`+14% vs last term`, Emerald badge).

### Status Badges & Chips
- **Open Status:** `#ECFDF5` background, `#059669` text, including a leading `6px` solid emerald pulsing dot.
- **Closed / Waitlisted Status:** `#FFF1F2` background, `#E11D48` text for full/closed; `#F1F5F9` background with `#475569` text for archived events.
- **Category Chips:** Light violet (`#F5F3FF`) background with `#7C3AED` text, hoverable with `1px solid #DDD6FE`.

### Input Fields & Search Bars
- Standard height of `42px` on desktop.
- `1px solid #E2E8F0` resting border, pure white fill, and `#0F172A` text.
- Focus ring displays an indigo glow (`0 0 0 3px rgba(79, 70, 229, 0.15)`) with an active `#4F46E5` border line.

### Event Cards
- Outer shell featuring `rounded-2xl`, white background, dual ambient shadow, and an aspect-ratio-bound media header.
- Lower content block highlights date pill (condensed month/day vertical stack), bold event title, organizer club avatar badge, and rapid-RSVP action row.