/*
 * Copyright 2021-Present The Open Workflow Specification Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as React from "react";
import type { FormFieldDescriptor } from "../../core/schemaToFormFields";

// ---------------------------------------------------------------------------
// TaskFormContext
// ---------------------------------------------------------------------------

export type TaskFormContextType = {
  isReadOnly: boolean;
  siblingTaskNames: string[];
  /**
   * Raw task data — always present (both read-only and edit modes).
   * Used for variant auto-selection (discrimination) in both modes, and
   * additionally for field-visibility filtering in read-only mode.
   */
  taskData: Record<string, unknown>;
  /**
   * Paths a one-of offers both as a `${...}` expression and as another kind of
   * string. Only these can hold a value left behind by the variant the user
   * switched away from — see `collectExpressionVariantPaths`.
   */
  expressionVariantPaths: Set<string>;
};

export const TaskFormContext = React.createContext<TaskFormContextType>({
  isReadOnly: false,
  siblingTaskNames: [],
  taskData: {},
  expressionVariantPaths: new Set(),
});

export function useTaskFormContext(): TaskFormContextType {
  return React.useContext(TaskFormContext);
}

// ---------------------------------------------------------------------------
// Read-only field filtering
// ---------------------------------------------------------------------------

/**
 * Walks an arbitrary nested object along a dot-notation path.
 * Returns `undefined` if any segment is missing.
 */
