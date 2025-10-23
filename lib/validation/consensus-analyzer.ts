/**
 * Consensus Analyzer - Cross-Model Validation
 *
 * Analyzes outputs from multiple LLM models to:
 * - Find field consensus (which fields models agree on)
 * - Find value consensus (which values models agree on)
 * - Rank models by quality
 * - Generate actionable recommendations
 */

import type { QualityScores } from './quality-scorer';
import { extractAllFieldPaths } from './quality-scorer';

// Helper to get value at a specific path
function getValueAtPath(obj: any, path: string): any {
  const parts = path.split('.').filter(p => !p.includes('['));
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return null;
    current = current[part];
  }

  return current;
}

export interface ModelOutput {
  model: string;
  json: any;
  raw: string;
  scores?: QualityScores;
}

export interface ConsensusAnalysis {
  fieldConsensus: {
    agreedFields: Array<{ field: string; agreementPercent: number }>;
    disputedFields: Array<{ field: string; presentIn: string[] }>;
    uniqueFields: Array<{ field: string; model: string }>;
    totalUniqueFields: number;
  };
  valueConsensus: {
    highConfidence: Array<{
      field: string;
      value: any;
      agreementPercent: number;
      modelsAgreed: string[];
    }>;
    lowConfidence: Array<{
      field: string;
      values: Array<{ value: any; models: string[] }>;
      disagreementReason: string;
    }>;
  };
  recommendations: {
    bestModel: string;
    bestScore: number;
    topModels: Array<{
      model: string;
      score: number;
      reason: string;
      strengths: string[];
    }>;
    warnings: string[];
    summary: string;
  };
}

export function analyzeConsensus(outputs: ModelOutput[]): ConsensusAnalysis {
  const validOutputs = outputs.filter(o => o.json !== null && o.json !== undefined);

  if (validOutputs.length === 0) {
    return getEmptyConsensus();
  }

  if (validOutputs.length === 1) {
    return getSingleModelConsensus(validOutputs[0]);
  }

  // Step 1: Analyze field consensus
  const fieldConsensus = analyzeFieldConsensus(validOutputs);

  // Step 2: Analyze value consensus for agreed fields
  const valueConsensus = analyzeValueConsensus(validOutputs, fieldConsensus.agreedFields);

  // Step 3: Rank models and generate recommendations
  const recommendations = generateRecommendations(validOutputs, outputs.length);

  return {
    fieldConsensus,
    valueConsensus,
    recommendations,
  };
}

// ============================================================================
// FIELD CONSENSUS ANALYSIS
// ============================================================================

function analyzeFieldConsensus(outputs: ModelOutput[]) {
  // Map: field path -> Set of models that have this field
  const fieldToModels = new Map<string, Set<string>>();

  // Collect all fields from all models
  outputs.forEach(output => {
    const fields = extractAllFieldPaths(output.json);
    fields.forEach(field => {
      if (!fieldToModels.has(field)) {
        fieldToModels.set(field, new Set());
      }
      fieldToModels.get(field)!.add(output.model);
    });
  });

  const totalModels = outputs.length;
  const highAgreementThreshold = 0.7; // 70%
  const mediumAgreementThreshold = 0.3; // 30%

  // Categorize fields by agreement level
  const agreedFields: Array<{ field: string; agreementPercent: number }> = [];
  const disputedFields: Array<{ field: string; presentIn: string[] }> = [];
  const uniqueFields: Array<{ field: string; model: string }> = [];

  fieldToModels.forEach((models, field) => {
    const agreementPercent = (models.size / totalModels) * 100;

    if (models.size >= totalModels * highAgreementThreshold) {
      // High agreement field
      agreedFields.push({ field, agreementPercent: Math.round(agreementPercent) });
    } else if (models.size > 1 && models.size >= totalModels * mediumAgreementThreshold) {
      // Disputed field (some models have it, but not majority)
      disputedFields.push({ field, presentIn: Array.from(models) });
    } else if (models.size === 1) {
      // Unique to one model
      uniqueFields.push({ field, model: Array.from(models)[0] });
    }
  });

  // Sort by agreement percentage
  agreedFields.sort((a, b) => b.agreementPercent - a.agreementPercent);

  return {
    agreedFields,
    disputedFields,
    uniqueFields,
    totalUniqueFields: fieldToModels.size,
  };
}

// ============================================================================
// VALUE CONSENSUS ANALYSIS
// ============================================================================

