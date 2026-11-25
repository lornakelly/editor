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

import type { TextEditorThemeColors } from "@openworkflowspec/text-editor";

/**
 * Monaco's `vs-dark` is neutral grey, which clashes with the diagram's slate
 * surfaces side by side, so the code pane takes the diagram's colours.
 * `dark` mirrors the diagram editor's `--dec-surface-dark*` tokens and the
 * divider in `DualEditor.css` repeats `editorWidget.border`; both are guarded
 * by `textEditorColors.test.ts`.
 */
const surfaces = (palette: {
  background: string;
  border: string;
  raised: string;
  lineNumber: string;
  lineNumberActive: string;
  indentGuide: string;
  indentGuideActive: string;
}): Record<string, string> => ({
  "editor.background": palette.background,
  "editorGutter.background": palette.background,
  "minimap.background": palette.background,
  // Monaco's own line beside the scrollbar doubled the divider.
  "editorOverviewRuler.border": "#00000000",
  "editorLineNumber.foreground": palette.lineNumber,
  "editorLineNumber.activeForeground": palette.lineNumberActive,
  "editorIndentGuide.background1": palette.indentGuide,
  "editorIndentGuide.activeBackground1": palette.indentGuideActive,
  "editorWidget.background": palette.raised,
  "editorWidget.border": palette.border,
  "editorSuggestWidget.background": palette.raised,
  "editorSuggestWidget.border": palette.border,
  "editorHoverWidget.background": palette.raised,
  "editorHoverWidget.border": palette.border,
});

export const TEXT_EDITOR_COLORS: TextEditorThemeColors = {
  light: surfaces({
    background: "#ffffff",
    border: "#cbd5e1",
    raised: "#f8fafc",
    lineNumber: "#64748b",
    lineNumberActive: "#1e293b",
    indentGuide: "#e2e8f0",
    indentGuideActive: "#94a3b8",
  }),
  dark: surfaces({
    background: "#1a202c", // --dec-surface-dark
    border: "#2d3748", // --dec-surface-dark-elevated
    raised: "#2d3748", // --dec-surface-dark-elevated
    lineNumber: "#8492a6",
    lineNumberActive: "#e2e8f0",
    indentGuide: "#2d3748",
    indentGuideActive: "#4a5568",
  }),
};
