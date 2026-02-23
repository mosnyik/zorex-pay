import type { Response } from "express";
import {
  ConflictError,
  ForbiddenError,
  InsufficientBalanceError,
  LoginError,
  NotFoundError,
  RefreshTokenValidityError,
  UnauthorizedError,
  ValidationError,
} from "../errors/domain.errors";
import logger from "../logger";

export const handleHttpError = (err: unknown, res: Response) => {
  if (err instanceof ValidationError) {
    logger.http({ err });
    return res.status(400).json({
      success: false,
      data: null,
      error: err.message,
    });
  }

  if (err instanceof ConflictError) {
    logger.http({ err });
    return res.status(409).json({
      success: false,
      data: null,
      error: err.message,
    });
  }

  if (err instanceof LoginError) {
    logger.http({ err });
    return res.status(400).json({
      success: false,
      data: null,
      error: err.message,
    });
  }

  if (err instanceof RefreshTokenValidityError) {
    logger.http({ err });
    return res.status(400).json({
      success: false,
      data: null,
      error: err.message,
    });
  }

  if (err instanceof NotFoundError) {
    logger.http({ err });
    return res.status(404).json({
      success: false,
      data: null,
      error: err.message,
    });
  }

  if (err instanceof UnauthorizedError) {
    logger.http({ err });
    return res.status(401).json({
      success: false,
      data: null,
      error: err.message,
    });
  }

  if (err instanceof ForbiddenError) {
    logger.http({ err });
    return res.status(403).json({
      success: false,
      data: null,
      error: err.message,
    });
  }

  if (err instanceof InsufficientBalanceError) {
    logger.http({ err });
    return res.status(400).json({
      success: false,
      data: null,
      error: err.message,
    });
  }

  logger.error("Unhandled error", { err });
  return res.status(500).json({
    success: false,
    data: null,
    error: "Internal server error",
  });
};
