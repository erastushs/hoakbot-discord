# Hoak Bot Dashboard Design System

## Purpose

This document defines the v3.2 dashboard design system for a modern developer dashboard inspired by the Discord Developer Portal UX and information architecture. The goal is a clean, professional, developer-focused experience with Hoak Bot's own identity.

This is inspiration only. Do not copy Discord branding, logos, assets, icons, CSS, source code, colors exactly, illustrations, or proprietary content.

## Design Principles

- Developer-first: prioritize clarity, configuration confidence, and fast access to module controls.
- Dark-first: the primary production dashboard theme is dark.
- Systematic: every page uses shared tokens, shared components, and shared layout rules.
- Minimal: avoid visual noise, decorative chrome, unnecessary modals, and inconsistent page patterns.
- Accessible: meet WCAG AA expectations for contrast, focus, keyboard navigation, screen readers, and reduced motion.
- Responsive: desktop-first, tablet-supported, mobile-supported.

## Typography

### Font Family

- Primary UI font: modern sans-serif system stack.
- Monospace font: system monospace stack for IDs, tokens, code-like values, and configuration keys.

Recommended stack:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
font-family-mono: "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
```

If a custom font is added later, it must not block first render and must preserve equivalent metrics.

### Font Scale

| Token | Size | Line Height | Use |
|-------|------|-------------|-----|
| `text-xs` | 12px | 16px | Badges, table metadata, helper text |
| `text-sm` | 14px | 20px | Body text, labels, navigation |
| `text-md` | 16px | 24px | Primary body, form controls |
| `text-lg` | 18px | 28px | Section intro text |
| `text-xl` | 20px | 28px | Card headings |
| `text-2xl` | 24px | 32px | Page titles |
| `text-3xl` | 30px | 38px | Dashboard hero title only |

### Font Weight

| Token | Weight | Use |
|-------|--------|-----|
| `font-regular` | 400 | Body text |
| `font-medium` | 500 | Labels, navigation, buttons |
| `font-semibold` | 600 | Card headings, page headers |
| `font-bold` | 700 | Rare emphasis only |

## Color Tokens

The color system is original to Hoak Bot and must not copy Discord colors exactly.

### Dark Theme

| Token | Purpose |
|-------|---------|
| `color-bg-app` | Main application background |
| `color-bg-sidebar` | Sidebar background |
| `color-bg-surface` | Card and panel background |
| `color-bg-surface-elevated` | Menus, popovers, dialogs |
| `color-bg-muted` | Secondary panels and inactive states |
| `color-border-subtle` | Low-contrast separators |
| `color-border-strong` | Active separators and form borders |
| `color-text-primary` | Primary text |
| `color-text-secondary` | Descriptions and muted body text |
| `color-text-tertiary` | Metadata and timestamps |
| `color-text-disabled` | Disabled text |
| `color-accent-primary` | Primary action color |
| `color-accent-hover` | Primary action hover |
| `color-accent-muted` | Accent background |
| `color-success` | Successful state |
| `color-warning` | Warning state |
| `color-danger` | Destructive state |
| `color-info` | Informational state |
| `color-focus-ring` | Keyboard focus outline |

### Light Theme Future Tokens

Light theme is future scope. Tokens must exist conceptually so components do not hardcode dark-only values.

| Token | Purpose |
|-------|---------|
| `light-bg-app` | Main light background |
| `light-bg-sidebar` | Light sidebar background |
| `light-bg-surface` | Light card surface |
| `light-border-subtle` | Light separators |
| `light-text-primary` | Primary light text |
| `light-text-secondary` | Muted light text |
| `light-accent-primary` | Primary action in light mode |

## Spacing Tokens

Use a consistent 4px-based spacing scale.

| Token | Value | Use |
|-------|-------|-----|
| `space-0` | 0 | Reset |
| `space-1` | 4px | Tight inline gaps |
| `space-2` | 8px | Compact control gaps |
| `space-3` | 12px | Form label gaps |
| `space-4` | 16px | Standard component padding |
| `space-5` | 20px | Card internal gaps |
| `space-6` | 24px | Section spacing |
| `space-8` | 32px | Page block spacing |
| `space-10` | 40px | Large page groups |
| `space-12` | 48px | Major layout separation |

## Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `radius-xs` | 4px | Badges, small controls |
| `radius-sm` | 6px | Inputs, compact buttons |
| `radius-md` | 8px | Buttons, cards |
| `radius-lg` | 12px | Panels, dialogs |
| `radius-xl` | 16px | Feature cards and large containers |
| `radius-full` | 9999px | Avatars, pills |

## Elevation and Shadows

Elevation should be subtle. Prefer borders and tonal contrast before heavy shadows.

| Token | Use |
|-------|-----|
| `elevation-0` | Flat surfaces |
| `elevation-1` | Cards |
| `elevation-2` | Sticky headers, dropdowns |
| `elevation-3` | Dialogs, drawers |

Shadow rules:

- Cards use either subtle border or low shadow, not both heavily.
- Dialogs and popovers may use stronger shadow to separate from page content.
- Shadows must be consistent across all elevated surfaces.

## Motion and Animation

Motion should be fast, subtle, and functional.

| Interaction | Duration |
|-------------|----------|
| Hover | 150ms |
| Dropdown | 180ms |
| Dialog | 220ms |
| Drawer | 240ms |
| Sidebar collapse | 250ms |
| Page transition | 250ms |

Motion rules:

- Use consistent easing.
- Do not animate layout in ways that cause content to jump unexpectedly.
- Respect `prefers-reduced-motion`.
- Avoid decorative animation that does not communicate state.

## Breakpoints

| Token | Width | Target |
|-------|-------|--------|
| `breakpoint-sm` | 640px | Large phones |
| `breakpoint-md` | 768px | Tablets |
| `breakpoint-lg` | 1024px | Small desktop |
| `breakpoint-xl` | 1280px | Desktop |
| `breakpoint-2xl` | 1536px | Wide desktop |

## Grid

- Desktop: 12-column content grid inside the scrollable content area.
- Tablet: 8-column grid.
- Mobile: 4-column grid.
- Cards should align to the grid and stack predictably.
- Avoid arbitrary card widths.

## Layout Dimensions

| Token | Value | Use |
|-------|-------|-----|
| `sidebar-width` | 280px | Desktop sidebar |
| `sidebar-collapsed-width` | 72px | Collapsed desktop sidebar |
| `header-height` | 64px | Top navigation |
| `page-max-width` | 1200px | Standard content width |
| `page-wide-max-width` | 1440px | Tables and dense admin pages |
| `container-padding-desktop` | 32px | Desktop page padding |
| `container-padding-tablet` | 24px | Tablet page padding |
| `container-padding-mobile` | 16px | Mobile page padding |
| `form-max-width` | 720px | Settings forms |
| `table-min-width` | 720px | Responsive table overflow threshold |

## Button Sizes

| Size | Height | Horizontal Padding | Use |
|------|--------|--------------------|-----|
| `sm` | 32px | 12px | Tables, compact rows |
| `md` | 40px | 16px | Default actions |
| `lg` | 48px | 20px | Primary page actions |
| `icon-sm` | 32px | square | Compact icon actions |
| `icon-md` | 40px | square | Default icon actions |

Button rules:

- Primary action appears once per page header when applicable.
- Destructive actions use danger styling and belong in Danger Zone sections.
- Disabled buttons must include visible disabled state and explanatory context where needed.

## Input Sizes

| Size | Height | Use |
|------|--------|-----|
| `sm` | 32px | Dense filters and table controls |
| `md` | 40px | Default forms |
| `lg` | 48px | Search and prominent setup fields |

Input rules:

- Labels are required for every form control.
- Helper text appears below the label or control consistently.
- Validation errors appear inline and are announced to assistive technology.

## Card Rules

- Cards group related content only.
- Avoid oversized cards with sparse content.
- Every card should have a clear heading or accessible label.
- Cards use consistent padding from the spacing scale.
- Clickable cards must have visible hover and focus states.

## Container and Page Width

- Standard pages use `page-max-width`.
- Data-heavy pages may use `page-wide-max-width`.
- Forms should not exceed `form-max-width` unless there is a clear reason.
- Page width remains consistent across routes unless the page type requires a data-dense layout.

## Table Rules

- Tables use shared `Table` or `VirtualTable` components.
- Long tables use pagination or virtualization.
- Tables must support responsive behavior.
- Mobile tables may collapse into stacked rows or horizontal scroll depending on content type.
- Empty, loading, and error table states use shared components.

## Icon Guidelines

- Use one icon family consistently.
- Icons are decorative unless they communicate unique meaning.
- Meaningful icons require accessible labels.
- Do not mix filled, outlined, and custom icon styles randomly.
- Default icon sizes: 16px, 20px, 24px.

## Accessibility

- WCAG AA contrast minimums are required.
- Keyboard navigation is required for all interactive components.
- Visible focus is required.
- Screen reader support is required for navigation, forms, dialogs, alerts, and tables.
- Reduced motion must be respected.
- ARIA labels must be provided when visible text is insufficient.
