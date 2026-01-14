import { FastifyInstance } from 'fastify';
import { performReadinessChecks } from './service.js';

export async function healthRoutes(app: FastifyInstance) {
  /**
   * GET /health/live
   * Kubernetes liveness probe - returns 200 if process is running
   * Lightweight check, should be fast
   */
  app.get('/health/live', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  });

  /**
   * GET /health/ready
   * Kubernetes readiness probe - returns 200 only if service can accept traffic
   * Checks all critical dependencies
   */
  app.get('/health/ready', async (_request, reply) => {
    const result = await performReadinessChecks();

    const statusCode = result.status === 'ok' ? 200 : 503;
    return reply.code(statusCode).send(result);
  });
}
