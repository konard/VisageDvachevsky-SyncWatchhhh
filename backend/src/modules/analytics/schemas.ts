/**
 * Analytics API request/response schemas
 */

import { Type } from '@sinclair/typebox';

/**
 * Track event request schema
 */
export const TrackEventSchema = Type.Object({
  sessionId: Type.String({ minLength: 1 }),
  userId: Type.Optional(Type.String()),
  roomId: Type.Optional(Type.String()),
  eventName: Type.String({ minLength: 1 }),
  category: Type.Union([
    Type.Literal('session'),
    Type.Literal('sync'),
    Type.Literal('voice'),
    Type.Literal('chat'),
    Type.Literal('funnel'),
  ]),
  properties: Type.Optional(Type.Record(Type.String(), Type.Any())),
  userAgent: Type.Optional(Type.String()),
  platform: Type.Optional(Type.String()),
});

/**
 * Batch track events request schema
 */
export const BatchTrackEventsSchema = Type.Object({
  events: Type.Array(TrackEventSchema, { minItems: 1, maxItems: 100 }),
});

/**
 * Date range query schema
 */
export const DateRangeQuerySchema = Type.Object({
  startDate: Type.Optional(Type.String({ format: 'date-time' })),
  endDate: Type.Optional(Type.String({ format: 'date-time' })),
});

/**
 * Get events query schema
 */
export const GetEventsQuerySchema = Type.Object({
  sessionId: Type.Optional(Type.String()),
  roomId: Type.Optional(Type.String()),
  userId: Type.Optional(Type.String()),
  category: Type.Optional(Type.Union([
    Type.Literal('session'),
    Type.Literal('sync'),
    Type.Literal('voice'),
    Type.Literal('chat'),
    Type.Literal('funnel'),
  ])),
  startDate: Type.Optional(Type.String({ format: 'date-time' })),
  endDate: Type.Optional(Type.String({ format: 'date-time' })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 1000 })),
});

/**
 * Export logs query schema
 */
export const ExportLogsQuerySchema = Type.Object({
  roomId: Type.String({ minLength: 1 }),
  startDate: Type.Optional(Type.String({ format: 'date-time' })),
  endDate: Type.Optional(Type.String({ format: 'date-time' })),
  format: Type.Optional(Type.Union([
    Type.Literal('json'),
    Type.Literal('csv'),
  ])),
});
