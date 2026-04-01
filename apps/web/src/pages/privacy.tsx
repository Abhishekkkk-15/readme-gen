export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy</h1>
      <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
        ReadMe Studio supports bring-your-own model keys and hosted inference. Authenticated account data and saved
        provider keys are handled by the backend; workspace preferences and some draft state may still be cached in
        the browser for product UX.
      </p>
      <h2 className="mt-10 text-lg font-semibold">Data we process in production (target state)</h2>
      <ul className="text-muted-foreground mt-3 list-inside list-disc space-y-2 text-sm">
        <li>Account email, plan, and billing metadata via our payments provider.</li>
        <li>Repository metadata you authorize through the GitHub App (file names, manifests, existing README).</li>
        <li>Prompts and completions when using hosted models — retained per your data retention policy.</li>
        <li>API keys you store with us are encrypted at rest and never shown in full after save.</li>
      </ul>
      <h2 className="mt-10 text-lg font-semibold">Your controls</h2>
      <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
        Export or delete workspace data, rotate keys, and revoke GitHub access at any time. Enterprise customers can
        request VPC deployment and zero data retention for prompts.
      </p>
      <p className="text-muted-foreground mt-10 text-xs">
        This page is a product placeholder — have legal review before publishing.
      </p>
    </div>
  )
}
