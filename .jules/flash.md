## 2024-05-18 - Unsanitized X-Forwarded-For injection vulnerability
**Category:** Security
**Finding:** `x-forwarded-for` header values were passed directly into Supabase insert operations without sanitization or `.trim()`.
**Learning:** Proxy chains can prepend multiple IPs or inject spaces in the `x-forwarded-for` header. Passing this unsanitized directly to database queries could trigger DoS via massive insertion limits or injection vulnerabilities.
**Action:** Always extract the client IP securely using `(ip || "").split(",")[0].trim()`.
