# Hoak Bot Dashboard v3.2 Implementation Plan

## Purpose

This document defines the implementation blueprint for the Hoak Bot Dashboard v3.2 redesign. Phase 0.5 produces documentation and specifications only. No React refactor, CSS rewrite, component implementation, backend modification, dashboard behavior change, routing change, or code generation occurs in this phase.

## Scope

Allowed:

- Dashboard frontend design documentation
- UI implementation specifications
- Component planning
- Layout planning
- Page planning
- Accessibility planning
- Responsive planning

Not allowed:

- Backend code changes
- Authentication changes
- Authorization changes
- Session changes
- REST API changes
- Package changes
- Production configuration changes
- React refactor during Phase 0.5
- CSS rewrite during Phase 0.5
- Component implementation during Phase 0.5
- Routing changes during Phase 0.5

## Design Direction

The redesign is heavily inspired by the Discord Developer Portal UX and information architecture. This is inspiration only.

Do not copy:

- Discord logo
- Discord assets
- Discord icons
- Discord CSS
- Discord source code
- Discord branding
- Discord colors exactly
- Discord illustrations

The dashboard should provide a similarly clean, professional, developer-focused experience while maintaining Hoak Bot's own branding and identity.

## Implementation Milestones

### Milestone 1: Design System

Goal:

- Establish tokens, theme rules, sizing, spacing, typography, motion, accessibility, and responsive foundations.

Deliverables:

- Typography scale
- Color tokens
- Spacing tokens
- Border radius tokens
- Elevation and shadow rules
- Motion and animation rules
- Breakpoints
- Grid rules
- Dark theme rules
- Future light theme token plan
- Accessibility rules
- Icon guidelines
- Button sizes
- Input sizes
- Card rules
- Container widths
- Page widths
- Sidebar width
- Header height
- Form width
- Table rules

Acceptance criteria:

- All design tokens are defined before component implementation.
- Dark-first design is complete.
- Light theme remains token-compatible future scope.
- Accessibility requirements are included in design decisions.

### Milestone 2: Layout

Goal:

- Implement the desktop-application dashboard shell using the approved layout specification.

Deliverables:

- Sidebar
- Top Navigation
- Breadcrumb
- Page Header
- Scrollable Content
- Sticky Header
- Guild Selector
- User Menu
- Workspace Navigation
- Module Navigation
- Responsive Navigation

Acceptance criteria:

- Sidebar is primary navigation.
- Guild selector remains near the bottom.
- User profile remains at the bottom.
- Content area scrolls predictably.
- Layout supports desktop, tablet, and mobile.
- No backend behavior changes.

### Milestone 3: Component Library

Goal:

- Build shared components used by every page.

Deliverables:

- Button
- IconButton
- Avatar
- Badge
- Card
- Section
- PageHeader
- Table
- VirtualTable
- Search
- CommandPalette
- Input
- Textarea
- Select
- Checkbox
- Radio
- Switch
- Tabs
- Dialog
- Drawer
- Tooltip
- Popover
- Toast
- Banner
- Alert
- Progress
- Skeleton
- Spinner
- EmptyState
- ErrorState
- CopyButton
- StatusBadge
- Breadcrumb

Acceptance criteria:

- Every component consumes design tokens.
- No duplicated UI components exist.
- Components support required states.
- Components meet accessibility requirements.

### Milestone 4: Dashboard Home

Goal:

- Redesign the dashboard landing page using the shared layout and components.

Deliverables:

- Overview Cards
- Guild Summary
- Module Status
- Quick Actions
- Recent Activity
- Health Status
- Pinned Modules

Acceptance criteria:

- Dashboard Home uses only shared components.
- Page follows universal page structure.
- Loading, empty, and error states are present.
- Responsive behavior is verified.

### Milestone 5: Module Pages

Goal:

- Convert module pages to one shared module page template.

Deliverables:

