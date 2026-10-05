import axios from 'axios';

/**
 * Turns a failed request into one short sentence for an error toast:
 * what happened and, when possible, what the user can do about it.
 */
export function describeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Can't reach Lista. Check your internet and try again.";
    }
    const status = error.response.status;
    if (status === 401) return 'Your session expired. Please log in again.';
    if (status === 403) return "You don't have permission to do that.";
    if (status === 404) return "We couldn't find it. It may have been deleted.";
    if (status >= 500) return "Lista's server had a problem. Try again in a moment.";
  }
  return 'Something went wrong. Please try again.';
}
