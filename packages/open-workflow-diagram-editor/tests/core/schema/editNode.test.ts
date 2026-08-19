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

/* oxlint-disable unicorn/no-thenable -- `then` is the DSL's flow directive, not a promise. */

import { describe, expect, it } from "vitest";
import { buildEditNode, findByPath } from "../../../src/core/schema/editNode";

const httpCall = {
  call: "http",
  with: { method: "POST", endpoint: "https://api.stripe.com/v1/charges" },
  then: "confirmPayment",
};

const paths = (node: { children?: { path: string }[] } | undefined) =>
  (node?.children ?? []).map((child) => child.path);

describe("the tree", () => {
  it("gives every node a path, so a row can be addressed", () => {
    const tree = buildEditNode("chargeCard", httpCall);

    expect(tree.path).toBe("");
    expect(paths(findByPath(tree, "with"))).toEqual(["with.method", "with.endpoint"]);
    expect(findByPath(tree, "with.endpoint")?.key).toBe("endpoint");
  });

  /* CallHTTP is `allOf: [{$ref: taskBase}, {properties: {call, with}}]`, and `#/$defs/task` is a
     union of twelve. Neither has readable `properties` until it is reduced — so this is the test
     that fails first if resolution ever stops merging. */
  it("sees taskBase keys and payload keys as one flat property set", () => {
    expect(paths(buildEditNode("chargeCard", httpCall))).toEqual(
      expect.arrayContaining(["call", "with", "then"]),
    );
  });

  it("shows a key only when the document carries it or the schema requires it", () => {
    expect(paths(buildEditNode("chargeCard", httpCall))).not.toContain("metadata");
    expect(paths(buildEditNode("c", { ...httpCall, metadata: { owner: "billing" } }))).toContain(
      "metadata",
    );
  });

  it("marks required from the schema, not from the document", () => {
    const tree = buildEditNode("chargeCard", httpCall);

    expect(findByPath(tree, "call")?.required).toBe(true);
    expect(findByPath(tree, "with.endpoint")?.required).toBe(true);
    expect(findByPath(tree, "then")?.required).toBe(false);
  });

  it("carries the schema's own description, never an authored one", () => {
    expect(findByPath(buildEditNode("chargeCard", httpCall), "with.method")?.description).toBe(
      "The HTTP method of the HTTP request to perform.",
    );
  });

  /* `metadata` is a bare `type: object`, so the schema names none of its keys and the document is
     the only source for them. A key with no schema behind it still gets a row carrying its value,
     and a nested one keeps its own rows rather than collapsing into a blob. */
  it("shows keys the schema does not name, and keeps their shape", () => {
    const tree = buildEditNode("chargeCard", {
      ...httpCall,
      metadata: { owner: { team: "billing" }, tier: "gold" },
    });

    expect(findByPath(tree, "metadata")?.kind).toBe("map");
    expect(findByPath(tree, "metadata.tier")?.value).toBe("gold");
    expect(findByPath(tree, "metadata.owner")?.kind).toBe("map");
    expect(findByPath(tree, "metadata.owner.team")?.value).toBe("billing");
  });

  it("says unresolved, rather than rendering the wrong controls, when nothing places the task", () => {
    expect(buildEditNode("mystery", { with: { method: "POST" } }).kind).toBe("unresolved");
    expect(buildEditNode("mystery", { notATask: true }).kind).toBe("unresolved");
  });
});

/* One document per task type, each the smallest thing the schema accepts. If a type ever stops
   resolving — a branch renamed upstream, a `required` changed — this fails by name. */
