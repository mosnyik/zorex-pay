import type { Response } from "express";
import {
  ConflictError,
  LoginError,
  RefreshTokenValidityError,
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

  logger.http({ err });
  return res.status(500).json({
    success: false,
    data: null,
    error: "Internal error",
  });
};
