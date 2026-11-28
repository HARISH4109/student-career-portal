/**
 * OpenAPI 3.1.0 specification for the Student Career & Placement Success Portal API (`/api/v1`).
 *
 * Served at `GET /api/v1/openapi.json` (raw OpenAPI JSON) and `GET /api/v1/docs` (Swagger UI).
 */

const successResponseRef = (description: string, dataSchema: Record<string, unknown> = { type: 'object' }) => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['success', 'data', 'error', 'meta'],
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: dataSchema,
          error: { type: 'null' },
          meta: { $ref: '#/components/schemas/ApiMeta' },
        },
      },
    },
  },
});

const paginatedResponseRef = (description: string, itemSchema: Record<string, unknown> = { type: 'object' }) => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['success', 'data', 'error', 'meta'],
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { type: 'array', items: itemSchema },
          error: { type: 'null' },
          meta: { $ref: '#/components/schemas/PaginationMeta' },
        },
      },
    },
  },
});

const errorResponses = {
  '401': {
    description: 'Authentication required or invalid token',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorResponse' } } },
  },
  '403': {
    description: 'Insufficient permissions',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorResponse' } } },
  },
  '404': {
    description: 'Resource not found',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorResponse' } } },
  },
  '422': {
    description: 'Validation error',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorResponse' } } },
  },
};

const paginationParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
];

const idPathParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
};

