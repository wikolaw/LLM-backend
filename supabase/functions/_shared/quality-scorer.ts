/**
 * Dynamic Quality Scoring System for LLM Outputs
 *
 * Provides 5-dimensional quality assessment:
 * 1. Syntax Quality (0-100): JSON validity and formatting
 * 2. Structural Quality (0-100): Object structure and nesting
 * 3. Completeness Score (0-100): Information depth and coverage
 * 4. Content Quality (0-100): Logical consistency of data
 * 5. Consensus Score (0-100): Agreement with other models
 */

export interface QualityScores {
  syntax: number;
  structural: number;
  completeness: number;
  content: number;
  consensus: number;
  overall: number;
}

export interface QualityDetails {
  scores: QualityScores;
  flags: {
    hasMarkdown: boolean;
    hasExtraText: boolean;
    hasStringNumbers: boolean;
    hasInconsistentDates: boolean;
    hasEmptyValues: boolean;
  };
  metrics: {
    topLevelFields: number;
    populatedFields: number;
    totalFields: number;
    maxDepth: number;
    arrayCount: number;
    nullCount: number;
  };
}

// ============================================================================
// SCORE 1: SYNTAX QUALITY (0-100)
// ============================================================================

export function scoreSyntax(rawText: string, parsedJson: any): number {
  let score = 0;

  // Valid JSON (already parsed successfully)
  score += 50;

  // No markdown code blocks
  if (!rawText.includes('```')) {
    score += 10;
  }

  // No extra text before/after JSON
  const trimmed = rawText.trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  if (firstBrace === 0 && lastBrace === trimmed.length - 1) {
    score += 10;
  } else if (firstBrace >= 0 && lastBrace > 0) {
    // Partial credit if JSON exists but has extra text
    score += 5;
  }

  // Check data types (numbers should be numeric, not strings)
  const stringNumberCount = countStringNumbers(parsedJson);
  if (stringNumberCount === 0) {
    score += 15;
  } else if (stringNumberCount <= 2) {
    score += 8;
  } else if (stringNumberCount <= 5) {
    score += 3;
  }

  // Check quotes consistency (already valid JSON, so +5)
  score += 5;

  // No trailing commas (already valid JSON, so +5)
  score += 5;

  // Proper brackets (already valid JSON, so +5)
  score += 5;

  return Math.min(score, 100);
}

// ============================================================================
// SCORE 2: STRUCTURAL QUALITY (0-100)
// ============================================================================

export function scoreStructure(json: any): number {
  let score = 0;

  // Is an object (not array or primitive)
  if (typeof json === 'object' && !Array.isArray(json) && json !== null) {
    score += 20;
  } else {
    return 0; // Not a valid structure
  }

  // Has nested structure
  const depth = getMaxDepth(json);
  if (depth >= 3) {
    score += 20;
  } else if (depth >= 2) {
    score += 15;
  } else if (depth >= 1) {
    score += 8;
  }

  // Consistent depth across sections
  const depthVariance = getDepthVariance(json);
  if (depthVariance <= 1) {
    score += 15;
  } else if (depthVariance <= 2) {
    score += 10;
  } else if (depthVariance <= 3) {
    score += 5;
  }

  // Proper use of null (not undefined or empty strings for missing data)
  const { hasUndefined, emptyStringCount } = checkNullUsage(json);
  if (!hasUndefined && emptyStringCount === 0) {
    score += 15;
  } else if (!hasUndefined && emptyStringCount <= 3) {
    score += 10;
  } else if (!hasUndefined) {
    score += 5;
  }

  // Arrays used for lists
  const { arraysFound, properArrays } = analyzeArrayUsage(json);
  if (arraysFound > 0) {
    const arrayScore = (properArrays / arraysFound) * 15;
    score += arrayScore;
  } else {
    score += 8; // Partial credit if no arrays expected
  }

  // Proper object nesting for entities
  const nestingQuality = analyzeNesting(json);
  score += nestingQuality * 15 / 100;

  return Math.min(score, 100);
}

