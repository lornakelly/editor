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

import type { DetailField } from "@/core/taskDetails";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Controller, useFormContext } from "react-hook-form";

export type EditableDetailField = Extract<DetailField, { kind: "scalar" }>;

type ControlProps = {
  id: string;
  name: string;
};

function TextControl({ id, name }: ControlProps) {
  const { register } = useFormContext();
  return <Input id={id} {...register(name)} />;
}

/* A shell command or script body needs room to edit.*/
function MultilineControl({ id, name }: ControlProps) {
  const { register } = useFormContext();
  return <Textarea id={id} rows={4} {...register(name)} />;
}

function NumberControl({ id, name }: ControlProps) {
  const { register } = useFormContext();
  return <Input id={id} type="number" {...register(name, { valueAsNumber: true })} />;
}

function BooleanControl({ id, name }: ControlProps) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: draft }) => (
        <Switch
          id={id}
          ref={draft.ref}
          checked={draft.value}
          onCheckedChange={draft.onChange}
          onBlur={draft.onBlur}
        />
      )}
    />
  );
}

export function FieldControl({ field, ...rest }: ControlProps & { field: EditableDetailField }) {
  if (typeof field.value === "number") {
    return <NumberControl {...rest} />;
  }

  if (typeof field.value === "boolean") {
    return <BooleanControl {...rest} />;
  }

  /* TODO: once we have the schemas metadata, use it to decide if multiline or not instead of below */
  return field.value.includes("\n") ? <MultilineControl {...rest} /> : <TextControl {...rest} />;
}
