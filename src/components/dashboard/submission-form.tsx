"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import type { SubmissionStatus } from "@/db/schema";
import {
  type SubmissionFormState,
  saveDraftAction,
  submitForReviewAction,
} from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";

const initialState: SubmissionFormState = { ok: true };

const inputBase =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-2 focus-visible:outline-ring";

export interface SubmissionFormProps {
  submissionId?: string;
  defaultValues?: {
    title?: string;
    slug?: string;
    excerpt?: string;
    tags?: string;
    authors?: string;
    bodyMarkdown?: string;
  };
  status: SubmissionStatus;
  readOnly?: boolean;
}

export function SubmissionForm({
  submissionId,
  defaultValues,
  status,
  readOnly,
}: SubmissionFormProps) {
  const [draftState, draftAction, draftPending] = useActionState(
    saveDraftAction,
    initialState,
  );
  const [submitState, submitAction, submitPending] = useActionState(
    submitForReviewAction,
    initialState,
  );

  const [title, setTitle] = useState(defaultValues?.title ?? "");

  const lastState: SubmissionFormState = draftPending
    ? initialState
    : submitState.message
      ? submitState
      : draftState;

  const fieldErrors = lastState.fieldErrors;
  const pending = draftPending || submitPending;

  return (
    <form className="space-y-6">
      {submissionId ? <input type="hidden" name="id" value={submissionId} /> : null}

      {lastState.message ? (
        <div
          role="status"
          className={cn(
            "rounded-md border px-4 py-3 text-sm",
            lastState.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
              : "border-destructive/40 bg-destructive/10 text-destructive",
          )}
        >
          {lastState.message}
        </div>
      ) : null}

      <Field
        label="כותרת המחקר"
        name="title"
        required
        error={fieldErrors?.title}
        readOnly={readOnly}
        defaultValue={defaultValues?.title}
        onChange={(v) => setTitle(v)}
      />

      <Field
        label="Slug (אופציונלי, ASCII בלבד)"
        name="slug"
        readOnly={readOnly}
        defaultValue={defaultValues?.slug}
        placeholder={title ? "" : "policy-impact-2026"}
        error={fieldErrors?.slug}
        helper="אם משאירים ריק, נחשב אוטומטית מהכותרת. אפשר אותיות קטנות, ספרות ומקפים בלבד."
      />

      <Field
        label="תקציר"
        name="excerpt"
        as="textarea"
        rows={3}
        required
        readOnly={readOnly}
        defaultValue={defaultValues?.excerpt}
        error={fieldErrors?.excerpt}
        helper="2-3 משפטים שמציגים את המחקר בקטלוג ובתוצאות חיפוש."
      />

      <Field
        label="כותבים"
        name="authors"
        readOnly={readOnly}
        defaultValue={defaultValues?.authors}
        helper="ברירת מחדל: שם המשתמש שלך. אפשר להפריד מספר כותבים בפסיקים."
        error={fieldErrors?.authors}
      />

      <Field
        label="תגיות"
        name="tags"
        readOnly={readOnly}
        defaultValue={defaultValues?.tags}
        helper="רשימה מופרדת בפסיקים — תגיות חדשות יאושרו על ידי Content Lead."
        error={fieldErrors?.tags}
      />

      <Field
        label="תוכן (Markdown / MDX)"
        name="bodyMarkdown"
        as="textarea"
        rows={20}
        required
        readOnly={readOnly}
        defaultValue={defaultValues?.bodyMarkdown}
        error={fieldErrors?.bodyMarkdown}
        className="font-mono text-sm leading-relaxed"
        helper="כותבים בעברית ב-Markdown. כותרות מסוג ## ו-### יופיעו בתוכן הענייניים."
      />

      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
          <Button type="submit" formAction={draftAction} variant="outline" disabled={pending}>
            {draftPending ? "שומר..." : "שמירת טיוטה"}
          </Button>
          <Button type="submit" formAction={submitAction} disabled={pending}>
            {submitPending
              ? "מגיש..."
              : status === "draft"
                ? "הגשה לבדיקה"
                : "שליחה מחודשת לבדיקה"}
          </Button>
          <p className="text-xs text-muted-foreground">
            הגשה תיצור PR טיוטה במאגר ותעדכן את ה-Content Lead (אם מוגדר).
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground border-t border-border pt-4">
          ההגשה במצב {status} ולא ניתנת כעת לעריכה.
        </p>
      )}
    </form>
  );
}

interface FieldProps {
  label: string;
  name: string;
  required?: boolean;
  readOnly?: boolean;
  defaultValue?: string;
  placeholder?: string;
  helper?: string;
  error?: string;
  as?: "input" | "textarea";
  rows?: number;
  className?: string;
  onChange?: (v: string) => void;
}

function Field(props: FieldProps) {
  const id = `field-${props.name}`;
  const helperId = props.helper ? `${id}-helper` : undefined;
  const errorId = props.error ? `${id}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;
  const sharedProps = {
    id,
    name: props.name,
    required: props.required,
    readOnly: props.readOnly,
    defaultValue: props.defaultValue,
    placeholder: props.placeholder,
    "aria-invalid": props.error ? true : undefined,
    "aria-describedby": describedBy,
    className: cn(inputBase, props.className),
    onChange: props.onChange
      ? (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          props.onChange?.(e.target.value)
      : undefined,
  } as const;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {props.label}
        {props.required ? <span className="ms-1 text-destructive">*</span> : null}
      </label>
      {props.as === "textarea" ? (
        <textarea {...sharedProps} rows={props.rows ?? 4} />
      ) : (
        <input type="text" {...sharedProps} />
      )}
      {props.helper ? (
        <p id={helperId} className="text-xs text-muted-foreground">
          {props.helper}
        </p>
      ) : null}
      {props.error ? (
        <p id={errorId} className="text-xs text-destructive">
          {props.error}
        </p>
      ) : null}
    </div>
  );
}
