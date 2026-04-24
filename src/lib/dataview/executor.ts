/**
 * Dataview Query Executor
 * In-memory filtering on vault index entries
 */

import type {
  DataviewQuery,
  DataviewResult,
  DataviewResultEntry,
  DataviewResultGroup,
  FromSource,
  WhereCondition,
  SortClause,
  FlattenClause,
  DateExpression,
} from "./types";
import type { VaultIndexEntry } from "@/lib/db/schema";
import type { VaultKey } from "@/lib/db/vault-index-queries";
import { getPublicVaultIndexEntries } from "@/lib/db/vault-index-queries";

/**
 * Check if a value is a DateExpression
 */
function isDateExpression(value: unknown): value is DateExpression {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    (value as DateExpression).type === "date"
  );
}

/**
 * Evaluate a DateExpression to an actual Date
 */
function evaluateDateExpression(expr: DateExpression): Date {
  let date: Date;

  switch (expr.value) {
    case "today":
      date = new Date();
      date.setHours(0, 0, 0, 0);
      break;
    case "now":
      date = new Date();
      break;
    case "yesterday":
      date = new Date();
      date.setDate(date.getDate() - 1);
      date.setHours(0, 0, 0, 0);
      break;
    case "tomorrow":
      date = new Date();
      date.setDate(date.getDate() + 1);
      date.setHours(0, 0, 0, 0);
      break;
    default:
      date = new Date();
  }

  if (expr.offset) {
    const multiplier = expr.offset.direction === "subtract" ? -1 : 1;
    const amount = expr.offset.amount * multiplier;

    switch (expr.offset.unit) {
      case "days":
        date.setDate(date.getDate() + amount);
        break;
      case "weeks":
        date.setDate(date.getDate() + amount * 7);
        break;
      case "months":
        date.setMonth(date.getMonth() + amount);
        break;
      case "years":
        date.setFullYear(date.getFullYear() + amount);
        break;
      case "hours":
        date.setHours(date.getHours() + amount);
        break;
      case "minutes":
        date.setMinutes(date.getMinutes() + amount);
        break;
    }
  }

  return date;
}

/**
 * Execute a Dataview query against the vault index
 */