const ONE_OF_EACH: [string, string, unknown][] = [
  ["CallHTTP", "chargeCard", httpCall],
  ["DoTask", "processOrder", { do: [{ a: { set: { x: 1 } } }] }],
  ["ForkTask", "notifyAll", { fork: { branches: [{ a: { set: { x: 1 } } }] } }],
  [
    "EmitTask",
    "announce",
    { emit: { event: { with: { type: "com.acme.v1", source: "https://acme.io" } } } },
  ],
  [
    "ForTask",
    "eachItem",
    { for: { each: "item", in: "${ .lines }" }, do: [{ a: { set: { x: 1 } } }] },
  ],
  ["ListenTask", "await", { listen: { to: { one: { with: { type: "com.acme.v1" } } } } }],
  ["RaiseTask", "reject", { raise: { error: { type: "https://acme.io/e", status: 400 } } }],
  ["RunTask", "transcode", { run: { container: { image: "acme/tool" } } }],
  ["SetTask", "buildSummary", { set: { total: 1 } }],
  ["SwitchTask", "routeOrder", { switch: [{ high: { then: "premium" } }] }],
  ["TryTask", "handleFailure", { try: [{ a: { set: { x: 1 } } }], catch: { as: "err" } }],
  ["WaitTask", "cooldown", { wait: { seconds: 30 } }],
];

describe("every task type", () => {
  it.each(ONE_OF_EACH)("resolves %s", (_title, name, task) => {
    const tree = buildEditNode(name, task);

    expect(tree.kind).not.toBe("unresolved");
    expect((tree.children ?? []).length).toBeGreaterThan(0);
  });
});

describe("choosing a union branch", () => {
  it("picks the branch whose required keys the value carries", () => {
    const run = findByPath(
      buildEditNode("transcode", { run: { container: { image: "a" } } }),
      "run",
    );

    expect(run?.kind).toBe("union");
    expect(run?.branch?.title).toBe("RunContainer");
    expect(paths(run)).toEqual(["run.container"]);
  });

  it("keeps the row a union once a branch is chosen, because the picker stays", () => {
    const to = findByPath(
      buildEditNode("await", { listen: { to: { one: { with: { type: "com.acme.v1" } } } } }),
      "listen.to",
    );

    expect(to?.kind).toBe("union");
    expect(to?.branch?.title).toBe("OneEventConsumptionStrategy");
  });

  /* THE REASON THE ENGINE USES A LIBRARY.
     These branches differ only by `pattern` — DurationExpression is `^\s*\$\{.+\}\s*$` and
     DurationLiteral is the ISO 8601 form. A rule reading only `required` and `type` sees two bare
     `type: string` branches, and either gives up or picks the first. Measured over the schema's
     literal-vs-expression unions it placed a plain URL on the *expression* branch four times. */
  it("separates a literal from a runtime expression, which needs the pattern", () => {
    const literal = findByPath(buildEditNode("cooldown", { wait: "PT5S" }), "wait");
    const expression = findByPath(buildEditNode("cooldown", { wait: "${ .delay }" }), "wait");

    expect(literal?.branch?.title).toBe("DurationLiteral");
    expect(expression?.branch?.title).toBe("DurationExpression");
  });

  it("does the same for an endpoint, where getting it wrong is silent", () => {
    const url = findByPath(buildEditNode("c", httpCall), "with.endpoint");
    const expression = findByPath(
      buildEditNode("c", { ...httpCall, with: { ...httpCall.with, endpoint: "${ .url }" } }),
      "with.endpoint",
    );

    /* By index, not by title. `#/$defs/endpoint/oneOf/0` is the runtime expression and `/1` is the
       URI — that is the distinction that matters, and it is the one identity a branch always has.
       Titles are optional, and the branches here are bare `$ref`s that declare none. */
    expect(url?.branch?.index).toBe(1);
    expect(expression?.branch?.index).toBe(0);
    expect(expression?.branch?.title).toBe("RuntimeExpression");
  });

  /* The known limit of asking the validator: it answers by *type name*, and `#/$defs/uriTemplate`'s
     two branches — `LiteralUriTemplate` and `LiteralUri` — are anonymous `pattern` strings the SDK
     registers no type for. So the walk places `endpoint` on the URI branch and stops there rather
     than guessing which of the two it is. It could not tell anyway: they share a `pattern`, and a
     template accepts every plain URI, so both would accept this value. */
  it("stops at a union whose branches the validator cannot be asked about", () => {
    const endpoint = findByPath(buildEditNode("c", httpCall), "with.endpoint");

    expect(endpoint?.branch?.index).toBe(1);
    expect(endpoint?.resolved.title).toBe("UriTemplate");
    expect(endpoint?.resolved.anyOf).toHaveLength(2);
  });

  /* Same limit, and the reason it is worth a second test: `set` is an everyday field, not an
     exotic one. Both branches of `setTask.set` are anonymous, so the row renders as an unset
     picker. Closing this needs the SDK to expose branch selection by pointer. */
  it("leaves a union unset when every branch is anonymous", () => {
    const set = findByPath(buildEditNode("s", { set: { total: 1 } }), "set");

    expect(set?.kind).toBe("union");
    expect(set?.branch).toBeUndefined();
    expect(set?.children).toBeUndefined();
  });
});