function analyzeValueConsensus(
  outputs: ModelOutput[],
  agreedFields: Array<{ field: string; agreementPercent: number }>
) {
  const highConfidence: Array<{
    field: string;
    value: any;
    agreementPercent: number;
    modelsAgreed: string[];
  }> = [];

  const lowConfidence: Array<{
    field: string;
    values: Array<{ value: any; models: string[] }>;
    disagreementReason: string;
  }> = [];

  // For each agreed field, check if models agree on the value
  agreedFields.forEach(({ field }) => {
    const valuesMap = new Map<string, string[]>(); // stringified value -> models

    outputs.forEach(output => {
      const value = getValueAtPath(output.json, field);

      // Skip objects and arrays for value comparison
      if (value !== null && value !== undefined && typeof value !== 'object') {
        const valueKey = String(value).toLowerCase().trim();
        if (!valuesMap.has(valueKey)) {
          valuesMap.set(valueKey, []);
        }
        valuesMap.get(valueKey)!.push(output.model);
      }
    });

    if (valuesMap.size === 0) {
      // All null/undefined or objects
      return;
    }

    // Find most common value
    let maxCount = 0;
    let mostCommonValue = '';
    let mostCommonModels: string[] = [];

    valuesMap.forEach((models, value) => {
      if (models.length > maxCount) {
        maxCount = models.length;
        mostCommonValue = value;
        mostCommonModels = models;
      }
    });

    const agreementPercent = (maxCount / outputs.length) * 100;

    if (agreementPercent >= 70) {
      // High confidence
      highConfidence.push({
        field,
        value: mostCommonValue,
        agreementPercent: Math.round(agreementPercent),
        modelsAgreed: mostCommonModels,
      });
    } else {
      // Low confidence - models disagree
      const values = Array.from(valuesMap.entries()).map(([value, models]) => ({
        value,
        models,
      }));

      const disagreementReason = determineDisagreementReason(values, field);

      lowConfidence.push({
        field,
        values,
        disagreementReason,
      });
    }
  });

  return { highConfidence, lowConfidence };
}

function determineDisagreementReason(
  values: Array<{ value: any; models: string[] }>,
  field: string
): string {
  if (values.length > 5) {
    return 'High variance - many different values extracted';
  }

  // Check if values are similar (might be formatting differences)
  const uniqueValues = values.map(v => String(v.value).toLowerCase().trim());
  const allSimilar = uniqueValues.every((val, idx, arr) =>
    arr.every(other => levenshteinSimilarity(val, other) > 0.8)
  );

  if (allSimilar) {
    return 'Formatting differences - values are similar but not identical';
  }

  if (values.length === 2) {
    return 'Binary disagreement - models split into two camps';
  }

  return 'Models extracted different information';
}

function levenshteinSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;

  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return 0;
  if (len2 === 0) return 0;

  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);

  return 1 - distance / maxLen;
}

// ============================================================================
// RECOMMENDATIONS
// ============================================================================

function generateRecommendations(
  validOutputs: ModelOutput[],
  totalOutputs: number
): ConsensusAnalysis['recommendations'] {
  // Sort by quality score
  const ranked = validOutputs
    .map(o => ({
      model: o.model,
      score: o.scores?.overall || 0,
      scores: o.scores,
      json: o.json,
    }))
    .sort((a, b) => b.score - a.score);

  const bestModel = ranked[0]?.model || 'Unknown';
  const bestScore = ranked[0]?.score || 0;

  // Get top 3 models
  const topModels = ranked.slice(0, 3).map((m, idx) => ({
    model: m.model,
    score: m.score,
    reason: generateReason(m, idx, validOutputs.length),
    strengths: identifyStrengths(m),
  }));

  // Generate warnings
  const warnings = generateWarnings(validOutputs.length, totalOutputs, ranked);

  // Generate summary
  const summary = generateSummary(validOutputs.length, totalOutputs, topModels);

  return {
    bestModel,
    bestScore,
    topModels,
    warnings,
    summary,
  };
}

function generateReason(model: any, rank: number, totalModels: number): string {
  if (rank === 0) {
    if (model.score >= 90) {
      return 'Exceptional quality with highest consistency and completeness';
    } else if (model.score >= 80) {
      return 'Highest quality score with strong structural consistency';
    } else if (model.score >= 70) {
      return 'Best among tested models with good overall quality';
    } else {
      return 'Highest score but quality could be improved';
    }
  } else if (rank === 1) {
    return 'Strong second choice with good consensus agreement';
  } else {
    return 'Reliable extraction with acceptable quality';
  }
}

