/**
 * Null Counter Utility
 *
 * Recursively counts null values in JSON objects to help users identify
 * when LLM models are returning incomplete data.
 */

/**
 * Recursively counts all null values in a JSON object or array
 *
 * @param obj - The object to analyze (can be object, array, or primitive)
 * @returns Total count of null values found in the structure
 *
 * @example
 * countNullValues({ name: "Test", value: null, nested: { field: null } })
 * // Returns: 2
 *
 * countNullValues([{ a: null }, { b: "value" }, { c: null }])
 * // Returns: 2
 */
export function countNullValues(obj: any): number {
  // Handle null value (count it)
  if (obj === null) {
    return 1
  }

  // Handle undefined (don't count it - different from null)
  if (obj === undefined) {
    return 0
  }

  // Handle arrays - recursively count nulls in each element
  if (Array.isArray(obj)) {
    return obj.reduce((count, item) => count + countNullValues(item), 0)
  }

  // Handle objects - recursively count nulls in each property
  if (typeof obj === 'object') {
    return Object.values(obj).reduce(
      (count, value) => count + countNullValues(value),
      0
    )
  }

  // Primitive non-null values don't count
  return 0
}

/**
 * Gets a list of field paths that contain null values
 * Useful for detailed analysis of which specific fields are null
 *
 * @param obj - The object to analyze
 * @param prefix - Current path prefix (used for recursion)
 * @returns Array of field paths that are null
 *
 * @example
 * getNullFieldPaths({ name: "Test", value: null, nested: { field: null } })
 * // Returns: ["value", "nested.field"]
 */
export function getNullFieldPaths(obj: any, prefix: string = ''): string[] {
  const nullPaths: string[] = []

  if (obj === null) {
    return prefix ? [prefix] : []
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const currentPath = prefix ? `${prefix}[${index}]` : `[${index}]`
      nullPaths.push(...getNullFieldPaths(item, currentPath))
    })
  } else if (typeof obj === 'object' && obj !== null) {
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = prefix ? `${prefix}.${key}` : key
      nullPaths.push(...getNullFieldPaths(value, currentPath))
    })
  }

  return nullPaths
}
