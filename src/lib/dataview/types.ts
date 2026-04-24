/**
 * Dataview MVP Types
 * Subset of Dataview syntax for web execution
 */

export type QueryType = "TABLE" | "LIST";

export type ColumnFunction = "length" | "count" | "sum" | "dateformat";

export type FromSource =
  | { type: "folder"; path: string }
  | { type: "tag"; name: string };

export type WhereOperator = "=" | "!=" | ">" | "<" | ">=" | "<=" | "contains" | "not_contains" | "truthy";

export interface DateExpression {
  type: "date";
  value: "today" | "now" | "yesterday" | "tomorrow";
  offset?: {
    amount: number;
    unit: "days" | "weeks" | "months" | "years" | "hours" | "minutes";
    direction: "add" | "subtract";
  };
}

export interface WhereCondition {
  field: string;
  operator: WhereOperator;
  value: string | number | boolean | DateExpression;
}

export interface SortClause {
  field: string;
  direction: "ASC" | "DESC";
}

export interface TableColumn {
  field: string;
  alias?: string;
  function?: ColumnFunction;
  format?: string; // For dateformat(field, "format")
}

export interface FlattenClause {
  field: string;
  as: string;
}

export interface DataviewQuery {
  type: QueryType;
  withoutId?: boolean;
  columns?: TableColumn[];
  from?: FromSource | FromSource[]; // Can be single source or array for OR
  where?: WhereCondition[];
  groupBy?: string;
  flatten?: FlattenClause;
  sort?: SortClause;
  limit?: number;
}

export interface DataviewResultEntry {
  filePath: string;
  fileName: string;
  frontmatter: Record<string, unknown>;
}

export interface DataviewLink {
  __type: "link";
  path: string;
  name: string;
}

export interface DataviewResultGroup {
  key: unknown;
  rows: DataviewResultEntry[];
}

export interface DataviewResult {
  success: boolean;
  entries: DataviewResultEntry[];
  groups?: DataviewResultGroup[];
  columns?: string[];
  totalCount: number;
  query: DataviewQuery;
  error?: string;
}

export interface DataviewParseError {
  error: string;
  line?: number;
}