// ============================================================================
// SCORE 3: COMPLETENESS (0-100)
// ============================================================================

export function scoreCompleteness(json: any): number {
  let score = 0;

  // Count fields
  const { topLevel, populated, total } = countFields(json);

  // Top-level fields (expect at least 5 major categories)
  const topLevelScore = Math.min((topLevel / 5) * 40, 40);
  score += topLevelScore;

  // Depth of information (nested objects/arrays)
  const depth = getMaxDepth(json);
  if (depth >= 4) {
    score += 20;
  } else if (depth >= 3) {
    score += 15;
  } else if (depth >= 2) {
    score += 10;
  } else if (depth >= 1) {
    score += 5;
  }

  // Populated vs total ratio
  if (total > 0) {
    const populationRatio = populated / total;
    score += populationRatio * 30;
  }

  // Arrays have content (not empty)
  const { totalArrays, emptyArrays } = countArrays(json);
  if (totalArrays > 0) {
    const arrayScore = ((totalArrays - emptyArrays) / totalArrays) * 10;
    score += arrayScore;
  } else {
    score += 5; // Partial credit
  }

  return Math.min(score, 100);
}

// ============================================================================
// SCORE 4: CONTENT QUALITY (0-100)
// ============================================================================

export function scoreContent(json: any): number {
  let score = 0;

  // Check date formats
  const dateAnalysis = analyzeDates(json);
  if (dateAnalysis.totalDates > 0) {
    const dateScore = (dateAnalysis.validDates / dateAnalysis.totalDates) * 20;
    score += dateScore;
  } else {
    score += 10; // Partial credit if no dates found
  }

  // Check numbers are reasonable
  const numberAnalysis = analyzeNumbers(json);
  if (numberAnalysis.totalNumbers > 0) {
    const numberScore = (numberAnalysis.reasonableNumbers / numberAnalysis.totalNumbers) * 20;
    score += numberScore;
  } else {
    score += 10; // Partial credit
  }

  // Check text values are meaningful
  const stringAnalysis = analyzeStrings(json);
  if (stringAnalysis.totalStrings > 0) {
    const stringScore = (stringAnalysis.meaningfulStrings / stringAnalysis.totalStrings) * 20;
    score += stringScore;
  }

  // Field naming consistency
  const fieldNames = extractFieldNames(json);
  const consistencyScore = analyzeNamingConsistency(fieldNames);
  score += consistencyScore * 20 / 100;

  // Swedish characters handled correctly
  const swedishCheck = checkSwedishCharacters(json);
  if (swedishCheck.found && !swedishCheck.corrupted) {
    score += 10;
  } else if (!swedishCheck.found) {
    score += 5; // Partial credit if no Swedish text
  }

  // No obvious hallucinations
  const hasHallucinations = detectHallucinations(json);
  if (!hasHallucinations) {
    score += 10;
  } else {
    score += 3; // Minimal credit
  }

  return Math.min(score, 100);
}

// ============================================================================
// SCORE 5: CONSENSUS (0-100) - Cross-model comparison
// ============================================================================

export function scoreConsensus(
  modelOutput: any,
  allOutputs: Array<{ model: string; json: any }>
): number {
  if (allOutputs.length < 2) {
    return 50; // Default score if no other models to compare
  }

  let score = 0;

  // Field name agreement
  const myFields = extractAllFieldPaths(modelOutput);
  const fieldAgreement = calculateFieldAgreement(myFields, allOutputs);
  score += fieldAgreement * 30 / 100;

  // Key value agreement (for comparable fields)
  const valueAgreement = calculateValueAgreement(modelOutput, allOutputs);
  score += valueAgreement * 40 / 100;

  // Structure similarity
  const structureSimilarity = calculateStructureSimilarity(modelOutput, allOutputs);
  score += structureSimilarity * 20 / 100;

  // Completeness compared to top performers
  const myCompleteness = countFields(modelOutput).populated;
  const allCompleteness = allOutputs.map(o => countFields(o.json).populated);
  const topCompleteness = Math.max(...allCompleteness, 1);
  const completenessRatio = Math.min(myCompleteness / topCompleteness, 1);
  score += completenessRatio * 10;

  return Math.min(score, 100);
}

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

