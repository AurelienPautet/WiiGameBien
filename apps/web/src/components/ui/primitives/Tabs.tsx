import { createContext, forwardRef, useContext, useId, useState } from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { LayoutGroup } from "motion/react";
import { cn } from "../../../lib/cn";
import { ui } from "../../../audio";
import { SelectionIndicator } from "./SelectionIndicator";

// Radix Tabs — keyboard nav (arrows/Home/End) + ARIA roles for free, replacing
// the hand-rolled components/ui/Tabs.tsx (which had neither).
const SelectedTab = createContext<string | undefined>(undefined);

export const Tabs = forwardRef<
  React.ComponentRef<typeof RadixTabs.Root>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Root>
>(({ value, defaultValue, onValueChange, ...props }, ref) => {
  const [localValue, setLocalValue] = useState(defaultValue);
  const groupId = useId();
  const selectedValue = value ?? localValue;
  return (
    <SelectedTab.Provider value={selectedValue}>
      <LayoutGroup id={groupId}>
        <RadixTabs.Root
          ref={ref}
          {...(selectedValue === undefined ? {} : { value: selectedValue })}
          onValueChange={(nextValue) => {
            if (value === undefined) setLocalValue(nextValue);
            onValueChange?.(nextValue);
          }}
          {...props}
        />
      </LayoutGroup>
    </SelectedTab.Provider>
  );
});
Tabs.displayName = "Tabs";

export const TabsList = forwardRef<
  React.ComponentRef<typeof RadixTabs.List>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.List>
>(({ className, ...props }, ref) => (
  <RadixTabs.List
    ref={ref}
    className={cn("flex w-full gap-2", className)}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = forwardRef<
  React.ComponentRef<typeof RadixTabs.Trigger>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger>
>(({ className, onClick, children, value, ...props }, ref) => {
  const selected = useContext(SelectedTab) === value;
  return (
    <RadixTabs.Trigger
      ref={ref}
      value={value}
      className={cn(
        "relative isolate flex-1 py-3 px-4 text-center font-display font-semibold uppercase rounded-t-xl cursor-pointer transition-colors",
        "border-x-[3px] border-t-[3px] border-transparent text-ink-soft hover:text-ink",
        "data-[state=active]:text-ink",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue/30",
        className
      )}
      {...props}
      onClick={(e) => {
        ui.tab();
        onClick?.(e);
      }}
    >
      {selected && (
        <SelectionIndicator className="pointer-events-none absolute -inset-[3px] bottom-0 -z-10 rounded-t-xl border-x-[3px] border-t-[3px] border-ink bg-white" />
      )}
      {children}
    </RadixTabs.Trigger>
  );
});
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = forwardRef<
  React.ComponentRef<typeof RadixTabs.Content>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Content>
>(({ className, ...props }, ref) => (
  <RadixTabs.Content
    ref={ref}
    className={cn(
      "tab-content-transition focus-visible:outline-none",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";
