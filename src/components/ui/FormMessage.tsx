import type { FormState } from "@/lib/forms";

export function FormMessage({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-2xl bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
        {state.message}
      </p>
    );
  }
  return null;
}