export function getNestedValue(data: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = data;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Returns true when the task actually has a meaningful value at `path`:
 * non-null, non-undefined, and non-empty-string.
 */
export function hasValue(task: Record<string, unknown>, path: string): boolean {
  const v = getNestedValue(task, path);
  return v !== null && v !== undefined && v !== "";
}

/**
 * Returns true when the task object has the given path present as an object
 * (even if all of its own properties are absent/empty). Used to decide
 * whether to show an object group or one-of selector in read-only mode.
 */
function hasObjectAtPath(task: Record<string, unknown>, path: string): boolean {
  const v = getNestedValue(task, path);
  return v !== null && v !== undefined && typeof v === "object" && !Array.isArray(v);
}

/**
 * Collects the paths where one one-of offers the *same* string field in two
 * different kinds — once as a `${...}` expression and once as something else.
 * `emit.event.with.source` is the only such path today: it is either a URI or
 * an expression, and both branches write to `…with.source`.
 *
 * Why this list exists: `StringControl` blanks its input when the stored value
 * looks like the wrong kind, so that switching URI → Expression does not leave
 * the old URI sitting in the expression box. That clean-up is only ever
 * *correct* at a path two branches share. Anywhere else a plain string is
 * perfectly entitled to hold an expression — a switch case's `when` and a
 * task's `if` both accept `${ … }` or a bare jq condition — and blanking there
 * hides what the document actually says.
 *
 * See it: Storybook → Nested Editing / Workflows → **Switch Locked Cases**,
 * click `routeOrder`. Every case's `when` holds `${ .orderType == … }`. Before
 * this list existed, all four boxes rendered empty. The same bug hit every
 * task's `if`.
 */
export function collectExpressionVariantPaths(fields: FormFieldDescriptor[]): Set<string> {
  const byPath = new Map<string, Set<boolean>>();

  const walk = (list: FormFieldDescriptor[], insideOneOf: boolean): void => {
    for (const field of list) {
      if (field.kind === "object") {
        walk(field.children, insideOneOf);
      } else if (field.kind === "one-of") {
        for (const variant of field.variants) walk(variant.fields, true);
      } else if (field.kind === "string" && insideOneOf) {
        const kinds = byPath.get(field.path) ?? new Set<boolean>();
        kinds.add(field.isRuntimeExpression);
        byPath.set(field.path, kinds);
      }
    }
  };
  walk(fields, false);

  return new Set([...byPath].filter(([, kinds]) => kinds.size > 1).map(([path]) => path));
}

/**
 * Collects the paths of lists the user edits through form controls, so
 * `applyDirtyValues` knows which arrays to strip empty values out of before
 * saving. Clearing a control is how you remove a key in such a list, so the
 * `""` it leaves behind must not reach the model.
 *
 * Only `ordered-map` qualifies. An array edited as text (`json`) means
 * exactly what it says — an empty string in it was typed on purpose.
 *
 * ⚠️ This has to be a descriptor question, not a shape question. A
 * `listen.to.all` entry (`{ with: {...} }`) is a single-key object exactly like
 * a switch case (`{ electronicOrder: {...} }`), so any check on the value alone
 * would strip both.
 */
export function collectFormListPaths(fields: FormFieldDescriptor[]): Set<string> {
  const paths = new Set<string>();

  const walk = (list: FormFieldDescriptor[]): void => {
    for (const field of list) {
      if (field.kind === "ordered-map") paths.add(field.path);
      else if (field.kind === "object") walk(field.children);
      else if (field.kind === "one-of") for (const v of field.variants) walk(v.fields);
    }
  };
  walk(fields);

  return paths;
}

/**
 * Re-roots a descriptor list under `prefix`, recursing through containers:
 *
 *     prefixFields([{ path: "when" }], "switch.0.electronicOrder")
 *       -> [{ path: "switch.0.electronicOrder.when" }]
 *
 * `OrderedMapField.itemFields` describes one entry using entry-relative
 * paths, because the schema knows an entry's shape but not how many entries a
 * given task has — that is data. Joining the two is the rendering row's job,
 * and this is that join.
 */
export function prefixFields(fields: FormFieldDescriptor[], prefix: string): FormFieldDescriptor[] {
  return fields.map((field): FormFieldDescriptor => {
    const path = `${prefix}.${field.path}`;
    if (field.kind === "object") {
      return { ...field, path, children: prefixFields(field.children, prefix) };
    }
    if (field.kind === "one-of") {
      return {
        ...field,
        path,
        variants: field.variants.map((variant) => ({
          ...variant,
          fields: prefixFields(variant.fields, prefix),
        })),
      };
    }
    // Everything else re-roots its own path and nothing more. Note a nested
    // `ordered-map` keeps its `itemFields` entry-relative: those are
    // re-rooted by the row that renders that list, not by this one.
    return { ...field, path };
  });
}

/**
 * Recursively filters a field list for read-only display.
 *
 * Rules:
 * - Object groups: hidden if the parent key is absent from task data; collapsed
 *   if present but all children have no values.
 * - one-of fields: hidden unless the task has a value at the field's path.
 *   The `__root__` one-of (top-level task variant) is always shown.
 * - Scalar fields (string/number/boolean/enum/…): hidden unless the task has a
 *   non-null, non-empty value at the field's path. This applies even to
 *   required fields — a required field inside an absent optional structure
 *   must not appear.
 */
export function filterReadOnlyFields(
  fields: FormFieldDescriptor[],
  task: Record<string, unknown>,
): FormFieldDescriptor[] {
  return fields.flatMap((field): FormFieldDescriptor[] => {
    if (field.kind === "object") {
      // Never show the object group if the parent key doesn't exist in the task data.
      if (!hasObjectAtPath(task, field.path)) return [];
      const children = filterReadOnlyFields(field.children, task);
      if (children.length === 0) return [];
      return [{ ...field, children }];
    }

    if (field.kind === "one-of") {
      // Root-level one-of (path="__root__") represents the whole task variant — always show
      if (field.path === "__root__") return [field];
      // Property-level one-of: show only if the task has a value at that path
      if (hasValue(task, field.path)) return [field];
      return [];
    }

    if (field.kind === "map") {
      // Show the map group only when the task contains a non-empty object at this path.
      return hasObjectAtPath(task, field.path) ? [field] : [];
    }

    if (field.kind === "ordered-map") {
      // A list with no entries has nothing to read. Entries are filtered one by
      // one by the row that renders them, against that entry's own values.
      const v = getNestedValue(task, field.path);
      return Array.isArray(v) && v.length > 0 ? [field] : [];
    }

    if (field.kind === "json") {
      // Show whenever the path has any defined value, including null, false, 0,
      // and empty strings — all are valid JSON values worth displaying.
      const v = getNestedValue(task, field.path);
      return v !== undefined ? [field] : [];
    }

    // For scalar fields: only show when the task actually has a value at the path.
    // This intentionally suppresses required fields whose parent object doesn't exist —
    // a required field inside an optional structure should not appear when that
    // structure is absent from the task data.
    return hasValue(task, field.path) ? [field] : [];
  });
}
