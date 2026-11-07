import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";
export const metadata = { title: "Developers | Urban Carrier" };
export default function Developers() {
  return (
    <main className="min-h-screen bg-[#061a33] text-white">
      <header className="border-b border-white/15 bg-[#041326]">
        <nav aria-label="Developer navigation" className="mx-auto flex max-w-6xl flex-wrap items-center gap-6 px-6 py-5 text-sm">
          <Link href="/" className="mr-auto font-bold text-white">Urban Carrier OS</Link>
          <Link href="/plans" className="text-sky-100">Plans</Link>
          <Link href="/download" className="text-sky-100">Apps</Link>
          <Link href="/developers" aria-current="page" className="text-orange-200">Developers</Link>
          <Link href="/auth?mode=login" className="text-sky-100">Log in</Link>
        </nav>
      </header>
      <article id="integrations" className="mx-auto max-w-4xl space-y-6 px-6 py-12 sm:px-8">
        <Link href="/">Urban Carrier</Link>
        <h1 className="text-4xl font-bold">Connect your dispatch workflow</h1>
        <p>
          Connect your website or business system to your company’s Carrier
          workspace. Use private server-side keys to create delivery requests,
          read job status, and receive signed notifications.
        </p>
        <Link className="inline-flex rounded-xl bg-orange-500 px-5 py-3 font-bold text-white hover:bg-orange-400" href="/workspace/integrations">
          Manage keys and webhooks →
        </Link>
        <h2 id="api-guide" className="text-2xl font-bold">Private keys</h2>
        <p>
          Owners and admins can create company-scoped keys with jobs:read,
          jobs:write, or events:read permission. Keys expire after 1–365 days
          and are shown once. Store them in your server’s secret manager, never
          browser code or a mobile app. Create a replacement key before revoking
          an old one. API use requires active company subscription access.
        </p>
        <h2 className="text-2xl">Endpoints</h2>
        <p>
          Use your configured Carrier API origin, shown in the Integrations
          screen. Authenticate with Authorization: Bearer YOUR_KEY. The limit is
          120 requests per minute per key. A 429 response includes Retry-After.
        </p>
        <pre className="overflow-auto rounded-xl bg-black/30 p-4">{`GET /api/v1/jobs                 jobs:read\nPOST /api/v1/jobs                jobs:write\nGET /api/v1/events               events:read`}</pre>
        <p>
          GET jobs returns up to 100 records, ordered by ID; pass nextCursor as
          ?after= to retrieve the next page. GET events returns up to 100 events
          ordered by creation time and ID; retain nextCursor and poll again to
          retrieve new events.
        </p>
        <h2 className="text-2xl">Create a booking</h2>
        <p>
          Send JSON with name, service, and address. Optional fields: details,
          email, phone. Assignments and status changes remain in the dispatch
          workspace. Include an Idempotency-Key header containing 8–100 letters,
          numbers, underscores, or hyphens. Repeating identical input with the
          same key returns the existing booking; changing the input returns 409.
        </p>
        <pre className="overflow-auto rounded-xl bg-black/30 p-4">
          {JSON.stringify(
            {
              name: "Example Customer",
              service: "Local delivery",
              address: "Customer delivery address",
              details: "Pickup instructions",
            },
            null,
            2,
          )}
        </pre>
        <p>
          New requests return 201; retries return 200. Responses contain the
          booking ID and current status. Invalid input returns 400, invalid keys
          401, inactive subscription access 402, and missing scopes 403. Keys
          cannot read another company’s jobs or change drivers, subscriptions,
          or account permissions.
        </p>
        <h2 className="text-2xl">Signed webhooks</h2>
        <p>
          Register a public HTTPS receiver in Integrations. Copy its signing
          secret once. Notifications include job.created, job.updated, and
          integration.test. Verify X-ICA-Signature against the HMAC-SHA256 of
          the exact raw body using the receiver’s secret; compare the hex value
          after sha256= in constant time. Validate createdAt, ignore duplicate
          event IDs, and acknowledge promptly with 2xx.
        </p>
        <pre className="overflow-auto rounded-xl bg-black/30 p-4">
          {JSON.stringify(
            {
              id: "event-id",
              event: "job.updated",
              createdAt: "ISO-8601 timestamp",
              data: { jobId: "booking-id", status: "Completed" },
            },
            null,
            2,
          )}
        </pre>
        <p>
          Delivery has an eight-second timeout and rejects redirects. This first
          version makes one attempt per notification. Use the events API and
          jobs API to reconcile missed updates; automatic delivery retries are
          not yet included. Receiver URLs must have a public DNS hostname, no
          embedded credentials, and the standard HTTPS port. Latest delivery
          status appears in Integrations; 0 means delivery could not complete.
        </p>
        <p>
          These customer credentials are separate from Stripe payment keys. API
          access is included with operating subscription access; metered API
          billing is not enabled.
        </p>
      </article>
      <SiteFooter />
    </main>
  );
}