export function calculateQualityScores(
  rawText: string,
  parsedJson: any,
  allOutputs?: Array<{ model: string; json: any }>
): QualityDetails {
  const syntax = scoreSyntax(rawText, parsedJson);
  const structural = scoreStructure(parsedJson);
  const completeness = scoreCompleteness(parsedJson);
  const content = scoreContent(parsedJson);

  // Consensus calculated later after all models complete
  const consensus = allOutputs
    ? scoreConsensus(parsedJson, allOutputs)
    : 0;

  // Overall weighted score
  const overall = Math.round(
    syntax * 0.25 +
    structural * 0.20 +
    completeness * 0.20 +
    content * 0.20 +
    consensus * 0.15
  );

  const flags = extractFlags(rawText, parsedJson);
  const metrics = extractMetrics(parsedJson);

  return {
    scores: { syntax, structural, completeness, content, consensus, overall },
    flags,
    metrics,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function countStringNumbers(obj: any, count = 0): number {
  if (obj === null || obj === undefined) return count;

  if (typeof obj === 'string') {
    // Check if string looks like a number
    if (/^-?\d+\.?\d*$/.test(obj.trim())) {
      return count + 1;
    }
  } else if (typeof obj === 'object') {
    for (const key in obj) {
      count = countStringNumbers(obj[key], count);
    }
  }

  return count;
}

function getMaxDepth(obj: any, current = 0): number {
  if (obj === null || typeof obj !== 'object') {
    return current;
  }

  let maxChildDepth = current;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'object') {
        maxChildDepth = Math.max(maxChildDepth, getMaxDepth(item, current + 1));
      }
    }
  } else {
    for (const key in obj) {
      maxChildDepth = Math.max(maxChildDepth, getMaxDepth(obj[key], current + 1));
    }
  }

  return maxChildDepth;
}

function getDepthVariance(obj: any): number {
  const depths: number[] = [];

  function collectDepths(o: any, depth: number) {
    if (o === null || typeof o !== 'object') {
      depths.push(depth);
      return;
    }

    if (Array.isArray(o)) {
      if (o.length === 0) {
        depths.push(depth);
      } else {
        o.forEach(item => collectDepths(item, depth + 1));
      }
    } else {
      const keys = Object.keys(o);
      if (keys.length === 0) {
        depths.push(depth);
      } else {
        keys.forEach(key => collectDepths(o[key], depth + 1));
      }
    }
  }

  collectDepths(obj, 0);

  if (depths.length === 0) return 0;

  const max = Math.max(...depths);
  const min = Math.min(...depths);
  return max - min;
}

function checkNullUsage(obj: any): { hasUndefined: boolean; emptyStringCount: number } {
  let hasUndefined = false;
  let emptyStringCount = 0;

  function traverse(o: any) {
    if (o === undefined) {
      hasUndefined = true;
      return;
    }

    if (o === '') {
      emptyStringCount++;
      return;
    }

    if (typeof o === 'object' && o !== null) {
      if (Array.isArray(o)) {
        o.forEach(traverse);
      } else {
        Object.values(o).forEach(traverse);
      }
    }
  }

  traverse(obj);
  return { hasUndefined, emptyStringCount };
}

function analyzeArrayUsage(obj: any): { arraysFound: number; properArrays: number } {
  let arraysFound = 0;
  let properArrays = 0;

  function traverse(o: any) {
    if (Array.isArray(o)) {
      arraysFound++;

      // Check if array contains proper elements (not comma-separated string)
      if (o.length === 0 || o.every(item => typeof item !== 'string' || !item.includes(','))) {
        properArrays++;
      }
    } else if (typeof o === 'object' && o !== null) {
      Object.values(o).forEach(traverse);
    }
  }

  traverse(obj);
  return { arraysFound, properArrays };
}

