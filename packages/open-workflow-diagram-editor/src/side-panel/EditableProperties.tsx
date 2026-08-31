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

import * as React from "react";
import { FormProvider, useForm } from "react-hook-form";
import type { DetailField } from "@/core/taskDetails";
import { Field, FieldGroup } from "@/components/ui/field";
import { FieldControl } from "./FieldControls";
import { PropertyValue, StaticPropertyRow } from "./Fields";

/**
 * Editable presentation of a task's properties. Display when isReadOnly={false}
 *
 * By default this renders the same static rows as read-only mode; edit mode is entered deliberately, by clicking a row, which
 * also focuses it.
 *
 */

type EditablePropertiesProps = {
  fields: DetailField[];
  nodeId: string;
};

/* react-hook-form field names and the keys of the draft  */
type DraftValues = Record<string, unknown>;

/* A unique string per field (f0, f1 etc) */
function draftName(index: number): string {
  return `f${index}`;
}

/* Creates a field name for each and maps each fieldname to its current value. Allows RHF to track changes (only scaler for now) */
function toDraftValues(fields: DetailField[]): DraftValues {
  const values: DraftValues = {};

  fields.forEach((field, index) => {
    if (field.kind === "scalar") {
      values[draftName(index)] = field.value;
    }
  });

  return values;
}

export function EditableProperties({ fields, nodeId }: EditablePropertiesProps) {
  const baseId = React.useId();
  const [isEditing, setIsEditing] = React.useState(false);
  const [fieldToFocus, setFieldToFocus] = React.useState<string | null>(null);

  const form = useForm<DraftValues>({ defaultValues: toDraftValues(fields) });

  /* Reset on node change rather than remounting behind a `key`: `useForm` lives above the
     rows, so remounting them alone would leave the previous node's values in the draft. */
  const renderedNodeId = React.useRef(nodeId);
  React.useEffect(() => {
    if (renderedNodeId.current === nodeId) {
      return;
    }

    renderedNodeId.current = nodeId;
    form.reset(toDraftValues(fields));
    setIsEditing(false);
    setFieldToFocus(null);
  }, [nodeId, fields, form]);

  /* Deferred to an effect because the control does not exist until edit mode has rendered. */
  React.useEffect(() => {
    if (!isEditing || fieldToFocus === null) {
      return;
    }

    form.setFocus(fieldToFocus);
    setFieldToFocus(null);
  }, [isEditing, fieldToFocus, form]);

  const activateField = (name: string) => {
    form.reset(toDraftValues(fields));
    setIsEditing(true);
    setFieldToFocus(name);
  };

  return (
    <FormProvider {...form}>
      {isEditing ? (
        <FieldGroup className="dec-sidebar-edit-fields">
          {fields.map((field, index) => {
            if (field.kind !== "scalar") {
              return <StaticPropertyRow key={field.label} field={field} />;
            }

            const controlId = `${baseId}-${index}`;

            return (
              <Field key={field.label}>
                <label htmlFor={controlId} className="dec-sidebar-edit-field-label">
                  {field.label}
                </label>
                <FieldControl field={field} id={controlId} name={draftName(index)} />
              </Field>
            );
          })}
        </FieldGroup>
      ) : (
        <div className="dec-sidebar-props">
          {fields.map((field, index) =>
            field.kind === "scalar" ? (
              <button
                key={field.label}
                type="button"
                className="dec-sidebar-prop dec-sidebar-prop-activator"
                onClick={() => activateField(draftName(index))}
              >
                <span className="dec-sidebar-prop-label">{field.label}</span>
                <span className="dec-sidebar-prop-value">
                  <PropertyValue field={field} />
                </span>
              </button>
            ) : (
              <StaticPropertyRow key={field.label} field={field} />
            ),
          )}
        </div>
      )}
    </FormProvider>
  );
}
