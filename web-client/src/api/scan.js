import { api } from "./client";

// Student self-checkout (books only).
// Posts the scanned/typed asset tag of a book copy. Backend verifies the
// caller has an APPROVED booking for that book title and flips the booking
// to CHECKED_OUT.
//
// BACKEND REQUIREMENT: add POST /scan/self-checkout (STUDENT, LECTURER) with
// body { assetTag } — see issue #N. Until that endpoint exists, calls will
// return 404 and the UI surfaces "Asset tag not recognised".
export const selfCheckoutBook = (assetTag) =>
  api.post("/scan/self-checkout", { assetTag }).then((r) => r.data);
