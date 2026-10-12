import Link from "next/link";
export const metadata = { title: "Developers | Urban Carrier" };
export default function Developers() {
  return (
    <main className="min-h-screen bg-[#061a33] text-white">
      <article className="mx-auto max-w-4xl space-y-6 p-8">
        <Link href="/">Urban Carrier</Link>
        <h1 className="text-4xl font-bold">Connect your dispatch workflow</h1>
        <p>
          Connect your website or business system to your company’s Carrier
          workspace. Use private server-side keys to create delivery requests,
          read job status, and receive signed notifications.
        </p>
        <Link className="text-sky-300 underline" href="/workspace/integrations">
          Manage keys and webhooks →
        </Link>
        <h2 className="text-2xl">Private keys</h2>
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
          These customer credentials are separate from Stripe payment keys. Separate API subscriptions and company-wide usage allowances are being prepared. No separate API charge or automatic overage fee is enabled yet. Paid API access, once launched, will be an additional subscription alongside operating software access. Owners/admins will manage it in Integrations.
        </p>
      </article>
    </main>
  );
}
