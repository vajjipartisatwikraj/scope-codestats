import axios from "../utils/axiosConfig";
import { apiUrl } from "../config/apiConfig";

/**
 * Client for /api/admin/emails-history (admins only): every email the platform sent to a person, and
 * how it went. Components never build these URLs themselves; auth headers come from the shared axios
 * instance.
 */
const base = `${apiUrl}/admin/emails-history`;

const unwrap = (promise) => promise.then((response) => response.data);

export { apiErrorMessage } from "./noticeApi";

export const emailHistoryApi = {
  /**
   * A page of emails, newest first.
   * { emails: [{ _id, type, to, recipientName, subject, status, error, sentAt, createdAt, sentBy, reference }],
   *   total, page, limit, totals: { sent, failed, sending } }
   */
  list: ({ status, type, search, page, limit }) =>
    unwrap(
      axios.get(base, {
        params: {
          status: status && status !== "all" ? status : undefined,
          type: type && type !== "all" ? type : undefined,
          search: search || undefined,
          page,
          limit,
        },
      })
    ),
  /** One email: the list fields plus messageId, details and `html` (the body, with its logos inlined) */
  get: (id) => unwrap(axios.get(`${base}/${id}`)),
};
