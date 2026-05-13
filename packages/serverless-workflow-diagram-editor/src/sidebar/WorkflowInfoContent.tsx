/*
 * Copyright 2021-Present The Serverless Workflow Specification Authors
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

import { useI18n } from "@serverlessworkflow/i18n";
import { useDiagramEditorContext } from "../store/DiagramEditorContext";

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="dec:flex dec:flex-col dec:gap-0.5">
      <span className="dec:text-xs dec:text-gray-500 dec:dark:text-gray-400 dec:uppercase dec:tracking-wide">
        {label}
      </span>
      <span className="dec:text-sm dec:text-gray-900 dec:dark:text-gray-100">{value}</span>
    </div>
  );
}

export function WorkflowInfoContent() {
  const { t } = useI18n();
  const { model } = useDiagramEditorContext();

  const document = model?.document;

  if (!document) {
    return (
      <p className="dec:text-sm dec:text-gray-500 dec:dark:text-gray-400 dec:px-4 dec:py-6 dec:text-center">
        {t("sidebar.selectNode")}
      </p>
    );
  }

  return (
    <div className="dec:flex dec:flex-col dec:gap-4 dec:px-4 dec:py-3">
      <h3 className="dec:text-sm dec:font-semibold dec:text-gray-900 dec:dark:text-gray-100">
        {t("sidebar.workflowInfo.title")}
      </h3>
      <div className="dec:flex dec:flex-col dec:gap-3">
        <InfoField label={t("sidebar.workflowInfo.name")} value={String(document.name ?? "")} />
        <InfoField
          label={t("sidebar.workflowInfo.version")}
          value={String(document.version ?? "")}
        />
        <InfoField label={t("sidebar.workflowInfo.dsl")} value={String(document.dsl ?? "")} />
        <InfoField
          label={t("sidebar.workflowInfo.namespace")}
          value={String(document.namespace ?? "")}
        />
      </div>
    </div>
  );
}
