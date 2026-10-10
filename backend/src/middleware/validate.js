import { badRequest } from '../utils/AppError.js';

/**
 * Validates req[source] with a Zod schema and replaces it with the parsed value.
 * (Express 5 makes req.query a getter, so parsed queries go to req.validatedQuery.)
 */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(badRequest('Validation failed', details));
  }
  if (source === 'query') req.validatedQuery = result.data;
  else req[source] = result.data;
  next();
};
