# Hoak Bot Dashboard Component Library

## Purpose

This document defines the reusable component library for the v3.2 dashboard redesign. Every page must use these components. No duplicated UI is allowed.

The design is inspired by professional developer dashboards, including Discord Developer Portal-style UX patterns, but Hoak Bot must retain its own branding and original visual implementation.

## Component Principles

- Components are shared across all pages.
- Components consume design tokens only.
- Components support dark theme first.
- Components are accessible by default.
- Components expose consistent states: default, hover, active, focus, disabled, loading, error where applicable.
- Components must not hardcode module-specific layouts.
- Components must not require backend changes.

## Required Components

### Button

Purpose: trigger primary, secondary, tertiary, and destructive actions.

Variants:

- Primary
- Secondary
- Tertiary
- Ghost
- Danger
- Link

Sizes:

- Small
- Medium
- Large

States:

- Default
- Hover
- Active
- Focus
- Disabled
- Loading

Rules:

- Use one primary button per page header where possible.
- Danger buttons appear only in destructive flows or Danger Zone sections.

### IconButton

Purpose: compact icon-only action.

Rules:

- Requires accessible label.
- Must use shared icon sizing.
- Must not be used when text is needed for clarity.

### Avatar

Purpose: user or guild identity display.

Variants:

- User
- Guild
- Fallback initials
- Bot/system

Rules:

- Always provide fallback state.
- Use consistent sizing.

### Badge

Purpose: compact metadata or category indicator.

Variants:

- Neutral
- Accent
- Success
- Warning
- Danger
- Info

### Card

Purpose: group related content.

Variants:

- Standard
- Interactive
- Elevated
- Muted
- Danger

Rules:

- Cards require consistent padding.
- Interactive cards require hover and focus states.
- Do not create one-off card styles per page.

### Section

Purpose: group page content under a shared heading and description.

Structure:

- Section heading
- Optional description
- Optional actions
- Section body

### PageHeader

Purpose: consistent top-of-page identity and actions.

Required content:

- Title
- Description
- Optional status
- Optional primary action
- Optional secondary actions

Rules:

- Every page uses PageHeader.
- PageHeader is the only place for primary page-level actions.

### Table

Purpose: standard tabular data.

Required states:

- Loading
- Empty
- Error
- Sorted
- Filtered

Rules:

- Use for moderate datasets.
- Use VirtualTable for large datasets.

### VirtualTable

Purpose: large data sets such as audit logs or activity history.

Rules:

- Preserve keyboard navigation.
- Preserve row focus state.
- Provide accessible row labels.

### Search

Purpose: local page filtering and global dashboard search entry.

Variants:

- Inline search
- Page search
- Global search trigger

### CommandPalette

Purpose: keyboard-first navigation and command execution.

Shortcut:

- Ctrl+K

Content:

- Pages
- Modules
- Settings
- Actions

Rules:

- Must be keyboard navigable.
- Must expose clear empty state.

### Input

Purpose: single-line text input.

Required:

- Label
- Optional description
- Placeholder
- Error state
- Disabled state

### Textarea

Purpose: multi-line text input.

Rules:

- Use for welcome/goodbye templates and longer configuration values.
- Support helper text and validation.

### Select

Purpose: single selection from a defined set.

Rules:

- Must support keyboard navigation.
- Use native or accessible custom select behavior.

### Checkbox

Purpose: independent boolean choices.

Rules:

- Label is required.
- Description is recommended for configuration toggles with side effects.

### Radio

Purpose: mutually exclusive choices.

Rules:

- Group label is required.
- Options must be keyboard navigable.

### Switch

Purpose: immediate on/off settings.

Rules:

- Label is required.
- Show save state when changes persist.
- Do not use for destructive actions.

### Tabs

Purpose: organize related sections in a module page.

Rules:

- Keyboard navigation is required.
- Do not hide critical required actions in secondary tabs.

### Dialog

Purpose: focused confirmation or short task.

Rules:

- Avoid unnecessary modal dialogs.
- Must trap focus.
- Must support Escape close where safe.
- Destructive confirmations must be explicit.

### Drawer

Purpose: secondary contextual panels without leaving the page.

Use cases:

- Audit detail
- Activity detail
- Preview panel

### Tooltip

Purpose: short supplemental explanation.

Rules:

- Do not put required information only in tooltips.
- Must be accessible by keyboard and screen readers where applicable.

### Popover

Purpose: lightweight contextual controls.

Use cases:

- Filters
- Quick settings
- Contextual metadata

### Toast

Purpose: transient feedback.

Variants:

- Success
- Error
- Warning
- Info

Rules:

- Do not use toast as the only error reporting mechanism for forms.
- State-changing actions should provide immediate feedback.

### Banner

Purpose: page-level persistent message.

Use cases:

- System warning
- Permission limitation
- Partial outage
- Unsaved changes

### Alert

Purpose: contextual warning, info, success, or error inside content.

### Progress

Purpose: progress feedback for multi-step or long-running operations.

### Skeleton

Purpose: loading placeholder matching final layout.

Rules:

- Use instead of layout-shifting spinners for page and card loading.

### Spinner

Purpose: compact loading indicator.

Rules:

- Use only for small inline operations.

### EmptyState

Purpose: explain missing content and next action.

Required:

- Title
- Description
- Optional action

### ErrorState

Purpose: recoverable error presentation.

Required:

- Title
- Description
- Optional retry action
- Optional support/action link

### CopyButton

Purpose: copy IDs, tokens, URLs, or configuration values.

Rules:

- Must provide success feedback.
- Must include accessible label.

### StatusBadge

Purpose: communicate module, system, or configuration status.

Variants:

- Online
- Offline
- Enabled
- Disabled
- Warning
- Error
- Pending
- Unknown

### Breadcrumb

Purpose: show page location and hierarchy.

Rules:

- Used in top navigation or page header area.
- Must remain concise.

## Component State Requirements

Every reusable component must define relevant states before implementation:

- Default
- Hover
- Active
- Focus
- Disabled
- Loading
- Empty
- Error
- Success
- Warning

## Page-to-Component Mapping

### Dashboard Home

- PageHeader
- Card
- StatCard pattern using Card
- StatusBadge
- Button
- Search
- EmptyState
- Skeleton

### Module Pages

- PageHeader
- Section
- Card
- Tabs
- StatusBadge
- Switch
- Input
- Textarea
- Select
- Checkbox
- Radio
- Button
- Table
- EmptyState
- ErrorState

### Audit Log

- PageHeader
- Search
- Table
- VirtualTable
- Badge
- StatusBadge
- Drawer
- EmptyState
- Skeleton

### Profile

- PageHeader
- Avatar
- Card
- Section
- Button
- Alert

### System Status

- PageHeader
- Card
- StatusBadge
- Progress
- Table
- Banner

### Error Pages

- ErrorState
- Button
- Card

## Duplication Rules

- Do not create page-local versions of shared components.
- Do not create module-specific buttons, cards, tables, or form controls.
- If a page needs a new visual pattern, add it to the component library first.
- Component variants must be token-driven.

## Accessibility Requirements

- All interactive components support keyboard navigation.
- Focus states are visible.
- ARIA is used when semantic HTML is insufficient.
- Dialogs and drawers manage focus.
- Toasts and alerts announce important state changes.
- Reduced motion is respected.
