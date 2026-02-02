/**
 * Dataview MVP Types
 * Subset of Dataview syntax for web execution
 */

export type QueryType = "TABLE" | "LIST";

export type FromSource =
  | { type: "folder"; path: string }
  | { type: "tag"; name: string };

export type WhereOperator = "=" | "!=" | ">" | "<" | ">=" | "<=" | "contains";

export interface WhereCondition {
  field: string;
  operator: WhereOperator;
  value: string | number | boolean;
}

export interface SortClause {
  field: string;
  direction: "ASC" | "DESC";
}

export interface TableColumn {
  field: string;
  alias?: string;
}

export interface DataviewQuery {
  type: QueryType;
  columns?: TableColumn[];
  from?: FromSource;
  where?: WhereCondition[];
  sort?: SortClause;
  limit?: number;
}

export interface DataviewResultEntry {
  filePath: string;
  fileName: string;
  frontmatter: Record<string, unknown>;
}

export interface DataviewResult {
  success: boolean;
  entries: DataviewResultEntry[];
  columns?: string[];
  totalCount: number;
  query: DataviewQuery;
  error?: string;
}

export interface DataviewParseError {
  error: string;
  line?: number;
}
