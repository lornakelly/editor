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

/**
 * Reading and writing a map's entries, including an "Other fields" map's (`MapField.otherFieldsOf`).
 *
 * An "Other fields" map edits the keys an object allows beyond its own properties. Those keys live
 * in the object itself, beside its fixed fields (`emit.event.with.tenantid` next to
 * `emit.event.with.type`), so the map's `path` (`emit.event.with.__other__`) is only its identity:
 * nothing is read or written there. Anything that reads a map's value from a task, default values
 * or form values, or writes one of its entries, goes through these helpers.
 */

import { getParentPath, isAtOrBelow, joinPath } from "./paths";
import type { FormFieldDescriptor, MapField, OtherFieldsOf } from "./schemaToFormFields";
import { isObjectNotArray } from "./utils";

export type OtherFieldsMap = MapField & { otherFieldsOf: OtherFieldsOf };

export function isOtherFieldsMap(field: FormFieldDescriptor): field is OtherFieldsMap {
  return field.kind === "map" && field.otherFieldsOf !== undefined;
}

/** The value at a dot path, or `undefined` when any segment is missing or not an object. */
function valueAt(source: Record<string, unknown>, path: string): unknown {
  let current: unknown = source;
  for (const part of path.split(".")) {
    if (!isObjectNotArray(current) || !Object.prototype.hasOwnProperty.call(current, part)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

/** Where a map's entries live: the map's own path, or an "Other fields" map's object. */
export function mapValuePath(field: MapField): string {
  return field.otherFieldsOf?.objectPath ?? field.path;
}

/** The dot path of the entry `key` of a map. */
export function mapEntryPath(field: MapField, key: string): string {
  return joinPath(mapValuePath(field), key);
}

/** Whether `key` is one of the object's own properties, so never an entry of its "Other fields". */
export function isFixedKey(field: MapField, key: string): boolean {
  return field.otherFieldsOf?.fixedKeys.includes(key) ?? false;
}

/**
 * A map's entries in `source` (a task, default values or form values), or `undefined` when there's
 * no object. A plain map's value is returned as is. An "Other fields" map's are the object's keys
 * that aren't its own properties, without the `undefined` a removed entry leaves in the draft.
 */
export function mapEntriesOf(
  field: MapField,
  source: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  return source === undefined
    ? undefined
    : mapEntriesIn(field, valueAt(source, mapValuePath(field)));
}

/** `mapEntriesOf` for the value already read at the map's `mapValuePath`. */
export function mapEntriesIn(field: MapField, value: unknown): Record<string, unknown> | undefined {
  if (!isObjectNotArray(value)) return undefined;
  if (field.otherFieldsOf === undefined) return value;
  return Object.fromEntries(
    Object.entries(value).filter(([key, entry]) => entry !== undefined && !isFixedKey(field, key)),
  );
}

/** Whether a map has at least one entry (not counting removed ones) in `source`. */
export function hasMapEntries(
  field: MapField,
  source: Record<string, unknown> | undefined,
): boolean {
  const entries = mapEntriesOf(field, source);
  return entries !== undefined && Object.values(entries).some((entry) => entry !== undefined);
}

/** Every "Other fields" map in the tree, in every variant. */
export function collectOtherFieldsMaps(fields: readonly FormFieldDescriptor[]): OtherFieldsMap[] {
  return fields.flatMap((field): OtherFieldsMap[] => {
    if (isOtherFieldsMap(field)) return [field];
    if (field.kind === "object" || field.kind === "section") {
      return collectOtherFieldsMaps(field.children);
    }
    if (field.kind === "one-of") {
      return field.variants.flatMap((variant) => collectOtherFieldsMaps(variant.fields));
    }
    return [];
  });
}

/** The tree with every "Other fields" map labelled `label` (the side panel's translation). */
export function withOtherFieldsLabel(
  fields: readonly FormFieldDescriptor[],
  label: string,
): FormFieldDescriptor[] {
  return fields.map((field): FormFieldDescriptor => {
    if (isOtherFieldsMap(field)) return { ...field, label };
    if (field.kind === "object" || field.kind === "section") {
      return { ...field, children: withOtherFieldsLabel(field.children, label) };
    }
    if (field.kind === "one-of") {
      return {
        ...field,
        variants: field.variants.map((variant) => ({
          ...variant,
          fields: withOtherFieldsLabel(variant.fields, label),
        })),
      };
    }
    return field;
  });
}

/**
 * The "Other fields" map among `maps` that owns the value at `path` (an entry, or a value inside
 * one), or `undefined` for a fixed field's path or any other.
 */
export function otherFieldsOwner(
  maps: readonly OtherFieldsMap[],
  path: string,
): OtherFieldsMap | undefined {
  return maps.find((map) => {
    const { objectPath } = map.otherFieldsOf;
    if (path === objectPath || !isAtOrBelow(path, objectPath)) return false;
    // The entry's key: the segment right below the object.
    let entryPath = path;
    while (getParentPath(entryPath) !== objectPath) entryPath = getParentPath(entryPath);
    const key = entryPath.slice(objectPath === "" ? 0 : objectPath.length + 1);
    return !isFixedKey(map, key);
  });
}
