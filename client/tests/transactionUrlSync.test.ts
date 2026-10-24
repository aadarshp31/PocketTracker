import {
  parseTransactionUrlState,
  buildTransactionSearchParams,
  TRANSACTION_LIMIT_OPTIONS,
} from '../src/features/transactions/utils/transactionUrlSync'
import { defaultTransactionFilters } from '../src/features/transactions/utils/transactionFilters'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected ${expected}, got ${actual}`)
  }
}

export function runTransactionUrlSyncTests() {
  // Verify allowed options contains 75 and 100
  assertEqual(TRANSACTION_LIMIT_OPTIONS.length, 5, 'Should have 5 options')
  assertEqual(TRANSACTION_LIMIT_OPTIONS[0], 10, 'First option should be 10')
  assertEqual(TRANSACTION_LIMIT_OPTIONS[1], 25, 'Second option should be 25')
  assertEqual(TRANSACTION_LIMIT_OPTIONS[2], 50, 'Third option should be 50')
  assertEqual(TRANSACTION_LIMIT_OPTIONS[3], 75, 'Fourth option should be 75')
  assertEqual(TRANSACTION_LIMIT_OPTIONS[4], 100, 'Fifth option should be 100')

  // Test parsing valid limits
  assertEqual(parseTransactionUrlState(new URLSearchParams('limit=10')).limit, 10, 'limit=10')
  assertEqual(parseTransactionUrlState(new URLSearchParams('limit=25')).limit, 25, 'limit=25')
  assertEqual(parseTransactionUrlState(new URLSearchParams('limit=50')).limit, 50, 'limit=50')
  assertEqual(parseTransactionUrlState(new URLSearchParams('limit=75')).limit, 75, 'limit=75')
  assertEqual(parseTransactionUrlState(new URLSearchParams('limit=100')).limit, 100, 'limit=100')

  // Test fallback for invalid / out-of-bounds limits
  assertEqual(parseTransactionUrlState(new URLSearchParams('limit=0')).limit, 25, 'limit=0 fallback')
  assertEqual(parseTransactionUrlState(new URLSearchParams('limit=150')).limit, 25, 'limit=150 fallback')
  assertEqual(parseTransactionUrlState(new URLSearchParams('limit=invalid')).limit, 25, 'limit=invalid fallback')
  assertEqual(parseTransactionUrlState(new URLSearchParams('')).limit, 25, 'default fallback')

  // Test search params serialization
  const params75 = buildTransactionSearchParams(defaultTransactionFilters, 1, 75, '')
  assertEqual(params75.get('limit'), '75', 'params limit=75')

  const params100 = buildTransactionSearchParams(defaultTransactionFilters, 1, 100, '')
  assertEqual(params100.get('limit'), '100', 'params limit=100')

  // Default limit (25) is not serialized into URL
  const params25 = buildTransactionSearchParams(defaultTransactionFilters, 1, 25, '')
  assert(params25.get('limit') === null, 'params limit=25 omitted')

  // Test type parsing for all 4 types
  assertEqual(parseTransactionUrlState(new URLSearchParams('type=investment')).filters.type, 'investment', 'parse type=investment')
  assertEqual(parseTransactionUrlState(new URLSearchParams('type=transfer')).filters.type, 'transfer', 'parse type=transfer')
  assertEqual(parseTransactionUrlState(new URLSearchParams('type=income')).filters.type, 'income', 'parse type=income')
  assertEqual(parseTransactionUrlState(new URLSearchParams('type=expense')).filters.type, 'expense', 'parse type=expense')
  assertEqual(parseTransactionUrlState(new URLSearchParams('type=unknown')).filters.type, 'all', 'fallback unknown type to all')

  console.log('client transactionUrlSync tests: ALL PASSED');
}

runTransactionUrlSyncTests();
