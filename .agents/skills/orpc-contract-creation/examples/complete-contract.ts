// Example: Creating an oRPC contract with input/output schemas
// Location: packages/server-contract/src/contract/example.contract.ts

import { oc } from '@orpc/contract';
import z from 'zod';

import { authProcedure } from './auth.procedures';

// Define reusable schemas
const exampleSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  ownerId: z.string(),
  createdAt: z.coerce.date(),
});

// Public endpoint - no authentication required
const listPublicExamples = oc
  .route({
    method: 'GET',
    path: '/',
    summary: 'List all public examples',
    description: 'Retrieves a paginated list of public examples with optional filtering',
  })
  .input(
    z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      search: z.string().optional(),
    }),
  )
  .output(
    z.object({
      examples: z.array(exampleSchema),
      total: z.number(),
    }),
  );

// Protected endpoint - requires authentication (start from authProcedure instead of oc)
const createExample = authProcedure
  .route({
    method: 'POST',
    path: '/',
    summary: 'Create a new example',
    description: 'Creates a new example owned by the authenticated user',
  })
  .input(
    z.object({
      name: z.string().min(1, 'Name is required'),
      description: z.string().max(500).optional(),
    }),
  )
  .output(exampleSchema);

// Protected endpoint with ID parameter
const getExample = authProcedure
  .route({
    method: 'GET',
    path: '/{id}',
    summary: 'Get example by ID',
    description: 'Retrieves a single example by its ID. User must be the owner or the example must be public.',
  })
  .input(
    z.object({
      id: z.uuid(),
    }),
  )
  .output(exampleSchema);

// Protected endpoint for updates
const updateExample = authProcedure
  .route({
    method: 'PATCH',
    path: '/{id}',
    summary: 'Update an example',
    description: 'Updates an example. User must be the owner.',
  })
  .input(
    z.object({
      id: z.uuid(),
      name: z.string().min(1).optional(),
      description: z.string().max(500).optional(),
    }),
  )
  .output(exampleSchema);

// Protected endpoint for deletion
const deleteExample = authProcedure
  .route({
    method: 'DELETE',
    path: '/{id}',
    summary: 'Delete an example',
    description: 'Soft deletes an example by marking it as archived. User must be the owner.',
  })
  .input(
    z.object({
      id: z.uuid(),
    }),
  )
  .output(
    z.object({
      success: z.boolean(),
    }),
  );

// Export the contract router; paths above are relative to the prefix
export const exampleContract = oc.prefix('/examples').router({
  listPublicExamples,
  createExample,
  getExample,
  updateExample,
  deleteExample,
});
