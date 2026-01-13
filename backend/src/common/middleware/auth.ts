import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../utils/jwt.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      email: string;
      username: string;
    };
  }
}

export async function authenticateUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authorization = request.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header',
    });
  }

  const token = authorization.slice(7);
  const payload = verifyAccessToken(token);

  if (!payload) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired access token',
    });
  }

  request.user = payload;
}
