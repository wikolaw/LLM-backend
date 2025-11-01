# LLM Backend - Nordic Minimalistic Styling Guide

**Version:** 1.0
**Last Updated:** 2025-10-29
**Reference Standard:** `/dashboard` (app/dashboard/page.tsx)

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Layout & Spacing](#layout--spacing)
5. [Component Patterns](#component-patterns)
6. [Dark Mode](#dark-mode)
7. [Accessibility](#accessibility)
8. [Code Examples](#code-examples)

---

## Design Philosophy

### Nordic Minimalistic Principles

The application follows a **Nordic minimalistic** design aesthetic characterized by:

- **Restrained Color Palette**: Muted, desaturated colors (no bright neons)
- **Generous Whitespace**: Clean, uncluttered layouts with breathing room
- **Functional Typography**: Clear hierarchy, readable sizes, proper spacing
- **Subtle Depth**: Light shadows (`shadow-sm`) instead of heavy drop shadows
- **Purposeful Elements**: Every UI element serves a clear function
- **Natural Dark Mode**: Thoughtful dark mode that feels native, not inverted

### Key Characteristics

✅ **Do:**
- Use the defined primary color system (#627d98 Nordic blue)
- Implement complete dark mode support on all colored elements
- Use consistent spacing from Tailwind's scale (4, 6, 8, etc.)
- Apply subtle shadows (`shadow-sm`) for depth
- Use muted status colors (success, warning, error)
- Keep borders thin and neutral (`border-gray-200 dark:border-gray-700`)

❌ **Don't:**
- Use hardcoded colors like `blue-600`, `red-500` outside the system
- Create high-contrast, vibrant elements without reason
- Use heavy shadows (`shadow-xl`) on standard cards
- Mix different color systems (stick to primary/status colors)
- Forget dark mode variants for any colored element
- Use plain white text on colored backgrounds without opacity control

---

## Color Palette

### Primary Color (Nordic Blue)

Our primary color is a **muted, desaturated blue** (#627d98) that evokes Nordic design sensibilities.

```typescript
// From tailwind.config.ts
primary: {
  50: '#f0f4f8',   // Very light (backgrounds)
  100: '#d9e2ec',  // Light (borders, hover states)
  200: '#bcccdc',
  300: '#9fb3c8',
  400: '#829ab1',
  500: '#627d98',  // Main brand color
  600: '#486581',  // Darker (buttons, active states)
  700: '#334e68',  // Even darker
  800: '#243b53',
  900: '#102a43',  // Darkest
}
```

**Usage:**
- **Buttons**: `bg-primary-600` (hover: `bg-primary-700`)
- **Links**: `text-primary-600 dark:text-primary-400`
- **Focus Rings**: `focus:ring-primary-500`
- **Progress Bars**: `bg-primary-600`
- **Badges/Pills**: `bg-primary-50 text-primary-700` (light), `bg-primary-950/30 text-primary-100` (dark)

### Status Colors

Muted, professional status colors for feedback.

```typescript
// Success (Green)
success: {
  500: '#10b981',
  600: '#059669',  // Primary success state
}

// Warning (Amber)
warning: {
  500: '#f59e0b',
  600: '#d97706',  // Primary warning state
}

// Error (Red)
error: {
  500: '#ef4444',
  600: '#dc2626',  // Primary error state
}
```

**Usage:**
- Success buttons: `bg-success-600 hover:bg-success-700`
- Warning banners: `bg-warning-50 border-warning-200 text-warning-900`
- Error messages: `text-error-600 dark:text-error-500`

### Neutral Grays

Carefully balanced grays optimized for both light and dark modes.

```typescript
gray: {
  50: '#f9fafb',    // Light backgrounds
  100: '#f3f4f6',
  200: '#e5e7eb',   // Light borders
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  600: '#4b5563',
  700: '#374151',   // Dark borders
  800: '#1f2937',   // Dark cards
  900: '#111827',   // Dark backgrounds
}
```

**Usage:**
- Light background: `bg-gray-50`
- Dark background: `bg-gray-900`
- Light cards: `bg-white`
- Dark cards: `bg-gray-800`
- Borders: `border-gray-200 dark:border-gray-700`
- Muted text: `text-gray-600 dark:text-gray-400`

---

## Typography

### Font Family

**Primary Font**: [Inter](https://fonts.google.com/specimen/Inter) (sans-serif)

```css
/* From tailwind.config.ts */
fontFamily: {
  sans: [
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
}
```

Inter provides excellent readability and a modern, professional appearance.

### Type Scale & Hierarchy

```typescript
// From tailwind.config.ts (with line-height and letter-spacing)
'xs':   ['0.75rem',  { lineHeight: '1.5', letterSpacing: '0.01em' }],  // 12px
'sm':   ['0.875rem', { lineHeight: '1.5', letterSpacing: '0.01em' }],  // 14px
'base': ['1rem',     { lineHeight: '1.6', letterSpacing: '0' }],       // 16px
'lg':   ['1.125rem', { lineHeight: '1.6', letterSpacing: '0' }],       // 18px
'xl':   ['1.25rem',  { lineHeight: '1.5', letterSpacing: '-0.01em' }], // 20px
'2xl':  ['1.5rem',   { lineHeight: '1.4', letterSpacing: '-0.02em' }], // 24px
'3xl':  ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.02em' }], // 30px
```

### Typography Hierarchy (Dashboard Standard)

```tsx
// Page Title (h1)
<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
  LLM Document Analysis v3.0
</h1>

// Section Title (h2)
<h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
  1. Upload Documents
</h2>

// Subsection Title (h3)
<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
  Batch Summary
</h3>

// Body Text
<p className="text-base text-gray-700 dark:text-gray-300">
  Regular paragraph text
</p>

// Small Text / Labels
<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
  Field Label
</label>

// Tiny Text / Captions
<p className="text-xs text-gray-600 dark:text-gray-400">
  Caption or helper text
</p>
```

### Font Weights

- `font-normal` (400): Body text
- `font-medium` (500): Labels, emphasized text
- `font-semibold` (600): Section headings
- `font-bold` (700): Page titles, important CTAs

---

## Layout & Spacing

### Container Standards

```tsx
// Page Container (Dashboard Standard)
<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
  {/* Sticky Header */}
  <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* Header content */}
    </div>
  </header>

  {/* Main Content */}
  <main className="max-w-7xl mx-auto px-4 py-8">
    {/* Page content */}
  </main>
</div>
```

**Key Layout Rules:**
- **Max Width**: `max-w-7xl` (1280px) for content containers
- **Horizontal Padding**: `px-4` (16px) on mobile, scales automatically
- **Vertical Padding**: `py-8` (32px) for main content, `py-4` (16px) for headers
- **Centering**: `mx-auto` for horizontal centering

### Spacing Scale

Use Tailwind's spacing scale consistently:

```
4  = 16px  (tight spacing, form fields)
6  = 24px  (section padding, card padding)
8  = 32px  (main content padding, large gaps)
12 = 48px  (major section separation)
```

**Common Patterns:**
- Section padding: `p-6`
- Card internal spacing: `space-y-4` or `space-y-6`
- Button padding: `px-6 py-2` (horizontal × vertical)
- Page margins: `px-4 py-8`

---

## Component Patterns

### Cards

**Standard Card (Light Background):**
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
    Card Title
  </h3>
  <p className="text-gray-600 dark:text-gray-400">
    Card content
  </p>
</div>
```

**Card with Border (Alternative):**
```tsx
<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
  {/* Content */}
</div>
```

**Interactive Card (Clickable):**
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer">
  {/* Content */}
</div>
```

### Buttons

**Primary Button:**
```tsx
<button className="px-6 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed">
  Primary Action
</button>
```

**Secondary Button:**
```tsx
<button className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
  Secondary Action
</button>
```

**Success Button (Dangerous Actions):**
```tsx
<button className="px-8 py-3 bg-success-600 dark:bg-success-500 text-white rounded-lg hover:bg-success-700 dark:hover:bg-success-600 transition-colors font-semibold">
  Start Processing
</button>
```

### Form Inputs

**Text Input:**
```tsx
<input
  type="text"
  className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
  placeholder="Enter text..."
/>
```

**Label + Input:**
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
    Field Label
  </label>
  <input
    type="text"
    className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
  />
</div>
```

### Info Banners

**Primary Banner (Informational):**
```tsx
<div className="bg-primary-50/50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
  <p className="text-sm font-medium text-primary-900 dark:text-primary-100">
    Information message
  </p>
  <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
    Additional details
  </p>
</div>
```

**Warning Banner:**
```tsx
<div className="bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800 rounded-lg p-4">
  <p className="text-sm font-semibold text-warning-900 dark:text-warning-100">
    Warning title
  </p>
  <p className="text-sm text-warning-700 dark:text-warning-300 mt-1">
    Warning message
  </p>
</div>
```

**Error Banner:**
```tsx
<div className="bg-error-50 dark:bg-error-950/30 border border-error-200 dark:border-error-800 rounded-lg p-4">
  <p className="text-sm text-error-900 dark:text-error-100">
    Error message
  </p>
</div>
```

### Progress Indicators

**Numbered Steps (Dashboard Style):**
```tsx
<div className="flex items-center">
  <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold bg-primary-600 dark:bg-primary-500 text-white">
    1
  </div>
  <span className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-100">
    Step Name
  </span>
</div>
```

**Progress Bar:**
```tsx
<div className="w-full bg-primary-200 dark:bg-primary-900 rounded-full h-4 overflow-hidden">
  <div
    className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-500 dark:to-primary-600 h-4 transition-all duration-500"
    style={{ width: '65%' }}
  >
    <span className="text-xs font-semibold text-white flex items-center justify-center h-full">
      65%
    </span>
  </div>
</div>
```

### Status Badges

**All Passed:**
```tsx
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 dark:bg-success-950/30 text-success-800 dark:text-success-100">
  All Passed
</span>
```

**Partial:**
```tsx
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 dark:bg-warning-950/30 text-warning-800 dark:text-warning-100">
  Partial
</span>
```

**Failed:**
```tsx
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-error-100 dark:bg-error-950/30 text-error-800 dark:text-error-100">
  Failed
</span>
```

### Links

**Primary Link:**
```tsx
<a
  href="/path"
  className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors"
>
  Link Text
</a>
```

**Back Link (with arrow):**
```tsx
<a
  href="/path"
  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
>
  ← Back to Home
</a>
```

---

## Dark Mode

### Implementation Strategy

Every colored element **MUST** have a dark mode variant. Use Tailwind's `dark:` prefix.

**Standard Pattern:**
```tsx
// Light mode = default, dark mode = dark: prefix
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
  {/* Content */}
</div>
```

### Common Dark Mode Mappings

| Light Mode | Dark Mode | Usage |
|------------|-----------|-------|
| `bg-white` | `dark:bg-gray-800` | Cards, modals |
| `bg-gray-50` | `dark:bg-gray-900` | Page backgrounds |
| `bg-gray-100` | `dark:bg-gray-800` | Secondary backgrounds |
| `text-gray-900` | `dark:text-gray-100` | Headings |
| `text-gray-700` | `dark:text-gray-300` | Body text |
| `text-gray-600` | `dark:text-gray-400` | Muted text |
| `border-gray-200` | `dark:border-gray-700` | Borders |
| `bg-primary-600` | `dark:bg-primary-500` | Primary buttons |
| `text-primary-600` | `dark:text-primary-400` | Primary links/text |

### Dark Mode Opacity for Colored Backgrounds

Use opacity-based backgrounds in dark mode for softer appearance:

```tsx
// Primary background (subtle)
className="bg-primary-50/50 dark:bg-primary-950/30"

// Warning background (subtle)
className="bg-warning-50 dark:bg-warning-950/30"

// Error background (subtle)
className="bg-error-50 dark:bg-error-950/30"
```

### Testing Dark Mode

1. Add dark mode toggle to your app (optional)
2. Test system preference detection
3. Verify all colors have dark variants
4. Check contrast ratios (WCAG 2.1 AA minimum)

---

## Accessibility

### Focus States

**Always include visible focus states** for keyboard navigation (WCAG 2.1 compliance).

```tsx
// Standard focus ring
className="focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:outline-none"

// Focus ring on inputs
className="focus:ring-2 focus:ring-primary-500 focus:border-transparent"

// Helper class (from globals.css)
className="focus-ring"
```

### Contrast Ratios

Ensure text meets **WCAG 2.1 AA standards**:
- **Normal text** (16px+): 4.5:1 contrast ratio
- **Large text** (18px+ or 14px+ bold): 3:1 contrast ratio

**Verified Color Combinations:**
- ✅ `text-gray-900` on `bg-white` (21:1 ratio)
- ✅ `text-gray-100` on `bg-gray-900` (18:1 ratio)
- ✅ `text-primary-700` on `bg-primary-50` (8.2:1 ratio)

### Semantic HTML

Use semantic HTML elements for better accessibility:

```tsx
// Good
<button onClick={handleClick}>Submit</button>
<nav>...</nav>
<main>...</main>
<header>...</header>

// Bad
<div onClick={handleClick}>Submit</div>
<div><!-- navigation --></div>
```

### Screen Reader Support

- Use `aria-label` for icon-only buttons
- Use `alt` text for images
- Mark decorative images with `alt=""`
- Use `role` attributes where appropriate

---

## Code Examples

### Complete Page Template

```tsx
'use client'

export default function ExamplePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Page Title
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Page description
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Section Card */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Section Title
          </h2>

          {/* Form Example */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Field Label
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter text..."
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <button className="px-6 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors">
                Primary Action
              </button>
              <button className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Secondary Action
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
```

### Migration Checklist

When updating existing pages to match the Nordic minimalistic standard:

- [ ] Replace all `blue-*` colors with `primary-*`
- [ ] Add dark mode variants (`dark:`) to all colored elements
- [ ] Update card styling to `bg-white dark:bg-gray-800 shadow-sm`
- [ ] Fix button styles to use primary color system
- [ ] Update borders to `border-gray-200 dark:border-gray-700`
- [ ] Ensure focus states use `focus:ring-primary-500`
- [ ] Match typography hierarchy (h1: 2xl, h2: xl, labels: sm)
- [ ] Apply consistent spacing (px-4 py-8 for main, p-6 for cards)
- [ ] Test in both light and dark modes
- [ ] Verify accessibility (focus states, contrast ratios)

---

## Utility Classes Reference

### Custom Utility Classes (from globals.css)

```css
/* Focus ring for accessibility */
.focus-ring {
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
}

/* Primary button */
.btn-primary {
  @apply bg-primary-600 text-white font-medium px-6 py-2 rounded-lg;
  @apply hover:bg-primary-700 active:bg-primary-800;
  @apply transition-colors duration-150;
  @apply focus-ring;
  @apply disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed;
}

/* Secondary button */
.btn-secondary {
  @apply bg-white text-gray-700 font-medium px-6 py-2 rounded-lg;
  @apply border border-gray-300 hover:border-gray-400 hover:bg-gray-50;
  @apply active:bg-gray-100;
  @apply transition-colors duration-150;
  @apply focus-ring;
}

/* Interactive card hover */
.card-interactive {
  @apply transition-all duration-200;
  @apply hover:shadow-lg hover:-translate-y-0.5;
}
```

**Usage:**
```tsx
<button className="btn-primary">Primary Button</button>
<button className="btn-secondary">Secondary Button</button>
<div className="card-interactive">Interactive Card</div>
```

---

## Version History

- **v1.0** (2025-10-29): Initial styling guide based on `/dashboard` Nordic minimalistic standard

---

## Questions or Improvements?

This guide is based on the established patterns in `app/dashboard/page.tsx`. If you notice inconsistencies or have suggestions for improvements, please update this document to keep it as the single source of truth for the application's visual identity.

**Key Files:**
- This guide: `STYLING-GUIDE.md`
- Tailwind config: `tailwind.config.ts`
- Global styles: `app/globals.css`
- Reference implementation: `app/dashboard/page.tsx`
