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

import type * as RF from "@xyflow/react";
import type { BaseNodeData } from "@/react-flow/nodes/Nodes";
import { useI18n } from "@openworkflowspec/i18n";
import { SidebarFooter } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useFormState } from "react-hook-form";
import { updateTask } from "@/core/workflowEditing";
import { useDiagramEditorContext } from "@/store/DiagramEditorContext";


export function EditFormFooter({ node }: { node: RF.Node<BaseNodeData> }) {
  const { t } = useI18n();
const {form, isEditing, setIsEditing} = useEditSession()
const {commitWorkflow, model} = useDiagramEditorContext()

const {dirtyFields, isDirty} = useFormState({ control: form.control });
const task = node.data.task;

const changedNames = Object.keys(dirtyFields);

const handleCancel = () => {
  form.reset();
  setIsEditing(false);
};

const handleApply = () => {
  const values = form.getValues()
  const changes = changedNames.map((name) => ({
   segments: parseFieldName(name),
   value: values[name],
   }));

  const updated = updateTask(model, node.id, applyFieldValues(task, changes));
  commitWorkflow(updated)
  form.reset(values);
};
  return (
      <SidebarFooter>
        <div className="dec-sidebar-footer">
          <span className="dec-sidebar-footer-count">{isDirty ? `${changedNames.length} ${t("sidebar.form.changed")}` : null}</span>
          <div className="dec-sidebar-footer-actions">
            <Button type="button" variant="outline" onClick={handleCancel}>
              {t("sidebar.form.cancel")}
            </Button>
              <Button type="button" variant="outline" onClick={handleApply}>
              {t("sidebar.form.apply")}
            </Button>
          </div>
        </div>
      </SidebarFooter>
  );
}