export async function executeDataviewQuery(
  query: DataviewQuery,
  vaultKey: VaultKey
): Promise<DataviewResult> {
  try {
    // Load all public entries from index
    const allEntries = await getPublicVaultIndexEntries(vaultKey);

    // Filter by FROM clause
    let filtered = filterByFrom(allEntries, query.from);

    // Apply FLATTEN before WHERE (expands arrays into multiple entries)
    if (query.flatten) {
      filtered = flattenEntries(filtered, query.flatten);
    }

    // Filter by WHERE conditions (AND logic)
    if (query.where) {
      for (const condition of query.where) {
        filtered = filterByWhere(filtered, condition);
      }
    }

    // Handle GROUP BY
    if (query.groupBy) {
      const groups = groupEntries(filtered, query.groupBy);

      // Sort groups if needed
      if (query.sort) {
        sortGroups(groups, query.sort, query.columns);
      }

      // Apply limit to groups
      const limitedGroups = query.limit ? groups.slice(0, query.limit) : groups;

      // Build columns list
      const columns = query.columns?.map((c) => c.alias || c.field);

      return {
        success: true,
        entries: [],
        groups: limitedGroups,
        columns,
        totalCount: groups.length,
        query,
      };
    }

    // Sort entries
    if (query.sort) {
      filtered = sortEntries(filtered, query.sort);
    }

    // Get total count before limit
    const totalCount = filtered.length;

    // Apply limit
    if (query.limit && query.limit > 0) {
      filtered = filtered.slice(0, query.limit);
    }

    // Transform to result entries (including file.mtime and file.ctime in frontmatter)
    const entries: DataviewResultEntry[] = filtered.map((entry) => ({
      filePath: entry.filePath,
      fileName: entry.fileName,
      frontmatter: {
        ...(entry.frontmatter as Record<string, unknown>),
        "file.mtime": entry.updatedAt,
        "file.ctime": entry.indexedAt,
      },
    }));

    // Build columns list for TABLE queries
    const columns = query.columns?.map((c) => c.alias || c.field);

    return {
      success: true,
      entries,
      columns,
      totalCount,
      query,
    };
  } catch (error) {
    return {
      success: false,
      entries: [],
      totalCount: 0,
      query,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Filter entries by a single FROM source (folder or tag)
 */
function filterBySingleSource(
  entries: VaultIndexEntry[],
  source: FromSource
): VaultIndexEntry[] {
  if (source.type === "folder") {
    const folderPath = source.path.replace(/^\//, "").replace(/\/$/, "");
    return entries.filter((entry) => {
      const entryFolder = entry.filePath
        .replace(/^\//, "")
        .split("/")
        .slice(0, -1)
        .join("/");
      return (
        entryFolder === folderPath || entryFolder.startsWith(folderPath + "/")
      );
    });
  }

  if (source.type === "tag") {
    const tagName = source.name.replace(/^#/, "");
    return entries.filter((entry) => {
      const tags = entry.tags as string[];
      return tags?.some((t) => {
        const normalized = t.replace(/^#/, "");
        return (
          normalized === tagName || normalized.startsWith(tagName + "/")
        );
      });
    });
  }

  return entries;
}

/**
 * Filter entries by FROM clause (folder or tag, supports OR)
 */
function filterByFrom(
  entries: VaultIndexEntry[],
  from: FromSource | FromSource[] | undefined
): VaultIndexEntry[] {
  if (!from) {
    return entries;
  }

  // Handle array of sources (OR logic)
  if (Array.isArray(from)) {
    // Union of all matching entries (OR)
    const matchedPaths = new Set<string>();
    const result: VaultIndexEntry[] = [];

    for (const source of from) {
      const matches = filterBySingleSource(entries, source);
      for (const entry of matches) {
        if (!matchedPaths.has(entry.filePath)) {
          matchedPaths.add(entry.filePath);
          result.push(entry);
        }
      }
    }

    return result;
  }

  // Single source
  return filterBySingleSource(entries, from);
}

/**
 * Filter entries by a single WHERE condition
 */
function filterByWhere(
  entries: VaultIndexEntry[],
  condition: WhereCondition
): VaultIndexEntry[] {
  return entries.filter((entry) => {
    const value = getFieldValue(entry, condition.field);
    return evaluateCondition(value, condition.operator, condition.value);
  });
}

/**
 * Get field value from entry (supports file.* fields and frontmatter)
 */
function getFieldValue(entry: VaultIndexEntry, field: string): unknown {
  // Special file fields
  if (field === "file.name") {
    return entry.fileName.replace(/\.md$/, "");
  }
  if (field === "file.path") {
    return entry.filePath;
  }
  if (field === "file.link") {
    return {
      __type: "link" as const,
      path: entry.filePath,
      name: entry.fileName.replace(/\.md$/, ""),
    };
  }
  if (field === "file.folder") {
    const parts = entry.filePath.split("/");
    return parts.slice(0, -1).join("/") || "/";
  }
  if (field === "file.tags") {
    return entry.tags || [];
  }
  if (field === "file.outlinks") {
    // Wikilinks are stored as objects with target property
    return (entry.wikilinks || []).map((w) => w.target);
  }
  if (field === "file.inlinks") {
    // Backlinks would need to be computed from the index
    // For now, return empty array as they're not directly available
    return [];
  }
  if (field === "file.tasks") {
    // Tasks are stored as frontmatter in some vaults
    const fm = entry.frontmatter as Record<string, unknown>;
    return fm.tasks || [];
  }
  if (field === "file.mtime") {
    // Modified time - use updatedAt from index
    return entry.updatedAt;
  }
  if (field === "file.ctime") {
    // Created time - use indexedAt as approximation (true ctime not available)
    return entry.indexedAt;
  }

  // Frontmatter fields (support nested with dot notation)
  const frontmatter = entry.frontmatter as Record<string, unknown>;
  const parts = field.split(".");
  let value: unknown = frontmatter;

  for (const part of parts) {
    if (value && typeof value === "object" && part in (value as object)) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Evaluate a condition against a value
 */
function evaluateCondition(
  fieldValue: unknown,
  operator: string,
  conditionValue: string | number | boolean | DateExpression
): boolean {
  // Handle undefined/null
  if (fieldValue === undefined || fieldValue === null) {
    if (operator === "!=") {
      return true;
    }
    return false;
  }

  // Handle DateExpression comparisons
  if (isDateExpression(conditionValue)) {
    const targetDate = evaluateDateExpression(conditionValue);
    const fieldDate = fieldValue instanceof Date
      ? fieldValue
      : new Date(fieldValue as string | number);

    if (isNaN(fieldDate.getTime())) return false;

    const fieldTime = fieldDate.getTime();
    const targetTime = targetDate.getTime();

    switch (operator) {
      case "=":
        // For date equality, compare just the date part (ignore time)
        return fieldDate.toDateString() === targetDate.toDateString();
      case "!=":
        return fieldDate.toDateString() !== targetDate.toDateString();
      case ">":
        return fieldTime > targetTime;
      case "<":
        return fieldTime < targetTime;
      case ">=":
        return fieldTime >= targetTime;
      case "<=":
        return fieldTime <= targetTime;
      default:
        return false;
    }
  }

  switch (operator) {
    case "=":
      return compareEqual(fieldValue, conditionValue);

    case "!=":
      return !compareEqual(fieldValue, conditionValue);

    case ">":
      return compareNumeric(fieldValue, conditionValue) > 0;

    case "<":
      return compareNumeric(fieldValue, conditionValue) < 0;

    case ">=":
      return compareNumeric(fieldValue, conditionValue) >= 0;

    case "<=":
      return compareNumeric(fieldValue, conditionValue) <= 0;

    case "contains":
      return compareContains(fieldValue, conditionValue);

    case "not_contains":
      return !compareContains(fieldValue, conditionValue);

    case "truthy":
      // Check if value is truthy (exists and is not empty)
      if (fieldValue === undefined || fieldValue === null) return false;
      if (Array.isArray(fieldValue)) return fieldValue.length > 0;
      if (typeof fieldValue === "string") return fieldValue.length > 0;
      if (typeof fieldValue === "boolean") return fieldValue;
      if (typeof fieldValue === "number") return !isNaN(fieldValue);
      return Boolean(fieldValue);

    default:
      return false;
  }
}

/**
 * Compare for equality (type-coercing)
 */
function compareEqual(a: unknown, b: string | number | boolean): boolean {
  // Array contains check
  if (Array.isArray(a)) {
    return a.some((item) => String(item) === String(b));
  }

  // String comparison (case-insensitive)
  if (typeof a === "string" && typeof b === "string") {
    return a.toLowerCase() === b.toLowerCase();
  }

  // Number comparison
  if (typeof a === "number" || typeof b === "number") {
    return Number(a) === Number(b);
  }

  // Boolean comparison
  if (typeof a === "boolean" || typeof b === "boolean") {
    return Boolean(a) === Boolean(b);
  }

  return String(a) === String(b);
}

/**
 * Compare numerically
 */
function compareNumeric(a: unknown, b: string | number | boolean): number {
  const numA = Number(a);
  const numB = Number(b);

  if (isNaN(numA) || isNaN(numB)) {
    // Fallback to string comparison
    return String(a).localeCompare(String(b));
  }

  return numA - numB;
}

/**
 * Check if field contains value (case-insensitive)
 */
function compareContains(
  fieldValue: unknown,
  searchValue: string | number | boolean
): boolean {
  const search = String(searchValue).toLowerCase();

  // Array check
  if (Array.isArray(fieldValue)) {
    return fieldValue.some((item) =>
      String(item).toLowerCase().includes(search)
    );
  }

  // String check
  if (typeof fieldValue === "string") {
    return fieldValue.toLowerCase().includes(search);
  }

  // Convert to string and check
  return String(fieldValue).toLowerCase().includes(search);
}

/**
 * Sort entries by field
 */
function sortEntries(
  entries: VaultIndexEntry[],
  sort: SortClause
): VaultIndexEntry[] {
  return [...entries].sort((a, b) => {
    const valueA = getFieldValue(a, sort.field);
    const valueB = getFieldValue(b, sort.field);

    let comparison: number;

    // Handle undefined values
    if (valueA === undefined && valueB === undefined) {
      comparison = 0;
    } else if (valueA === undefined) {
      comparison = 1;
    } else if (valueB === undefined) {
      comparison = -1;
    } else if (typeof valueA === "number" && typeof valueB === "number") {
      comparison = valueA - valueB;
    } else {
      comparison = String(valueA).localeCompare(String(valueB));
    }

    return sort.direction === "DESC" ? -comparison : comparison;
  });
}

/**
 * Flatten entries by expanding an array field into multiple entries
 */
function flattenEntries(
  entries: VaultIndexEntry[],
  flatten: FlattenClause
): VaultIndexEntry[] {
  const result: VaultIndexEntry[] = [];

  for (const entry of entries) {
    const arrayValue = getFieldValue(entry, flatten.field);

    if (Array.isArray(arrayValue) && arrayValue.length > 0) {
      for (const item of arrayValue) {
        result.push({
          ...entry,
          frontmatter: {
            ...(entry.frontmatter as Record<string, unknown>),
            [flatten.as]: item,
          },
        });
      }
    } else {
      // Keep entry but with undefined flattened field
      result.push({
        ...entry,
        frontmatter: {
          ...(entry.frontmatter as Record<string, unknown>),
          [flatten.as]: arrayValue,
        },
      });
    }
  }

  return result;
}

/**
 * Group entries by a field value
 */
function groupEntries(
  entries: VaultIndexEntry[],
  groupBy: string
): DataviewResultGroup[] {
  const groups = new Map<string, VaultIndexEntry[]>();

  for (const entry of entries) {
    const keyValue = getFieldValue(entry, groupBy);
    const key = keyValue === undefined ? "undefined" : String(keyValue);

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(entry);
  }

  return Array.from(groups.entries()).map(([key, rows]) => ({
    key: key === "undefined" ? undefined : key,
    rows: rows.map((e) => ({
      filePath: e.filePath,
      fileName: e.fileName,
      frontmatter: {
        ...(e.frontmatter as Record<string, unknown>),
        "file.mtime": e.updatedAt,
        "file.ctime": e.indexedAt,
      },
    })),
  }));
}

/**
 * Sort groups (for GROUP BY + SORT)
 */
function sortGroups(
  groups: DataviewResultGroup[],
  sort: SortClause,
  columns?: { field: string; alias?: string; function?: string }[]
): void {
  // Check if sorting by length(rows)
  const isLengthRows = sort.field === "length(rows)" ||
    columns?.some(c => c.function === "length" && c.field === "rows");

  groups.sort((a, b) => {
    let valueA: unknown;
    let valueB: unknown;

    if (isLengthRows || sort.field === "length(rows)") {
      valueA = a.rows.length;
      valueB = b.rows.length;
    } else {
      valueA = a.key;
      valueB = b.key;
    }

    let comparison: number;

    if (valueA === undefined && valueB === undefined) {
      comparison = 0;
    } else if (valueA === undefined) {
      comparison = 1;
    } else if (valueB === undefined) {
      comparison = -1;
    } else if (typeof valueA === "number" && typeof valueB === "number") {
      comparison = valueA - valueB;
    } else {
      comparison = String(valueA).localeCompare(String(valueB));
    }

    return sort.direction === "DESC" ? -comparison : comparison;
  });
}
