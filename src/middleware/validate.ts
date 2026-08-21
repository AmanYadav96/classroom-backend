import type { NextFunction, Request, Response } from "express";
import { z, ZodError, type ZodTypeAny } from "zod";

// Avoid Express type incompatibilities with Zod parsed types by casting req fields.
// We only use the parsed values for subsequent runtime logic.



type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

const formatZodError = (err: ZodError) =>
  err.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
  }));

export const validateQuery = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const details = formatZodError(result.error);
      const body: ErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details,
        },
      };
      return res.status(400).json(body);
    }
    (req as any).query = result.data;

    return next();
  };
};

export const validateParams = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const details = formatZodError(result.error);
      const body: ErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid route parameters",
          details,
        },
      };
      return res.status(400).json(body);
    }
    (req as any).params = result.data;

    return next();
  };
};

export const validateBody = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = formatZodError(result.error);
      const body: ErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details,
        },
      };
      return res.status(400).json(body);
    }
    (req as any).body = result.data;

    return next();
  };
};

// Small helper schemas you may re-use in routes
export const paginationSchema = z.object({
  page: z
    .preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().min(1).optional())
    .optional(),
  limit: z
    .preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().min(1).max(100).optional())
    .optional(),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

