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

import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type PropsWithChildren } from "react";
import { DynamicSchemaForm, type TaskSchema } from "../../src/form-poc/DynamicSchemaForm";
import setTaskSchemaJson from "../../src/form-poc/setTask.schema.json";
import { useResolvedColorMode } from "../../src/hooks/useResolvedColorMode";
import type { ColorMode } from "../../src/types";

/* A captured copy of `getSchemaForDefinition("setTask")` — see src/form-poc/README.md. */
const setTaskSchema = setTaskSchemaJson as TaskSchema;

/** The `initContext` task from stories/nested-editing/workflows/set-open-map.yaml — a real one. */
const POPULATED_SET_TASK: Record<string, unknown> = {
  set: {
    requestedAt: "${ now }",
    environment: "production",
  },
  then: "continue",
};

/* Simulates the DiagramEditor's `.dec-root` wrapper — without it the shadcn design
   tokens (--foreground, --muted, --destructive) are undefined and the form renders
   unstyled. */
const DecRoot = ({ colorMode, children }: PropsWithChildren<{ colorMode: ColorMode }>) => {
  const resolved = useResolvedColorMode(colorMode);
  return (
    <div
      className={`dec-root${resolved === "dark" ? " dark" : ""}`}
      style={{
        backgroundColor: resolved === "dark" ? "#1a202c" : "#ffffff",
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      {children}
    </div>
  );
};

function SetTaskFormStory({ colorMode = "system" }: { colorMode?: ColorMode }) {
  const [task, setTask] = useState<Record<string, unknown>>(POPULATED_SET_TASK);
  const [saved, setSaved] = useState<Record<string, unknown> | null>(null);

  return (
    <DecRoot colorMode={colorMode}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <DynamicSchemaForm
          schema={setTaskSchema}
          task={task}
          onSubmit={(next) => {
            setSaved(next);
            setTask(next);
          }}
        />
        {saved !== null && (
          <p className="dec:mt-4 dec:font-mono dec:text-xs dec:text-slate-500 dec:dark:text-slate-400">
            Saved — the form reset to the new task.
          </p>
        )}
      </div>
    </DecRoot>
  );
}

const meta = {
  title: "Features/Dynamic Schema Form",
  component: SetTaskFormStory,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: `
## Schema-driven task form (POC)

A react-hook-form editor generated from \`getSchemaForDefinition("setTask")\`.

Deliberately minimal: **one text input per schema property**, whatever its type. The point is
to show that react-hook-form can be driven by the schema — picking a control per type is a
separate problem, and not one this POC answers.

### What it shows

- **The fields come from the schema.** Nothing about \`set\`, \`if\` or \`then\` is hardcoded — the
  form reads \`schema.properties\` and \`schema.required\`.
- **The document stays clean.** Untouched inputs are dropped rather than submitted as \`""\`.
  Watch the *Task document* panel: it only ever holds what you typed.
- **Dirty state is exact.** Save and Cancel enable only once something changed, via
  \`formState.isDirty\`.
- **Switching task resets the form**, so values cannot leak from one node to the next.

### Deliberately not handled

Objects are edited as raw JSON in the input, \`$ref\` properties are not dereferenced, unions get
no branch selector, and there is no validation. Those are the next questions, not this one.
`,
      },
    },
  },
  argTypes: {
    colorMode: {
      control: { type: "select" },
      options: ["light", "dark", "system"],
    },
  },
} satisfies Meta<typeof SetTaskFormStory>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A configured Set task — the case where a form has to round-trip existing data. */
export const SetTask: Story = {
  args: { colorMode: "system" },
};

/** An empty Set task — watch that mounting alone writes nothing into the document. */
export const EmptySetTask: Story = {
  args: { colorMode: "system" },
  render: ({ colorMode = "system" }) => (
    <DecRoot colorMode={colorMode}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <DynamicSchemaForm schema={setTaskSchema} task={{}} />
      </div>
    </DecRoot>
  ),
};
