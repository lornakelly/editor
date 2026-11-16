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

import { isObjectNotArray } from "../../../core/utils";

/**
 * Everything the editor keys by path holds a list entry's **index** (`listen.to.all.1.with`), so
 * removing an entry must renumber what came after it, in every store, or the next entry takes
 * over the removed one's option choices, texts and rows. These are the pure halves of that.
 */

const INDEX = /^\d+$/;

/** Renumbers one entry-keyed node: drops `removed`, moves later entries down by one. */
function shiftEntries(node: unknown, removed: number): unknown {
  if (Array.isArray(node)) return node.filter((_entry, index) => index !== removed);
  if (!isObjectNotArray(node)) return node;
  const shifted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (!INDEX.test(key)) {
      shifted[key] = value;
      continue;
    }
    const index = Number(key);
    if (index === removed) continue;
    shifted[String(index > removed ? index - 1 : index)] = value;
  }
  return shifted;
}

/**
 * An index-keyed tree (sentinels, inner text) with entry `removed` of `listPath` dropped and later
 * entries renumbered. Copies along the path; never mutates `tree`. The entries may be an array or
 * an object with numeric keys (RHF makes arrays for numeric segments it creates itself).
 */
export function shiftEntryTree(
  tree: Record<string, unknown>,
  listPath: string,
  removed: number,
): Record<string, unknown> {
  const [head, ...rest] = listPath.split(".");
  if (head === undefined || !Object.prototype.hasOwnProperty.call(tree, head)) return tree;
  const child = tree[head];
  if (rest.length === 0) return { ...tree, [head]: shiftEntries(child, removed) };
  if (!isObjectNotArray(child)) return tree;
  return { ...tree, [head]: shiftEntryTree(child, rest.join("."), removed) };
}

/**
 * A flat key (a map path in the map-rows record, an added field's path) after the removal:
 * renumbered if it is under a later entry, `undefined` if it is under the removed one.
 */
export function shiftEntryKey(key: string, listPath: string, removed: number): string | undefined {
  const prefix = `${listPath}.`;
  if (!key.startsWith(prefix)) return key;
  const [index, ...rest] = key.slice(prefix.length).split(".");
  if (index === undefined || !INDEX.test(index)) return key;
  const n = Number(index);
  if (n === removed) return undefined;
  return [`${listPath}.${n > removed ? n - 1 : n}`, ...rest].join(".");
}
