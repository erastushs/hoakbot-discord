# Hoak Bot Dashboard Page Specification

## Purpose

This document defines every planned v3.2 dashboard page and the required structure for each page. Every page follows the same core page structure and uses shared components only.

No backend behavior, authentication, authorization, sessions, REST APIs, routing contracts, or production configuration may change for this redesign phase.

## Universal Page Structure

Every page follows exactly this structure. No exceptions.

```text
Page Header
Description
Primary Action
Status
Sections
Cards
Footer Actions
```

## Shared Page Requirements

- Every page uses `PageHeader`.
- Every page includes a clear description.
- Primary action appears in the header when applicable.
- Status appears near the header or relevant section.
- Sections use shared `Section`.
- Content groups use shared `Card`.
- Footer actions appear only when the page needs save/cancel or completion actions.
- Empty, loading, and error states use shared components.

## Complete Page Inventory

### Authentication

- Login
- Logout
- Unauthorized
- Session Expired

### Application

- Dashboard Home
- Guild Overview
- Guild Settings
- Module List

### Modules

- General
- Voice
- Welcome
- Goodbye
- Logging
- Moderation

### Administration

- Audit Log
- Activity
- Profile
- System Status

### Errors

- 404
- 403
- 500

## Authentication Pages

### Login

Purpose:

- Provide a clean entry point to existing Discord OAuth authentication.

Sections:

- Product identity
- Login action
- Security note
- Error state if login initiation fails

Components:

- PageHeader or auth-specific header pattern
- Card
- Button
- Alert
- Spinner

Rules:

- Do not change OAuth behavior.
- Do not introduce new auth providers.
- Do not alter session behavior.

### Logout

Purpose:

- Confirm logout progress and completion using existing logout behavior.

Sections:

- Logout status
- Return to login action

Components:

- Card
- Spinner
- Button
- Alert

### Unauthorized

Purpose:

- Explain that the authenticated user lacks access.

Sections:

- Unauthorized explanation
- Current user summary when available
- Return action

Components:

- ErrorState
- Button
- Card

### Session Expired

Purpose:

- Explain expired session and provide re-login action.

Components:

- ErrorState
- Button
- Alert

## Application Pages

### Dashboard Home

Purpose:

- Provide the main guild dashboard overview and fast access to common tasks.

Required content:

- Overview Cards
- Guild Summary
- Module Status
- Quick Actions
- Recent Activity
- Health Status
- Pinned Modules

Sections:

- Overview
- Quick Actions
- Module Status
- Recent Activity
- Health Status
- Pinned Modules

Components:

- PageHeader
- Card
- StatusBadge
- Button
- Search
- EmptyState
- Skeleton

Design rules:

- Use overview cards for high-level stats.
- Keep quick actions obvious and limited.
- Recent activity must not dominate the page.
- Health status should be visible but not alarming unless action is required.

### Guild Overview

Purpose:

- Summarize selected guild state and dashboard readiness.

Sections:

- Guild Summary
- Active Modules
- Recent Changes
- Configuration Health

Components:

- PageHeader
- Card
- StatusBadge
- Table
- Badge

### Guild Settings

Purpose:

- Display guild-level configuration available through existing frontend/backend contracts.

Sections:

- General settings
- Preferences
- Save actions

Components:

- PageHeader
- Section
- Card
- Input
- Select
- Switch
- Button
- Alert

Rules:

- Do not add backend settings.
- Only represent settings supported by existing contracts.

### Module List

Purpose:

- Show all modules and their statuses.

Sections:

- Module search
- Enabled modules
- Available modules
- Future modules placeholder if applicable

Components:

- PageHeader
- Search
- Card
- Badge
- StatusBadge
- EmptyState
- Skeleton

## Module Pages

Every module page uses one shared layout.

Required sections:

- Overview
- Configuration
- Permissions
- Logs
- Preview, if applicable
- Danger Zone, if applicable

Shared components:

- PageHeader
- Section
- Card
- Tabs
- StatusBadge
- Badge
- Input
- Textarea
- Select
- Checkbox
- Radio
- Switch
- Button
- Table
- EmptyState
- ErrorState

Shared rules:

- No module gets a custom page structure.
- Module-specific content appears inside the shared template.
- Unsupported sections are hidden or shown as clear unavailable states.
- No backend contracts are changed to satisfy page design.

### General

Purpose:

- Manage general bot settings exposed by existing contracts.

Likely sections:

- Overview
- Configuration
- Permissions
- Logs

### Voice

Purpose:

- Manage voice-related configuration exposed by existing contracts.

Likely sections:

- Overview
- Configuration
- Permissions
- Logs
- Preview, if applicable
- Danger Zone, if applicable

### Welcome

Purpose:

- Manage welcome behavior exposed by existing contracts.

Likely sections:

- Overview
- Configuration
- Preview
- Permissions
- Logs

### Goodbye

Purpose:

- Manage goodbye behavior exposed by existing contracts.

Likely sections:

- Overview
- Configuration
- Preview
- Permissions
- Logs

### Logging

Purpose:

- Manage logging behavior exposed by existing contracts.

Likely sections:

- Overview
- Configuration
- Logs
- Permissions

### Moderation

Purpose:

- Manage moderation configuration exposed by existing contracts.

Likely sections:

- Overview
- Configuration
- Permissions
- Logs
- Danger Zone, if applicable

## Administration Pages

### Audit Log

Purpose:

- Show administrative and configuration history available through existing contracts.

Sections:

- Filters
- Audit table
- Detail drawer
- Empty/error states

Components:

- PageHeader
- Search
- Table
- VirtualTable
- Badge
- StatusBadge
- Drawer
- EmptyState
- Skeleton

Rules:

- Use virtualization for large history lists.
- Do not add new audit backend behavior in v3.2.

### Activity

Purpose:

- Show recent dashboard or guild activity available from existing contracts.

Sections:

- Activity feed
- Filters
- Empty state

Components:

- PageHeader
- Card
- Badge
- Search
- EmptyState
- Skeleton

### Profile

Purpose:

- Show authenticated user profile and account-related actions available through existing contracts.

Sections:

- User identity
- Session-related actions
- Linked guild context

Components:

- PageHeader
- Avatar
- Card
- Button
- Alert

Rules:

- Do not change session behavior.
- Do not add account management backend features.

### System Status

Purpose:

- Show dashboard/system health available through existing contracts.

Sections:

- Health summary
- Service status
- Version/build information if already available
- Error state

Components:

- PageHeader
- Card
- StatusBadge
- Progress
- Table
- Alert

## Error Pages

### 404

Purpose:

- Explain that the page does not exist.

Components:

- ErrorState
- Button
- Card

### 403

Purpose:

- Explain forbidden access.

Components:

- ErrorState
- Button
- Alert

### 500

Purpose:

- Explain unrecoverable dashboard error and recovery options.

Components:

- ErrorState
- Button
- Alert

## Responsive Page Behavior

Desktop:

- Use full sidebar and sticky top navigation.
- Cards may use grid layouts.
- Tables use full layout.

Tablet:

- Sidebar can collapse.
- Cards reduce columns.
- Tables use horizontal scroll or compact mode.

Mobile:

- Sidebar becomes drawer/collapsed navigation.
- Cards stack.
- Forms use full width.
- Tables use responsive transformation.
- Primary actions remain reachable.

## Accessibility Page Requirements

- Page title must be unique.
- Main content must be identifiable.
- Headings must follow a logical order.
- Form labels are required.
- Error messages are associated with controls.
- Keyboard users can reach all actions.
- Focus state is visible.
- Reduced motion is respected.
