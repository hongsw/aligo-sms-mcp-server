# Security Policy

## Known Vulnerabilities

### axios dependency in aligoapi package

The `aligoapi` package (v1.1.3) currently uses axios v0.21.4, which has known security vulnerabilities:

1. **Axios Cross-Site Request Forgery Vulnerability** (GHSA-wf5p-g6vw-rhxx)
   - Severity: Moderate (CVSS Score: 6.5)
   - CWE: CWE-352

2. **Axios Requests Vulnerable To Possible SSRF and Credential Leakage via Absolute URL** (GHSA-jr5f-v2jv-69x6)
   - Severity: High
   - CWE: CWE-918

## Mitigation

Currently, the aligo-sms-mcp-server is designed to be used in a controlled environment with trusted input, which significantly reduces the security risk. The server:

- Only accepts input from authorized MCP clients (like Claude AI)
- Does not expose any public-facing endpoints
- Uses the Aligo API with authenticated requests only

## Recommended Actions

1. **For Production Use**: Monitor the `aligoapi` package for updates that address the axios vulnerability
2. **For Development**: Use the server only with trusted inputs and in controlled environments
3. **Alternative Solution**: Consider implementing direct API calls without the aligoapi dependency (work in progress)

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please report it by creating an issue with the "security" label.

## Updates

We are actively working with the aligoapi maintainer to update the axios dependency. This document will be updated once the vulnerability is resolved.

Last updated: 2025-07-26