function analyzeNesting(obj: any): number {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return 0;
  }

  let nestedObjects = 0;
  let totalFields = 0;

  for (const key in obj) {
    totalFields++;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      nestedObjects++;
    }
  }

  if (totalFields === 0) return 0;

  // Return percentage of fields that are nested objects
  return (nestedObjects / totalFields) * 100;
}

function countFields(obj: any): { topLevel: number; populated: number; total: number } {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return { topLevel: 0, populated: 0, total: 0 };
  }

  const topLevel = Object.keys(obj).length;
  let populated = 0;
  let total = 0;

  function traverse(o: any) {
    if (o === null || o === undefined) {
      total++;
      return;
    }

    if (Array.isArray(o)) {
      total++;
      if (o.length > 0) populated++;
      o.forEach(traverse);
    } else if (typeof o === 'object') {
      for (const key in o) {
        traverse(o[key]);
      }
    } else {
      total++;
      populated++;
    }
  }

  traverse(obj);

  return { topLevel, populated, total };
}

function countArrays(obj: any): { totalArrays: number; emptyArrays: number } {
  let totalArrays = 0;
  let emptyArrays = 0;

  function traverse(o: any) {
    if (Array.isArray(o)) {
      totalArrays++;
      if (o.length === 0) {
        emptyArrays++;
      }
      o.forEach(traverse);
    } else if (typeof o === 'object' && o !== null) {
      Object.values(o).forEach(traverse);
    }
  }

  traverse(obj);
  return { totalArrays, emptyArrays };
}

function analyzeDates(obj: any): { totalDates: number; validDates: number; inconsistentFormat: boolean } {
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/,        // YYYY-MM-DD (ISO)
    /^\d{4}\/\d{2}\/\d{2}$/,       // YYYY/MM/DD
    /^\d{2}\/\d{2}\/\d{4}$/,       // DD/MM/YYYY or MM/DD/YYYY
    /^\d{4}\.\d{2}\.\d{2}$/,       // YYYY.MM.DD
    /^\d{1,2}\s+\w+\s+\d{4}$/,     // DD Month YYYY
  ];

  let totalDates = 0;
  let validDates = 0;
  const formats = new Set<number>();

  function traverse(o: any, key: string) {
    if (typeof o === 'string') {
      // Check if this looks like a date field
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('date') || lowerKey.includes('datum') ||
          lowerKey.includes('start') || lowerKey.includes('slut') ||
          lowerKey.includes('tecknat')) {
        totalDates++;

        // Check which format it matches
        for (let i = 0; i < datePatterns.length; i++) {
          if (datePatterns[i].test(o)) {
            validDates++;
            formats.add(i);
            break;
          }
        }
      }
    } else if (typeof o === 'object' && o !== null) {
      if (Array.isArray(o)) {
        o.forEach((item, idx) => traverse(item, `${key}[${idx}]`));
      } else {
        for (const k in o) {
          traverse(o[k], k);
        }
      }
    }
  }

  traverse(obj, '');

  return {
    totalDates,
    validDates,
    inconsistentFormat: formats.size > 1,
  };
}

function analyzeNumbers(obj: any): { totalNumbers: number; reasonableNumbers: number } {
  let totalNumbers = 0;
  let reasonableNumbers = 0;

  function traverse(o: any) {
    if (typeof o === 'number') {
      totalNumbers++;

      // Check if number is reasonable (not NaN, Infinity, or extremely large/small)
      if (isFinite(o) && Math.abs(o) < 1e15) {
        reasonableNumbers++;
      }
    } else if (typeof o === 'object' && o !== null) {
      if (Array.isArray(o)) {
        o.forEach(traverse);
      } else {
        Object.values(o).forEach(traverse);
      }
    }
  }

  traverse(obj);
  return { totalNumbers, reasonableNumbers };
}

