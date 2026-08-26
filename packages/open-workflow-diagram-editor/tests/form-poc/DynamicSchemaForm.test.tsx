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

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DynamicSchemaForm, type TaskSchema } from "../../src/form-poc/DynamicSchemaForm";
import setTaskSchemaJson from "../../src/form-poc/setTask.schema.json";

const schema = setTaskSchemaJson as TaskSchema;

const POPULATED = {
  set: { environment: "production" },
  then: "continue",
};

describe("DynamicSchemaForm (setTask)", () => {
  it("renders one input per schema property", () => {
    render(<DynamicSchemaForm schema={schema} task={{}} />);

    expect(screen.getAllByRole("textbox").map((i) => i.getAttribute("name"))).toEqual([
      "set",
      "if",
      "input",
      "output",
      "export",
      "timeout",
      "then",
      "metadata",
    ]);
  });

  it("marks the required property", () => {
    render(<DynamicSchemaForm schema={schema} task={{}} />);
    expect(screen.getByText("set").textContent).toBe("set *");
  });

  it("shows an existing task's values, objects as JSON", () => {
    render(<DynamicSchemaForm schema={schema} task={POPULATED} />);

    expect(screen.getByLabelText(/^set/)).toHaveValue('{"environment":"production"}');
    expect(screen.getByLabelText(/^then/)).toHaveValue("continue");
  });

  it("submits nothing for untouched fields rather than empty strings", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<DynamicSchemaForm schema={schema} task={{}} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/^set/), '{{"greeting":"hello"}');
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith({ set: { greeting: "hello" } });
  });

  it("keeps a runtime expression as a string", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<DynamicSchemaForm schema={schema} task={{}} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/^if/), "${{ .order.total > 100 }");
    await user.type(screen.getByLabelText(/^set/), "x");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith({ if: "${ .order.total > 100 }", set: "x" });
  });

  it("keeps Save and Cancel disabled until something changes", async () => {
    const user = userEvent.setup();
    render(<DynamicSchemaForm schema={schema} task={POPULATED} />);

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByText("no changes")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^then/), "x");

    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(screen.getByText("unsaved changes")).toBeInTheDocument();
  });

  it("resets when a different task is supplied — no values leak across", () => {
    const { rerender } = render(<DynamicSchemaForm schema={schema} task={POPULATED} />);
    expect(screen.getByLabelText(/^then/)).toHaveValue("continue");

    rerender(<DynamicSchemaForm schema={schema} task={{ set: "other" }} />);

    expect(screen.getByLabelText(/^set/)).toHaveValue("other");
    expect(screen.getByLabelText(/^then/)).toHaveValue("");
  });
});
