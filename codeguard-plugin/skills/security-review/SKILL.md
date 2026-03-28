# CodeGuard Security Review Skill

This skill defines the security-focused checks for the ReviewAgent. Security findings often require tracing data flow from an untrusted source to a sensitive sink. Apply these checks to every file in the review scope.

---

## Data Flow Tracing Method

For each security check, follow this systematic approach:

1. **Identify Sources**: Find where external/untrusted data enters the system (HTTP request parameters, headers, body, file uploads, environment variables, database reads, message queues, user-controlled file paths).
2. **Trace Transformations**: Follow the data through variable assignments, function calls, and transformations. Note any sanitization, validation, or encoding applied.
3. **Identify Sinks**: Find where the data is used in a security-sensitive operation (database query, command execution, file system access, HTML rendering, HTTP response, redirect URL).
4. **Assess Protection**: Determine whether the sanitization/validation between source and sink is sufficient to prevent exploitation.

Build evidence chains that show the complete path from source to sink.

---

## 1. SQL Injection

Detect cases where untrusted input is concatenated or interpolated into SQL queries without parameterization.

### What to Look For

- String concatenation or f-strings/template literals used to build SQL queries with user input.
- ORM raw query methods with interpolated values (e.g., `Model.objects.raw(f"SELECT ... WHERE id = {user_id}")`)
- Dynamic table or column names derived from user input without allowlist validation.
- `LIKE` clauses with unescaped wildcards from user input.
- Stored procedures called with concatenated parameters.

### What is NOT an Issue

- Parameterized queries with placeholders (`?`, `$1`, `%s` with separate args, named parameters).
- ORM query builders using safe methods (e.g., `.filter(id=user_id)`).
- Static SQL with no external input.

### Evidence Chain Requirement

1. Show the **source**: where the untrusted input originates (e.g., request parameter).
2. Show the **path**: how it flows to the query construction (variable assignments, function calls).
3. Show the **sink**: the exact line where the query is built with the tainted data.
4. Show the **missing protection**: confirm that no parameterization or allowlist is applied.

**Severity**: `critical` (confidence >= 0.85 required). Downgrade to `warning` if the input source is ambiguous.

---

## 2. Authentication Bypass

Detect logic flaws that allow unauthenticated or unauthorized access.

### What to Look For

- Route handlers or API endpoints missing authentication middleware.
- Authorization checks that compare with `==` instead of constant-time comparison for tokens.
- JWT validation that does not verify the signature algorithm (`alg: none` attack).
- Role checks that use client-supplied role claims without server-side verification.
- Session fixation: session ID not regenerated after login.
- Missing CSRF protection on state-changing endpoints.
- Authentication logic with early return on partial success (timing oracle).

### Evidence Chain Requirement

1. Show the **endpoint or route** definition.
2. Show the **middleware chain or decorator list** — highlight the missing auth check.
3. Show a **comparison with similar endpoints** that do have auth (if available) to demonstrate the inconsistency.

**Severity**: `critical` if the endpoint exposes sensitive data or state-changing operations. `warning` for informational endpoints.

---

## 3. Secret Exposure

Detect hardcoded secrets, credentials, or API keys in the codebase.

### What to Look For

- Hardcoded passwords, API keys, tokens, or private keys in source code.
- Secrets in configuration files that are committed to version control (check `.gitignore`).
- Secrets logged to stdout/stderr or included in error messages.
- Secrets passed as URL query parameters (visible in logs and browser history).
- Default credentials that are not overridden in production configuration.
- `.env` files or secret files committed without `.gitignore` protection.

### What is NOT an Issue

- Environment variable references (e.g., `os.environ["API_KEY"]`, `process.env.SECRET`).
- Placeholder values clearly marked as examples (e.g., `"your-api-key-here"`, `"changeme"`).
- Test fixtures with fake credentials in test directories.

### Evidence Chain Requirement

1. Show the **secret value** (partially redacted — show first 4 chars and last 2 chars only, replace the rest with `***`).
2. Show the **file and line** where it appears.
3. Show whether the **file is gitignored** or committed.

**Severity**: `critical` for production credentials. `warning` for development/staging credentials or default values.

---

## 4. Input Validation

Detect missing or insufficient validation of external input.

### What to Look For

- User input used directly without type checking, length limits, or format validation.
- Numeric inputs not checked for range, sign, or NaN/Infinity.
- File upload paths not validated for directory traversal (`../`).
- Regular expressions vulnerable to ReDoS (catastrophic backtracking).
- Deserialization of untrusted data without schema validation (e.g., `pickle.loads()`, `JSON.parse()` followed by unchecked property access, `yaml.load()` without safe loader).
- HTML/XML input not sanitized before rendering (XSS).
- Email, URL, or other structured input accepted without format validation.

### Evidence Chain Requirement

1. Show the **input source** and its type/format.
2. Show the **usage site** where the input is consumed.
3. Show the **missing validation** between source and usage.
4. Describe a **concrete attack input** that exploits the gap.

**Severity**: `critical` for XSS, path traversal, or deserialization attacks. `warning` for missing length limits or format validation.

---

## 5. SSRF (Server-Side Request Forgery)

Detect cases where user-controlled input influences outbound HTTP requests or network connections made by the server.

### What to Look For

- User-supplied URLs passed to HTTP clients (e.g., `requests.get(user_url)`, `fetch(user_url)`, `http.Get(user_url)`).
- URL construction using user input for host, port, or path components.
- Redirect following without validating the target URL.
- DNS rebinding potential: URL validated at check time but resolved differently at use time.
- Internal service URLs constructible from user input (e.g., accessing metadata endpoints like `http://169.254.169.254`).

### What is NOT an Issue

- Outbound requests to hardcoded, trusted URLs with no user-controlled components.
- URL path parameters that are validated against an allowlist.
- Webhook URLs stored by admins (not regular users) with appropriate access controls.

### Evidence Chain Requirement

1. Show the **user input** that controls the URL or part of it.
2. Show the **HTTP client call** where the URL is used.
3. Show the **missing validation** — no allowlist, no domain restriction, no private IP blocking.
4. Describe the **attack scenario** (e.g., accessing internal metadata service, port scanning).

**Severity**: `critical` if the server can reach internal services or cloud metadata endpoints. `warning` if limited to external URLs without sensitive internal access.

---

## General Security Review Guidelines

- **Assume all external input is hostile.** The burden of proof is on the code to demonstrate safety, not on the reviewer to demonstrate exploitability.
- **Check the full data flow.** A sanitization function applied at the wrong layer or after the sensitive operation is not protection.
- **Consider the deployment context.** Code running in a container with network restrictions has different SSRF risk than code on a flat network.
- **Do not flag theoretical issues without evidence.** Every finding must trace a concrete path from source to sink.
- **Respect the confidence threshold.** If you cannot trace the full data flow, lower the confidence. If confidence drops below 0.85, do not use `critical` severity.
