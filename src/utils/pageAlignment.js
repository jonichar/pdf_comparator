/**
 * pageAlignment.js
 * 
 * Computes an intelligent alignment between two documents of potentially
 * different page counts. Uses text similarity (Jaccard index on word sets)
 * combined with a Needleman-Wunsch-style dynamic programming alignment
 * to detect inserted/deleted pages.
 * 
 * Returns an array of pairs: [doc1PageNum | null, doc2PageNum | null]
 * where null means "blank placeholder" on that side.
 * 
 * Example for doc1=17 pages, doc2=18 pages where page 5 was inserted in doc2:
 *   [[1,1], [2,2], [3,3], [4,4], [null,5], [5,6], [6,7], ...]
 */

/**
 * Compute Jaccard similarity between two text strings based on word sets.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
function jaccardSimilarity(text1, text2) {
  if (!text1 && !text2) return 1.0
  if (!text1 || !text2) return 0.0

  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(Boolean))
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(Boolean))

  if (words1.size === 0 && words2.size === 0) return 1.0
  if (words1.size === 0 || words2.size === 0) return 0.0

  let intersection = 0
  for (const w of words1) {
    if (words2.has(w)) intersection++
  }

  const union = words1.size + words2.size - intersection
  return union === 0 ? 0 : intersection / union
}

/**
 * Build a similarity matrix between all pages of doc1 and doc2.
 * simMatrix[i][j] = similarity between doc1 page i and doc2 page j.
 */
function buildSimilarityMatrix(pageTexts1, pageTexts2) {
  const n = pageTexts1.length
  const m = pageTexts2.length
  const matrix = []

  for (let i = 0; i < n; i++) {
    matrix[i] = []
    for (let j = 0; j < m; j++) {
      matrix[i][j] = jaccardSimilarity(pageTexts1[i], pageTexts2[j])
    }
  }

  return matrix
}

/**
 * Needleman-Wunsch inspired alignment using the similarity matrix.
 * 
 * Score system:
 * - Match: similarity score (0 to 1)
 * - Gap penalty: cost of inserting a blank on one side (a page exists
 *   in one doc but not the other)
 * 
 * Returns an array of [doc1PageNum | null, doc2PageNum | null] pairs.
 */
export function computePageAlignment(pageTexts1, pageTexts2) {
  const n = pageTexts1.length
  const m = pageTexts2.length

  // Edge cases
  if (n === 0 && m === 0) return []
  if (n === 0) return pageTexts2.map((_, j) => [null, j + 1])
  if (m === 0) return pageTexts1.map((_, i) => [i + 1, null])

  // If same page count, just pair them 1:1 (no alignment needed)
  if (n === m) {
    return Array.from({ length: n }, (_, i) => [i + 1, i + 1])
  }

  const sim = buildSimilarityMatrix(pageTexts1, pageTexts2)

  // Gap penalty: a page that has no match costs this much.
  // We want to prefer matching similar pages even with slight differences.
  const GAP_PENALTY = -0.15

  // DP table: dp[i][j] = best alignment score using first i pages of doc1
  // and first j pages of doc2
  const dp = Array.from({ length: n + 1 }, () => new Float64Array(m + 1))

  // Initialize: gaps along edges
  for (let i = 1; i <= n; i++) dp[i][0] = dp[i - 1][0] + GAP_PENALTY
  for (let j = 1; j <= m; j++) dp[0][j] = dp[0][j - 1] + GAP_PENALTY

  // Fill DP
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const matchScore = dp[i - 1][j - 1] + sim[i - 1][j - 1]
      const gapDoc2    = dp[i - 1][j] + GAP_PENALTY  // doc1 page has no match in doc2
      const gapDoc1    = dp[i][j - 1] + GAP_PENALTY   // doc2 page has no match in doc1

      dp[i][j] = Math.max(matchScore, gapDoc2, gapDoc1)
    }
  }

  // Traceback to find the optimal alignment
  const alignment = []
  let i = n, j = m

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const matchScore = dp[i - 1][j - 1] + sim[i - 1][j - 1]
      const gapDoc2    = dp[i - 1][j] + GAP_PENALTY
      const gapDoc1    = dp[i][j - 1] + GAP_PENALTY
      const current    = dp[i][j]

      if (Math.abs(current - matchScore) < 1e-9) {
        // Match: pair these pages
        alignment.push([i, j])
        i--; j--
      } else if (Math.abs(current - gapDoc2) < 1e-9) {
        // Gap in doc2: doc1 page i has no counterpart
        alignment.push([i, null])
        i--
      } else {
        // Gap in doc1: doc2 page j has no counterpart
        alignment.push([null, j])
        j--
      }
    } else if (i > 0) {
      alignment.push([i, null])
      i--
    } else {
      alignment.push([null, j])
      j--
    }
  }

  alignment.reverse()
  return alignment
}
