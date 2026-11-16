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
import { Plus, X } from "lucide-react";
import { useFormContext, useFormState } from "react-hook-form";
import { useI18n } from "@openworkflowspec/i18n";
import type { KeyedObjectsField as KeyedObjectsDescriptor } from "../../../core/schemaToFormFields";
import { isObjectNotArray } from "../../../core/utils";
import { Input } from "../ui/input";
import { FieldList } from "../FieldList";
import { GroupHeading } from "../FormField";
import { useAddedFields } from "../addedFields";
import { LevelErrors } from "../validation";
import { InlineLevelsContext } from "../drill/DrillContext";
import { MAP_ROWS_KEY, readAllMapRows, type MapRowDraft } from "../sentinels";
import {
  filterReadOnlyFields,
  getNestedValue,
  prefixFields,
  useTaskFormContext,
} from "../taskFormContext";
import { newId } from "./fieldHelpers";

/**
 * One key of a keyed-objects value. A key's value lives in the form at `<field>.<key>`; while the
 * key is blank there is no path for it, so the row holds what was there (`held`) until it gets one.
 */
type KeyedRow = { id: string; key: string; held?: unknown };

/** The keys of the value, without the `undefined` a removed or renamed key leaves behind. */
function keysOf(value: unknown): string[] {
  return isObjectNotArray(value)
    ? Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k]) => k)
    : [];
}

/**
 * Rows from the ones an earlier mount stored (they keep blank keys, which the value cannot), while
 * they still name exactly the value's keys; else from the value.
 */
function initialRows(values: Record<string, unknown>, path: string, value: unknown): KeyedRow[] {
  const stored: MapRowDraft[] | undefined = readAllMapRows(values)[path];
  const keys = keysOf(value);
  if (Array.isArray(stored)) {
    const storedKeys = stored.map((row) => row.key).filter((key) => key !== "");
    if (storedKeys.length === keys.length && storedKeys.every((key) => keys.includes(key))) {
      return stored.map((row) => ({
        id: newId(),
        key: row.key,
        ...(row.key === "" && row.value !== undefined ? { held: row.value } : {}),
      }));
    }
  }
  return keys.map((key) => ({ id: newId(), key }));
}

/**
 * Keys whose every value is an object of known fields (listen's `correlate`: each key's
 * `{ from, expect? }`). Each key is a row: its key, its value's fields (the required ones shown,
 * the rest as chips) and a ✕; then "+ Add key". A dot in a key is not supported (keys are path
 * segments), as for other maps.
 */
export function KeyedObjectsField({ field }: { field: KeyedObjectsDescriptor }) {
  const { isReadOnly } = useTaskFormContext();
  const headingId = React.useId();
  return (
    <section className="dec-form-group" aria-labelledby={headingId}>
      <GroupHeading
        id={headingId}
        label={field.label}
        required={field.required}
        fieldPath={field.path}
        {...(field.description !== undefined ? { description: field.description } : {})}
      />
      <LevelErrors path={field.path} />
      <InlineLevelsContext.Provider value={true}>
        {isReadOnly ? <CommittedKeys field={field} /> : <EditableKeys field={field} />}
      </InlineLevelsContext.Provider>
    </section>
  );
}

function CommittedKeys({ field }: { field: KeyedObjectsDescriptor }) {
  const { taskData } = useTaskFormContext();
  return (
    <div className="dec-form-keyed-list">
      {keysOf(getNestedValue(taskData, field.path)).map((key) => {
        const fields = filterReadOnlyFields(
          prefixFields(field.itemFields, `${field.path}.${key}`),
          taskData,
        );
        return (
          <div key={key} className="dec-form-keyed-entry">
            <span className="dec-form-keyed-key-readonly">{key}</span>
            <FieldList fields={fields} />
          </div>
        );
      })}
    </div>
  );
}