function identifyStrengths(model: any): string[] {
  const strengths: string[] = [];

  if (!model.scores) return strengths;

  if (model.scores.syntax >= 90) {
    strengths.push('Perfect JSON syntax');
  }

  if (model.scores.structural >= 85) {
    strengths.push('Excellent structure');
  }

  if (model.scores.completeness >= 85) {
    strengths.push('High completeness');
  }

  if (model.scores.content >= 85) {
    strengths.push('Quality content extraction');
  }

  if (model.scores.consensus >= 85) {
    strengths.push('Strong consensus with other models');
  }

  if (strengths.length === 0) {
    strengths.push('Functional output');
  }

  return strengths;
}

function generateWarnings(
  validCount: number,
  totalCount: number,
  ranked: any[]
): string[] {
  const warnings: string[] = [];

  // Warning if many models failed
  const failureRate = ((totalCount - validCount) / totalCount) * 100;
  if (failureRate >= 50) {
    warnings.push(`${Math.round(failureRate)}% of models failed to produce valid JSON`);
  }

  // Warning if best model has low score
  if (ranked.length > 0 && ranked[0].score < 60) {
    warnings.push('Best model quality is below recommended threshold (60/100)');
  }

  // Warning if low consensus
  if (ranked.length >= 3) {
    const scores = ranked.map(r => r.scores?.consensus || 0);
    const avgConsensus = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avgConsensus < 50) {
      warnings.push('Low consensus among models - results may vary significantly');
    }
  }

  // Warning if all models have similar low scores
  if (ranked.length >= 3) {
    const allLow = ranked.slice(0, 3).every(r => r.score < 70);
    if (allLow) {
      warnings.push('All models struggled with this document - consider refining prompts');
    }
  }

  return warnings;
}

function generateSummary(
  validCount: number,
  totalCount: number,
  topModels: any[]
): string {
  if (validCount === 0) {
    return 'No models produced valid output. Please check prompts and document format.';
  }

  if (validCount === 1) {
    return `Only 1 model succeeded. Score: ${topModels[0]?.score || 0}/100.`;
  }

  const successRate = Math.round((validCount / totalCount) * 100);
  const avgTopScore = topModels.slice(0, 3).reduce((sum, m) => sum + m.score, 0) / Math.min(topModels.length, 3);

  if (successRate >= 80 && avgTopScore >= 80) {
    return `Excellent results: ${successRate}% success rate, average top-3 score: ${Math.round(avgTopScore)}/100`;
  } else if (successRate >= 60 && avgTopScore >= 70) {
    return `Good results: ${successRate}% success rate, average top-3 score: ${Math.round(avgTopScore)}/100`;
  } else if (successRate >= 40) {
    return `Moderate results: ${successRate}% success rate, consider using premium models`;
  } else {
    return `Poor results: ${successRate}% success rate, prompt refinement recommended`;
  }
}

// ============================================================================
// HELPER FUNCTIONS FOR EMPTY/SINGLE CASES
// ============================================================================

function getEmptyConsensus(): ConsensusAnalysis {
  return {
    fieldConsensus: {
      agreedFields: [],
      disputedFields: [],
      uniqueFields: [],
      totalUniqueFields: 0,
    },
    valueConsensus: {
      highConfidence: [],
      lowConfidence: [],
    },
    recommendations: {
      bestModel: 'None',
      bestScore: 0,
      topModels: [],
      warnings: ['No models produced valid output'],
      summary: 'All models failed to produce valid JSON',
    },
  };
}

function getSingleModelConsensus(output: ModelOutput): ConsensusAnalysis {
  const fields = extractAllFieldPaths(output.json);

  return {
    fieldConsensus: {
      agreedFields: fields.map(f => ({ field: f, agreementPercent: 100 })),
      disputedFields: [],
      uniqueFields: [],
      totalUniqueFields: fields.length,
    },
    valueConsensus: {
      highConfidence: [],
      lowConfidence: [],
    },
    recommendations: {
      bestModel: output.model,
      bestScore: output.scores?.overall || 0,
      topModels: [{
        model: output.model,
        score: output.scores?.overall || 0,
        reason: 'Only model with valid output',
        strengths: output.scores ? identifyStrengths({ scores: output.scores }) : [],
      }],
      warnings: ['Only one model succeeded - no cross-validation possible'],
      summary: 'Single model output - consensus analysis not available',
    },
  };
}