describe("arrays and maps", () => {
  it("gives array items an indexed path", () => {
    const tree = buildEditNode("routeOrder", {
      switch: [{ high: { when: "${ .t > 100 }", then: "premium" } }, { low: { then: "standard" } }],
    });

    expect(paths(findByPath(tree, "switch"))).toEqual(["switch[0]", "switch[1]"]);
  });

  it("takes a map's keys from the document, since the schema names none", () => {
    const tree = buildEditNode("transcode", {
      run: { container: { image: "acme/tool", environment: { LOG: "debug", TZ: "UTC" } } },
    });
    const environment = findByPath(tree, "run.container.environment");

    expect(environment?.kind).toBe("map");
    expect((environment?.children ?? []).map((child) => child.key)).toEqual(["LOG", "TZ"]);
    expect(findByPath(tree, "run.container.environment.LOG")?.value).toBe("debug");
  });
});

describe("raw and resolved", () => {
  it("shows the declaration before resolution and the chosen branch after", () => {
    const endpoint = findByPath(buildEditNode("c", httpCall), "with.endpoint");

    /* `raw` is what the schema writes at this position — a `$ref` with its own label beside it. */
    expect(endpoint?.raw.$ref).toBe("#/$defs/endpoint");
    expect(endpoint?.raw.oneOf).toBeUndefined();
    expect(endpoint?.resolved.title).toBe("UriTemplate");
  });

  it("leaves a schema alone when there is nothing to reduce", () => {
    const method = findByPath(buildEditNode("c", httpCall), "with.method");

    expect(JSON.stringify(method?.raw)).toBe(JSON.stringify(method?.resolved));
  });
});

describe("a document the schema rejects", () => {
  /* 76 definitions carry `unevaluatedProperties: false`, so a single key the schema does not
     declare invalidates the whole branch and nothing can place the task. This milestone's answer
     is to say so rather than guess: `unresolved` is a state the panel renders. A shape-based
     fallback would let the panel draw rows for a half-typed task, and is the obvious next step —
     but it is a guess, and guessing is what this engine exists to avoid, so it waits until we know
     how often a real document lands here. */
  const invalid = {
    call: "http",
    with: { method: "POST", endpoint: "https://x.test", notInTheSpec: "x" },
  };

  it("says unresolved for a task carrying a key the schema does not declare", () => {
    expect(buildEditNode("chargeCard", invalid).kind).toBe("unresolved");
  });

  it("says unresolved for a task that is merely incomplete", () => {
    expect(buildEditNode("chargeCard", { call: "http", with: { method: "POST" } }).kind).toBe(
      "unresolved",
    );
  });

  it("keeps the value on the node, so nothing is lost", () => {
    expect(buildEditNode("chargeCard", invalid).value).toBe(invalid);
  });
});
