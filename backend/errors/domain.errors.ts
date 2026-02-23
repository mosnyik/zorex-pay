// Domain Errors - safe to expose messages to clients

export class ConflictError extends Error {
  constructor(message: string = "Resource already exists") {
    super(message);
    this.name = "ConflictError";
  }
}

export class ValidationError extends Error {
  constructor(message: string = "Validation failed") {
    super(message);
    this.name = "ValidationError";
  }
}

export class LoginError extends Error {
  constructor(message: string = "Invalid credentials") {
    super(message);
    this.name = "LoginError";
  }
}

export class RefreshTokenValidityError extends Error {
  constructor(message: string = "Invalid or expired refresh token") {
    super(message);
    this.name = "RefreshTokenValidityError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = "Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class InsufficientBalanceError extends Error {
  constructor(message: string = "Insufficient balance") {
    super(message);
    this.name = "InsufficientBalanceError";
  }
}