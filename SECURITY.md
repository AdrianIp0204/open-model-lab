# Security Policy

Open Model Lab accepts private vulnerability reports. Please report suspected vulnerabilities privately instead of opening a public issue.

## Supported Version

Security support currently covers the current `main` branch and the live Open Model Lab deployment only. Older commits, forks, and unofficial deployments are not covered unless maintainers state otherwise.

## Reporting A Vulnerability

Use the temporary security contact path:

- email: `feedback@openmodellab.com`
- subject prefix: `Security report:`
- fallback: the `/contact` page on the live site

If the public feedback address changes, use the address shown by the live Open Model Lab contact page.

Include:

- affected route, API endpoint, or feature
- reproduction steps
- expected and actual behavior
- impact and who may be affected
- screenshots or logs only if they do not expose secrets or user data
- suggested fix, if known

## Testing Boundaries

Do not:

- access, modify, delete, or exfiltrate real user data
- test against accounts you do not own or control
- run destructive, high-volume, denial-of-service, spam, or social-engineering tests
- bypass payment, billing, or entitlement systems outside a clearly controlled local/test setup
- publish exploit details before the issue is resolved

Use local development, test accounts, and the dev harness where possible.

## Response Expectations

No bug bounty, reward program, or service-level agreement is promised. The project owner or maintainers will review reports as capacity allows and may ask for more information.
