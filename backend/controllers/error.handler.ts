import type { Response } from "express";
import { ConflictError, ValidationError } from "../errors/domain.errors";

export const handleHttpError = (err: unknown, res: Response) => {
  if (err instanceof ValidationError) {
    console.log({ err });
    return res.status(400).json({
      success: false,
      data: null,
      error: err.message,
    });
  }

  if (err instanceof ConflictError) {
    console.log({ err });
    return res.status(409).json({
      success: false,
      data: null,
      error: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    data: null,
    error: "Internal error",
  });
};
