/**
 * Dataview Query Parser
 * Regex-based line parsing for MVP syntax
 */

import type {
  DataviewQuery,
  DataviewParseError,
  QueryType,
  FromSource,
  WhereCondition,
  WhereOperator,
  SortClause,
  TableColumn,
  FlattenClause,
} from "./types";

// Regex patterns for parsing
const TABLE_WITHOUT_ID_REGEX = /^TABLE\s+WITHOUT\s+ID\s+(.+?)(?:\s+FROM|\s+WHERE|\s+FLATTEN|\s+GROUP|\s+SORT|\s+LIMIT|$)/i;
const TABLE_REGEX = /^TABLE\s+(.+?)(?:\s+FROM|\s+WHERE|\s+FLATTEN|\s+GROUP|\s+SORT|\s+LIMIT|$)/i;
const LIST_REGEX = /^LIST(?:\s+|$)/i;
const FROM_FOLDER_REGEX = /FROM\s+"([^"]+)"/i;
const FROM_TAG_REGEX = /FROM\s+#([\w\/-]+)/i;
const GROUP_BY_REGEX = /GROUP\s+BY\s+([\w.]+)/i;
const FLATTEN_REGEX = /FLATTEN\s+([\w.]+)\s+[aA][sS]\s+(\w+)/i;
const SORT_REGEX = /SORT\s+([\w.()]+)\s*(ASC|DESC)?/i;
const LIMIT_REGEX = /LIMIT\s+(\d+)/i;

/**
 * Parse a Dataview query string into a structured query object
 */
export function parseDataviewQuery(
  input: string
): DataviewQuery | DataviewParseError {
  const trimmed = input.trim();

  if (!trimmed) {
    return { error: "Empty query" };
  }

  // Normalize line breaks and join into single line for regex matching
  const normalized = trimmed.replace(/\r\n/g, "\n").replace(/\n+/g, " ").trim();

  // Detect query type
  let type: QueryType;
  let columns: TableColumn[] | undefined;
  let withoutId = false;

  // Try TABLE WITHOUT ID first
  const tableWithoutIdMatch = normalized.match(TABLE_WITHOUT_ID_REGEX);
  const tableMatch = normalized.match(TABLE_REGEX);
  const listMatch = normalized.match(LIST_REGEX);

  if (tableWithoutIdMatch) {
    type = "TABLE";
    withoutId = true;
    columns = parseTableColumns(tableWithoutIdMatch[1]);
    if (columns.length === 0) {
      return { error: "TABLE query requires at least one column" };
    }
  } else if (tableMatch && !normalized.toUpperCase().startsWith("TABLE WITHOUT")) {
    type = "TABLE";
    columns = parseTableColumns(tableMatch[1]);
    if (columns.length === 0) {
      return { error: "TABLE query requires at least one column" };
    }
  } else if (listMatch) {
    type = "LIST";
  } else {
    return {
      error: "Query must start with TABLE or LIST",
    };
  }

  // Parse FROM clause
  const from = parseFromClause(normalized);

  // Parse WHERE clauses
  const whereResult = parseWhereConditions(normalized);
  if ("error" in whereResult) {
    return whereResult;
  }

  // Parse FLATTEN clause
  const flatten = parseFlattenClause(normalized);

  // Parse GROUP BY clause
  const groupBy = parseGroupByClause(normalized);

  // Parse SORT clause
  const sort = parseSortClause(normalized);

  // Parse LIMIT clause
  const limit = parseLimitClause(normalized);

  return {
    type,
    withoutId: withoutId || undefined,
    columns,
    from,
    where: whereResult.length > 0 ? whereResult : undefined,
    flatten,
    groupBy,
    sort,
    limit,
  };
}

/**
 * Parse TABLE columns (comma-separated field names with optional AS alias)
 * Supports: field, field AS alias, length(field) AS alias
 */
