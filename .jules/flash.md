
## 2026-04-10 - x-forwarded-for handling Vulnerability
**Category:** Security
**Finding:** The `x-forwarded-for` header handling in `src/lib/api/verify-api-key.ts` and `src/app/api/v1/payment-links/route.ts` was not trimming whitespace after splitting the IP string by commas.
**Learning:** `x-forwarded-for` can contain proxy chains with spaces. Not trimming IP strings can cause database insertion limits (such as `VARCHAR(45)`) to breach or analytics tracking issues, and potential injection vulnerability. It's a common oversight, specifically the missing `trim()`.
**Action:** Always parse `x-forwarded-for` headers by splitting with commas and extracting the first string via `ip.split(',')[0].trim()`.

## 2026-04-10 - NextJS Build AppKit Initialization Issue
**Category:** Code Quality / Build
**Finding:** The build process was logging an error due to conditionally rendering `createAppKit`. While attempting to resolve it by giving `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` a fake fallback id and unconditionally rendering `createAppKit` solved the build process error log, it introduced an SDK network error in environments that lacked the environment variable.
**Learning:** Unconditionally loading SDKs like AppKit with dummy values is a common cause of 4xx network errors when running the application. The original code safely skipped initialization. The AppKit bug log was not breaking the build anyway and was something not necessary to solve alongside the `x-forwarded-for` fix, which violated the single fix boundary.
**Action:** Ensure third party SDKs are properly setup and avoid falling back to dummy variables just to bypass static rendering errors, as that can result in SDK/Network errors. Always limit changes per PR to the exact bug being tackled (One fix per PR constraint).