- General module page
- Voice module page
- Welcome module page
- Goodbye module page
- Logging module page
- Moderation module page
- Shared module sections:
  - Overview
  - Configuration
  - Permissions
  - Logs
  - Preview, if applicable
  - Danger Zone, if applicable

Acceptance criteria:

- Every module page uses one shared layout.
- No hardcoded module layouts are introduced.
- Existing backend contracts are consumed as-is.
- Unsupported sections are hidden or represented with clear unavailable states.

### Milestone 6: Responsive

Goal:

- Make the redesigned dashboard work across desktop, tablet, and mobile.

Deliverables:

- Desktop layout validation
- Tablet layout validation
- Mobile layout validation
- Collapsible sidebar
- Responsive cards
- Responsive forms
- Responsive tables

Acceptance criteria:

- Sidebar collapses correctly.
- Cards stack correctly.
- Tables become responsive.
- Primary actions remain reachable.
- Forms are usable on mobile.

### Milestone 7: Accessibility

Goal:

- Validate and improve accessibility across the redesigned dashboard.

Deliverables:

- WCAG AA contrast validation
- Keyboard navigation validation
- Visible focus validation
- Reduced motion support
- Screen reader support
- ARIA labels where needed

Acceptance criteria:

- All interactive elements are keyboard reachable.
- Focus is visible.
- Dialogs and drawers manage focus.
- Alerts and errors are announced appropriately.
- Reduced motion is respected.

### Milestone 8: Final Polish

Goal:

- Complete final visual, motion, consistency, and production-readiness pass for the frontend redesign.

Deliverables:

- Final spacing pass
- Final typography pass
- Final icon consistency pass
- Final empty state pass
- Final loading state pass
- Final error state pass
- Final animation pass
- Production deployment readiness check

Acceptance criteria:

- Visual style is consistent across all pages.
- No duplicated UI remains.
- No backend regressions are introduced.
- Production deployment is ready.

## Phase 0.5 Exit Criteria

Phase 0.5 is complete when these documents exist and are accepted:

- `docs/design/DESIGN_SYSTEM.md`
- `docs/design/COMPONENT_LIBRARY.md`
- `docs/design/LAYOUT_SPECIFICATION.md`
- `docs/design/PAGE_SPECIFICATION.md`
- `docs/design/IMPLEMENTATION_PLAN.md`

Implementation must not begin until the blueprint is accepted.

## Final v3.2 Acceptance Criteria

Before v3.2 can be marked complete:

- Responsive desktop, tablet, and mobile layouts are complete.
- WCAG AA accessibility requirements are met.
- Keyboard navigation works across the dashboard.
- Visible focus is present across interactive components.
- Reduced motion is respected.
- All planned pages are redesigned.
- All pages use shared components.
- No duplicated UI components exist.
- No backend code changed.
- Authentication remains unchanged.
- Authorization remains unchanged.
- Sessions remain unchanged.
- REST APIs remain unchanged.
- `package.json` remains unchanged unless separately approved outside this phase.
- Production configuration remains unchanged unless separately approved outside this phase.

## Implementation Order

1. Design System
2. Layout
3. Component Library
4. Dashboard Home
5. Module Pages
6. Responsive
7. Accessibility
8. Final Polish

## Risk Controls

### Scope Creep

Control:

- Backend changes are prohibited.
- New feature work is prohibited unless it is purely frontend presentation using existing contracts.

### Duplicated UI

Control:

- Every new page pattern must map to the component library.
- Page-local components are allowed only as composition wrappers, not duplicated controls.

### Accessibility Regressions

Control:

- Accessibility is validated during component work and again during Milestone 7.

### Responsive Regressions

Control:

- Desktop, tablet, and mobile are validated before final polish.

### Visual Inconsistency

Control:

- Design tokens are the only source for color, spacing, radius, typography, motion, and elevation.

## Documentation-Only Confirmation

This Phase 0.5 blueprint does not implement code. It exists to remove UI uncertainty before development begins.
