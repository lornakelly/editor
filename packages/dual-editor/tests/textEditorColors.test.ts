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

import { describe, expect, it } from "vitest";
import diagramStyles from "../../open-workflow-diagram-editor/src/styles.css?raw";
import dualEditorStyles from "../src/DualEditor.css?raw";
import { TEXT_EDITOR_COLORS } from "../src/textEditorColors";

// Monaco and CSS can't share variables, so these hexes are repeated; keep them in step.
const hexIn = (css: string, pattern: string) =>
  new RegExp(`${pattern}:\\s*(#[0-9a-fA-F]{3,8})`).exec(css)?.[1]?.toLowerCase();

const dividerColor = (selector: string) =>
  hexIn(
    dualEditorStyles,
    `${selector.replace(/[.-]/g, "\\$&")}\\s*\\{[^}]*--ows-dual-editor-divider-color`,
  );

describe("TEXT_EDITOR_COLORS", () => {
  it.each([
    ["editor.background", "--dec-surface-dark"],
    ["editorWidget.background", "--dec-surface-dark-elevated"],
    ["editorWidget.border", "--dec-surface-dark-elevated"],
  ])("dark %s matches the diagram's %s", (colorId, token) => {
    expect(TEXT_EDITOR_COLORS.dark?.[colorId]).toBe(hexIn(diagramStyles, token));
  });

  it.each([
    ["light", ".ows-dual-editor"],
    ["dark", ".ows-dual-editor--dark"],
  ] as const)("%s divider matches editorWidget.border", (mode, selector) => {
    expect(dividerColor(selector)).toBe(TEXT_EDITOR_COLORS[mode]?.["editorWidget.border"]);
  });
});
