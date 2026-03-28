---
name: general-review
description: General code quality review - logic errors, edge cases, error handling, resource cleanup, naming
disable-model-invocation: true
---

# CodeGuard General Review Skill

This skill defines the checks and guidelines for general code quality review. Apply these checks to every file in the review scope.

---

## 1. Logic Errors

Identify code that will produce incorrect results under normal execution.

### Checks

#### 1.1 Off-by-One Errors

- Loop boundaries: verify `<` vs `<=`, `>` vs `>=` in loop conditions.
- Array/list indexing: check for access at index `length` instead of `length - 1`.
- Substring/slice operations: verify start and end indices.
- Pagination: check for skipped or duplicated items at page boundaries.

**Evidence chain requirement**: Show the loop/index expression, the data structure size or boundary, and the specific case where the off-by-one causes incorrect behavior.

#### 1.2 Null/Undefined Handling

- Identify variables that may be null/undefined/None and are used without checks.
- Look for optional chaining that should be mandatory, or vice versa.
- Check return values of functions that can return null (e.g., `Map.get()`, `find()`, database lookups).
- Verify constructor/initialization order — are fields used before they are assigned?

**Evidence chain requirement**: Show the source that can produce null, the path to the usage site, and the missing guard.

#### 1.3 Type Mismatches

- Implicit type coercion that changes behavior (e.g., `"5" + 3` in JavaScript).
- Wrong type passed to a function parameter (especially in dynamically typed languages).
- Enum or string literal mismatches (e.g., comparing `"active"` with `"Active"`).
- Integer overflow or floating-point precision issues in arithmetic.

**Evidence chain requirement**: Show the type at the source, the expected type at the destination, and the resulting incorrect behavior.

#### 1.4 Dead Code

- Unreachable code after return/throw/break/continue.
- Conditions that are always true or always false.
- Unused function parameters that suggest incomplete refactoring.
- Commented-out code blocks that should be removed.

**Evidence chain requirement**: Show the code path that prevents execution, or the condition that is tautological, and reference the dead code.

---

## 2. Edge Cases

Identify inputs or conditions that the code does not handle correctly.

### Checks

#### 2.1 Empty Inputs

- Empty strings, empty arrays/lists, empty maps/objects.
- Zero-length files, empty request bodies.
- Functions that assume at least one element exists (e.g., `array[0]` without length check).

**Evidence chain requirement**: Show the function entry point, the assumption about non-emptiness, and the failure mode when input is empty.

#### 2.2 Boundary Values

- Integer min/max values (e.g., `INT_MAX`, `0`, `-1`).
- Empty string vs null vs undefined — are they treated differently as expected?
- Date boundaries (midnight, DST transitions, leap years, epoch).
- File size limits, request size limits, timeout values.

**Evidence chain requirement**: Show the boundary value, the code that processes it, and the incorrect or undefined behavior.

#### 2.3 Concurrent Access

- Shared mutable state accessed from multiple threads/goroutines/async tasks without synchronization.
- Race conditions in check-then-act patterns (e.g., check file exists then read).
- Non-atomic operations on shared counters or flags.
- Deadlock potential from inconsistent lock ordering.

**Evidence chain requirement**: Show the shared state, the two (or more) access points, and the interleaving that causes the race or deadlock.

#### 2.4 Unicode and Encoding

- String length calculations that count bytes instead of characters/graphemes.
- File I/O without explicit encoding specification.
- URL encoding/decoding mismatches.
- Regular expressions that do not account for multi-byte characters.

**Evidence chain requirement**: Show the string operation, the assumption about encoding, and a concrete input that breaks it.

---

## 3. Error Handling

Identify missing, incorrect, or incomplete error handling.

### Checks

#### 3.1 Swallowed Errors

- Empty catch blocks or catch blocks that only log without re-raising or handling.
- Ignored return values from functions that return error codes.
- `.catch(() => {})` patterns that silently discard errors.
- Go-style `err` variables that are assigned but never checked.

**Evidence chain requirement**: Show the operation that can fail, the catch/error handling block, and the missing propagation or recovery logic.

#### 3.2 Error Propagation

- Errors that lose context when re-thrown (e.g., `throw new Error("failed")` instead of wrapping the original).
- HTTP error responses that expose internal details (stack traces, SQL queries).
- Error types that are too broad (catching `Exception` instead of specific types).

**Evidence chain requirement**: Show the original error source, the propagation path, and where information is lost or leaked.

#### 3.3 Partial Failure

