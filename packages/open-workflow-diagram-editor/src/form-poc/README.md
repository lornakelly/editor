# Form POC — schema-driven task editing with react-hook-form

Proof that a task form can be generated from `getSchemaForDefinition()` using
react-hook-form, with no Zod layer.

**Scope: `setTask`, one text input per property.** Choosing a control per type is a
separate problem and is not answered here.

## Files

- `setTask.schema.json` — the schema the form is built from
- `DynamicSchemaForm.tsx` — the whole thing
- `stories/features/DynamicSchemaForm.stories.tsx` — Storybook → Features → Dynamic Schema Form
- `tests/form-poc/DynamicSchemaForm.test.tsx`

```bash
pnpm start
```

## The schema is a captured file, on purpose

`setTask.schema.json` is a byte-for-byte copy of what `getSchemaForDefinition("setTask")`
produced — `allOf` merged, `taskBase` inlined, transitively referenced definitions
bundled into its own `$defs`. The POC reads the file directly rather than calling the
resolver, so you can open it and see exactly what the form is working from.

To regenerate it after a schema or resolver change:

```ts
writeFileSync(
  "src/form-poc/setTask.schema.json",
  JSON.stringify(getSchemaForDefinition("setTask"), null, 2) + "\n",
);
```

## What it shows

- **The fields come from the schema** — the form reads `properties` and `required`;
  nothing about `set`, `if` or `then` is hardcoded.
- **The document stays clean.** Empty inputs are dropped, so an untouched task submits
  `{}` rather than `{ if: "", input: "", output: "" }` — none of which are valid.
- **Dirty state is exact**, via `formState.isDirty`, which is what Save/Cancel needs.
- **Switching task resets the form**, so values cannot leak between nodes.

Two details worth keeping if this grows:

**Labels use the property name, never `title`.** In this schema `title` is the generated
TypeScript class name — `SetTaskConfiguration`, `TaskBaseIf`. `description` is the human
sentence.

**Reset happens via `reset()` in an effect, not a `key` on `<form>`.** `useForm` lives
above that element, so remounting the child leaves the hook's state intact and the
previous task's values leak into the next one.

## Deliberately not handled

- Objects are edited as raw JSON in the input. A value is only parsed as JSON when it
  looks like JSON, so `${ .order.total }` stays a string.
- `$ref` properties are not dereferenced. `getSchemaForDefinition` _bundles_ referenced
  definitions in a `$defs` block rather than inlining them, so `input`, `output`, `export`
  and `then` arrive as `{$ref}` pointers with no `type`.
- Unions get no branch selector, and there is no validation. The intended route for the
  latter is the SDK's own ajv through RHF's `resolver`, so the panel and the canvas error
  badges cannot disagree.
- Strings are hardcoded rather than routed through i18n — this is not shipping code, and
  nothing here is exported from the package entry point.

## Why no Zod

The authoritative schema already exists. Adding Zod means translating JSON Schema into a
second, lossier schema language at runtime. RHF's `resolver` takes a plain function, so
the SDK's ajv can be used directly.