function analyzeStrings(obj: any): { totalStrings: number; meaningfulStrings: number } {
  let totalStrings = 0;
  let meaningfulStrings = 0;

  function traverse(o: any) {
    if (typeof o === 'string') {
      totalStrings++;

      // Check if string is meaningful (not empty, not just whitespace, has substance)
      if (o.trim().length >= 2) {
        meaningfulStrings++;
      }
    } else if (typeof o === 'object' && o !== null) {
      if (Array.isArray(o)) {
        o.forEach(traverse);
      } else {
        Object.values(o).forEach(traverse);
      }
    }
  }

  traverse(obj);
  return { totalStrings, meaningfulStrings };
}

function extractFieldNames(obj: any, names: string[] = []): string[] {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return names;
  }

  for (const key in obj) {
    names.push(key);
    extractFieldNames(obj[key], names);
  }

  return names;
}

function analyzeNamingConsistency(fieldNames: string[]): number {
  if (fieldNames.length === 0) return 100;

  // Check for consistent naming convention
  const hasUnderscores = fieldNames.some(name => name.includes('_'));
  const hasCamelCase = fieldNames.some(name => /[a-z][A-Z]/.test(name));
  const hasAllLowercase = fieldNames.every(name => name === name.toLowerCase());

  // Consistent if all follow same pattern
  if (hasAllLowercase && !hasCamelCase) {
    return 100;
  }

  if (hasCamelCase && !hasUnderscores) {
    return 100;
  }

  if (hasUnderscores && !hasCamelCase) {
    return 100;
  }

  // Mixed conventions
  return 60;
}

function checkSwedishCharacters(obj: any): { found: boolean; corrupted: boolean } {
  const swedishChars = /[åäöÅÄÖ]/;
  const corruptedChars = /[����]/; // Common encoding issues

  let found = false;
  let corrupted = false;

  function traverse(o: any) {
    if (typeof o === 'string') {
      if (swedishChars.test(o)) {
        found = true;
      }
      if (corruptedChars.test(o)) {
        corrupted = true;
      }
    } else if (typeof o === 'object' && o !== null) {
      if (Array.isArray(o)) {
        o.forEach(traverse);
      } else {
        Object.values(o).forEach(traverse);
      }
    }
  }

  traverse(obj);
  return { found, corrupted };
}

function detectHallucinations(obj: any): boolean {
  // Check for suspicious patterns that might indicate hallucinations
  const suspiciousPatterns = [
    /example\.com/i,
    /test@test\.com/i,
    /\[INSERT.*\]/i,
    /\[TODO.*\]/i,
    /lorem ipsum/i,
  ];

  function traverse(o: any): boolean {
    if (typeof o === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(o));
    } else if (typeof o === 'object' && o !== null) {
      if (Array.isArray(o)) {
        return o.some(traverse);
      } else {
        return Object.values(o).some(traverse);
      }
    }
    return false;
  }

  return traverse(obj);
}

export function extractAllFieldPaths(obj: any, prefix = ''): string[] {
  const paths: string[] = [];

  if (typeof obj !== 'object' || obj === null) {
    return paths;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      paths.push(...extractAllFieldPaths(item, `${prefix}[${idx}]`));
    });
  } else {
    for (const key in obj) {
      const path = prefix ? `${prefix}.${key}` : key;
      paths.push(path);
      paths.push(...extractAllFieldPaths(obj[key], path));
    }
  }

  return paths;
}

function calculateFieldAgreement(
  myFields: string[],
  allOutputs: Array<{ model: string; json: any }>
): number {
  if (allOutputs.length < 2) return 100;

  const otherFields = allOutputs.flatMap(o => extractAllFieldPaths(o.json));
  const fieldCounts = new Map<string, number>();

  otherFields.forEach(field => {
    fieldCounts.set(field, (fieldCounts.get(field) || 0) + 1);
  });

  let agreedFields = 0;
  const threshold = allOutputs.length * 0.5; // 50% agreement

  myFields.forEach(field => {
    if ((fieldCounts.get(field) || 0) >= threshold) {
      agreedFields++;
    }
  });

  if (myFields.length === 0) return 0;

  return (agreedFields / myFields.length) * 100;
}

