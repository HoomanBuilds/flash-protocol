
## 2024-05-18 - [Fix IP Extraction from x-forwarded-for]
**Category:** Security | Bug
**Finding:** The `x-forwarded-for` header can contain multiple comma-separated IP addresses when a request goes through proxies. Previously, the raw string or untrimmed string was being directly assigned to `ip_address` in database logs, which has a length limit of 45 (`varchar(45)`).
**Learning:** For Next.js/Supabase architectures, processing headers containing proxy chains must always handle string extraction properly. Passing a raw comma-separated list of IPs can crash database inserts, and ignoring whitespace can cause malformed data.
**Action:** Always extract the actual client IP by splitting the `x-forwarded-for` header by commas and explicitly trimming whitespace: `ip.split(',')[0].trim()`.
