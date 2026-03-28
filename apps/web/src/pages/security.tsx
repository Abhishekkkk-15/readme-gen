export function SecurityPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Security &amp; compliance</h1>
      <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
        Our roadmap targets SOC 2 Type II, annual pen tests, and customer-accessible audit logs for Enterprise
        workspaces. The current repository is a UI demo — no production API or data store is attached.
      </p>

      <h2 className="mt-10 text-lg font-semibold">Practices we ship toward</h2>
      <ul className="text-muted-foreground mt-3 list-inside list-disc space-y-2 text-sm">
        <li>Least-privilege GitHub App permissions scoped to repositories you select.</li>
        <li>Tenant isolation for hosted inference and encrypted secrets (KMS-backed).</li>
        <li>SSO (SAML/OIDC) and SCIM for Enterprise orgs.</li>
        <li>Published subprocessors list and DPA on request.</li>
      </ul>

      <h2 className="mt-10 text-lg font-semibold">Report a vulnerability</h2>
      <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
        Contact security@example.com with encrypted details (PGP fingerprint published alongside launch). We aim for
        initial response within two business days.
      </p>

      <p className="text-muted-foreground mt-10 text-xs">
        Replace contact methods and claims with counsel-approved text before go-live.
      </p>
    </div>
  )
}
