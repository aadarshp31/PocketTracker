import { parse } from "csv-parse/sync";

export interface CSVColumnMapping {
  dateColumn?: number; // 0-indexed column number
  descriptionColumn?: number;
  amountColumn?: number;
  typeColumn?: number; // Optional: income/expense indicator
  categoryColumn?: number; // Optional: explicit category column
}

export interface ParsedTransaction {
  date: string; // ISO date format
  description: string;
  amount: number;
  type: "income" | "expense";
  category?: string; // Optional, for user-provided category
}

export interface CSVParseResult {
  success: boolean;
  transactions: ParsedTransaction[];
  errors: Array<{ rowIndex: number; message: string }>;
  skippedRows: number;
}

export default class CSVParserService {
  /**
   * Parse CSV content with configurable column mapping
   * @param csvContent Raw CSV file content
   * @param mapping Column mapping configuration
   * @param defaultType Default transaction type if not specified in CSV
   * @returns Parse result with transactions and errors
   */
  static parseCSV(
    csvContent: string,
    mapping: CSVColumnMapping,
    defaultType: "income" | "expense" = "expense"
  ): CSVParseResult {
    const result: CSVParseResult = {
      success: true,
      transactions: [],
      errors: [],
      skippedRows: 0,
    };

    try {
      // Parse CSV content
      const records = parse(csvContent, {
        skip_empty_lines: true,
        trim: true,
      }) as string[][];

      if (records.length === 0) {
        result.errors.push({ rowIndex: 0, message: "CSV file is empty" });
        return result;
      }

      // Process each row starting from row 1 (skip header at row 0)
      for (let rowIndex = 1; rowIndex < records.length; rowIndex++) {
        const row = records[rowIndex];
        const errors: string[] = [];

        // Extract and validate required fields
        const date = this.extractAndValidateDate(row, mapping.dateColumn, errors);
        const description = this.extractAndValidateDescription(row, mapping.descriptionColumn, errors);
        const amount = this.extractAndValidateAmount(row, mapping.amountColumn, errors);

        // Extract optional fields
        const type = this.extractType(row, mapping.typeColumn, defaultType, errors);
        const category = mapping.categoryColumn !== undefined ? row[mapping.categoryColumn]?.trim() : undefined;

        // If critical fields are missing, skip this row
        if (errors.length > 0) {
          result.errors.push({ rowIndex, message: errors.join("; ") });
          result.skippedRows++;
          continue;
        }

        // Add successfully parsed transaction
        if (date && description && amount !== null) {
          result.transactions.push({
            date,
            description,
            amount,
            type,
            category: category?.trim() || undefined,
          });
        }
      }

      result.success = result.errors.length === 0 || result.transactions.length > 0;
    } catch (error) {
      result.success = false;
      result.errors.push({
        rowIndex: 0,
        message: `CSV parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }

    return result;
  }

  /**
   * Validate and extract date from a column
   */
  private static extractAndValidateDate(
    row: string[],
    columnIndex: number | undefined,
    errors: string[]
  ): string | null {
    if (columnIndex === undefined) {
      // If no date column specified, use today's date
      return new Date().toISOString().split("T")[0];
    }

    const value = row[columnIndex]?.trim();
    if (!value) {
      errors.push("Missing date");
      return null;
    }

    // Try to parse as ISO date or common formats
    const dateObj = this.parseDate(value);
    if (!dateObj) {
      errors.push(`Invalid date format: ${value}`);
      return null;
    }

    return dateObj.toISOString().split("T")[0];
  }

  /**
   * Validate and extract description from a column
   */
  private static extractAndValidateDescription(
    row: string[],
    columnIndex: number | undefined,
    errors: string[]
  ): string | null {
    if (columnIndex === undefined) {
      errors.push("Missing description column mapping");
      return null;
    }

    const value = row[columnIndex]?.trim();
    if (!value) {
      errors.push("Description is empty");
      return null;
    }

    if (value.length > 500) {
      errors.push("Description exceeds 500 characters");
      return null;
    }

    return value;
  }

  /**
   * Validate and extract amount from a column
   */
  private static extractAndValidateAmount(
    row: string[],
    columnIndex: number | undefined,
    errors: string[]
  ): number | null {
    if (columnIndex === undefined) {
      errors.push("Missing amount column mapping");
      return null;
    }

    const value = row[columnIndex]?.trim();
    if (!value) {
      errors.push("Amount is empty");
      return null;
    }

    // Remove common currency symbols and normalize
    const normalized = value
      .replace(/[$€£¥₹]/g, "") // Remove currency symbols
      .replace(/,/g, "") // Remove commas (thousand separator)
      .trim();

    const amount = parseFloat(normalized);
    if (isNaN(amount) || amount < 0) {
      errors.push(`Invalid amount: ${value}`);
      return null;
    }

    // Round to 2 decimal places
    return Math.round(amount * 100) / 100;
  }

  /**
   * Extract and validate transaction type
   */
  private static extractType(
    row: string[],
    columnIndex: number | undefined,
    defaultType: "income" | "expense",
    errors: string[]
  ): "income" | "expense" {
    if (columnIndex === undefined) {
      return defaultType;
    }

    const value = row[columnIndex]?.trim().toLowerCase();
    if (!value) {
      return defaultType;
    }

    if (["income", "in", "credit", "+"].includes(value)) {
      return "income";
    }
    if (["expense", "out", "debit", "-"].includes(value)) {
      return "expense";
    }

    // If unrecognized, use default
    return defaultType;
  }

  /**
   * Parse date from various common formats
   */
  private static parseDate(dateString: string): Date | null {
    // Try ISO format first
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Try common formats: DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY or MM/DD/YYYY
      /(\d{1,2})-(\d{1,2})-(\d{4})/, // DD-MM-YYYY or MM-DD-YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
    ];

    for (const format of formats) {
      const match = dateString.match(format);
      if (match) {
        const [, part1, part2, part3] = match;
        // Assume MM/DD/YYYY or MM-DD-YYYY format (most common in bank statements)
        date = new Date(`${part3}-${part1}-${part2}`);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return null;
  }

  /**
   * Detect column mapping automatically by analyzing first few rows
   * Looks for common patterns in headers or data
   */
  static autoDetectColumns(csvContent: string): CSVColumnMapping {
    const mapping: CSVColumnMapping = {};

    try {
      const records = parse(csvContent, {
        skip_empty_lines: true,
        trim: true,
      }) as string[][];

      if (records.length < 1) return mapping;

      const headerRow = records[0];

      // Try to match header names
      headerRow.forEach((header, index) => {
        const lowerHeader = header.toLowerCase();

        if (
          lowerHeader.includes("date") ||
          lowerHeader.includes("trans date") ||
          lowerHeader.includes("posted")
        ) {
          mapping.dateColumn = index;
        } else if (
          lowerHeader.includes("description") ||
          lowerHeader.includes("memo") ||
          lowerHeader.includes("trans")
        ) {
          mapping.descriptionColumn = index;
        } else if (
          lowerHeader.includes("amount") ||
          lowerHeader.includes("debit") ||
          lowerHeader.includes("credit") ||
          lowerHeader.includes("withdrawal") ||
          lowerHeader.includes("deposit")
        ) {
          mapping.amountColumn = index;
        } else if (lowerHeader.includes("type") || lowerHeader.includes("category")) {
          mapping.typeColumn = index;
        }
      });
    } catch (error) {
      console.warn("Auto-detection failed, returning empty mapping");
    }

    return mapping;
  }
}
