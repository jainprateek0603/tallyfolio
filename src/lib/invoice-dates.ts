import { ApiError } from "@/lib/api-error";
import { parseIsoDate } from "@/lib/dates";

type StoredDates = { issueDate: Date; dueDate: Date };
type DatePatch = { issueDate?: string; dueDate?: string };

/**
 * Applies an invoice update's dates over the stored ones and checks the result.
 * Use this in update routes: the schema can only compare the two dates when the
 * request sends both, so moving one date past the stored other one needs this.
 */
export function mergeInvoiceDates(stored: StoredDates, patch: DatePatch): StoredDates {
  const issueDate = patch.issueDate ? parseIsoDate(patch.issueDate) : stored.issueDate;
  const dueDate = patch.dueDate ? parseIsoDate(patch.dueDate) : stored.dueDate;
  if (dueDate < issueDate) {
    const message = "Due date must be on or after the issue date.";
    throw new ApiError(422, "VALIDATION_ERROR", "Check the highlighted fields.", {
      formErrors: [],
      fieldErrors: { [patch.dueDate ? "dueDate" : "issueDate"]: [message] },
    });
  }
  return { issueDate, dueDate };
}