function EditableKeys({ field }: { field: KeyedObjectsDescriptor }) {
  const { t } = useI18n();
  const { control, getValues, setValue, clearErrors } = useFormContext<Record<string, unknown>>();
  const { drop } = useAddedFields();
  const [rows, setRows] = React.useState<KeyedRow[]>(() =>
    initialRows(getValues(), field.path, getValues(field.path as never)),
  );
  const rowsRef = React.useRef(rows);
  React.useEffect(() => {
    rowsRef.current = rows;
  });

  // A reset (node switch, undo, Cancel, Apply) makes the value the truth again.
  const { defaultValues } = useFormState({ control });
  const [seenDefaults, setSeenDefaults] = React.useState(defaultValues);
  if (seenDefaults !== defaultValues) {
    setSeenDefaults(defaultValues);
    setRows(
      keysOf(getNestedValue(defaultValues ?? {}, field.path)).map((key) => ({ id: newId(), key })),
    );
  }

  const entryPath = (key: string) => `${field.path}.${key}`;

  /** Replaces the rows and stores them in the form, so leaving the level keeps blank keys. */
  function commit(next: KeyedRow[]) {
    rowsRef.current = next;
    setRows(next);
    const drafts: MapRowDraft[] = next.map((row) => ({ key: row.key, value: row.held }));
    setValue(
      MAP_ROWS_KEY as never,
      { ...readAllMapRows(getValues()), [field.path]: drafts } as never,
    );
  }

  // Focus the key input of a row just added.
  const listRef = React.useRef<HTMLDivElement>(null);
  const focusRow = React.useRef<string | null>(null);
  React.useEffect(() => {
    const id = focusRow.current;
    if (id === null) return;
    focusRow.current = null;
    listRef.current
      ?.querySelector<HTMLInputElement>(`[data-keyed-row="${id}"] .dec-map-key-input`)
      ?.focus();
  });

  function rename(id: string, key: string) {
    const row = rowsRef.current.find((r) => r.id === id);
    if (row === undefined || row.key === key) return;
    // The value moves with its key: renaming never edits it.
    const moving = row.key === "" ? row.held : getValues(entryPath(row.key) as never);
    if (row.key !== "") {
      setValue(entryPath(row.key) as never, undefined as never, { shouldDirty: true });
      clearErrors(entryPath(row.key));
      drop(entryPath(row.key));
    }
    if (key !== "") {
      setValue(entryPath(key) as never, (moving ?? {}) as never, { shouldDirty: true });
    }
    commit(
      rowsRef.current.map((r) =>
        r.id === id
          ? { id, key, ...(key === "" && moving !== undefined ? { held: moving } : {}) }
          : r,
      ),
    );
  }

  function remove(id: string) {
    const row = rowsRef.current.find((r) => r.id === id);
    if (row === undefined) return;
    if (row.key !== "") {
      setValue(entryPath(row.key) as never, undefined as never, { shouldDirty: true });
      clearErrors(entryPath(row.key));
      drop(entryPath(row.key));
    }
    commit(rowsRef.current.filter((r) => r.id !== id));
  }

  function add() {
    const id = newId();
    focusRow.current = id;
    commit([...rowsRef.current, { id, key: "" }]);
  }

  return (
    <div className="dec-form-keyed-list" ref={listRef}>
      {rows.map((row) => {
        const removeName = `${t("sidebar.field.remove")} ${row.key === "" ? t("sidebar.keyed.key") : row.key}`;
        return (
          <div key={row.id} className="dec-form-keyed-entry" data-keyed-row={row.id}>
            <div className="dec-form-keyed-key">
              <Input
                className="dec-map-key-input"
                value={row.key}
                placeholder={t("sidebar.map.keyPlaceholder")}
                aria-label={t("sidebar.keyed.key")}
                onChange={(e) => rename(row.id, e.target.value)}
              />
              <button
                type="button"
                className="dec-map-delete-btn"
                aria-label={removeName}
                title={removeName}
                onClick={() => remove(row.id)}
              >
                <X className="dec-map-delete-icon" aria-hidden="true" />
              </button>
            </div>
            {row.key !== "" && (
              <FieldList
                fields={prefixFields(field.itemFields, entryPath(row.key))}
                ownerPath={entryPath(row.key)}
              />
            )}
          </div>
        );
      })}
      <div className="dec-map-add-btn-wrap">
        <button type="button" className="dec-map-add-btn" onClick={add}>
          <Plus className="dec-map-add-icon" aria-hidden="true" />
          {t("sidebar.keyed.add")}
        </button>
      </div>
    </div>
  );
}
