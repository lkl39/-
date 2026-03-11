"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  idleText: string;
  pendingText: string;
  className: string;
};

export function SubmitButton({
  idleText,
  pendingText,
  className,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" aria-disabled={pending} className={className}>
      {pending ? pendingText : idleText}
    </button>
  );
}
