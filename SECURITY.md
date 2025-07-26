# Security Policy

## Security Status

✅ **All known vulnerabilities have been resolved as of 2025-07-26**

### Previous Issues (Resolved)

The project previously had a security vulnerability due to the `aligoapi` package dependency, which used an outdated version of axios (0.21.4) with known vulnerabilities:

1. **Axios Cross-Site Request Forgery Vulnerability** (GHSA-wf5p-g6vw-rhxx) - RESOLVED
2. **Axios Requests Vulnerable To Possible SSRF and Credential Leakage** (GHSA-jr5f-v2jv-69x6) - RESOLVED

### Resolution

We have successfully re-engineered the codebase to:
- Remove the `aligoapi` dependency entirely
- Implement direct API calls using the latest version of axios (^1.7.0)
- Maintain full functionality while improving security

## Current Security Measures

The aligo-sms-mcp-server implements the following security practices:

- Uses the latest stable version of all dependencies
- Regular security audits via `npm audit`
- Designed for use in controlled environments with trusted input
- Only accepts input from authorized MCP clients (like Claude AI)
- Does not expose any public-facing endpoints
- Uses authenticated API requests with secure HTTPS connections

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please report it by creating an issue with the "security" label.

## Verification

You can verify the security status by running:
```bash
npm audit
```

Last updated: 2025-07-26