const bearerAuth = [{ bearerAuth: [] }];

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Career Success Portal API',
    version: '1.0.0',
    description:
      'Standardized REST API contract for frontend, backend, and AI services. All responses follow the { success, data, error, meta } envelope.',
  },
  servers: [{ url: '/api/v1', description: 'API v1 base path' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ApiMeta: {
        type: 'object',
        properties: {
          requestId: { type: 'string' },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1 },
          pageSize: { type: 'integer', minimum: 1, maximum: 100 },
          totalItems: { type: 'integer', minimum: 0 },
          totalPages: { type: 'integer', minimum: 0 },
          requestId: { type: 'string' },
        },
      },
      ApiErrorResponse: {
        type: 'object',
        required: ['success', 'data', 'error', 'meta'],
        properties: {
          success: { type: 'boolean', enum: [false] },
          data: { type: 'null' },
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: {
                type: 'string',
                enum: [
                  'VALIDATION_ERROR',
                  'UNAUTHORIZED',
                  'FORBIDDEN',
                  'NOT_FOUND',
                  'CONFLICT',
                  'RATE_LIMITED',
                  'INTERNAL_ERROR',
                ],
              },
              message: { type: 'string' },
              details: {
                type: 'object',
                additionalProperties: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          meta: { $ref: '#/components/schemas/ApiMeta' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Basic health check',
        responses: { '200': successResponseRef('Service healthy') },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth & Users'],
        summary: 'Get authenticated user profile and roles',
        security: bearerAuth,
        responses: { '200': successResponseRef('Authenticated user'), '401': errorResponses['401'] },
      },
    },
    '/users/me': {
      get: {
        tags: ['Auth & Users'],
        summary: 'Get current user profile',
        security: bearerAuth,
        responses: { '200': successResponseRef('Current user'), '401': errorResponses['401'] },
      },
      patch: {
        tags: ['Auth & Users'],
        summary: 'Update current user profile',
        security: bearerAuth,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': successResponseRef('Updated user'), '401': errorResponses['401'], '422': errorResponses['422'] },
      },
    },
    '/students/me': {
      get: {
        tags: ['Students'],
        summary: 'Get own student profile',
        security: bearerAuth,
        responses: { '200': successResponseRef('Student profile'), '401': errorResponses['401'], '403': errorResponses['403'] },
      },
      patch: {
        tags: ['Students'],
        summary: 'Update own student profile',
        security: bearerAuth,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': successResponseRef('Updated student profile'), '401': errorResponses['401'], '422': errorResponses['422'] },
      },
    },
    '/students/{id}': {
      get: {
        tags: ['Students'],
        summary: 'Get student profile by ID (faculty/admin)',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: { '200': successResponseRef('Student profile'), '401': errorResponses['401'], '403': errorResponses['403'], '404': errorResponses['404'] },
      },
    },
    '/resumes': {
      get: {
        tags: ['Resumes'],
        summary: 'List own resumes (paginated)',
        security: bearerAuth,
        parameters: paginationParams,
        responses: { '200': paginatedResponseRef('List of resumes'), '401': errorResponses['401'] },
      },
      post: {
        tags: ['Resumes'],
        summary: 'Create a resume',
        security: bearerAuth,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': successResponseRef('Created resume'), '401': errorResponses['401'], '422': errorResponses['422'] },
      },
    },
    '/resumes/{id}': {
      get: {
        tags: ['Resumes'],
        summary: 'Get resume by ID',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: { '200': successResponseRef('Resume details'), '401': errorResponses['401'], '404': errorResponses['404'] },
      },
      patch: {
        tags: ['Resumes'],
        summary: 'Update resume by ID',
        security: bearerAuth,
        parameters: [idPathParam],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': successResponseRef('Updated resume'), '401': errorResponses['401'], '404': errorResponses['404'], '422': errorResponses['422'] },
      },
      delete: {
        tags: ['Resumes'],
        summary: 'Delete resume by ID',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: { '200': successResponseRef('Deleted resume'), '401': errorResponses['401'], '404': errorResponses['404'] },
      },
    },
    '/resumes/{id}/analyze': {
      post: {
        tags: ['Resumes'],
        summary: 'Run AI analysis on a resume',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: { '200': successResponseRef('Resume analysis result'), '401': errorResponses['401'], '404': errorResponses['404'] },
      },
    },
    '/opportunities': {
      get: {
        tags: ['Opportunities'],
        summary: 'List opportunities (paginated)',
        security: bearerAuth,
        parameters: paginationParams,
        responses: { '200': paginatedResponseRef('List of opportunities'), '401': errorResponses['401'] },
      },
      post: {
        tags: ['Opportunities'],
        summary: 'Create opportunity (faculty/admin)',
        security: bearerAuth,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': successResponseRef('Created opportunity'), '401': errorResponses['401'], '403': errorResponses['403'], '422': errorResponses['422'] },
      },
    },
    '/opportunities/{id}': {
      get: {
        tags: ['Opportunities'],
        summary: 'Get opportunity by ID',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: { '200': successResponseRef('Opportunity details'), '401': errorResponses['401'], '404': errorResponses['404'] },
      },
      patch: {
        tags: ['Opportunities'],
        summary: 'Update opportunity by ID',
        security: bearerAuth,
        parameters: [idPathParam],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': successResponseRef('Updated opportunity'), '401': errorResponses['401'], '403': errorResponses['403'], '404': errorResponses['404'] },
      },
      delete: {
        tags: ['Opportunities'],
        summary: 'Delete opportunity by ID',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: { '200': successResponseRef('Deleted opportunity'), '401': errorResponses['401'], '403': errorResponses['403'], '404': errorResponses['404'] },
      },
    },
    '/opportunities/{id}/publish': {
      post: {
        tags: ['Opportunities'],
        summary: 'Publish an opportunity',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: { '200': successResponseRef('Published opportunity'), '401': errorResponses['401'], '403': errorResponses['403'], '404': errorResponses['404'] },
      },
    },
    '/opportunities/{id}/close': {
      post: {
        tags: ['Opportunities'],
        summary: 'Close an opportunity',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: { '200': successResponseRef('Closed opportunity'), '401': errorResponses['401'], '403': errorResponses['403'], '404': errorResponses['404'] },
      },
    },
    '/opportunities/{id}/applications': {
      post: {
        tags: ['Applications'],
        summary: 'Apply to an opportunity',
        security: bearerAuth,
        parameters: [idPathParam],
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': successResponseRef('Application submitted'), '401': errorResponses['401'], '403': errorResponses['403'], '422': errorResponses['422'] },
      },
    },
    '/applications/me': {
      get: {
        tags: ['Applications'],
        summary: 'List own applications (paginated)',
        security: bearerAuth,
        parameters: paginationParams,
        responses: { '200': paginatedResponseRef('List of own applications'), '401': errorResponses['401'] },
      },
    },
    '/applications/{id}': {
      get: {
        tags: ['Applications'],
        summary: 'Get application by ID',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: { '200': successResponseRef('Application details'), '401': errorResponses['401'], '404': errorResponses['404'] },
      },
    },
    '/applications/{id}/withdraw': {
      post: {
        tags: ['Applications'],
        summary: 'Withdraw an application',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: { '200': successResponseRef('Withdrawn application'), '401': errorResponses['401'], '404': errorResponses['404'] },
      },
    },
    '/applications/{id}/status': {
      patch: {
        tags: ['Applications'],
        summary: 'Update application status (faculty/admin)',
        security: bearerAuth,
        parameters: [idPathParam],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': successResponseRef('Updated application status'), '401': errorResponses['401'], '403': errorResponses['403'], '404': errorResponses['404'] },
      },
    },
    '/extraction/sources': {
      post: {
        tags: ['AI Extraction'],
        summary: 'Submit an extraction source for AI opportunity ingestion',
        security: bearerAuth,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': successResponseRef('Extraction source ingested'), '401': errorResponses['401'], '403': errorResponses['403'], '422': errorResponses['422'] },
      },
    },
    '/extraction/drafts': {
      get: {
        tags: ['AI Extraction'],
        summary: 'List extracted opportunity drafts (paginated)',
        security: bearerAuth,
        parameters: paginationParams,
        responses: { '200': paginatedResponseRef('List of drafts'), '401': errorResponses['401'], '403': errorResponses['403'] },
      },
    },
    '/extraction/drafts/{id}': {
      get: {
        tags: ['AI Extraction'],
        summary: 'Get extraction draft by ID',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: { '200': successResponseRef('Draft details'), '401': errorResponses['401'], '404': errorResponses['404'] },
      },
      patch: {
        tags: ['AI Extraction'],
        summary: 'Update extraction draft by ID',
        security: bearerAuth,
        parameters: [idPathParam],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': successResponseRef('Updated draft'), '401': errorResponses['401'], '404': errorResponses['404'] },
      },
    },
    '/extraction/drafts/{id}/approve': {
      post: {
        tags: ['AI Extraction'],
        summary: 'Approve extraction draft and publish opportunity',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: { '200': successResponseRef('Approved draft'), '401': errorResponses['401'], '403': errorResponses['403'], '404': errorResponses['404'] },
      },
    },
    '/extraction/drafts/{id}/reject': {
      post: {
        tags: ['AI Extraction'],
        summary: 'Reject extraction draft',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: { '200': successResponseRef('Rejected draft'), '401': errorResponses['401'], '403': errorResponses['403'], '404': errorResponses['404'] },
      },
    },
    '/extraction/runs/{id}/retry': {
      post: {
        tags: ['AI Extraction'],
        summary: 'Retry failed extraction run',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: { '200': successResponseRef('Retried extraction'), '401': errorResponses['401'], '403': errorResponses['403'], '404': errorResponses['404'] },
      },
    },
    '/tests': {
      get: {
        tags: ['Preparation'],
        summary: 'List mock tests (paginated)',
        security: bearerAuth,
        parameters: paginationParams,
        responses: { '200': paginatedResponseRef('List of tests'), '401': errorResponses['401'] },
      },
      post: {
        tags: ['Preparation'],
        summary: 'Create mock test (faculty/admin)',
        security: bearerAuth,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': successResponseRef('Created test'), '401': errorResponses['401'], '403': errorResponses['403'], '422': errorResponses['422'] },
      },
    },
    '/tests/{id}': {
      get: {
        tags: ['Preparation'],
        summary: 'Get test overview by ID',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: { '200': successResponseRef('Test overview'), '401': errorResponses['401'], '404': errorResponses['404'] },
      },
    },
    '/tests/{id}/start': {
      post: {
        tags: ['Preparation'],
        summary: 'Start a test attempt',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: { '201': successResponseRef('Started test attempt'), '401': errorResponses['401'], '404': errorResponses['404'] },
      },
    },
    '/tests/{id}/submit': {
      post: {
        tags: ['Preparation'],
        summary: 'Submit answers for a test',
        security: bearerAuth,
        parameters: [idPathParam],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': successResponseRef('Submitted test result'), '401': errorResponses['401'], '404': errorResponses['404'] },
      },
    },
    '/attempts/{id}/result': {
      get: {
        tags: ['Preparation'],
        summary: 'Get test attempt result',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: { '200': successResponseRef('Attempt result'), '401': errorResponses['401'], '404': errorResponses['404'] },
      },
    },
    '/career-paths': {
      get: {
        tags: ['Career & Resources'],
        summary: 'List career paths (paginated)',
        security: bearerAuth,
        parameters: paginationParams,
        responses: { '200': paginatedResponseRef('List of career paths'), '401': errorResponses['401'] },
      },
    },
    '/roadmaps': {
      post: {
        tags: ['Career & Resources'],
        summary: 'Start a career roadmap',
        security: bearerAuth,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': successResponseRef('Started roadmap'), '401': errorResponses['401'], '422': errorResponses['422'] },
      },
    },
    '/roadmaps/{id}': {
      get: {
        tags: ['Career & Resources'],
        summary: 'Get roadmap by ID',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: { '200': successResponseRef('Roadmap details'), '401': errorResponses['401'], '404': errorResponses['404'] },
      },
    },
    '/resources': {
      get: {
        tags: ['Career & Resources'],
        summary: 'List learning resources (paginated)',
        security: bearerAuth,
        parameters: paginationParams,
        responses: { '200': paginatedResponseRef('List of resources'), '401': errorResponses['401'] },
      },
      post: {
        tags: ['Career & Resources'],
        summary: 'Create learning resource (faculty/admin)',
        security: bearerAuth,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': successResponseRef('Created resource'), '401': errorResponses['401'], '403': errorResponses['403'], '422': errorResponses['422'] },
      },
    },
    '/skill-gaps/me': {
      get: {
        tags: ['Career & Resources'],
        summary: 'Get own skill gap analyses (paginated)',
        security: bearerAuth,
        parameters: paginationParams,
        responses: { '200': paginatedResponseRef('Skill gap analyses'), '401': errorResponses['401'], '422': errorResponses['422'] },
      },
    },
    '/skill-gaps/analyze': {
      post: {
        tags: ['Career & Resources'],
        summary: 'Analyze skill gaps against target role/career path',
        security: bearerAuth,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': successResponseRef('Skill gap analysis result'), '401': errorResponses['401'], '422': errorResponses['422'] },
      },
    },
    '/notices': {
      get: {
        tags: ['Notices & Notifications'],
        summary: 'List notices (paginated)',
        security: bearerAuth,
        parameters: paginationParams,
        responses: { '200': paginatedResponseRef('List of notices'), '401': errorResponses['401'] },
      },
      post: {
        tags: ['Notices & Notifications'],
        summary: 'Create notice (faculty/admin)',
        security: bearerAuth,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': successResponseRef('Created notice'), '401': errorResponses['401'], '403': errorResponses['403'], '422': errorResponses['422'] },
      },
    },
    '/notices/{id}/publish': {
      post: {
        tags: ['Notices & Notifications'],
        summary: 'Publish a notice',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: { '200': successResponseRef('Published notice'), '401': errorResponses['401'], '403': errorResponses['403'], '404': errorResponses['404'] },
      },
    },
    '/notifications': {
      get: {
        tags: ['Notices & Notifications'],
        summary: 'List user notifications (paginated)',
        security: bearerAuth,
        parameters: paginationParams,
        responses: { '200': paginatedResponseRef('List of notifications'), '401': errorResponses['401'] },
      },
    },
    '/notifications/{id}/read': {
      patch: {
        tags: ['Notices & Notifications'],
        summary: 'Mark notification as read',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: { '200': successResponseRef('Marked as read'), '401': errorResponses['401'], '404': errorResponses['404'] },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List users (paginated, admin)',
        security: bearerAuth,
        parameters: paginationParams,
        responses: { '200': paginatedResponseRef('List of users'), '401': errorResponses['401'], '403': errorResponses['403'] },
      },
    },
    '/admin/users/{id}/status': {
      patch: {
        tags: ['Admin'],
        summary: 'Activate or deactivate a user (admin)',
        security: bearerAuth,
        parameters: [idPathParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
                  isActive: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: { '200': successResponseRef('Updated user status'), '401': errorResponses['401'], '403': errorResponses['403'], '422': errorResponses['422'] },
      },
    },
    '/admin/audit-logs': {
      get: {
        tags: ['Admin'],
        summary: 'List audit logs (paginated, admin)',
        security: bearerAuth,
        parameters: paginationParams,
        responses: { '200': paginatedResponseRef('List of audit logs'), '401': errorResponses['401'], '403': errorResponses['403'] },
      },
    },
    '/academic/departments': {
      get: { tags: ['Admin'], summary: 'List departments', responses: { '200': successResponseRef('Departments') } },
      post: { tags: ['Admin'], summary: 'Create department (admin)', security: bearerAuth, responses: { '201': successResponseRef('Created department') } },
    },
    '/academic/programs': {
      get: { tags: ['Admin'], summary: 'List programs', responses: { '200': successResponseRef('Programs') } },
      post: { tags: ['Admin'], summary: 'Create program (admin)', security: bearerAuth, responses: { '201': successResponseRef('Created program') } },
    },
    '/academic/streams': {
      get: { tags: ['Admin'], summary: 'List streams', responses: { '200': successResponseRef('Streams') } },
      post: { tags: ['Admin'], summary: 'Create stream (admin)', security: bearerAuth, responses: { '201': successResponseRef('Created stream') } },
    },
    '/academic/batches': {
      get: { tags: ['Admin'], summary: 'List batches', responses: { '200': successResponseRef('Batches') } },
      post: { tags: ['Admin'], summary: 'Create batch (admin)', security: bearerAuth, responses: { '201': successResponseRef('Created batch') } },
    },
  },
} as const;
