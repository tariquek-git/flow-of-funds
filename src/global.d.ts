export {};

declare global {
  interface Window {
    /**
     * Set by the inline URL-sanitizer in the root layout: the handed-off payment
     * query (`q`), post-unlock destination (`next`), and prefill-link payload
     * (`d`, e.g. a link shared from the Polaris WhatsApp bot) are lifted out of
     * the URL — so they never reach analytics, the Referer, or browser history —
     * and parked here for the app (Landing / Studio / unlock page) to consume on
     * mount.
     */
    __fofHandoff?: { q: string | null; next: string | null; d: string | null };
  }
}
