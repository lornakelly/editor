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

import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditableProperties } from "../../src/side-panel/EditableProperties";
import type { DetailField } from "../../src/core/taskDetails";
import { renderWithProviders } from "../test-utils/render-helpers";
import { scalarField } from "../test-utils/detail-fields";

const callFields: DetailField[] = [scalarField("call", "http"), scalarField("with.method", "GET")];

const renderEditable = (fields: DetailField[] = callFields, nodeId = "/do/fetchUser") =>
  renderWithProviders(<EditableProperties fields={fields} nodeId={nodeId} />, {
    isReadOnly: false,
  });

describe("EditableProperties", () => {
  describe("default view (read only)", () => {
    it("presents values statically rather than as form controls", () => {
      renderEditable();

      expect(screen.getByText("GET")).toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("renders an editable row as a button", () => {
      renderEditable();

      expect(screen.getByRole("button", { name: /with\.method/ })).toBeInTheDocument();
    });
  });

  describe("entering edit mode", () => {
    it("turns every editable field into a control, not just the clicked one", async () => {
      const user = userEvent.setup();
      renderEditable();

      await user.click(screen.getByText("GET"));

      expect(screen.getByLabelText("call")).toHaveValue("http");
      expect(screen.getByLabelText("with.method")).toHaveValue("GET");
    });

    it("focuses the clicked field so typing continues where the user pointed", async () => {
      const user = userEvent.setup();
      renderEditable();

      await user.click(screen.getByText("GET"));

      expect(screen.getByLabelText("with.method")).toHaveFocus();
    });

    it("focuses a clicked boolean row's switch", async () => {
      const user = userEvent.setup();
      renderEditable([scalarField("fork.compete", true)]);

      await user.click(screen.getByText("true"));

      expect(screen.getByRole("switch")).toHaveFocus();
    });
  });

  describe("editing", () => {
    it("holds typed input in the draft", async () => {
      const user = userEvent.setup();
      renderEditable();

      await user.click(screen.getByText("GET"));
      await user.clear(screen.getByLabelText("with.method"));
      await user.type(screen.getByLabelText("with.method"), "POST");

      expect(screen.getByLabelText("with.method")).toHaveValue("POST");
    });

    /* That a number survives as a number, rather than just looking numeric, is proved by the
       submit round-trip in `FieldControls.test.tsx`. */
    it("renders a number field as a number input", async () => {
      const user = userEvent.setup();
      renderEditable([scalarField("with.port", 8080)]);

      await user.click(screen.getByText("8080"));

      expect(screen.getByLabelText("with.port")).toHaveAttribute("type", "number");
    });

    it("keeps fields with the same label but different segments distinct", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      renderEditable([
        scalarField("set.user.name", "aaa", ["set", "user", "name"]),
        scalarField("set.user.name", "bbb", ["set", "user.name"]),
      ]);
      expect(
        consoleError.mock.calls.some(([message]) =>
          String(message).includes("Encountered two children with the same key"),
        ),
      ).toBe(false);
      consoleError.mockRestore();
    });
  });

  /* The form lives above the rendered rows, so a node switch must reset it explicitly —
     remounting the rows alone would leave the previous node's values in the draft. */
  describe("switching node", () => {
    const otherNode = (
      <EditableProperties fields={[scalarField("call", "grpc")]} nodeId="/do/other" />
    );

    it("shows the newly selected node's values", async () => {
      const user = userEvent.setup();
      const { rerender } = renderEditable();

      await user.click(screen.getByText("GET"));
      await user.clear(screen.getByLabelText("with.method"));
      await user.type(screen.getByLabelText("with.method"), "POST");
      rerender(otherNode);

      expect(screen.getByText("grpc")).toBeInTheDocument();
      expect(screen.queryByDisplayValue("POST")).not.toBeInTheDocument();
    });

    it("returns to the resting presentation", async () => {
      const user = userEvent.setup();
      const { rerender } = renderEditable();

      await user.click(screen.getByText("GET"));
      rerender(otherNode);

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });
});
