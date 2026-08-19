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

import type { Meta, StoryObj } from "@storybook/react-vite";
import { SchemaResolverPoc } from "./SchemaResolverPoc";

const meta = {
  title: "POC/Schema Resolver",
  component: SchemaResolverPoc,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SchemaResolverPoc>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A discriminated union: the document names its own branch with `call`, so the branch is read
 * rather than scored.
 */
export const CallTasks: Story = {
  args: {
    fixtures: {
      "chargeCard — call: http": {
        call: "http",
        with: {
          method: "POST",
          endpoint: "https://api.stripe.com/v1/charges",
          headers: { Accept: "application/json" },
        },
        then: "confirmPayment",
      },
      "chargeCard — endpoint as a configuration": {
        call: "http",
        with: {
          method: "POST",
          endpoint: { uri: "https://api.stripe.com/v1/charges", authentication: { bearer: {} } },
        },
      },
      "lookupUser — call: grpc": {
        call: "grpc",
        with: {
          proto: { endpoint: "file://app/protos/user.proto" },
          service: { name: "UserService", host: "users.internal", port: 50_051 },
          method: "GetUser",
        },
      },
      "askModel — call: mcp": {
        call: "mcp",
        with: { client: { name: "acme", version: "1.0.0" }, tool: "search" },
      },
      "sendInvoice — an unregistered function name": {
        call: "sendInvoice",
        with: { customer: "${ .order.customer }" },
      },
      "notACall — with, but no discriminator": { with: { method: "POST" } },
    },
  },
};

/**
 * The other eleven task types. None carries a discriminator, so the branch is chosen by which
 * payload keys the document holds — most specific winning, so `for` + `do` is a For and not a Do.
 *
 * The unions inside them are chosen the same way, one level down: `run` by `container` / `script` /
 * `shell` / `workflow`, `listen.to` by `all` / `any` / `one`, `set` and `raise.error` by type.
 */
export const EveryTaskType: Story = {
  args: {
    fixtures: {
      "buildSummary — set as a map": {
        set: { total: "${ .order.total }", currency: "GBP" },
        then: "continue",
      },
      "buildSummary — set as a runtime expression": { set: "${ . + { total: .a + .b } }" },
      "routeOrder — switch, an ordered array of named cases": {
        switch: [
          { highValue: { when: "${ .order.total > 100 }", then: "premiumFlow" } },
          { default: { then: "standardFlow" } },
        ],
      },
      "handleFailure — try + catch, retry four levels down": {
        try: [{ charge: { set: { attempted: true } } }],
        catch: {
          as: "err",
          when: "${ .error.status >= 500 }",
          retry: { limit: { attempt: { count: 3, duration: "PT30S" } } },
        },
      },
      "transcodeVideo — run: container, with an open map": {
        run: { container: { image: "acme/transcoder", environment: { LOG: "debug", TZ: "UTC" } } },
      },
      "runScript — the same union, a different branch": {
        run: { script: { language: "js", code: "return 1;" } },
      },
      "awaitReadings — listen.to picks one of three strategies": {
        listen: { to: { one: { with: { type: "com.acme.reading.v1" } } } },
      },
      "announceShipment — emit, and a free-form data map": {
        emit: {
          event: {
            with: {
              type: "com.acme.shipped.v1",
              source: "https://acme.io",
              data: { carrier: "DHL" },
            },
          },
        },
      },
      "eachLineItem — for + do, the more specific branch wins": {
        for: { each: "item", in: "${ .order.lines }" },
        do: [{ validate: { set: { ok: true } } }],
      },
      "processOrder — do alone is a Do task": {
        do: [{ charge: { call: "http", with: { method: "POST", endpoint: "https://x.test" } } }],
      },
      "notifyAll — fork": {
        fork: { branches: [{ email: { set: { sent: true } } }], compete: true },
      },
      "rejectOrder — raise": {
        raise: { error: { type: "https://acme.io/errors/invalid", status: 400 } },
      },
      "cooldown — wait as an ISO 8601 literal": { wait: "PT5S" },
      "cooldown — wait as a runtime expression": { wait: "${ .delay }" },
      "cooldown — wait as an inline duration": { wait: { seconds: 30 } },
      "ambiguous — set and emit together": { set: {}, emit: {} },
      "invalid — a key the schema does not declare": {
        call: "http",
        with: { method: "POST", endpoint: "https://x.test", notInTheSpec: "x" },
      },
    },
  },
};
