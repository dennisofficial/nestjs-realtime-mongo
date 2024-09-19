export class ApiError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string, status: number, details?: any) {
    super(message, status, details);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details: any) {
    super(message, 400, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 409, details);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 503, details);
    this.name = 'ServiceUnavailableError';
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 500, details);
    this.name = 'InternalServerError';
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}
