## 2026-04-05 - IP Extraction Vulnerability and Next.js Static Prerendering Error
**Category:** Security | Bug
**Finding:**
1. The `x-forwarded-for` header handling in `src/app/api/v1/payment-links/route.ts` and `src/lib/api/verify-api-key.ts` was vulnerable to IP spoofing and database insertion limits by inserting the raw string which can contain multiple comma-separated proxy chains.
2. Next.js static prerendering `npm run build` would fail because `createAppKit()` inside `src/providers.tsx` was conditionally executed inside `if (projectId)` which resolved to an empty string during build without environment variables.
**Learning:**
1. Always parse proxy chains properly: `ip.split(',')[0].trim()` instead of inserting raw values directly.
2. Next.js executes module level code during static generation without runtime environment variables. Third-party SDK initialization must be run unconditionally with fallback values.
**Action:**
1. Always split and trim the `x-forwarded-for` header to fetch the real client IP.
2. Ensure third-party initialization using environment variables has a fallback and is executed unconditionally.
