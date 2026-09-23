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
 * The `switch` cases row — a `ordered-map` descriptor expanded once per
 * entry in the live form value.
 *
 * The descriptor carries one entry's fields with entry-relative paths, so the
 * row owns joining them back up (`switch.0.closeIssue.when`). These tests drive
 * the real walker output rather than a hand-written descriptor, so a change to
 * either side has to keep them agreeing.
 */

import { describe, it, expect } from "vitest";
import * as React from "react";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import { I18nProvider } from "@openworkflowspec/i18n";
import { TooltipProvider } from "../../../src/components/ui/tooltip";
import { en } from "../../../src/i18n/locales/en";
import { FormField } from "../../../src/side-panel/forms/FormField";
import { TaskFormContext } from "../../../src/side-panel/forms/taskFormContext";
import { getFormFieldsForNodeType } from "../../../src/core/schemaWalker";
import type { OrderedMapField } from "../../../src/core/schemaToFormFields";
import { MANAGING_GITHUB_ISSUES_WORKFLOW } from "../../fixtures/workflows";
import { nodeAt, parseFixture } from "../../test-utils";

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

/** A nested switch: `closeIssue` sets `when`, `default` leaves it unset. */
const SWITCH_NODE_ID = "/do/evaluateReview/do/evaluate";
/** A different switch, to stand in for selecting another node. */
const OTHER_SWITCH_NODE_ID = "/do/evaluateDevWorkOutcome";

const model = parseFixture(MANAGING_GITHUB_ISSUES_WORKFLOW);
const switchTask = nodeAt(model, SWITCH_NODE_ID).data.task as Record<string, unknown>;
const otherSwitchTask = nodeAt(model, OTHER_SWITCH_NODE_ID).data.task as Record<string, unknown>;

const casesField = getFormFieldsForNodeType("switch")[0] as OrderedMapField;

const SIBLING_TASK_NAMES = ["closeIssue", "reviewIssue"];

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

function renderCases({ isReadOnly = false } = {}) {
  const captured = { form: undefined as UseFormReturn<Record<string, unknown>> | undefined };

  function Harness() {
    const form = useForm<Record<string, unknown>>({ defaultValues: switchTask });
    captured.form = form;
    return (
      <I18nProvider locale="en" dictionaries={{ en }}>
        <TooltipProvider>
          <TaskFormContext.Provider
            value={{
              isReadOnly,
              siblingTaskNames: SIBLING_TASK_NAMES,
              taskData: switchTask,
              expressionVariantPaths: new Set<string>(),
            }}
          >
            <FormProvider {...form}>
              <FormField field={casesField} />
            </FormProvider>
          </TaskFormContext.Provider>
        </TooltipProvider>
      </I18nProvider>
    );
  }

  render(<Harness />);
  return captured;
}

/** The fieldset for one case, found by the name in its legend. */
const caseGroup = (name: string) => within(screen.getByRole("group", { name: new RegExp(name) }));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("switch cases row", () => {
  it("renders one group per case", () => {
    renderCases();

    expect(screen.getAllByRole("group")).toHaveLength(2);
    expect(screen.getByRole("group", { name: /closeIssue/ })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /default/ })).toBeInTheDocument();
  });

  it("shows a case name as text, because renaming it relabels an edge", () => {
    renderCases();

    const legend = screen.getByRole("group", { name: /closeIssue/ }).querySelector("legend");
    expect(legend).toHaveTextContent("closeIssue");
    expect(legend?.querySelector("input")).toBeNull();
  });

  it("fills a case's own fields from that case", () => {
    renderCases();

    expect(caseGroup("closeIssue").getByLabelText("when")).toHaveValue(
      '$context.issue.action == "close"',
    );
    expect(caseGroup("closeIssue").getByLabelText("then")).toHaveValue("closeIssue");
    expect(caseGroup("default").getByLabelText("then")).toHaveValue("exit");
  });

  it("offers an empty control for an optional field the case has not set", () => {
    renderCases();

    expect(caseGroup("default").getByLabelText("when")).toHaveValue("");
  });

  it("writes an edit to that case alone", async () => {
    const user = userEvent.setup();
    const captured = renderCases();

    await user.type(caseGroup("closeIssue").getByLabelText("when"), "!");

    expect(captured.form?.getValues()).toEqual({
      switch: [
        { closeIssue: { when: '$context.issue.action == "close"!', then: "closeIssue" } },
        { default: { then: "exit" } },
      ],
    });
  });

  // TEMPORARY — the structural controls arrive with the add/reorder/delete
  // milestone. Until then the diagram owns the list, so they are absent rather
  // than disabled.
  it("offers no way to add, remove or reorder a case", () => {
    renderCases();

    const structural = screen
      .queryAllByRole("button")
      .filter((button) => /add|remove|delete|move|reorder/i.test(button.textContent ?? ""));

    expect(structural).toEqual([]);
    expect(screen.queryAllByLabelText(/add|remove|delete|move|reorder/i)).toEqual([]);
  });

  it("hides an unset field when read-only", () => {
    renderCases({ isReadOnly: true });

    expect(caseGroup("closeIssue").getByLabelText("when")).toBeInTheDocument();
    expect(caseGroup("default").queryByLabelText("when")).toBeNull();
  });
});

describe("switch cases row following the form", () => {
  /**
   * The rows come from `useFieldArray`, which holds its own snapshot of the
   * list rather than reading it on every render. `TaskForm` re-seeds the draft
   * with `form.reset()` whenever the selected node changes or an undo moves the
   * task underneath it, so the snapshot has to follow a reset or the panel
   * keeps showing the previous task's cases.
   */
  it("shows the new cases after the draft is reset to another task", () => {
    const captured = renderCases();

    expect(screen.getByRole("group", { name: /closeIssue/ })).toBeInTheDocument();

    act(() => captured.form?.reset(otherSwitchTask));

    expect(screen.queryByRole("group", { name: /closeIssue/ })).toBeNull();
    expect(screen.getByRole("group", { name: /review/ })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /requestDetails/ })).toBeInTheDocument();
  });
});
