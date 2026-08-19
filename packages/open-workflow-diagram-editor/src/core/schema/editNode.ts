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

import { SchemaValidationError, validate, workflowSchema } from "@openworkflowspec/sdk";
import type { JsonSchema } from "./types";

/**
 * The rows an edit panel draws for one task, computed from the DSL schema and the document.
 *
 * Two rules hold everywhere below, and they are what this file is for:
 *
 * 1. **The schema is read at runtime and nothing is generated from it.** When DSL 1.0.4 ships the
 *    only change here is bumping the SDK.
 * 2. **A union branch is chosen by *validating* the value, never by guessing from its shape.**
 *    Several DSL unions are separated by `pattern` alone — `DurationLiteral` is ISO 8601 and
 *    `DurationExpression` is `^\s*\$\{.+\}\s*$`, both bare `type: string` — so a rule reading
 *    `required` and `type` renders a plain URL as a runtime expression. The validator used is the
 *    SDK's own {@link validate}: the same one that will later refuse to save.
 */

const SCHEMA = workflowSchema as JsonSchema;

/** Where a task starts. `#/$defs/task` is the union of all twelve; nothing here lists them. */
const TASK: JsonSchema = { $ref: "#/$defs/task" };

/* ------------------------------------------------------------------------------------------------
 * Reading the schema
 * ---------------------------------------------------------------------------------------------- */

