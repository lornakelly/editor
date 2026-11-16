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

import type { ObjectListField } from "../../../core/schemaToFormFields";
import { filterReadOnlyFields, getNestedValue } from "../taskFormContext";

/**
 * Which values identify an entry, keyed by the list items' `$defs` name
 * (`ObjectListField.itemDef`). The schema doesn't say which attribute names a filter, so this
 * registry does. The first set value titles the row; the rest go on its second line.
 */
export const ENTRY_SUMMARY_PATHS: Readonly<Record<string, readonly string[]>> = {
  eventFilter: ["with.type", "with.source"],
};

export type EntrySummary = {
  /** The first set summary value; undefined → the row says "<itemLabel> <n>". */
  title?: string;
  /** The other set summary values. */
  detail: string[];
  /** How many of the entry's own fields are set, for a row with no detail to show. */
  setCount: number;
};

/** What an entry row says about `entry`, one item of `list`. */
export function entrySummary(list: ObjectListField, entry: unknown): EntrySummary {
  const data =
    entry !== null && typeof entry === "object" && !Array.isArray(entry)
      ? (entry as Record<string, unknown>)
      : {};
  const paths = list.itemDef === undefined ? [] : (ENTRY_SUMMARY_PATHS[list.itemDef] ?? []);
  const values = paths.flatMap((path) => {
    const value = getNestedValue(data, path);
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? value === ""
        ? []
        : [String(value)]
      : [];
  });
  const [title, ...detail] = values;
  return {
    ...(title !== undefined ? { title } : {}),
    detail,
    setCount: filterReadOnlyFields(list.itemFields, data).length,
  };
}
