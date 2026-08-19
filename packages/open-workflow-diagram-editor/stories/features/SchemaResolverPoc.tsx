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
 * PROOF OF CONCEPT — not shipped, not reachable from the editor.
 *
 * Answers two questions at once, which is the only reason it is two panes:
 *
 *   left   — how the panel would use the SDK: rows built entirely by `buildEditNode`
 *   right  — what the SDK returned at the row you clicked, raw and resolved
 *
 * So a row that looks wrong is traceable to the schema that produced it, in one click. Nothing here
 * is authored per task type: every label, every `*` and every nesting level comes from the schema.
 */

import { useState } from "react";
import { dump } from "js-yaml";
import { workflowSchema } from "@openworkflowspec/sdk";
/* Relative, not the `@/` alias: that path mapping is tsconfig-only and Storybook's Vite does not
   resolve it from `stories/`, which every existing story here reflects. */
import { buildEditNode, findByPath, type EditNode } from "../../src/core/schema";

/**
 * The fixture as the editor would actually receive it: a whole workflow document, not a bare task.
 *
 * The panel edits one task, but the user hands over the file — so seeing the YAML beside the rows
 * is what makes the mapping legible. The DSL version is read from the schema's own `$id` rather
 * than written here, so this document stays valid against whatever the SDK ships.
 */
function asWorkflowYaml(name: string, task: unknown): string {
  const dsl = /schemas\/([^/]+)\//.exec(
    String((workflowSchema as { $id?: string }).$id ?? ""),
  )?.[1];

  return dump(
    {
      document: {
        dsl: dsl ?? "1.0.3",
        name: name.replaceAll(/[A-Z]/g, (character) => `-${character.toLowerCase()}`),
        version: "1.0.0",
        namespace: "default",
      },
      do: [{ [name]: task }],
    },
    { lineWidth: 88, noRefs: true },
  );
}

const KIND_HINT: Record<string, string> = {
  union: "oneOf — the branch below was chosen by asking the SDK's validator, not by guessing",
  object: "properties readable because allOf was merged",
  map: "an open map — keys come from the document, because the schema names none",
  array: "items",
  enum: "a closed list",
  scalar: "a leaf",
  boolean: "a leaf",
  unresolved: "no branch could be identified — the panel says so rather than guessing",
};

