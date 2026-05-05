import TransactionModel from "../models/TransactionModel";

export interface DuplicateMatch {
  existingTransactionId: string;
  existingTransaction: {
    id: string;
    amount: number;
    description: string;
    date: string;
    type: string;
  };
  matchScore: number; // 0-1 confidence score
  matchReasons: string[]; // Why it matched
}

export interface TransactionWithDuplicates {
  newTransaction: {
    amount: number;
    description: string;
    date: string;
    type: string;
  };
  index: number; // Index in the import array
  potentialMatches: DuplicateMatch[];
  isDuplicate: boolean; // true if high confidence match found
}

export default class DuplicateDetectionService {
  /**
   * Detect potential duplicates in imported transactions
   * @param newTransactions Array of new transactions to check
   * @param userId User ID to scope the duplicate detection
   * @param dateToleranceDays How many days difference to consider a potential match (default: 1)
   * @param descriptionSimilarityThreshold Minimum similarity score 0-1 (default: 0.3)
   */
  static async detectDuplicates(
    newTransactions: Array<{
      amount: number;
      description: string;
      date: string;
      type: string;
    }>,
    userId: string,
    dateToleranceDays: number = 1,
    descriptionSimilarityThreshold: number = 0.3
  ): Promise<TransactionWithDuplicates[]> {
    const results: TransactionWithDuplicates[] = [];

    // Fetch existing transactions for this user
    const existingTransactions = await TransactionModel.findAll({
      where: { user_id: userId },
      attributes: ["id", "amount", "description", "date", "type"],
    });

    // Check each new transaction for duplicates
    for (let index = 0; index < newTransactions.length; index++) {
      const newTx = newTransactions[index];
      const potentialMatches: DuplicateMatch[] = [];

      // Compare against each existing transaction
      for (const existing of existingTransactions) {
        const existingData = existing.get({ plain: true });

        // Quick filters for potential matches
        const amountMatches = this.amountsMatch(newTx.amount, Number(existingData.amount));
        const dateClose = this.datesAreClose(newTx.date, String(existingData.date), dateToleranceDays);
        const typesMatch = newTx.type === existingData.type;

        // If amount and type don't match, skip
        if (!amountMatches || !typesMatch) continue;

        // Calculate description similarity
        const descriptionSimilarity = this.calculateStringSimilarity(
          newTx.description,
          String(existingData.description)
        );

        // Build match if criteria met
        if (dateClose && descriptionSimilarity > descriptionSimilarityThreshold) {
          const matchReasons: string[] = [];
          if (amountMatches) matchReasons.push("same amount");
          if (dateClose) matchReasons.push(`date within ${dateToleranceDays} days`);
          if (descriptionSimilarity > 0.7) matchReasons.push("similar description");

          const matchScore = this.calculateMatchScore(
            amountMatches,
            dateClose,
            descriptionSimilarity
          );

          potentialMatches.push({
            existingTransactionId: String(existingData.id),
            existingTransaction: {
              id: String(existingData.id),
              amount: Number(existingData.amount),
              description: String(existingData.description),
              date: String(existingData.date),
              type: String(existingData.type),
            },
            matchScore,
            matchReasons,
          });
        }
      }

      // Sort matches by score (highest first)
      potentialMatches.sort((a, b) => b.matchScore - a.matchScore);

      results.push({
        newTransaction: newTx,
        index,
        potentialMatches,
        isDuplicate: potentialMatches.length > 0 && potentialMatches[0].matchScore > 0.8,
      });
    }

    return results;
  }

  /**
   * Check if two amounts match (with slight tolerance for rounding)
   */
  private static amountsMatch(amount1: number, amount2: number, tolerance: number = 0.01): boolean {
    return Math.abs(amount1 - amount2) <= tolerance;
  }

  /**
   * Check if two dates are within specified tolerance
   */
  private static datesAreClose(date1: string, date2: string, toleranceDays: number = 1): boolean {
    const d1 = new Date(date1).getTime();
    const d2 = new Date(date2).getTime();
    const diffMs = Math.abs(d1 - d2);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= toleranceDays;
  }

  /**
   * Calculate similarity between two strings using Levenshtein-like approach
   * Returns score 0-1 (0 = completely different, 1 = identical)
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    // Exact match
    if (s1 === s2) return 1;

    // Check if one contains the other
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;

    // Simple similarity based on character overlap
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1;

    const editDistance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);

    // Normalize edit distance to 0-1 score
    return 1 - editDistance / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * (number of single-character edits required to change one to the other)
   */
  private static levenshteinDistance(s1: string, s2: string): number {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[len2][len1];
  }

  /**
   * Calculate overall match score 0-1 based on multiple factors
   */
  private static calculateMatchScore(
    amountMatches: boolean,
    dateClose: boolean,
    descriptionSimilarity: number
  ): number {
    let score = 0;

    // Exact amount match is most important
    if (amountMatches) score += 0.5;

    // Date proximity
    if (dateClose) score += 0.3;

    // Description similarity
    score += descriptionSimilarity * 0.2;

    return Math.min(score, 1);
  }

  /**
   * Check if a transaction should be considered a definite duplicate
   * (for auto-skipping, only used if user enables aggressive duplicate removal)
   */
  static isDuplicateWithHighConfidence(match: DuplicateMatch): boolean {
    return match.matchScore >= 0.95;
  }
}
