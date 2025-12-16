import type { Request, Response } from "express";
import authService from "../services/auth.service";
import refreshService from "../services/refresh.service";
import { handleHttpError } from "./error.handler";

const refreshUserToken = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.refreshToken;

    authService.verifyRefreshToken(token);

    const { accessToken, refreshToken } = await refreshService.refresh(token);

    // set new accessToken in cookies
    authService.setAccessTokenCookie(res, accessToken!);
    // set new refreshToken in cookies
    authService.setRefreshTokenCookie(res, refreshToken!);

    res.status(200).json({
      success: true,
      data: {}, // the new access token and new refresh token
      error: null,
    });
  } catch (err) {
    handleHttpError(err, res);
  }
};

export default refreshUserToken;
