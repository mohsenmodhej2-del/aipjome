export class DomainError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function normalizeError(error: unknown) {
  return error instanceof DomainError
    ? error
    : new DomainError(500, 'خطای غیرمنتظره رخ داد.');
}
