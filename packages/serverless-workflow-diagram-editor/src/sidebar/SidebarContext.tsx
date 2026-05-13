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

import * as React from "react";
import { PanelRightOpen } from "lucide-react";

const SIDEBAR_WIDTH = "16rem";

type SidebarContextType = {
  open: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextType | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}

export function SidebarProvider({
  defaultOpen = true,
  children,
}: {
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const toggleSidebar = React.useCallback(() => setOpen((o) => !o), []);

  const value = React.useMemo(() => ({ open, toggleSidebar }), [open, toggleSidebar]);

  return (
    <SidebarContext.Provider value={value}>
      <div
        className="dec:flex dec:h-full dec:w-full"
        style={{ "--sidebar-width": SIDEBAR_WIDTH } as React.CSSProperties}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function SidebarInset({ children }: { children: React.ReactNode }) {
  return (
    <div className="dec:relative dec:flex dec:w-full dec:flex-1 dec:flex-col dec:min-w-0">
      {children}
    </div>
  );
}

export function Sidebar({
  children,
  side = "right",
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  side?: "left" | "right";
  "aria-label"?: string;
}) {
  const { open } = useSidebar();

  return (
    <aside
      aria-label={ariaLabel}
      data-state={open ? "expanded" : "collapsed"}
      data-side={side}
      className={`dec:h-full dec:overflow-hidden dec:bg-white dec:dark:bg-gray-900 dec:transition-[width] dec:duration-200 dec:ease-linear ${
        side === "right" ? "dec:border-l" : "dec:border-r"
      } dec:border-gray-200 dec:dark:border-gray-700 ${
        open ? "dec:w-(--sidebar-width)" : "dec:w-0"
      }`}
    >
      <div className="dec:flex dec:h-full dec:w-(--sidebar-width) dec:flex-col">{children}</div>
    </aside>
  );
}

export function SidebarHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={className}>{children}</div>;
}

export function SidebarContent({ children }: { children: React.ReactNode }) {
  return <div className="dec:flex-1 dec:overflow-auto">{children}</div>;
}

export function SidebarTrigger({ className }: { className?: string }) {
  const { toggleSidebar } = useSidebar();
  return (
    <button onClick={toggleSidebar} className={className} aria-label="Toggle Sidebar" type="button">
      <PanelRightOpen className="dec:h-4 dec:w-4" />
    </button>
  );
}
