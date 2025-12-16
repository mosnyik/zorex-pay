import type { Request, Response } from "express";
import { handleHttpError } from "./error.handler";
import loginService from "../services/login.service";
import logger from "../logger";
import authService from "../services/auth.service";

export const loginUser = async (req: Request, res: Response) => {
  try {
    // log user in
    const {
      accessToken,
      refreshToken,
      cleanUser: user,
    } = await loginService.login(req.body);

    // save accessToken to the cookies
    authService.setAccessTokenCookie(res, accessToken!);

    // save refresh token to the cookies
    authService.setRefreshTokenCookie(res, refreshToken!);

    logger.debug("Saved cookies to header");
    return res.status(200).json({
      success: true,
      data: user,
      error: null,
    });
  } catch (err) {
    handleHttpError(err, res);
  }
};
