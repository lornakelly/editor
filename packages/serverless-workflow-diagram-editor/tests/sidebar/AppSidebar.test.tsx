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
import { render } from "@testing-library/react";
import { SidebarProvider } from "../../src/components/ui/sidebar";
import { AppSidebar } from "../../src/sidebar/AppSidebar";
import { I18nProvider } from "@serverlessworkflow/i18n";
import {
  DiagramEditorContext,
  type DiagramEditorContextType,
} from "../../src/store/DiagramEditorContext";
import { en } from "../../src/i18n/locales/en";
import { createMockContextValue } from "../test-utils";
import type { Specification } from "@serverlessworkflow/sdk";

const MOCK_MODEL = {
  document: {
    dsl: "1.0.3",
    name: "test-workflow",
    version: "1.0.0",
    namespace: "default",
  },
  do: [],
} as unknown as Specification.Workflow;

function renderWithSidebar(contextOverrides?: Partial<DiagramEditorContextType>) {
  const mockContext = createMockContextValue({ model: MOCK_MODEL, ...contextOverrides });
  return render(
    <DiagramEditorContext.Provider value={mockContext}>
      <I18nProvider locale="en" dictionaries={{ en }}>
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
        </SidebarProvider>
      </I18nProvider>
    </DiagramEditorContext.Provider>,
  );
}

describe("AppSidebar", () => {
  it("renders the sidebar", () => {
    const { container } = renderWithSidebar();
    expect(container.querySelector('[data-slot="sidebar"]')).toBeInTheDocument();
  });

  it("renders workflow info content", () => {
    renderWithSidebar();
    expect(screen.getByText("test-workflow")).toBeInTheDocument();
  });

  it("renders hint text when no model", () => {
    renderWithSidebar({ model: null });
    expect(screen.getByText("Select a node to view its details")).toBeInTheDocument();
  });
});
