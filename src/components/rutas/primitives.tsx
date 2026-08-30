import { X } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Tone = "default" | "primary" | "success" | "danger" | "warning" | "ghost";

const toneClass: Record<Tone, string> = {
  default:
    "bg-elevated text-foreground border-border-strong hover:border-subtle hover:bg-secondary",
  primary:
    "bg-primary text-primary-foreground border-primary hover:brightness-110",
  success:
    "bg-success/12 text-success border-success/35 hover:bg-success/20",
  danger:
    "bg-destructive/12 text-destructive border-destructive/35 hover:bg-destructive/20",
  warning:
    "bg-warning/12 text-warning border-warning/35 hover:bg-warning/20",
  ghost: "bg-transparent text-muted-foreground border-transparent hover:bg-secondary",
};

export function Btn({
  tone = "default",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-lg border font-medium transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
        size === "sm" && "px-2.5 py-1.5 text-xs",
        size === "md" && "px-3.5 py-2 text-sm",
        size === "lg" && "px-4 py-3 text-[15px]",
        toneClass[tone],
        className,
      )}
      {...props}
    />
  );
}

export function LinkBtn({
  tone = "default",
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { tone?: Tone }) {
  return (
    <a
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all active:scale-[0.98]",
        toneClass[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle">
          {label}
        </span>
      ) : null}
      <input
        className={cn(
          "w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-subtle/70 focus:border-ring focus:ring-2 focus:ring-ring/25",
          className,
        )}
        {...props}
      />
    </label>
  );
}

export function TextArea({
  label,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle">
          {label}
        </span>
      ) : null}
      <textarea
        className={cn(
          "w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-subtle/70 focus:border-ring focus:ring-2 focus:ring-ring/25",
          className,
        )}
        {...props}
      />
    </label>
  );
}

export function Select({
  label,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle">
          {label}
        </span>
      ) : null}
      <select
        className={cn(
          "w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/25",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Badge({
  tone = "muted",
  children,
  className,
}: {
  tone?: "muted" | "primary" | "success" | "danger" | "warning";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    muted: "bg-secondary text-muted-foreground border-border",
    primary: "bg-primary/15 text-accent border-primary/30",
    success: "bg-success/15 text-success border-success/30",
    danger: "bg-destructive/15 text-destructive border-destructive/30",
    warning: "bg-warning/15 text-warning border-warning/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Cerrar"
        className="absolute inset-0 bg-background/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-popover shadow-panel sm:rounded-2xl",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{title}</h3>
            {subtitle ? (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="scroll-area flex-1 px-5 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-border bg-elevated/60 px-5 py-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: ReactNode;
  title: string;
  hint?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-elevated text-muted-foreground">
        {icon}
      </div>
      <p className="text-[15px] font-semibold text-foreground">{title}</p>
      {hint ? <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
