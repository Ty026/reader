import {
  FilterCondition,
  FilterOperator,
  type MetadataFilter,
} from "./vector-db";

const postgresOperatorMap = new Map<FilterOperator, string>([
  [FilterOperator.EQ, "="],
  [FilterOperator.GT, ">"],
  [FilterOperator.LT, "<"],
  [FilterOperator.NE, "!="],
  [FilterOperator.GTE, ">="],
  [FilterOperator.LTE, "<="],
  [FilterOperator.IN, "= ANY"],
  [FilterOperator.NIN, "!= ANY"],
  [FilterOperator.CONTAINS, "@>"],
  [FilterOperator.ANY, "?|"],
  [FilterOperator.ALL, "?&"],
]);

export function toPostgresOperator(operator: `${FilterOperator}`): string {
  return postgresOperatorMap.get(operator as FilterOperator) ?? "=";
}

export function buildFilterClause(
  filter: MetadataFilter,
  paramIndex: number,
): {
  clause: string;
  param: string | string[] | number | number[] | undefined;
} {
  if (
    filter.operator === FilterOperator.IN ||
    filter.operator === FilterOperator.NIN
  ) {
    return {
      clause: `metadata->>'${filter.key}' ${toPostgresOperator(filter.operator)}($${paramIndex})`,
      param: filter.value,
    };
  }

  if (
    filter.operator === FilterOperator.ALL ||
    filter.operator === FilterOperator.ANY
  ) {
    return {
      clause: `metadata->'${filter.key}' ${toPostgresOperator(filter.operator)} $${paramIndex}::text[]`,
      param: filter.value,
    };
  }

  if (filter.operator === FilterOperator.CONTAINS) {
    return {
      clause: `metadata->'${filter.key}' ${toPostgresOperator(filter.operator)} $${paramIndex}::jsonb`,
      param: JSON.stringify([filter.value]),
    };
  }

  if (filter.operator === FilterOperator.IS_EMPTY) {
    return {
      clause: `(NOT (metadata ? '${filter.key}') OR metadata->>'${filter.key}' IS NULL OR metadata->>'${filter.key}' = '' OR metadata->'${filter.key}' = '[]'::jsonb)`,
      param: undefined,
    };
  }

  if (filter.operator === FilterOperator.TEXT_MATCH) {
    const escapedValue = escapeLikeString(filter.value as string);
    return {
      clause: `metadata->>'${filter.key}' LIKE $${paramIndex}`,
      param: `%${escapedValue}%`,
    };
  }

  // if value is number, coerce metadata value to float
  if (typeof filter.value === "number") {
    return {
      clause: `(metadata->>'${filter.key}')::float ${toPostgresOperator(filter.operator)} $${paramIndex}`,
      param: filter.value,
    };
  }

  return {
    clause: `metadata->>'${filter.key}' ${toPostgresOperator(filter.operator)} $${paramIndex}`,
    param: filter.value,
  };
}

export function toPostgresCondition(condition: `${FilterCondition}`) {
  if (condition === FilterCondition.AND) return "AND";
  if (condition === FilterCondition.OR) return "OR";
  return "AND";
}

export const escapeLikeString = (value: string) => {
  return value.replace(/[%_\\]/g, "\\$&");
};
