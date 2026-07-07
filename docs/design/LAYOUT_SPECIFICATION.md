# Hoak Bot Dashboard Layout Specification

## Purpose

This document defines the v3.2 dashboard application layout. The dashboard should feel like a desktop application: persistent navigation, predictable workspace context, scrollable content, and efficient developer-focused configuration workflows.

Layout inspiration comes from the Discord Developer Portal, but Hoak Bot must use original branding, assets, CSS, visual tokens, and implementation.

## Layout Goals

- Provide a professional developer dashboard experience.
- Make the sidebar the primary navigation surface.
- Keep guild and user context visible.
- Support quick movement between modules and settings.
- Preserve one consistent page structure across all pages.
- Support desktop, tablet, and mobile.

## Application Structure

The application shell contains:

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

## Layout Hierarchy

```text
Workspace
  -> Sidebar
  -> Top Navigation
  -> Breadcrumb
  -> Page Header
  -> Scrollable Content
  -> Section
  -> Card
  -> Form
  -> Control
```

## Desktop Application Behavior

Desktop is the primary target.

Rules:

- Sidebar remains visible by default.
- Top navigation remains sticky where appropriate.
- Main content scrolls independently from persistent navigation.
- Guild selector remains near the bottom of the sidebar.
- User profile remains anchored at the bottom of the sidebar.
- Content uses consistent page width and spacing.
- Tables and dense admin pages may use wider content width.

## Sidebar

The sidebar is the primary navigation.

### Sidebar Hierarchy

- Dashboard
- General
- Voice
- Welcome
- Goodbye
- Logging
- Moderation
- Audit Logs
- System
- Profile
- Settings

### Sidebar Bottom Area

- Guild selector remains near the bottom.
- User profile stays at the bottom.
- User menu opens from the profile area.

### Sidebar Rules

- Active route is visually clear.
- Navigation groups use consistent spacing.
- Icons use one consistent icon family.
- Sidebar supports collapsed mode.
- Sidebar supports mobile drawer behavior.
- Module navigation must scale to future modules.
- Sidebar must not hardcode backend behavior changes.

## Top Navigation

Top navigation provides context and fast actions.

Content:

- Breadcrumb
- Quick search
- Command palette trigger
- Optional page-level utility actions
- User menu access where sidebar is collapsed or unavailable

Rules:

- Top navigation height is consistent.
- Top navigation is sticky on desktop when useful.
- Top navigation should not duplicate the entire sidebar.
- Quick search should be discoverable.

## Breadcrumb

Purpose:

- Communicate current hierarchy.
- Support fast movement to parent pages.

Examples:

- Dashboard
- Dashboard / Voice
- Dashboard / Logging / Audit History
- Dashboard / Settings / Profile

Rules:

- Keep breadcrumb labels short.
- Do not use breadcrumbs as the only navigation mechanism.

## Page Header

Every page uses the same Page Header structure.

Required:

- Page title
- Description
- Primary action area
- Status area when applicable

Optional:

- Secondary actions
- Metadata
- Last updated timestamp

Rules:

- No page skips Page Header.
- Page Header is the only place for the primary page action.
- Page Header spacing is consistent across pages.

## Scrollable Content

Rules:

- Main content is the primary scroll region.
- Sidebar remains stable while content scrolls on desktop.
- Sticky page elements should not cover focused controls.
- Scroll restoration should be predictable between pages.

## Sticky Header

Use for:

- Top navigation
- Data table controls when useful
- Save bars for dirty forms when applicable

Rules:

- Sticky elements must not create cramped vertical space.
- Sticky elements must have clear background and border separation.

## Guild Selector

Purpose:

- Switch active guild/workspace.
- Show current guild identity.

Rules:

- Located near the bottom of the sidebar on desktop.
- Available in responsive navigation on tablet and mobile.
- Must include loading, empty, and unauthorized states.
- Must not change authentication or authorization behavior.

## User Menu

Purpose:

- Show current user.
- Provide profile and logout access.

Rules:

- Anchored at the bottom of the sidebar on desktop.
- Accessible from top navigation or mobile navigation when sidebar is collapsed.
- Logout behavior uses existing auth/session contracts unchanged.

## Workspace Navigation

Workspace navigation represents guild-level dashboard context.

Rules:

- Current workspace is always visible.
- Workspace switching must not require backend changes.
- Unauthorized or unavailable workspaces show clear states.

## Module Navigation

Module navigation provides access to module pages.

Rules:

- Module pages share one template.
- Navigation order should match primary usage and roadmap order.
- Future modules should fit without layout redesign.

## Page Structure

Every page follows exactly the same structure. No exceptions.

```text
Page Header
Description
Primary Action
Status
Sections
Cards
Footer Actions
```

### Page Header

- Title
- Description
- Primary action
- Status

### Description

- One or two concise sentences.
- Explains what the page controls or displays.

### Primary Action

- Optional if the page has no primary action.
- Appears in the Page Header.

### Status

- Shows module, guild, system, or page status when applicable.
- Uses StatusBadge or Alert components.

### Sections

- Major page groups.
- Use shared Section component.

### Cards

- Group related settings and content.
- Use shared Card component.

### Footer Actions

- Save/cancel or secondary completion actions when needed.
- Avoid duplicating primary actions unnecessarily.

## Module Page Template

Every module uses one shared layout.

Sections:

- Overview
- Configuration
- Permissions
- Logs
- Preview, if applicable
- Danger Zone, if applicable

### Overview

Purpose:

- Explain what the module does.
- Show status, last update, and quick metrics.

### Configuration

Purpose:

- Main settings controls.
- Uses shared forms and cards.

### Permissions

Purpose:

- Display permission information from existing backend contracts.
- No authorization behavior changes.

### Logs

Purpose:

- Show relevant activity or historical events when available.

### Preview

Purpose:

- Show generated messages or configuration output when applicable.

### Danger Zone

Purpose:

- Destructive or high-impact actions.
- Uses clear warning copy and danger styling.

## Responsive Layout

### Desktop

- Persistent sidebar.
- Sticky top navigation.
- Multi-column cards where appropriate.
- Full tables where space allows.

### Tablet

- Sidebar may collapse.
- Content uses fewer columns.
- Tables can scroll horizontally or use condensed layout.

### Mobile

- Sidebar becomes a drawer or collapsed navigation.
- Cards stack vertically.
- Tables become responsive through stacking or horizontal scroll.
- Primary actions remain reachable.
- Page content keeps readable spacing.

## Width Rules

| Area | Width |
|------|-------|
| Sidebar | 280px |
| Collapsed sidebar | 72px |
| Header | 64px height |
| Standard page | 1200px max |
| Wide page | 1440px max |
| Form content | 720px max |

## Spacing Rules

- Page padding desktop: 32px.
- Page padding tablet: 24px.
- Page padding mobile: 16px.
- Section gap: 32px.
- Card gap: 16px to 24px.
- Form row gap: 16px.
- Control group gap: 8px to 12px.

## Visual Style

Characteristics:

- Minimal
- Clean
- Developer-first
- Consistent spacing
- Large whitespace
- Soft shadows
- Subtle borders
- Rounded corners
- Muted colors
- Modern typography
- Dark-first
- Professional

## Do Not Copy

Do not copy:

- Discord logo
- Discord assets
- Discord icons
- Discord CSS
- Discord source code
- Discord branding
- Discord colors exactly
- Discord illustrations

Create original Hoak Bot branding with a similar UX philosophy.
