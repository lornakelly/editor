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

import * as monaco from "monaco-editor/editor";
import type { ResolvedColorMode } from "@openworkflowspec/core";

/**
 * Monaco colour overrides per colour mode, keyed by Monaco colour id
 * (e.g. `"editor.background"`). Syntax colours still come from `vs`/`vs-dark`.
 */
export type TextEditorThemeColors = Partial<Record<ResolvedColorMode, Record<string, string>>>;

const BASE_THEMES: Record<ResolvedColorMode, monaco.editor.BuiltinTheme> = {
  light: "vs",
  dark: "vs-dark",
};

export const CUSTOM_THEME_NAMES: Record<ResolvedColorMode, string> = {
  light: "ows-custom-light",
  dark: "ows-custom-dark",
};

/**
 * The Monaco theme to use for `mode`: the built-in one, or, when `colors` has
 * overrides for that mode, a theme inheriting it with those colours.
 */
export const resolveMonacoTheme = (
  mode: ResolvedColorMode,
  colors: TextEditorThemeColors | undefined,
): string => {
  const modeColors = colors?.[mode];
  if (!modeColors) {
    return BASE_THEMES[mode];
  }

  monaco.editor.defineTheme(CUSTOM_THEME_NAMES[mode], {
    base: BASE_THEMES[mode],
    inherit: true,
    rules: [],
    colors: modeColors,
  });
  return CUSTOM_THEME_NAMES[mode];
};
