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
 * POC: a react-hook-form task editor generated from `getSchemaForDefinition("setTask")`.
 *
 * Scope is deliberately minimal — **one text input per property**, whatever the
 * property's type. The point is only to show that react-hook-form can be driven by the
 * schema; choosing a control per type is a separate problem.
 *
 * NOT production code: hardcoded strings, not exported from the package entry point.
 */

import { useEffect, useId, useMemo } from "react";
import { useForm, useWatch, type Control } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * A resolved task schema — `allOf` merged, `$ref`s bundled into a `$defs` block.
 * `setTask.schema.json` is a captured copy of what `getSchemaForDefinition("setTask")`
 * produces; see the README for how to regenerate it.
 */
export type TaskSchema = Record<string, unknown>;

type Values = Record<string, string>;

type Field = {
  name: string;
  required: boolean;
  description: string | undefined;
};

interface DynamicSchemaFormProps {
  /** A resolved task schema, e.g. `setTask.schema.json`. */
  schema: TaskSchema;
  /** The task being edited. Changing it resets the form. */
  task?: Record<string, unknown>;
  onSubmit?: (task: Record<string, unknown>) => void;
}

/**
 * The schema's `properties` map, in document order.
 *
 * `description` is read off the property itself rather than followed through its
 * `$ref` — the property-level sentence is the specific one. `title` is deliberately
 * ignored: in this schema it holds the generated class name (`SetTaskConfiguration`),
 * not anything a user should read.
 */
function readFields(schema: TaskSchema): Field[] {
  const properties = (schema["properties"] ?? {}) as Record<string, Record<string, unknown>>;
  const required = (schema["required"] ?? []) as string[];

  const fields = Object.entries(properties).map(([name, property]) => ({
    name,
    required: required.includes(name),
    description: typeof property["description"] === "string" ? property["description"] : undefined,
  }));

  /* The merge inlines `taskBase` first, so a task's own required property lands last —
     `set` would sit below seven inherited fields. Required first puts it where it
     belongs without hardcoding anything about Set. */
  return [...fields.filter((f) => f.required), ...fields.filter((f) => !f.required)];
}

/** Document → form. Objects are shown as JSON so a single input can hold them. */
function toValues(fields: Field[], task: Record<string, unknown>): Values {
  const values: Values = {};
  for (const { name } of fields) {
    const value = task[name];
    values[name] =
      value === undefined || value === null
        ? ""
        : typeof value === "string"
          ? value
          : JSON.stringify(value);
  }
  return values;
}

/**
 * Form → document.
 *
 * Empty inputs are dropped, so an untouched task writes `{}` rather than
 * `{ if: "", input: "", output: "" }` — none of which are valid against the schema.
 * A value is parsed as JSON only when it looks like JSON, so `${ .order.id }` stays
 * the string it is.
 */
function toDocument(fields: Field[], values: Values): Record<string, unknown> {
  const document: Record<string, unknown> = {};

  for (const { name } of fields) {
    const raw = (values[name] ?? "").trim();
    if (raw === "") continue;

    if (raw.startsWith("{") || raw.startsWith("[")) {
      try {
        document[name] = JSON.parse(raw);
        continue;
      } catch {
        /* Not valid JSON yet — keep the text so the user doesn't lose it. */
      }
    }
    document[name] = raw;
  }

  return document;
}

function TaskField({
  field,
  register,
}: {
  field: Field;
  register: ReturnType<typeof useForm<Values>>["register"];
}) {
  const id = useId();
  const descriptionId = `${id}-desc`;

  return (
    <div className="dec:space-y-1.5">
      <label
        htmlFor={id}
        className="dec:font-mono dec:text-xs dec:font-medium dec:text-slate-700 dec:dark:text-slate-200"
      >
        {field.name}
        {field.required && (
          <span className="dec:text-red-600 dec:dark:text-red-400" aria-hidden="true">
            {" *"}
          </span>
        )}
      </label>
      <Input
        id={id}
        className="dec:h-8 dec:border-slate-300 dec:font-mono dec:text-xs dec:text-slate-900 dec:dark:border-slate-600 dec:dark:text-slate-100"
        {...(field.description !== undefined ? { "aria-describedby": descriptionId } : {})}
        {...register(field.name)}
      />
      {field.description !== undefined && (
        <p id={descriptionId} className="dec:text-xs dec:text-slate-500 dec:dark:text-slate-400">
          {field.description}
        </p>
      )}
    </div>
  );
}

/** Live view of what would actually be written back to the workflow. */
function DocumentPreview({ fields, control }: { fields: Field[]; control: Control<Values> }) {
  const values = useWatch({ control }) as Values;
  const document = useMemo(() => toDocument(fields, values), [fields, values]);

  return (
    <pre className="dec:max-h-72 dec:overflow-auto dec:rounded-md dec:border dec:border-slate-200 dec:bg-slate-50 dec:p-3 dec:font-mono dec:text-xs dec:text-slate-900 dec:dark:border-slate-700 dec:dark:bg-slate-800 dec:dark:text-slate-100">
      {JSON.stringify(document, null, 2)}
    </pre>
  );
}

export function DynamicSchemaForm({ schema, task, onSubmit }: DynamicSchemaFormProps) {
  const fields = useMemo(() => readFields(schema), [schema]);
  const defaultValues = useMemo(() => toValues(fields, task ?? {}), [fields, task]);

  const {
    control,
    formState: { isDirty },
    handleSubmit,
    register,
    reset,
  } = useForm<Values>({ defaultValues });

  /* `useForm` reads `defaultValues` once, so a new task has to be pushed in. Keying the
     <form> element would not do it — the hook lives above it, and the previous task's
     values would leak into the next one. */
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <div className="dec:grid dec:gap-6 dec:md:grid-cols-2">
      <form
        onSubmit={handleSubmit((values) => onSubmit?.(toDocument(fields, values)))}
        className="dec:space-y-4"
      >
        {fields.map((field) => (
          <TaskField key={field.name} field={field} register={register} />
        ))}

        <div className="dec:flex dec:items-center dec:gap-2 dec:border-t dec:border-slate-200 dec:pt-4 dec:dark:border-slate-700">
          <span className="dec:flex-1 dec:font-mono dec:text-xs dec:text-slate-500 dec:dark:text-slate-400">
            {isDirty ? "unsaved changes" : "no changes"}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!isDirty}
            onClick={() => reset(defaultValues)}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!isDirty}>
            Save
          </Button>
        </div>
      </form>

      <div className="dec:space-y-1.5">
        <h3 className="dec:text-xs dec:font-semibold dec:text-slate-700 dec:dark:text-slate-200">
          Task document
        </h3>
        <DocumentPreview fields={fields} control={control} />
      </div>
    </div>
  );
}
