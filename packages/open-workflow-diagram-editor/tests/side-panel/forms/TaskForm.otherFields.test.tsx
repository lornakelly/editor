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
 * "Other fields": the keys an object allows beyond its own properties, here CloudEvents extension
 * attributes beside an emit event's `type` and `source`. Its entries live in the event's `with`
 * object, so editing them must never touch the fixed attributes beside them.
 */

import { describe, it, expect, vi } from "vitest";
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Specification } from "@openworkflowspec/sdk";
vi.mock("../../../src/side-panel/forms/ui/combobox", async () => {
  const { createComboboxStub } = await import("../../test-utils/combobox-stub");
  return createComboboxStub();
});

const { EMIT_OTHER_FIELDS_WORKFLOW } = await import("../../fixtures/workflows");
const { parseFixture } = await import("../../test-utils");
const { renderTaskPanel, panel } = await import("../../test-utils/panel-helpers");

const model = parseFixture(EMIT_OTHER_FIELDS_WORKFLOW);
const WITH_EXTRAS = "/do/notifyShipped";
const WITHOUT_EXTRAS = "/do/notifyPlain";
const OTHER_FIELDS = "Other fields";

type EmitTask = Specification.EmitTask;
const eventOf = (task: unknown) => (task as EmitTask).emit?.event?.with as Record<string, unknown>;

const keyInputs = () => screen.queryAllByRole("textbox", { name: "Entry key" });
const valueInputs = () => screen.queryAllByRole("textbox", { name: "Entry value" });
const keys = () => keyInputs().map((input) => (input as HTMLInputElement).value);

async function apply(p: Awaited<ReturnType<typeof renderTaskPanel>>) {
  await p.user.click(panel.apply());
  await act(async () => {});
}

