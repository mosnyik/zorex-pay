import type { NextFunction, Request, Response } from "express";
import authService from "../services/auth/auth.service";
import type { JwtPayload } from "jsonwebtoken";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { id: string; role?: string };
    }
  }
}

/**
 * Middleware to verify JWT access token from cookies
 * Attaches decoded user payload to req.user
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      data: null,
      error: "Authentication required",
    });
  }

  try {
    const decoded = authService.verifyAccessToken(token) as JwtPayload & { id: string };
    req.user = decoded;
    next();
  } catch (err: any) {
    // Check if token expired vs invalid
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        data: null,
        error: "Token expired",
        code: "TOKEN_EXPIRED",
      });
    }

    return res.status(401).json({
      success: false,
      data: null,
      error: "Invalid token",
    });
  }
}

/**
 * Middleware to check user role
 * Must be used after requireAuth
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "Authentication required",
      });
    }

    const userRole = req.user.role || "USER";

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        data: null,
        error: "Insufficient permissions",
      });
    }

    next();
  };
}
