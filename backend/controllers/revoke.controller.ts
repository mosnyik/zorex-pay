import type { Request, Response } from "express";
import { RefreshTokenValidityError } from "../errors/domain.errors";
import authService from "../services/auth.service";
import RevokeService from "../services/revoke.service";
import { handleHttpError } from "./error.handler";

export const revokeUser = async (req: Request, res: Response) => {
  try {
    const token_to_revoke = req.cookies.refreshToken;
    try {
      authService.verifyRefreshToken(token_to_revoke);
    } catch (err) {
      throw new RefreshTokenValidityError("Invalid token");
    }

    // invalidate the refresh token
    RevokeService.revoke(token_to_revoke);

    res.status(200).json({
      success: true,
      data: {},
      error: null,
    });
  } catch (err) {
    handleHttpError(err, res);
  }
};