- Multi-step operations where a failure in step N leaves steps 1..N-1 in an inconsistent state.
- Missing rollback or compensation logic in transactions.
- Batch operations that fail silently for some items.

**Evidence chain requirement**: Show the multi-step sequence, the failure point, and the inconsistent state that results.

#### 3.4 Retry Safety

- Operations that are retried but are not idempotent (e.g., incrementing a counter, sending an email).
- Missing deduplication keys on retry.
- Retry loops without backoff or maximum attempt limits.

**Evidence chain requirement**: Show the retry mechanism, the non-idempotent operation, and the duplication that results.

---

## 4. Resource Cleanup

Identify resources that may not be properly released.

### Checks

#### 4.1 File Handles

- Files opened without corresponding close, or outside of a context manager / try-finally / defer.
- File descriptors leaked in error paths.

#### 4.2 Locks and Mutexes

- Locks acquired without guaranteed release (missing `finally`, `defer`, or RAII).
- Lock held across await/yield points in async code.

#### 4.3 Temporary Resources

- Temporary files or directories created but never cleaned up.
- Database connections or cursors not returned to the pool.
- Event listeners or subscriptions registered but never removed.

**Evidence chain requirement (all resource checks)**: Show the resource acquisition, the code path where cleanup is missed, and the consequence (leak, deadlock, exhaustion).

---

## 5. Naming Clarity

Identify names that reduce code readability or are misleading.

### Checks

#### 5.1 Misleading Names

- Variable names that suggest a different type or purpose than actual usage (e.g., `isReady` that holds a count).
- Function names that do not describe side effects (e.g., `getUser()` that also modifies the database).
- Names that are too similar to each other, inviting confusion (e.g., `data` and `dataList` for unrelated things).

#### 5.2 Abbreviations

- Non-standard abbreviations that reduce readability (e.g., `clcPrcFrmInpt` instead of `calculatePriceFromInput`).
- Single-letter variable names outside of short loops or lambdas.

#### 5.3 Boolean Naming

- Boolean variables or functions that do not use a clear predicate form (e.g., `flag` instead of `isEnabled`, `check` instead of `hasPermission`).
- Double negatives in boolean expressions (e.g., `!isNotReady`).

**Evidence chain requirement (all naming checks)**: Show the name, its actual usage, and the clearer alternative. Naming issues should always be severity `style`.

---

---

## 6. Cross-Layer Data Flow

Identify incorrect assumptions about data formats, value ranges, or types as data crosses system boundaries (backend → API → frontend, service A → service B, database → application).

### Checks

#### 6.1 Value Format Assumptions

- Before flagging a data transformation as incorrect, **read the actual data source** to verify the value's format and range.
- Common **correct** patterns that must not be flagged as bugs:
  - Frontend multiplies a 0.0-1.0 float by 100 for percentage display — correct if the backend stores a normalized float.
  - Frontend divides a value by 1000 — correct if the backend stores milliseconds and the frontend displays seconds.
  - String formatting or rounding differences between API response and display.

**Evidence chain requirement**: Include at least one evidence step from the **data producer** (e.g., model field definition, database column type, API serialization) and one from the **data consumer** (e.g., frontend display code). Show the actual value range at the source. A finding based on only the consumer side is insufficient.

#### 6.2 API Contract Mismatches

- Verify that frontend type definitions match the actual API response shape.
- Check for fields that are optional on the backend but treated as required on the frontend, or vice versa.
- Look for enum/string literal values that differ between backend and frontend constants.

**Evidence chain requirement**: Show the backend response model, the API serialization, and the frontend type definition side by side.

#### 6.3 Unit and Encoding Mismatches

- Timestamps: epoch seconds vs milliseconds vs ISO 8601 strings.
- Currency: cents vs dollars.
- Percentages: 0.0-1.0 vs 0-100.
- Sizes: bytes vs kilobytes vs megabytes.

**Evidence chain requirement**: Show the unit at the source, the unit expected by the consumer, and whether a conversion is present and correct.

---

## General Guidelines

- **Prefer precision over volume.** Do not flag a potential issue unless you can construct a clear evidence chain.
- **Be language-aware.** Adjust checks to the idioms of the language being reviewed. For example, Go error handling is different from Python exception handling.
- **Consider the project context.** A prototype script has different standards than a production service.
- **Check changed code first, then check how it integrates** with existing code. Issues at integration boundaries are often the most important.
- **When reviewing data transformations, always verify the source.** The most common false positives come from assuming a value's format in one layer without checking the actual definition in another layer. Cross-layer assumptions are the #1 source of false positives.
