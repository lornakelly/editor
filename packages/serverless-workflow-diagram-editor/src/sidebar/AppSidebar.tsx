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

import { Sidebar, SidebarContent, SidebarHeader } from "./SidebarContext";
import { useI18n } from "@serverlessworkflow/i18n";
import { WorkflowInfoContent } from "./WorkflowInfoContent";
import { PanelRightClose } from "lucide-react";
import "./Sidebar.css";

export function AppSidebar() {
  const { t } = useI18n();

  return (
    <Sidebar side="right" aria-label={t("sidebar.toggle")}>
      <SidebarHeader className="dec:flex dec:items-center dec:gap-2 dec:px-4 dec:py-3">
        <PanelRightClose className="dec:h-4 dec:w-4 dec:text-gray-500" />
      </SidebarHeader>
      <SidebarContent>
        <WorkflowInfoContent />
      </SidebarContent>
    </Sidebar>
  );
}