describe("emit: Other fields", () => {
  it("shows the extension attributes as one Other fields row", async () => {
    await renderTaskPanel(model, WITH_EXTRAS);
    expect(panel.row(OTHER_FIELDS)).toHaveAccessibleName(/2 entries/);
    expect(panel.chip(OTHER_FIELDS)).toBeNull();
  });

  it("lists only the extension attributes in its level, never the event's own", async () => {
    const p = await renderTaskPanel(model, WITH_EXTRAS);
    await panel.drillInto(p.user, OTHER_FIELDS);
    expect(keys()).toEqual(["tenantid", "traceparent"]);
  });

  it("shows them as text in read-only", async () => {
    await renderTaskPanel(model, WITH_EXTRAS, { isReadOnly: true });
    await panel.drillInto(userEvent.setup(), OTHER_FIELDS);
    expect(screen.getByText("tenantid")).toBeInTheDocument();
    expect(screen.getByText("acme-eu")).toBeInTheDocument();
    expect(screen.queryByText("com.acme.order.shipped")).toBeNull();
  });

  it("offers a chip on an event without any", async () => {
    await renderTaskPanel(model, WITHOUT_EXTRAS);
    expect(panel.chip(OTHER_FIELDS)).not.toBeNull();
  });

  it("commits an edited entry as one change, the event's own attributes untouched", async () => {
    const p = await renderTaskPanel(model, WITH_EXTRAS);
    await panel.drillInto(p.user, OTHER_FIELDS);
    await p.user.clear(valueInputs()[0]!);
    await p.user.type(valueInputs()[0]!, "acme-us");
    expect(panel.status()).toBe("1 changed");

    await apply(p);
    expect(eventOf(p.committedTask())).toEqual({
      type: "com.acme.order.shipped",
      source: "https://acme.com/shipping",
      tenantid: "acme-us",
      traceparent: "${ $context.trace }",
    });
  });

  it("counts every entry edited as one change, beside an edit to Type", async () => {
    const p = await renderTaskPanel(model, WITH_EXTRAS);
    const type = screen.getByDisplayValue("com.acme.order.shipped");
    await p.user.type(type, ".v2");
    await panel.drillInto(p.user, OTHER_FIELDS);
    await p.user.type(valueInputs()[0]!, "-1");
    await p.user.type(valueInputs()[1]!, " ");
    expect(panel.status()).toBe("2 changed");
  });

  it("removes every entry with ✕, keeping the event's own attributes", async () => {
    const p = await renderTaskPanel(model, WITH_EXTRAS);
    await p.user.click(screen.getByRole("button", { name: `Remove ${OTHER_FIELDS}` }));
    expect(panel.chip(OTHER_FIELDS)).not.toBeNull();
    expect(panel.status()).toBe("1 changed");

    await apply(p);
    expect(eventOf(p.committedTask())).toEqual({
      type: "com.acme.order.shipped",
      source: "https://acme.com/shipping",
    });
  });

  it("adds an entry to an event without any", async () => {
    const p = await renderTaskPanel(model, WITHOUT_EXTRAS);
    await panel.add(p.user, OTHER_FIELDS);
    await p.user.click(screen.getByRole("button", { name: "Add property" }));
    await p.user.type(keyInputs()[0]!, "tenantid");
    await p.user.type(valueInputs()[0]!, "acme-eu");

    await apply(p);
    expect(eventOf(p.committedTask())).toEqual({
      type: "com.acme.order.placed",
      source: "https://acme.com/orders",
      tenantid: "acme-eu",
    });
  });

  it("stays on screen when its last entry is deleted", async () => {
    const p = await renderTaskPanel(model, WITH_EXTRAS);
    await panel.drillInto(p.user, OTHER_FIELDS);
    for (const button of screen.getAllByRole("button", { name: "Delete entry" })) {
      await p.user.click(button);
    }
    await panel.toTopLevel(p.user, "notifyShipped");
    expect(panel.row(OTHER_FIELDS)).toHaveAccessibleName(/0 entries/);
  });

  it("leaves no empty entry behind after applying a deleted one", async () => {
    const p = await renderTaskPanel(model, WITH_EXTRAS);
    await panel.drillInto(p.user, OTHER_FIELDS);
    await p.user.click(screen.getAllByRole("button", { name: "Delete entry" })[0]!);
    await apply(p);
    await panel.toTopLevel(p.user, "notifyShipped");
    await panel.drillInto(p.user, OTHER_FIELDS);
    expect(keys()).toEqual(["traceparent"]);
  });

  describe("a key the event has its own field for", () => {
    async function typeRow(key: string, value: string) {
      const p = await renderTaskPanel(model, WITH_EXTRAS);
      await panel.drillInto(p.user, OTHER_FIELDS);
      await p.user.click(screen.getByRole("button", { name: "Add property" }));
      const row = keyInputs().at(-1)!;
      await p.user.type(row, key);
      if (value !== "") await p.user.type(valueInputs().at(-1)!, value);
      return p;
    }
    const typeValue = (p: Awaited<ReturnType<typeof renderTaskPanel>>) =>
      p.form().getValues("emit.event.with.type");

    it("is not written while it is typed", async () => {
      const p = await typeRow("type", "com.acme.order.moved");
      expect(typeValue(p)).toBe("com.acme.order.shipped");
    });

    it("moves to its field when focus leaves the row", async () => {
      const p = await typeRow("type", "com.acme.order.moved");
      await p.user.click(document.body);
      expect(keys()).toEqual(["tenantid", "traceparent"]);
      expect(typeValue(p)).toBe("com.acme.order.moved");

      await panel.toTopLevel(p.user, "notifyShipped");
      expect(screen.getByDisplayValue("com.acme.order.moved")).toBeInTheDocument();
    });

    it("never touches that field when the key is typed past it", async () => {
      const p = await typeRow("types", "x");
      await p.user.click(document.body);
      expect(typeValue(p)).toBe("com.acme.order.shipped");
      await apply(p);
      expect(eventOf(p.committedTask())).toMatchObject({
        type: "com.acme.order.shipped",
        types: "x",
      });
    });

    it("leaves that field alone when its value is empty", async () => {
      const p = await typeRow("type", "");
      await p.user.click(document.body);
      expect(typeValue(p)).toBe("com.acme.order.shipped");
    });

    it("shows a field that was a chip once its value moves there", async () => {
      const p = await typeRow("subject", "order-42");
      await p.user.click(document.body);
      await panel.toTopLevel(p.user, "notifyShipped");
      const subject = screen.getByDisplayValue("order-42");
      expect(
        within(subject.closest("[data-field-item]")!).getByText("Subject"),
      ).toBeInTheDocument();
    });
  });
});
