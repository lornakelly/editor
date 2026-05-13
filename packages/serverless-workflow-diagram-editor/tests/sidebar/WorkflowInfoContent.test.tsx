/*
 * Copyright 2021-Present The Serverless Workflow Specification Authors
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
import { WorkflowInfoContent } from "../../src/sidebar/WorkflowInfoContent";
import { renderWithProviders } from "../test-utils";
import type { Specification } from "@serverlessworkflow/sdk";

const MOCK_WORKFLOW_MODEL = {
  document: {
    dsl: "1.0.3",
    name: "test-workflow",
    version: "2.0.0",
    namespace: "my-namespace",
  },
  do: [],
} as unknown as Specification.Workflow;

describe("WorkflowInfoContent", () => {
  it("displays workflow metadata when model is available", () => {
    renderWithProviders(<WorkflowInfoContent />, {
      model: MOCK_WORKFLOW_MODEL,
    });

    expect(screen.getByText("Workflow Info")).toBeInTheDocument();
    expect(screen.getByText("test-workflow")).toBeInTheDocument();
    expect(screen.getByText("2.0.0")).toBeInTheDocument();
    expect(screen.getByText("1.0.3")).toBeInTheDocument();
    expect(screen.getByText("my-namespace")).toBeInTheDocument();
  });

  it("displays field labels from translations", () => {
    renderWithProviders(<WorkflowInfoContent />, {
      model: MOCK_WORKFLOW_MODEL,
    });

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Version")).toBeInTheDocument();
    expect(screen.getByText("DSL")).toBeInTheDocument();
    expect(screen.getByText("Namespace")).toBeInTheDocument();
  });

  it("displays hint text when model is null", () => {
    renderWithProviders(<WorkflowInfoContent />, { model: null });

    expect(screen.getByText("Select a node to view its details")).toBeInTheDocument();
  });

  it("displays hint text when model has no document", () => {
    const modelWithoutDocument = { do: [] } as unknown as Specification.Workflow;
    renderWithProviders(<WorkflowInfoContent />, {
      model: modelWithoutDocument,
    });

    expect(screen.getByText("Select a node to view its details")).toBeInTheDocument();
  });
});
