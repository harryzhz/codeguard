---
name: performance-review
description: Performance review - N+1 queries, unbounded loops, missing pagination, memory, async blocking
disable-model-invocation: true
---

# CodeGuard Performance Review Skill

This skill defines the performance-focused checks for the ReviewAgent. Performance issues can cause degraded user experience, increased costs, and system instability. Apply these checks to every file in the review scope.

---

## 1. N+1 Queries

Detect database access patterns where a query is executed inside a loop, resulting in O(N) queries instead of O(1).

### What to Look For

- Database queries (SQL or ORM) executed inside `for`/`while`/`forEach` loops.
- Lazy-loaded relationships accessed in iteration without eager loading (e.g., accessing `order.customer.name` in a loop over orders without a `JOIN` or `prefetch_related`/`includes`).
- GraphQL resolvers that issue individual database calls per field in a list.
- Cache lookups in a loop that could be replaced with a batch `mget`.

### What is NOT an Issue

- Loops with a small, bounded iteration count (e.g., iterating over enum values).
- Queries inside loops that are already batched or use `IN` clauses.
- Intentional sequential processing where batching is not possible (document this in the observation).

### Evidence Chain Requirement

1. Show the **loop** that iterates over the collection.
2. Show the **query or database call** inside the loop body.
3. Show the **collection source** to establish that N can be large.
4. Suggest the **batched alternative** (e.g., `WHERE id IN (...)`, eager loading, `prefetch_related`).

**Severity**: `warning` for most cases. `critical` only if N is unbounded and the query is on a hot path (e.g., API endpoint serving user requests).

---

## 2. Unbounded Loops and Recursion

Detect loops or recursive calls that have no guaranteed termination bound or could run for an excessive number of iterations.

### What to Look For

- `while True` or `for (;;)` loops where the exit condition depends on external state that may never change.
- Recursive functions without a depth limit or with a base case that may not be reached for certain inputs.
- Retry loops without a maximum attempt count.
- Pagination loops that do not check for an empty page to terminate.
- Generator/iterator consumption without a limit (e.g., `list(infinite_generator())`).

### Evidence Chain Requirement

1. Show the **loop or recursive call**.
2. Show the **termination condition** (or lack thereof).
3. Show the **input or state** that could prevent termination.
4. Suggest a **bound** (max iterations, max depth, timeout).

**Severity**: `critical` if the unbounded operation is on a request-handling path (can cause DoS). `warning` for background tasks or CLI tools.

---

## 3. Missing Pagination

Detect API endpoints or database queries that return unbounded result sets.

### What to Look For

- `SELECT * FROM table` without `LIMIT` or `TOP`.
- ORM queries like `.all()` or `.find({})` without pagination parameters.
- API endpoints that return full collections without `limit`/`offset`, `cursor`, or `page` parameters.
- In-memory collection building that loads all records before filtering.
- File listing operations on directories that could contain millions of files.

### What is NOT an Issue

- Queries on tables with a known small, bounded size (e.g., configuration tables, enum lookup tables).
- Internal batch processing jobs that intentionally process all records (with streaming).
- Queries with a `WHERE` clause that constrains results to a small set.

### Evidence Chain Requirement

1. Show the **query or API endpoint** returning unbounded results.
2. Show the **table or collection** being queried to establish that it can grow large.
3. Show the **missing pagination** parameters.
4. Suggest the **pagination strategy** appropriate for the context (offset, cursor, keyset).

**Severity**: `warning` for most cases. `critical` if the unbounded query is on a user-facing endpoint and the table is known to be large.

---

## 4. Large Memory Allocations

Detect code patterns that may allocate excessive memory.

### What to Look For

- Reading entire files into memory (e.g., `file.read()`, `readFileSync()`) for files that could be large.
- Building large strings through repeated concatenation in a loop (O(N^2) memory in some languages).
- Collecting all results from a generator/stream into a list before processing.
- Deep copying large objects unnecessarily.
- Unbounded caches or memoization without eviction (memory leak over time).
- Buffer pre-allocation with user-controlled size without a maximum cap.

### Evidence Chain Requirement

1. Show the **allocation point** (file read, list construction, buffer allocation).
2. Show why the **size could be large** (user-controlled input, unbounded data source).
3. Show the **missing bound or streaming alternative**.
4. Suggest the **fix** (streaming, chunked processing, size limits).

**Severity**: `warning` for most cases. `critical` if the allocation size is directly user-controlled (potential DoS vector).

---

## 5. Blocking I/O in Async Code

Detect synchronous, blocking operations within async/concurrent code paths that can degrade throughput.

### What to Look For

- Synchronous file I/O (`open()`, `readFileSync()`) in async functions or event loop handlers.
- Synchronous HTTP calls (e.g., `requests.get()`) inside `async def` functions in Python.
- `time.sleep()` or `Thread.sleep()` in async code instead of `asyncio.sleep()` or equivalent.
- CPU-intensive computation in async handlers without offloading to a thread pool.
- Database drivers using synchronous connections in an async application.
- Blocking mutex/lock acquisition in async code.

### What is NOT an Issue

- Synchronous I/O in synchronous code (non-async context).
- Async I/O properly awaited (e.g., `await fs.promises.readFile()`).
- Blocking calls in dedicated worker threads.

### Evidence Chain Requirement

1. Show the **async context** (async function, event handler, coroutine).
2. Show the **blocking call** within that context.
3. Explain the **impact** (event loop blocked, throughput degraded, latency spike).
4. Suggest the **async alternative** or thread pool offloading approach.

**Severity**: `warning` for most cases. `critical` if the blocking call is in a high-throughput request handler.

---

## General Performance Review Guidelines

- **Quantify when possible.** "This query runs N times per request where N is the number of items in the cart" is better than "This could be slow."
- **Consider the hot path.** A performance issue in code that runs once at startup is far less important than one in a per-request handler.
- **Be practical.** Micro-optimizations in non-critical paths are `style` at most, not `warning`.
- **Check for existing mitigations.** Caching, connection pooling, or rate limiting may already address the concern — verify before flagging.
- **Distinguish O(N) from O(N^2).** Linear operations on large data sets are often acceptable; quadratic ones rarely are.