function parseTableColumns(columnsStr: string): TableColumn[] {
  const columns: TableColumn[] = [];

  // Split by comma, handling potential AS aliases
  const parts = columnsStr.split(",").map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    // Check for function: length(field) AS alias
    const lengthMatch = part.match(/^length\(([\w.]+)\)(?:\s+[aA][sS]\s+["']?([^"']+)["']?)?$/i);
    if (lengthMatch) {
      columns.push({
        field: lengthMatch[1].trim(),
        alias: lengthMatch[2]?.trim() || `length(${lengthMatch[1].trim()})`,
        function: "length",
      });
      continue;
    }

    // Check for alias: field AS alias OR field as alias
    const aliasMatch = part.match(/^([\w.]+)\s+[aA][sS]\s+["']?([^"']+)["']?$/);
    if (aliasMatch) {
      columns.push({
        field: aliasMatch[1].trim(),
        alias: aliasMatch[2].trim(),
      });
      continue;
    }

    // Simple field name
    const field = part.trim();
    if (field && /^[\w.]+$/.test(field)) {
      columns.push({ field });
    }
  }

  return columns;
}

/**
 * Parse FROM clause (folder path or tag)
 */
function parseFromClause(query: string): FromSource | undefined {
  // Try folder first: FROM "path/to/folder"
  const folderMatch = query.match(FROM_FOLDER_REGEX);
  if (folderMatch) {
    return {
      type: "folder",
      path: folderMatch[1].trim(),
    };
  }

  // Try tag: FROM #tagname
  const tagMatch = query.match(FROM_TAG_REGEX);
  if (tagMatch) {
    return {
      type: "tag",
      name: tagMatch[1].trim(),
    };
  }

  return undefined;
}

/**
 * Parse WHERE conditions
 * Supports: field = value, field != value, field > value, etc.
 */
function parseWhereConditions(
  query: string
): WhereCondition[] | DataviewParseError {
  const conditions: WhereCondition[] = [];

  // Match all WHERE clauses
  // Pattern: WHERE field operator value
  const whereRegex =
    /WHERE\s+([\w.]+)\s*(=|!=|>=|<=|>|<|contains)\s*(".*?"|'.*?'|[\w\d.-]+)/gi;

  let match;
  while ((match = whereRegex.exec(query)) !== null) {
    const field = match[1].trim();
    const operator = match[2].trim() as WhereOperator;
    let rawValue = match[3].trim();

    // Parse value
    const value = parseValue(rawValue);

    conditions.push({
      field,
      operator,
      value,
    });
  }

  return conditions;
}

/**
 * Parse a value string into appropriate type
 */
function parseValue(raw: string): string | number | boolean {
  // Remove quotes if present
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }

  // Check for boolean
  const lower = raw.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;

  // Check for number
  const num = Number(raw);
  if (!isNaN(num)) return num;

  // Default to string
  return raw;
}

/**
 * Parse SORT clause
 */
function parseSortClause(query: string): SortClause | undefined {
  const match = query.match(SORT_REGEX);
  if (!match) return undefined;

  return {
    field: match[1].trim(),
    direction: (match[2]?.toUpperCase() as "ASC" | "DESC") || "ASC",
  };
}

/**
 * Parse LIMIT clause
 */
function parseLimitClause(query: string): number | undefined {
  const match = query.match(LIMIT_REGEX);
  if (!match) return undefined;

  const limit = parseInt(match[1], 10);
  return isNaN(limit) ? undefined : limit;
}

/**
 * Parse FLATTEN clause: FLATTEN field AS alias
 */
function parseFlattenClause(query: string): FlattenClause | undefined {
  const match = query.match(FLATTEN_REGEX);
  if (!match) return undefined;

  return {
    field: match[1].trim(),
    as: match[2].trim(),
  };
}

/**
 * Parse GROUP BY clause
 */
function parseGroupByClause(query: string): string | undefined {
  const match = query.match(GROUP_BY_REGEX);
  return match ? match[1].trim() : undefined;
}

/**
 * Validate a query string without executing
 */
export function validateDataviewQuery(input: string): boolean {
  const result = parseDataviewQuery(input);
  return !("error" in result);
}

/**
 * Get human-readable error message for parse failures
 */
export function getParseErrorMessage(input: string): string | null {
  const result = parseDataviewQuery(input);
  if ("error" in result) {
    return result.error;
  }
  return null;
}
