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

import { useMemo } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        "dec:flex dec:flex-col dec:gap-6",
        "dec:has-[>[data-slot=checkbox-group]]:gap-3 dec:has-[>[data-slot=radio-group]]:gap-3",
        className,
      )}
      {...props}
    />
  );
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "dec:mb-3 dec:font-medium",
        "dec:data-[variant=legend]:text-base",
        "dec:data-[variant=label]:text-sm",
        className,
      )}
      {...props}
    />
  );
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "dec:group/field-group dec:@container/field-group dec:flex dec:w-full dec:flex-col dec:gap-7 dec:data-[slot=checkbox-group]:gap-3 dec:[&>[data-slot=field-group]]:gap-4",
        className,
      )}
      {...props}
    />
  );
}

const fieldVariants = cva(
  "dec:group/field dec:flex dec:w-full dec:gap-3 dec:data-[invalid=true]:text-destructive",
  {
    variants: {
      orientation: {
        vertical: ["dec:flex-col [&>*]:w-full [&>.sr-only]:w-auto"],
        horizontal: [
          "dec:flex-row dec:items-center",
          "dec:[&>[data-slot=field-label]]:dec:flex-auto",
          "dec:has-[>[data-slot=field-content]]:dec:items-start dec:has-[>[data-slot=field-content]]:dec:[&>[role=checkbox],[role=radio]]:dec:mt-px",
        ],
        responsive: [
          "dec:flex-col @md/field-group:dec:flex-row @md/field-group:dec:items-center [@>*]:dec:w-full @md/field-group:[@>*]:dec:w-auto [@>.sr-only]:dec:w-auto",
          "@md/field-group:[&>[data-slot=field-label]]:dec:flex-auto",
          "@md/field-group:dec:has-[>[data-slot=field-content]]:dec:items-start @md/field-group:dec:has-[>[data-slot=field-content]]:dec:[&>[role=checkbox],[role=radio]]:dec:mt-px",
        ],
      },
    },
    defaultVariants: {
      orientation: "vertical",
    },
  },
);

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  );
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn(
        "dec:group/field-content dec:flex dec:flex-1 dec:flex-col dec:gap-1.5 dec:leading-snug",
        className,
      )}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        "dec:group/field-label dec:peer/field-label dec:flex dec:w-fit dec:gap-2 dec:leading-snug dec:group-data-[disabled=true]/field:opacity-50",
        "dec:has-[>[data-slot=field]]:w-full dec:has-[>[data-slot=field]]:flex-col dec:has-[>[data-slot=field]]:rounded-md dec:has-[>[data-slot=field]]:border dec:[&>*]:data-[slot=field]:p-4",
        "dec:has-data-[state=checked]:border-primary dec:has-data-[state=checked]:bg-primary/5 dec:dark:has-data-[state=checked]:bg-primary/10",
        className,
      )}
      {...props}
    />
  );
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        "dec:flex dec:w-fit dec:items-center dec:gap-2 dec:text-sm dec:leading-snug dec:font-medium dec:group-data-[disabled=true]/field:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "dec:text-sm dec:leading-normal dec:font-normal dec:text-muted-foreground dec:group-has-[[data-orientation=horizontal]]/field:text-balance",
        "dec:last:mt-0 dec:nth-last-2:-mt-1 dec:[[data-variant=legend]+&]:-mt-1.5",
        "dec:[&>a]:underline dec:[&>a]:underline-offset-4 dec:[&>a:hover]:text-primary",
        className,
      )}
      {...props}
    />
  );
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  children?: React.ReactNode;
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        "dec:relative dec:-my-2 dec:h-5 dec:text-sm dec:group-data-[variant=outline]/field-group:-mb-2",
        className,
      )}
      {...props}
    >
      <Separator className="dec:absolute dec:inset-0 dec:top-1/2" />
      {children && (
        <span
          className="dec:relative dec:mx-auto dec:block dec:w-fit dec:bg-background dec:px-2 dec:text-muted-foreground"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  );
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>;
}) {
  const content = useMemo(() => {
    if (children) {
      return children;
    }

    if (!errors?.length) {
      return null;
    }

    const uniqueErrors = [...new Map(errors.map((error) => [error?.message, error])).values()];

    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message;
    }

    return (
      <ul className="dec:ml-4 dec:flex dec:list-disc dec:flex-col dec:gap-1">
        {uniqueErrors.map((error, index) => error?.message && <li key={index}>{error.message}</li>)}
      </ul>
    );
  }, [children, errors]);

  if (!content) {
    return null;
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn("dec:text-sm dec:font-normal dec:text-destructive", className)}
      {...props}
    >
      {content}
    </div>
  );
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
};
