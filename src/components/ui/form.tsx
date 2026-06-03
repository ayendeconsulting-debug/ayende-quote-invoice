"use client";

import { useFormStatus } from "react-dom";
import clsx from "clsx";

const baseField =
  "w-full rounded-lg border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-100)] disabled:opacity-60";

export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-[var(--color-ink-500)]">
        {label}
        {required ? <span className="ml-0.5 text-[var(--color-accent-600)]">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-[var(--color-rose)]">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-[var(--color-ink-300)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(baseField, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx(baseField, "min-h-24 resize-y", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx(baseField, props.className)} />;
}

export function SubmitButton({ children, idle }: { children?: React.ReactNode; idle?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-600)] disabled:opacity-60"
    >
      {pending ? "Saving…" : children ?? idle ?? "Save"}
    </button>
  );
}

export function FormMessage({ type, children }: { type: "success" | "error"; children: React.ReactNode }) {
  const styles =
    type === "success"
      ? "bg-[#e7f4ef] text-[var(--color-teal)]"
      : "bg-[#fdecea] text-[var(--color-rose)]";
  return <p className={clsx("rounded-lg px-3 py-2 text-sm", styles)}>{children}</p>;
}
