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
} from "./types";
import type { VaultIndexEntry } from "@/lib/db/schema";
import type { VaultKey } from "@/lib/db/vault-index-queries";
import { getPublicVaultIndexEntries } from "@/lib/db/vault-index-queries";

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

    // Transform to result entries
    const entries: DataviewResultEntry[] = filtered.map((entry) => ({
      filePath: entry.filePath,
      fileName: entry.fileName,
      frontmatter: entry.frontmatter as Record<string, unknown>,
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
 * Filter entries by FROM clause (folder or tag)
 */
function filterByFrom(
  entries: VaultIndexEntry[],
  from: FromSource | undefined
): VaultIndexEntry[] {
  if (!from) {
    return entries;
  }

  if (from.type === "folder") {
    const folderPath = from.path.replace(/^\//, "").replace(/\/$/, "");
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

  if (from.type === "tag") {
    const tagName = from.name.replace(/^#/, "");
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
  conditionValue: string | number | boolean
): boolean {
  // Handle undefined/null
  if (fieldValue === undefined || fieldValue === null) {
    if (operator === "!=") {
      return true;
    }
    return false;
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
      frontmatter: e.frontmatter as Record<string, unknown>,
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
