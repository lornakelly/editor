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
import { Plus } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useI18n } from "@openworkflowspec/i18n";
import type { ObjectListField as ObjectListDescriptor } from "../../../core/schemaToFormFields";
import { isAtOrBelow } from "../../../core/paths";
import { pruneEmptyLeaves } from "../../../core/taskDraft";
import { structuralEqual } from "../../../core/structuralEqual";
import { isObjectNotArray } from "../../../core/utils";
import { useEditSession } from "../../EditSession";
import { useAddedFields } from "../addedFields";
import { getNestedValue, useTaskFormContext, useVariantSnapshots } from "../taskFormContext";
import { INNER_TEXT_KEY, MAP_ROWS_KEY, readAllMapRows, SENTINEL_KEY } from "../sentinels";
import { useDrill } from "../drill/DrillContext";
import { LevelErrors } from "../validation";
import { GroupHeading, RHF_ENTRY_KEY } from "../FormField";
import { EntryRow } from "./EntryRow";
import { shiftEntryKey, shiftEntryTree } from "./removeListEntry";

/**
 * A list of objects in place: one drill row per entry, then "+ Add <item>". Each entry opens as
 * its own level (`listEntryField`), addressed by its index.
 */
export function ObjectListField({ field }: { field: ObjectListDescriptor }) {
  const { isReadOnly } = useTaskFormContext();
  const headingId = React.useId();
  return (
    <section className="dec-form-group" aria-labelledby={headingId}>
      <GroupHeading
        id={headingId}
        label={field.label}
        required={field.required}
        {...(field.description !== undefined ? { description: field.description } : {})}
      />
      <LevelErrors path={field.path} />
      {isReadOnly ? <CommittedEntries field={field} /> : <EditableEntries field={field} />}
    </section>
  );
}

/** Read-only: the committed entries, never the draft's. */
function CommittedEntries({ field }: { field: ObjectListDescriptor }) {
  const { taskData } = useTaskFormContext();
  const entries = getNestedValue(taskData, field.path);
  if (!Array.isArray(entries)) return null;
  return (
    <div className="dec-form-entry-list">
      {entries.map((entry, index) => (
        <EntryRow key={index} list={field} index={index} entry={entry} />
      ))}
    </div>
  );
}

/** An entry's value as Apply would see it: `""` padding and removed (`undefined`) keys dropped. */
const settled = (value: unknown): unknown => pruneEmptyLeaves(value);

function EditableEntries({ field }: { field: ObjectListDescriptor }) {
  const { t } = useI18n();
  const { open } = useDrill();
  const { taskData, revalidateIfAttempted } = useTaskFormContext();
  const { baselineTask, entryOrigins, setEntryOrigins } = useEditSession();
  const addedFields = useAddedFields();
  const snapshots = useVariantSnapshots();
  const { control, getValues, setValue, clearErrors } = useFormContext<Record<string, unknown>>();
  // Structure from `useFieldArray` (stable keys); live values for the rows' summaries.
  const {
    fields: entries,
    append,
    remove,
  } = useFieldArray({
    control,
    name: field.path as never,
    keyName: RHF_ENTRY_KEY,
  });
  const values = useWatch({ control, name: field.path as never }) as unknown;
  const list = Array.isArray(values) ? values : [];
  const addLabel = `${t("sidebar.field.add")} ${field.itemLabel}`;

  // Baseline after Apply (the panel's task updates only after the canvas layout).
  const committedValue = getNestedValue(baselineTask ?? taskData, field.path);
  const committed = Array.isArray(committedValue) ? committedValue : [];
  const origins: readonly (number | null)[] =
    entryOrigins.get(field.path) ?? committed.map((_entry, index) => index);
  const originOf = (index: number) => (index < origins.length ? (origins[index] ?? null) : null);
  const isChanged = (index: number) => {
    const origin = originOf(index);
    return origin === null || !structuralEqual(settled(list[index]), settled(committed[origin]));
  };

  // After a removal, focus the row that took the removed one's place, else "Add".
  const listRef = React.useRef<HTMLDivElement>(null);
  const pendingFocus = React.useRef<number | null>(null);
  React.useEffect(() => {
    const index = pendingFocus.current;
    if (index === null || listRef.current === null) return;
    pendingFocus.current = null;
    const row = listRef.current.querySelector<HTMLElement>(
      `[data-drill-path="${CSS.escape(`${field.path}.${index}`)}"]`,
    );
    (row ?? listRef.current.querySelector<HTMLElement>(".dec-map-add-btn"))?.focus();
  });

  function handleAdd() {
    const index = entries.length;
    append({} as never);
    setEntryOrigins(field.path, [...origins.slice(0, index), null]);
    open(`${field.path}.${index}`, `${field.itemLabel} ${index + 1}`, { focus: "first" });
  }

  /**
   * Removes entry `index` and renumbers every store keyed by an entry's path, so the entries after
   * it keep their own option choices, texts, map rows and added fields.
   */
  function handleRemove(index: number) {
    remove(index);
    const formValues = getValues();
    for (const key of [SENTINEL_KEY, INNER_TEXT_KEY]) {
      const tree = formValues[key];
      if (isObjectNotArray(tree)) {
        setValue(key, shiftEntryTree(tree, field.path, index), { shouldDirty: true });
      }
    }
    const mapRows = readAllMapRows(formValues);
    if (Object.keys(mapRows).length > 0) {
      setValue(
        MAP_ROWS_KEY,
        Object.fromEntries(
          Object.entries(mapRows).flatMap(([path, rows]) => {
            const next = shiftEntryKey(path, field.path, index);
            return next === undefined ? [] : [[next, rows]];
          }),
        ),
      );
    }
    addedFields.shift(field.path, index);
    // A parked option's values can't follow their entry; dropping them is safe, moving them wrong isn't.
    for (const key of [...snapshots.keys()]) {
      const path = key.split("\u0000")[0]!;
      if (path !== field.path && isAtOrBelow(path, field.path)) snapshots.delete(key);
    }
    setEntryOrigins(
      field.path,
      origins.filter((_origin, i) => i !== index),
    );
    clearErrors(field.path);
    revalidateIfAttempted?.();
    pendingFocus.current = index;
  }

  return (
    <div className="dec-form-entry-list" ref={listRef}>
      {entries.map((entry, index) => (
        <EntryRow
          key={String((entry as unknown as Record<string, unknown>)[RHF_ENTRY_KEY])}
          list={field}
          index={index}
          entry={list[index]}
          changed={isChanged(index)}
          onRemove={() => handleRemove(index)}
        />
      ))}
      <div className="dec-map-add-btn-wrap">
        <button type="button" className="dec-map-add-btn" onClick={handleAdd}>
          <Plus className="dec-map-add-icon" aria-hidden="true" />
          {addLabel}
        </button>
      </div>
    </div>
  );
}
