import assert from 'node:assert/strict';
import '../middlewares/Middlewares';
import TransactionController from '../controllers/TransactionController';
import TransactionService from '../services/TransactionService';
import TransactionModel from '../models/TransactionModel';
import type { Request, Response } from 'express';

async function testTransactionControllerPagination() {
  let capturedOptions: any = null;
  const mockService = {
    getAllTransactions: async (_userId: string, options: any) => {
      capturedOptions = options;
      return {
        transactions: [],
        meta: {
          page: options.page ?? 1,
          limit: options.limit ?? 10,
          totalPages: 1,
          totalCount: 0,
        },
      };
    },
  } as unknown as TransactionService;

  const mockUserService = {} as any;
  const controller = new TransactionController(mockService, mockUserService);

  // Bypass auth DB lookup
  (controller as any).getUserIdFromSupabaseId = async () => 'mock-user-uuid';

  const createMockRes = () => {
    const res: any = {
      statusCode: 200,
      jsonData: null,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.jsonData = data;
        return this;
      },
    };
    return res;
  };

  // 1. Test limit = 75
  const req75 = {
    user: { id: 'supabase-user-id', email: 'test@example.com' },
    query: { limit: '75', page: '1' },
  } as unknown as Request;
  const res75 = createMockRes();
  await controller.getAll(req75, res75 as unknown as Response);

  assert.equal(capturedOptions.limit, 75, 'Controller should pass limit 75 to service');
  assert.equal(res75.jsonData.meta.limit, 75, 'Response meta should reflect limit 75');

  // 2. Test limit = 100
  const req100 = {
    user: { id: 'supabase-user-id', email: 'test@example.com' },
    query: { limit: '100', page: '2' },
  } as unknown as Request;
  const res100 = createMockRes();
  await controller.getAll(req100, res100 as unknown as Response);

  assert.equal(capturedOptions.limit, 100, 'Controller should pass limit 100 to service');
  assert.equal(res100.jsonData.meta.limit, 100, 'Response meta should reflect limit 100');

  // 3. Test limit = 50
  const req50 = {
    user: { id: 'supabase-user-id', email: 'test@example.com' },
    query: { limit: '50' },
  } as unknown as Request;
  const res50 = createMockRes();
  await controller.getAll(req50, res50 as unknown as Response);

  assert.equal(capturedOptions.limit, 50, 'Controller should pass limit 50 to service');
  assert.equal(res50.jsonData.meta.limit, 50, 'Response meta should reflect limit 50');

  // 4. Test invalid limit falls back to 10
  const reqInvalid = {
    user: { id: 'supabase-user-id', email: 'test@example.com' },
    query: { limit: 'not-a-number' },
  } as unknown as Request;
  const resInvalid = createMockRes();
  await controller.getAll(reqInvalid, resInvalid as unknown as Response);

  assert.equal(capturedOptions.limit, 10, 'Controller should fallback to default limit 10');

  console.log('testTransactionControllerPagination: PASS');
}

async function testTransactionServicePagination() {
  const service = new TransactionService();

  let capturedFindAllOptions: any = null;
  TransactionModel.count = (async () => 200) as any;
  TransactionModel.findAll = (async (opts: any) => {
    capturedFindAllOptions = opts;
    return [];
  }) as any;

  // 1. Limit 75
  const result75 = await service.getAllTransactions('user-uuid', { page: 1, limit: 75 });
  assert.equal(capturedFindAllOptions.limit, 75, 'TransactionModel.findAll should receive limit 75');
  assert.equal(result75.meta.limit, 75, 'Meta limit should be 75');
  assert.equal(result75.meta.totalPages, 3, '200 items / 75 per page = 3 pages');

  // 2. Limit 100
  const result100 = await service.getAllTransactions('user-uuid', { page: 1, limit: 100 });
  assert.equal(capturedFindAllOptions.limit, 100, 'TransactionModel.findAll should receive limit 100');
  assert.equal(result100.meta.limit, 100, 'Meta limit should be 100');
  assert.equal(result100.meta.totalPages, 2, '200 items / 100 per page = 2 pages');

  // 3. Limit 150 (exceeds max 100, should be capped to 100)
  const result150 = await service.getAllTransactions('user-uuid', { page: 1, limit: 150 });
  assert.equal(capturedFindAllOptions.limit, 100, 'TransactionModel.findAll should cap limit at 100');
  assert.equal(result150.meta.limit, 100, 'Meta limit should be capped at 100');

  // 4. Default / invalid limit defaults to 10
  const resultDefault = await service.getAllTransactions('user-uuid', { page: 1, limit: 0 });
  assert.equal(capturedFindAllOptions.limit, 10, 'TransactionModel.findAll should default limit to 10');
  assert.equal(resultDefault.meta.limit, 10, 'Meta limit should default to 10');

  console.log('testTransactionServicePagination: PASS');
}

async function run() {
  await testTransactionControllerPagination();
  await testTransactionServicePagination();
  console.log('All transaction pagination tests passed successfully!');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
