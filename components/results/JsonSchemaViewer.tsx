'use client'

interface SchemaProperty {
  type: string
  format?: string
  description?: string
  required?: boolean
}

interface ValidationDetails {
  jsonErrors: string[]
  missingAttributes: string[]
  invalidAttributes: string[]
  formatErrors: Array<{
    path: string
    message: string
    keyword?: string
  }>
}

interface JsonSchemaViewerProps {
  schema: any
  jsonPayload: any
  validationDetails: ValidationDetails
}

export function JsonSchemaViewer({
  schema,
  jsonPayload,
  validationDetails
}: JsonSchemaViewerProps) {
  if (!schema || !schema.properties) {
    return (
      <div className="text-sm text-gray-500 p-4 border rounded">
        No schema available for comparison
      </div>
    )
  }

  const schemaFields = Object.keys(schema.properties || {})
  const requiredFields = schema.required || []

  // Helper to check if a field is valid
  const isFieldValid = (fieldPath: string): boolean => {
    // Check if field is missing (and required)
    if (validationDetails.missingAttributes.some(attr => attr.includes(fieldPath))) {
      return false
    }

    // Check if field has format errors
    if (validationDetails.formatErrors.some(err => err.path.includes(fieldPath))) {
      return false
    }

    // Check if field is in invalid attributes
    if (validationDetails.invalidAttributes.some(attr => attr.includes(fieldPath))) {
      return false
    }

    return true
  }

  // Helper to get field error message
  const getFieldError = (fieldPath: string): string | null => {
    // Check for missing
    const missingMatch = validationDetails.missingAttributes.find(attr => attr.includes(fieldPath))
    if (missingMatch) return 'Required field missing'

    // Check for format error
    const formatError = validationDetails.formatErrors.find(err => err.path.includes(fieldPath))
    if (formatError) return formatError.message

    // Check for invalid attribute
    const invalidMatch = validationDetails.invalidAttributes.find(attr => attr.includes(fieldPath))
    if (invalidMatch) return 'Unexpected field or wrong structure'

    return null
  }

  // Helper to get field value display
  const getFieldValueDisplay = (fieldPath: string): { value: string; isNull: boolean } => {
    try {
      const value = jsonPayload?.[fieldPath]
      if (value === null) return { value: 'null', isNull: true }
      if (value === undefined) return { value: 'undefined', isNull: false }
      if (typeof value === 'object') return { value: JSON.stringify(value, null, 2), isNull: false }
      return { value: String(value), isNull: false }
    } catch {
      return { value: 'N/A', isNull: false }
    }
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Field Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Expected Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actual Value
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {schemaFields.map((field) => {
            const property = schema.properties[field] as SchemaProperty
            const isRequired = requiredFields.includes(field)
            const isValid = isFieldValid(field)
            const error = getFieldError(field)
            const actualValue = getFieldValueDisplay(field)

            return (
              <tr
                key={field}
                className={isValid ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-red-50 dark:bg-red-950/20'}
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                    {field}
                  </span>
                  {isRequired && (
                    <span className="ml-2 text-xs text-red-600 dark:text-red-500">*</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="text-gray-900 dark:text-gray-100">
                    {property.type}
                    {property.format && (
                      <span className="text-gray-500 dark:text-gray-400"> ({property.format})</span>
                    )}
                  </div>
                  {property.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {property.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {actualValue.isNull ? (
                    <pre className="font-mono text-sm font-bold whitespace-pre-wrap max-w-xs overflow-auto bg-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 px-1 rounded inline-block">
                      {actualValue.value}
                    </pre>
                  ) : (
                    <pre className="font-mono text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap max-w-xs overflow-auto">
                      {actualValue.value}
                    </pre>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    {isValid ? (
                      <span className="text-blue-600 dark:text-blue-500 text-sm font-medium flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Valid
                      </span>
                    ) : (
                      <div>
                        <span className="text-red-600 dark:text-red-500 text-sm font-medium flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Invalid
                        </span>
                        {error && (
                          <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                            {error}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Summary */}
      <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <strong>Total Fields:</strong> {schemaFields.length} |{' '}
          <strong>Required:</strong> {requiredFields.length} |{' '}
          <strong className="text-blue-600 dark:text-blue-500">Valid:</strong>{' '}
          {schemaFields.filter(f => isFieldValid(f)).length} |{' '}
          <strong className="text-red-600 dark:text-red-500">Invalid:</strong>{' '}
          {schemaFields.filter(f => !isFieldValid(f)).length}
        </p>
      </div>
    </div>
  )
}
