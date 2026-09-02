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

import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { FieldControl } from "../../src/side-panel/FieldControls";
import type { EditableDetailField } from "../../src/side-panel/FieldControls";
import { renderWithProviders } from "../test-utils/render-helpers";
import { scalarField } from "../test-utils/detail-fields";

/* `FieldControl` is bound to the surrounding draft, so it only renders inside a form. . */
const DRAFT_NAME = "f0";

function SingleFieldForm({
  field,
  onValues,
}: {
  field: EditableDetailField;
  onValues?: (v: unknown) => void;
}) {
  const form = useForm({ defaultValues: { [DRAFT_NAME]: field.value } });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit((values) => onValues?.(values))}>
        <label htmlFor="control">{field.label}</label>
        <FieldControl field={field} id="control" name={DRAFT_NAME} />
        <button type="submit">submit</button>
      </form>
    </FormProvider>
  );
}

const renderControl = (field: EditableDetailField, onValues?: (v: unknown) => void) =>
  renderWithProviders(<SingleFieldForm field={field} onValues={onValues} />, { isReadOnly: false });

const control = () => screen.getByLabelText("f");

const field = (value: string | number | boolean) => scalarField("f", value) as EditableDetailField;

describe("FieldControl", () => {
  it("renders a string as a text input", () => {
    renderControl(field("http"));

    expect(control().tagName).toBe("INPUT");
    expect(control()).toHaveValue("http");
    expect(control()).toBeEnabled();
  });

  it("renders a number as a number input", () => {
    renderControl(field(8080));

    expect(control()).toHaveAttribute("type", "number");
  });

  it("submits an edited number as a number", async () => {
    const user = userEvent.setup();
    let submitted: unknown;
    renderControl(field(8080), (v) => (submitted = v));

    await user.clear(control());
    await user.type(control(), "9090");
    await user.click(screen.getByRole("button", { name: "submit" }));

    expect(submitted).toEqual({ f0: 9090 });
  });

  it("renders a boolean as a switch", () => {
    renderControl(field(true));

    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("submits a toggled boolean as a boolean", async () => {
    const user = userEvent.setup();
    let submitted: unknown;
    renderControl(field(true), (v) => (submitted = v));

    await user.click(screen.getByRole("switch"));
    await user.click(screen.getByRole("button", { name: "submit" }));

    expect(submitted).toEqual({ f0: false });
  });

  /* A shell command or script body needs room. Chosen from the value being multi-line rather
   than from its key, so it holds for any such string. */
  it("renders a multi-line string as a textarea", () => {
    renderControl(field("line one\nline two"));

    expect(control().tagName).toBe("TEXTAREA");
  });
});
