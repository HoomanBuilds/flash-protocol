## 2025-04-07 - Insecure extraction of x-forwarded-for leading to DB errors
**Category:** Security
**Finding:** The `x-forwarded-for` header was either directly inserted into the database or split by commas without trimming.
**Learning:** This could lead to a vulnerability where users can pass huge lengths of proxy chains leading to database insert failures when inserting logs due to string size constraints, as well as inaccurate logging. Always extract the first IP and trim it to avoid these issues.
**Action:** When extracting the client IP from the `x-forwarded-for` header, always handle proxy chains securely by splitting the string by comma and trimming whitespace (`ip.split(',')[0].trim()`).