function Row({
  node,
  depth,
  selected,
  onSelect,
}: {
  node: EditNode;
  depth: number;
  selected: string;
  onSelect: (path: string) => void;
}) {
  const isLeaf = (node.children?.length ?? 0) === 0;

  return (
    <>
      <li>
        <button
          type="button"
          className={`sr-row${node.path === selected ? " sr-row-on" : ""}`}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          onClick={() => onSelect(node.path)}
        >
          <span className="sr-key">{node.key}</span>
          {node.required ? <span className="sr-req">*</span> : null}
          <span className="sr-kind">
            {node.kind}
            {node.kind === "union" ? (node.branch ? ` → ${branchName(node)}` : " → unset") : ""}
          </span>
          {isLeaf ? <span className="sr-val">{formatValue(node.value)}</span> : null}
        </button>
      </li>
      {node.children?.map((child) => (
        <Row
          key={child.path}
          node={child}
          depth={depth + 1}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

/** A branch's own title, or its position when the schema gave it none. */
function branchName(node: EditNode): string {
  if (node.branch === undefined) return "unset";
  return node.branch.title ?? `branch ${node.branch.index}`;
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return "not set";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function Json({ label, value, note }: { label: string; value: unknown; note?: string }) {
  return (
    <section className="sr-json">
      <h4>
        {label}
        {note === undefined ? null : <span className="sr-hint"> — {note}</span>}
      </h4>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </section>
  );
}

/** The fixtures live in the story, so a new task type is a story rather than a change here. */
export function SchemaResolverPoc({ fixtures }: { fixtures: Record<string, unknown> }) {
  const [fixture, setFixture] = useState(Object.keys(fixtures)[0]!);
  const [selected, setSelected] = useState("");

  /* A fixture set swapped underneath us leaves `fixture` naming a key that no longer exists. */
  const current = fixture in fixtures ? fixture : Object.keys(fixtures)[0]!;
  const taskName = current.split(" — ")[0]!;
  const tree = buildEditNode(taskName, fixtures[current]);
  const node = findByPath(tree, selected) ?? tree;

  /* Most nodes resolve to themselves: resolution only does something where the schema wrote a
     `$ref` or an `allOf`, and most leaf properties are written inline. Printing identical JSON
     twice reads as a bug, so the two blocks collapse into one when they agree. */
  const identical = JSON.stringify(node.raw) === JSON.stringify(node.resolved);

  return (
    <div className="sr">
      <style>{CSS}</style>

      <header className="sr-hd">
        <strong>Schema resolver — proof of concept</strong>
        <span>
          rows on the left are built only from <code>resolveSchema</code> /{" "}
          <code>resolveSchemaAt</code>; click one to see what the SDK returned for it
        </span>
        <select
          value={current}
          onChange={(event) => {
            setFixture(event.target.value);
            setSelected("");
          }}
        >
          {Object.keys(fixtures).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </header>

      <div className="sr-panes">
        <div className="sr-pane">
          <details className="sr-src" open>
            <summary>What the user handed the editor</summary>
            <pre>{asWorkflowYaml(taskName, fixtures[current])}</pre>
          </details>

          <h3>The rows the panel would draw</h3>
          <ul className="sr-tree">
            <Row node={tree} depth={0} selected={node.path} onSelect={setSelected} />
          </ul>
          {tree.kind === "unresolved" ? (
            <p className="sr-note">
              No branch could be placed. The SDK&rsquo;s validator rejected every task type for this
              document — usually one key it does not declare, since most definitions are closed. The
              answer here is to say so rather than guess: a shape-based fallback could draw rows for
              a half-typed task, but it would be guessing, which is what this engine exists to
              avoid.
            </p>
          ) : null}
        </div>

        <div className="sr-pane">
          <h3>
            What the schema says at <code>{node.path === "" ? node.key : node.path}</code>
          </h3>
          <p className="sr-note">
            The SDK hands over two things and neither is per-row: <code>workflowSchema</code>, one
            constant holding the whole DSL schema, and <code>validate(typeName, value)</code>, a
            yes/no for one type name. Everything below is this editor reading that one object —
            following <code>$ref</code>, merging <code>allOf</code>, and asking the validator which
            union branch the value belongs to.
          </p>

          <dl className="sr-facts">
            <dt>kind</dt>
            <dd>
              {node.kind} <span className="sr-hint">{KIND_HINT[node.kind]}</span>
            </dd>
            <dt>branch</dt>
            <dd>
              {node.kind === "union" ? (
                node.branch ? (
                  <>
                    {branchName(node)} <span className="sr-hint">index {node.branch.index}</span>
                  </>
                ) : (
                  <>
                    none chosen{" "}
                    <span className="sr-hint">
                      nothing fits, or two fit equally well — the panel opens a picker unset
                    </span>
                  </>
                )
              ) : (
                "—"
              )}
            </dd>
            <dt>required</dt>
            <dd>{String(node.required)}</dd>
            <dt>title</dt>
            <dd>{node.title ?? "—"}</dd>
            <dt>description</dt>
            <dd>{node.description ?? "—"}</dd>
            <dt>properties</dt>
            <dd>{Object.keys(node.resolved.properties ?? {}).join(", ") || "—"}</dd>
            <dt>required keys</dt>
            <dd>{(node.resolved.required ?? []).join(", ") || "—"}</dd>
            <dt>value in the document</dt>
            <dd>{formatValue(node.value)}</dd>
          </dl>

          {identical ? (
            <Json
              label="RAW = RESOLVED"
              value={node.raw}
              note="nothing to resolve — this position is written out in full, with no $ref, no allOf and no union"
            />
          ) : (
            <>
              <Json
                label="RAW"
                value={node.raw}
                note="the literal slice of workflowSchema at this position, exactly as written"
              />
              <Json
                label="RESOLVED"
                value={node.resolved}
                note="what it means: $ref followed, allOf merged, and any union branch chosen by validating the value"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const CSS = `
.sr {
  --sr-bg: #ffffff; --sr-ink: #16202b; --sr-soft: #5b6875; --sr-line: #dde3ea;
  --sr-chip: #f1f5f9; --sr-accent: #0f766e; --sr-req: #16202b;
  font: 13px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--sr-ink); background: var(--sr-bg); height: 100vh;
  display: flex; flex-direction: column;
}
@media (prefers-color-scheme: dark) {
  .sr {
    --sr-bg: #10161e; --sr-ink: #e6ecf2; --sr-soft: #94a3b3; --sr-line: #2a3440;
    --sr-chip: #1b242f; --sr-accent: #2dd4bf; --sr-req: #e6ecf2;
  }
}
.sr code, .sr pre { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.sr-hd {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 10px 14px; border-bottom: 1px solid var(--sr-line);
}
.sr-hd span { color: var(--sr-soft); font-size: 12px; }
.sr-hd select { margin-left: auto; font: inherit; padding: 4px 6px; }
.sr-panes { display: grid; grid-template-columns: minmax(320px, 1fr) minmax(360px, 1.1fr); flex: 1; min-height: 0; }
.sr-pane { overflow: auto; padding: 12px 14px; min-width: 0; }
.sr-pane + .sr-pane { border-left: 1px solid var(--sr-line); }
.sr-pane h3 { margin: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--sr-accent); }
.sr-tree { list-style: none; margin: 0; padding: 0; }
.sr-row {
  display: flex; align-items: baseline; gap: 7px; width: 100%; text-align: left;
  font: inherit; background: none; border: none; cursor: pointer;
  padding: 4px 6px; border-radius: 5px; color: inherit;
}
.sr-row:hover { background: var(--sr-chip); }
.sr-row:focus-visible { outline: 2px solid var(--sr-accent); outline-offset: -2px; }
.sr-row-on { background: var(--sr-chip); box-shadow: inset 2px 0 0 var(--sr-accent); }
.sr-key { font-family: ui-monospace, monospace; font-weight: 600; }
.sr-req { color: var(--sr-req); font-weight: 700; }
.sr-kind { font-size: 10.5px; color: var(--sr-soft); text-transform: uppercase; letter-spacing: 0.06em; }
.sr-val { margin-left: auto; font-family: ui-monospace, monospace; font-size: 11.5px; color: var(--sr-soft); overflow-wrap: anywhere; max-width: 45%; }
.sr-note { color: var(--sr-soft); font-size: 12px; border-left: 2px solid var(--sr-line); padding-left: 10px; }
.sr-facts { display: grid; grid-template-columns: 130px 1fr; gap: 4px 12px; margin: 0 0 14px; }
.sr-facts dt { color: var(--sr-soft); font-size: 11.5px; }
.sr-facts dd { margin: 0; overflow-wrap: anywhere; }
.sr-hint { color: var(--sr-soft); font-size: 11.5px; }
.sr-json h4 { margin: 12px 0 4px; font-size: 11.5px; color: var(--sr-soft); letter-spacing: 0.04em; }
.sr-src { margin: 0 0 14px; border: 1px solid var(--sr-line); border-radius: 7px; background: var(--sr-chip); }
.sr-src > summary {
  cursor: pointer; padding: 7px 10px; font-size: 11px; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--sr-accent); font-weight: 700; list-style: none;
}
.sr-src > summary::-webkit-details-marker { display: none; }
.sr-src pre {
  margin: 0; padding: 0 10px 10px; font-size: 11.5px; line-height: 1.5;
  overflow-x: auto; max-height: 230px; overflow-y: auto;
}
.sr-json pre {
  margin: 0; padding: 9px 11px; background: var(--sr-chip); border: 1px solid var(--sr-line);
  border-radius: 7px; overflow-x: auto; font-size: 11.5px; line-height: 1.5; max-height: 340px;
}
`;
