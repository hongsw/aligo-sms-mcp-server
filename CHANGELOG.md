# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-07-26

### Added
- Dockerfile for containerized deployment via Smithery and Glama platforms
- smithery.yaml configuration for Smithery deployment
- .dockerignore to optimize Docker builds
- SECURITY.md documenting security policies and vulnerability status
- Glama.ai MCP server badge in README
- Direct axios implementation for API calls
- form-data package for multipart/form-data support (MMS images)

### Changed
- Replaced aligoapi dependency with direct axios implementation
- Updated axios from vulnerable v0.21.4 (via aligoapi) to latest v1.7.0
- Refactored sendAligoSMS function to use axios instead of native https module
- Improved error handling with proper axios error responses
- Added request timeout configuration (30 seconds)

### Fixed
- **Critical Security Fix**: Resolved axios security vulnerabilities
  - CVE: Axios Cross-Site Request Forgery Vulnerability (GHSA-wf5p-g6vw-rhxx)
  - CVE: Axios SSRF and Credential Leakage Vulnerability (GHSA-jr5f-v2jv-69x6)

### Removed
- aligoapi dependency (v1.1.3) due to outdated axios vulnerability
- .tool-versions file

### Security
- All known vulnerabilities resolved (0 vulnerabilities reported by npm audit)
- Updated to latest stable versions of all dependencies
- Implemented security best practices for API communication

## [1.0.0] - 2025-03-22

### Added
- Initial release of Aligo SMS MCP Server
- Model Context Protocol (MCP) integration
- SMS sending functionality via Aligo API
- Support for SMS, LMS, and MMS message types
- Configuration via .garakrc file
- Scheduled message sending
- Multiple recipient support
- Image attachment support for MMS
- MIT License

### Features
- Send SMS messages through Aligo API
- MCP-compatible server for AI agents like Claude
- Environment-based configuration
- Test mode support
- Comprehensive error handling