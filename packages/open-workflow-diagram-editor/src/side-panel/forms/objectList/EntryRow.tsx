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
import { ChevronRight } from "lucide-react";
import { get, useFormContext, useFormState } from "react-hook-form";
import { useI18n } from "@openworkflowspec/i18n";
import type { ObjectListField } from "../../../core/schemaToFormFields";
import { useDrill } from "../drill/DrillContext";
import { RemoveFieldButton, RemoveFieldContext } from "../removeField";
import { countFieldErrors } from "../drill/rowCounts";
import { countLevelErrorsUnder, useTaskValidation } from "../validation";
import { entrySummary } from "./entrySummary";

/** The label of entry `index` of `list` as its row and breadcrumb show it. */
export function entryLabel(list: ObjectListField, index: number, entry: unknown): string {
  return entrySummary(list, entry).title ?? `${list.itemLabel} ${index + 1}`;
}

/**
 * The drill row of one list entry: titled by its summary (the first identifying value, in mono),
 * else "<itemLabel> <n>"; underneath, the other identifying values, else how many fields are set.
 * An error pill counts the errors inside the entry (its fields', and its levels'). In edit mode: a
 * "Changed" pill when it differs from the committed entry it started as, and its ✕ beside the
 * row, never inside its button.
 */
export function EntryRow({
  list,
  index,
  entry,
  changed = false,
  onRemove,
}: {
  list: ObjectListField;
  index: number;
  entry: unknown;
  changed?: boolean;
  /** Omitted in read-only. */
  onRemove?: () => void;
}) {
  const { t } = useI18n();
  const { open } = useDrill();
  const path = `${list.path}.${index}`;
  const { title, detail, setCount } = entrySummary(list, entry);
  const label = title ?? `${list.itemLabel} ${index + 1}`;
  const summary =
    detail.length > 0
      ? detail.join(" · ")
      : `${setCount} ${t(setCount === 1 ? "sidebar.drill.field" : "sidebar.drill.fields")}`;

  const { control } = useFormContext<Record<string, unknown>>();
  const { errors } = useFormState({ control, name: path as never });
  const { levelErrors } = useTaskValidation().taskValidation;
  const errorCount = countFieldErrors(get(errors, path)) + countLevelErrorsUnder(levelErrors, path);
  const errorText = `${errorCount} ${t(errorCount === 1 ? "sidebar.drill.error" : "sidebar.drill.errors")}`;
  const changedText = t("sidebar.form.fieldChanged");
  const ariaLabel = [
    `${t("sidebar.drill.open")} ${label}`,
    summary,
    ...(changed ? [changedText] : []),
    ...(errorCount > 0 ? [errorText] : []),
  ].join(", ");
  const remove = React.useMemo(
    () => (onRemove === undefined ? null : { path, label, remove: onRemove }),
    [onRemove, path, label],
  );

  const row = (
    <button
      type="button"
      className={`dec-form-drill-row${errorCount > 0 ? " has-error" : ""}`}
      data-drill-path={path}
      aria-label={ariaLabel}
      onClick={() => open(path, label)}
    >
      <span className="dec-form-drill-row-text">
        <span className={`dec-form-drill-row-label${title !== undefined ? " is-value" : ""}`}>
          {label}
        </span>
        <span className="dec-form-drill-row-summary">{summary}</span>
      </span>
      {(changed || errorCount > 0) && (
        <span className="dec-form-drill-row-pills">
          {errorCount > 0 && <span className="dec-form-drill-pill error">{errorText}</span>}
          {changed && <span className="dec-form-drill-pill changed">{changedText}</span>}
        </span>
      )}
      <ChevronRight className="dec-form-drill-row-chevron" aria-hidden="true" />
    </button>
  );
  if (remove === null) return row;
  return (
    <RemoveFieldContext.Provider value={remove}>
      <div className="dec-form-drill-row-wrap">
        {row}
        <RemoveFieldButton path={path} />
      </div>
    </RemoveFieldContext.Provider>
  );
}
