import type { Request, Response } from "express";
import { handleHttpError } from "./error.handler";
import loginService from "../services/login.service";
import logger from "../logger";

export const loginUser = async (req: Request, res: Response) => {
  const isProd = process.env.NODE_ENV === "production";
  try {
    // log user in
    const { accessToken, refreshToken, user } = await loginService.login(
      req.body
    );

    // save accessToken to the cookies
    res.cookie("x-auth-accessToken", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 86400000,
    });

    // save refresh token to the cookies
    res.cookie("x-auth-refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: 86400000,
    });

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
