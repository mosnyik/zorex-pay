import type { NextFunction, Request, RequestHandler, Response } from "express";

export default (handler: RequestHandler) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (ex) {
      next(ex);
    }
  };
};
