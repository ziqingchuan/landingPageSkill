---
name: compose-landing-page
description: Generate and implement complete education advertising landing pages from user_config_info.json, business rules, and design specifications. Use when the user asks to create a landing page from a JSON configuration table, build a paid-traffic education landing page, implement lead-capture or trial-booking flows, or deliver a previewable, editable, and publishable education campaign website. This skill must produce final page code and a runnable page, not a page plan or blueprint.
---

# Compose Landing Page

## Purpose

Generate conversion-focused education landing pages from `user_config_info.json`. Treat the JSON configuration as the source of truth, enforce business rules before visual decisions, and produce output that can be previewed, edited, and published.

## Required Inputs

Before generating or editing a landing page:

1. Load the user's `user_config_info.json` or Markdown file containing that JSON.
2. Read `references/user-config-spec.md` to interpret the schema.
3. Read `references/business-rules.md` to enforce lead form, booking, multi-child, and multi-subject rules.
4. Read `references/design-specifications.md` to shape page structure, copy, UI, and responsive behavior.

When the user provides an existing page, inspect it before editing and preserve working behavior unless the request requires replacement.

## Validation

Run the bundled validator when a JSON configuration file is available:

```bash
python scripts/validate_user_config.py path/to/user_config_info.json
```

If validation fails, stop and report the blocking errors with the exact fields to fix. If validation returns warnings only, proceed and mention the assumptions used.

Always enforce these blocking rules even if the script is not run:

- Keep at least one enabled contact field: phone or email.
- Include privacy consent in every lead or booking form.
- For Chinese courses, require enabled age and level fields.
- For English or math courses, require an enabled grade field.
- Require an enabled region field.
- Keep `maxChildren` between 1 and 3 when multi-child booking is enabled.
- Render only subjects and fields present in the configuration; do not invent unconfigured subjects.

## Generation Workflow

1. Parse and validate the configuration.
2. Derive the conversion path:
   - Booking off: lead capture only, no class-time picker.
   - Booking on: include trial-class booking with date/time selection.
   - Multi-child on: support additional child flows up to `maxChildren`.
   - Multi-subject on: support configured subject expansion without inventing subjects.
3. Select the page structure from the design specifications.
4. Write parent-facing copy that is clear, concrete, and conversion-oriented.
5. Build the form and interaction logic from enabled fields and business rules.
6. Produce or edit the page artifact using the host project's existing framework and style conventions.
7. Verify responsive layout, CTA visibility, form completeness, and non-overlapping UI.

## Final Page Implementation Delivery Contract

Always fully implement and deliver the final landing page. Do not stop at an explanatory document, module list, wireframe, CTA strategy, form specification, flow description, or development plan.

The final delivery must include:

- Runnable page code in the current project, following the existing framework, routing, component, and styling conventions.
- A preview route or local development URL.
- Fully rendered page sections, not only a list of section names.
- Real clickable CTA buttons in the hero, a mid-page conversion area, and the final conversion area.
- Form fields from `user_config_info.json`, including required states, field validation, privacy consent, and submit success/failure feedback.
- Trial-class booking UI when `delivery.booking` is `true`, including date selection, time selection, appointment summary, and result states.
- Lead-capture flow when `delivery.booking` is `false`, without class-time pickers or controls that only apply to booking scenarios.
- Multi-child and multi-subject flows when enabled, strictly respecting `maxChildren` and the configured subject scope.
- Editable data structures or component configuration for copy, campaign content, form fields, and placeholders so operators can revise the page later.
- Verified responsive behavior for mobile and desktop, including readable text, tappable controls, and non-overlapping layout.
- A final response that summarizes changed files, preview instructions, validation commands, and unresolved assumptions without treating a page plan as the delivered artifact.

Use page structure, CTA copy, form rules, trial-booking or lead-capture flow, missing-configuration handling, placeholders, and responsive requirements as implementation inputs that must be reflected directly in the page code. Do not output those items as a standalone explanation and stop.

## Content Rules

- Use family-friendly education language for overseas parents.
- Prioritize "what the child gains" over generic feature claims.
- Do not fabricate brand numbers, testimonials, teacher credentials, or partner logos. Use editable placeholders when real proof is missing.
- Keep one primary conversion goal per page.
- Keep mobile readability and tappable CTAs ahead of decoration.

## Resource Guide

- `references/user-config-spec.md`: schema and field meanings.
- `references/business-rules.md`: hard conversion and form rules.
- `references/design-specifications.md`: page strategy, visual rules, copy rules, and final checklist.
- `scripts/validate_user_config.py`: deterministic configuration validator.