/*
* Finds a piece of the schema using a path like #/$defs/task. 
* Example: nodeAt("#/$defs/task") → returns the task definition from the schema
*/
function nodeAt(pointer: string): JsonSchema | undefined {
  let node: unknown = SCHEMA;

  for (const token of pointer
    .replace(/^[^#]*#/, "")
    .split("/")
    .slice(1)) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[token.replaceAll("~1", "/").replaceAll("~0", "~")];
  }

  return node as JsonSchema | undefined;
}

/**
 * Follows $ref links and merges allOf parts to get the complete schema for a node
 * Example: If schema says $ref: "#/$defs/taskBase", it fetches that definition and combines it
 */
function resolve(node: JsonSchema | undefined, seen: ReadonlySet<string> = new Set()): JsonSchema {
  if (node === null || node === undefined || typeof node !== "object") return {};

  if (typeof node.$ref === "string") {
    if (seen.has(node.$ref)) return {};

    const { $ref, ...siblings } = node;

    return { ...resolve(nodeAt($ref), new Set([...seen, $ref])), ...siblings };
  }

  if (Array.isArray(node.allOf)) {
    const { allOf, ...ownKeywords } = node;

    return [...allOf.map((part) => resolve(part, seen)), ownKeywords].reduce(mergePart, {});
  }

  return node;
}

/*
* Helper for resolve() - combines two schema pieces together
* Example: Combines properties and required fields from multiple schema parts
*/
function mergePart(accumulator: JsonSchema, part: JsonSchema): JsonSchema {
  const merged: JsonSchema = { ...accumulator, ...part };

  const properties = { ...accumulator.properties, ...part.properties };
  if (Object.keys(properties).length > 0) merged.properties = properties;

  const required = [...new Set([...(accumulator.required ?? []), ...(part.required ?? [])])];
  if (required.length > 0) merged.required = required;

  return merged;
}

/*
* Checks if schema has multiple options (union type)
* Example: Returns the array of options from oneOf or anyOf
*/
const branchesOf = (schema: JsonSchema): JsonSchema[] | undefined => schema.oneOf ?? schema.anyOf;

type Verdict = "accepts" | "rejects" | "unknown";

/*
* Asks the SDK validator "does this value match this type?"
* Returns: "accepts" / "rejects" / "unknown"
* ask(["CallHTTP"], {call: "http"}) → "accepts"
*/
function ask(typeNames: string[], value: unknown): Verdict {
  for (const typeName of typeNames) {
    try {
      validate(typeName, value);
      return "accepts";
    } catch (error) {
      if (error instanceof SchemaValidationError) return "rejects";
    }
  }

  return "unknown";
}

/**
 * Gets the names the SDK might know a branch by
 * Example: A branch might be called "DurationExpression" or "RuntimeExpression"
 */
function typeNamesFor(branch: JsonSchema): string[] {
  const own = resolve(branch).title;
  const target = typeof branch.$ref === "string" ? resolve(nodeAt(branch.$ref)).title : undefined;

  return [own, target].filter(
    (name, index, all): name is string => name !== undefined && all.indexOf(name) === index,
  );
}

/*
* Figures out which option from a union the value matches 
* For {call: "http"}, picks the "CallHTTP" branch from the task union
*/
function chooseBranch(
  union: JsonSchema,
  value: unknown,
): { index: number; schema: JsonSchema; title?: string | undefined } | undefined {
  const branches = branchesOf(union);
  if (branches === undefined) return undefined;

  const resolved = branches.map((branch) => resolve(branch));
  const verdicts = branches.map((branch) => ask(typeNamesFor(branch), value));
  const matching = (want: Verdict) =>
    verdicts.flatMap((verdict, index) => (verdict === want ? [index] : []));

  const accepted = matching("accepts");
  const unknown = matching("unknown");

  if (accepted.length === 1 || (accepted.length > 1 && union.anyOf !== undefined)) {
    return described(accepted[0]!, resolved);
  }

  if (accepted.length === 0 && unknown.length === 1) return described(unknown[0]!, resolved);

  return undefined;
}

/* 
* Helper that packages up the chosen branch info
* Returns: {index: 0, schema: {...}, title: "CallHTTP"}
*/
const described = (index: number, resolved: JsonSchema[]) => ({
  index,
  schema: resolved[index]!,
  title: resolved[index]!.title,
});

/* ------------------------------------------------------------------------------------------------
 * The tree
 * ---------------------------------------------------------------------------------------------- */

/** What kind of control a value gets. Decided by the schema, never by the key name. */
export type EditNodeKind =
  | "object"
  | "map"
  | "array"
  | "union"
  | "enum"
  | "boolean"
  | "scalar"
  /* No branch could be identified, so the panel has nothing reliable to render. */
  | "unresolved";

export interface EditNode {
  /**
   * Dotted path from the task root — `""` for the root, `with.endpoint` for a leaf.
   *
   * A row has to be **addressable** by something other than its position: errors arrive against a
   * path, dirty state is tracked per path, and putting the cursor back in a field after a re-render
   * means naming that field. Retrofitting this means reworking the tree, so it is here from the
   * first walk.
   *
   * The format matches `getNodeErrorField`, which already turns an SDK error's pointer into a
   * dot-joined path relative to the task (`with`, `with.endpoint`) — so an error routes to a row by
   * string equality, with nothing to convert.
   */
  path: string;
  key: string;
  kind: EditNodeKind;
  required: boolean;
  value: unknown;
  /* `| undefined` spelled out because the package sets `exactOptionalPropertyTypes`: the schema may
     genuinely have no title, and "absent" and "present but undefined" are the same fact here. */
  title?: string | undefined;
  description?: string | undefined;
  children?: EditNode[] | undefined;
  /**
   * For a union: which branch the value was placed in, if one could be.
   *
   * Absent means *nothing was chosen*, and that is a state the panel renders rather than an error —
   * a picker, opened unset. Which is why the row stays `kind: "union"` even once a branch is found.
   */
  branch?: { index: number; title?: string | undefined } | undefined;
  /**
   * POC ONLY — the schema at this position before and after resolution, so the explorer can show
   * the mapping. A production `EditNode` holds no schemas: it is the *answer*, and keeping the
   * question beside it doubles the tree for nothing.
   */
  raw: JsonSchema;
  resolved: JsonSchema;
}

/**
 * Ask the schema which control this is.
 *
 * `value` is consulted only where the schema declines to say anything — a key this DSL version does
 * not declare resolves to the empty schema, which permits everything, and there the document is the
 * only evidence of shape. Guessing "scalar" instead would flatten a nested object into one
 * unedittable blob.
 */
function classify(schema: JsonSchema, value: unknown): EditNodeKind {
  if (branchesOf(schema) !== undefined) return "union";
  if (Array.isArray(schema.enum)) return "enum";
  if (schema.additionalProperties && typeof schema.additionalProperties === "object") return "map";
  if (schema.type === "array") return "array";
  /* An object that declares no properties is an open map, not a fixed object: JSON Schema's default
     is `additionalProperties: true`, so every key is legal and none is named. The DSL leans on that
     default — `ContainerEnvironment`, `metadata` and an emitted event's `data` are all a bare
     `type: object` — and calling them objects gives them a fixed-fields control with no fields. */
  if (schema.type === "object" && schema.properties === undefined) return "map";
  if (schema.type === "object" || schema.properties) return "object";
  if (schema.type === "boolean") return "boolean";
  if (schema.type !== undefined) return "scalar";

  return Array.isArray(value)
    ? "array"
    : value !== null && typeof value === "object"
      ? "map"
      : "scalar";
}

/**
 * A key gets a row iff the document carries it, or the schema requires it.
 *
 * Required keys lead, in schema order, then whatever else the document holds. Everything else the
 * schema allows belongs behind `Add field`, which this POC does not build.
 */
function rowKeys(schema: JsonSchema, value: unknown): string[] {
  const required = schema.required ?? [];
  const present = value !== null && typeof value === "object" ? Object.keys(value) : [];
  const declared = Object.keys(schema.properties ?? {});

  const ordered = declared.filter((key) => required.includes(key));
  const rest = present.filter((key) => !ordered.includes(key));

  return [...ordered, ...rest];
}

/**
 * A runaway guard, not a display limit.
 *
 * The document bounds the walk in practice — a key only gets a row when it is present or required —
 * so this exists for the case where that is not true. It is generous because depth is not what a
 * reader would count: one level of nested `do` costs three (array, then open map, then the task
 * union), so an ordinary three-deep workflow is already at nine.
 */
const MAX_DEPTH = 32;

function walk(
  path: string,
  key: string,
  declared: JsonSchema,
  value: unknown,
  required: boolean,
  depth: number,
): EditNode {
  const merged = resolve(declared);

  /* Descend through nested unions in one step: `#/$defs/task` picks `callTask`, which is itself a
     union that picks `CallHTTP`. The *outermost* choice is what the row reports, because that is
     the one a picker on this row would change. */
  let placed = merged;
  let branch: EditNode["branch"];

  for (let guard = 0; branchesOf(placed) !== undefined && guard < MAX_DEPTH; guard++) {
    const chosen = chooseBranch(placed, value);
    /* Stop, but keep what is already known: an inner union we cannot place does not un-place the
       outer one, and reporting no branch at all would hide a row we can identify. */
    if (chosen === undefined) break;

    branch ??= { index: chosen.index, title: chosen.title };
    placed = chosen.schema;
  }

  const editNode: EditNode = {
    path,
    key,
    kind: classify(merged, value),
    required,
    value,
    /* Both labels from one place, and that place is the *declaration*: `merged` carries the
       keywords written beside the `$ref`, so `then` reads "The flow directive to be performed upon
       completion of the task." rather than the generic definition it points at. Which variant the
       value turned out to be is `branch.title`, separately. */
    title: merged.title,
    description: merged.description,
    branch,
    raw: declared,
    resolved: placed,
  };

  if (depth >= MAX_DEPTH) return editNode;

  editNode.children = childrenOf(path, placed, value, depth);
  return editNode;
}

/** The rows that sit under a node, or `undefined` where a node has none. */
function childrenOf(
  path: string,
  schema: JsonSchema,
  value: unknown,
  depth: number,
): EditNode[] | undefined {
  const child = (
    key: string | number,
    childSchema: JsonSchema | undefined,
    isRequired: boolean,
    childPath: string,
  ) =>
    /* A key this DSL version does not declare still gets a row, drawn from the empty schema: the
       panel shows the value it found rather than losing it. */
    walk(childPath, String(key), childSchema ?? {}, readKey(value, key), isRequired, depth + 1);

  switch (classify(schema, value)) {
    case "object": {
      const required = schema.required ?? [];
      return rowKeys(schema, value).map((key) =>
        child(
          key,
          schema.properties?.[key],
          required.includes(key),
          path === "" ? key : `${path}.${key}`,
        ),
      );
    }

    /* Indexed, because position is the only name an array item has — and in `switch` and `do`,
       position is also execution order, so it is information rather than bookkeeping. */
    case "array":
      if (!Array.isArray(value)) return undefined;
      return value.map((_item, index) => child(index, schema.items, false, `${path}[${index}]`));

    /* An open map names none of its keys in the schema, so the document is the only source for
       them — the one place the walk reads shape from data rather than from the schema. */
    case "map": {
      if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
      const each =
        typeof schema.additionalProperties === "object" ? schema.additionalProperties : undefined;
      return Object.keys(value).map((key) => child(key, each, false, `${path}.${key}`));
    }

    default:
      return undefined;
  }
}

function readKey(value: unknown, key: string | number): unknown {
  if (typeof key === "number") return Array.isArray(value) ? value[key] : undefined;

  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

/**
 * Build the tree of rows for a task.
 *
 * One entry point for all twelve types: `#/$defs/task` is a union of them, and the branch is chosen
 * by validating — including `call`, whose nested union is resolved in the same descent. Nothing
 * here lists a task type or a call variant.
 */
export function buildEditNode(name: string, task: unknown): EditNode {
  const node = walk("", name, TASK, task, true, 0);

  return node.branch === undefined ? { ...node, kind: "unresolved", children: undefined } : node;
}

/** Find a node by its dotted path. The POC's selection, and what errors and focus will use. */
export function findByPath(node: EditNode, path: string): EditNode | undefined {
  if (node.path === path) return node;

  for (const child of node.children ?? []) {
    const hit = findByPath(child, path);
    if (hit !== undefined) return hit;
  }

  return undefined;
}