function calculateValueAgreement(
  myOutput: any,
  allOutputs: Array<{ model: string; json: any }>
): number {
  if (allOutputs.length < 2) return 100;

  const myPaths = extractAllFieldPaths(myOutput);
  let agreedValues = 0;
  let totalComparisons = 0;

  myPaths.forEach(path => {
    const myValue = getValueAtPath(myOutput, path);
    if (myValue === null || myValue === undefined || typeof myValue === 'object') {
      return; // Skip non-comparable values
    }

    const otherValues = allOutputs
      .map(o => getValueAtPath(o.json, path))
      .filter(v => v !== null && v !== undefined && typeof v !== 'object');

    if (otherValues.length === 0) return;

    totalComparisons++;

    // Check if my value matches majority
    const matchCount = otherValues.filter(v => String(v) === String(myValue)).length;
    if (matchCount >= otherValues.length * 0.5) {
      agreedValues++;
    }
  });

  if (totalComparisons === 0) return 50; // Neutral if no comparisons

  return (agreedValues / totalComparisons) * 100;
}

function getValueAtPath(obj: any, path: string): any {
  const parts = path.split('.').filter(p => !p.includes('['));
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return null;
    current = current[part];
  }

  return current;
}

function calculateStructureSimilarity(
  myOutput: any,
  allOutputs: Array<{ model: string; json: any }>
): number {
  if (allOutputs.length < 2) return 100;

  const myDepth = getMaxDepth(myOutput);
  const myTopLevel = typeof myOutput === 'object' && myOutput !== null ? Object.keys(myOutput).length : 0;

  const depths = allOutputs.map(o => getMaxDepth(o.json));
  const topLevels = allOutputs.map(o =>
    typeof o.json === 'object' && o.json !== null ? Object.keys(o.json).length : 0
  );

  const avgDepth = depths.reduce((a, b) => a + b, 0) / depths.length;
  const avgTopLevel = topLevels.reduce((a, b) => a + b, 0) / topLevels.length;

  const depthSimilarity = 100 - Math.min(Math.abs(myDepth - avgDepth) * 20, 100);
  const topLevelSimilarity = 100 - Math.min(Math.abs(myTopLevel - avgTopLevel) * 10, 100);

  return (depthSimilarity + topLevelSimilarity) / 2;
}

function extractFlags(rawText: string, json: any): QualityDetails['flags'] {
  return {
    hasMarkdown: rawText.includes('```'),
    hasExtraText: !rawText.trim().startsWith('{') || !rawText.trim().endsWith('}'),
    hasStringNumbers: countStringNumbers(json) > 0,
    hasInconsistentDates: analyzeDates(json).inconsistentFormat,
    hasEmptyValues: checkNullUsage(json).emptyStringCount > 0,
  };
}

function extractMetrics(json: any): QualityDetails['metrics'] {
  const { topLevel, populated, total } = countFields(json);
  const { totalArrays } = countArrays(json);
  const { nullCount } = countNulls(json);
  const maxDepth = getMaxDepth(json);

  return {
    topLevelFields: topLevel,
    populatedFields: populated,
    totalFields: total,
    maxDepth,
    arrayCount: totalArrays,
    nullCount,
  };
}

function countNulls(obj: any, count = 0): { nullCount: number } {
  if (obj === null) {
    return { nullCount: count + 1 };
  }

  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      obj.forEach(item => {
        const result = countNulls(item, count);
        count = result.nullCount;
      });
    } else {
      Object.values(obj).forEach(value => {
        const result = countNulls(value, count);
        count = result.nullCount;
      });
    }
  }

  return { nullCount: count };
}
