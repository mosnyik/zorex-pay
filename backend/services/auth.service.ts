import type { Response } from "express";
import type { userDomainDto } from "../models/user.model";
import { UserRepo } from "../repository/user.repo";
import jwt from "jsonwebtoken";
import type { cookieOptions } from "../models/auth.model";
import logger from "../logger";

const ACCESS_TOKEN_SECRET: string = "jwtPrivateKey";
// config.get("jwtPrivateKey");
const REFRESH_TOKEN_SECRET: string = "jwtRefreshTokenSecretKey";
// config.get("jwtRefreshTokenSecretKey");
const MUNITE = 60 * 1000;
const HOUR = 60 * MUNITE;

const isProd = process.env.NODE_ENV === "production";

const generateAccessToken = (user: userDomainDto) => {
  logger.debug({ user });
  const { id } = user;

  return jwt.sign({ id: id }, ACCESS_TOKEN_SECRET, { expiresIn: "5m" });
};

const generateRefreshToken = (payload: userDomainDto) => {
  const { id } = payload;
  const token = jwt.sign({ id }, REFRESH_TOKEN_SECRET, { expiresIn: "24h" });
  // save token to the refresh_token table in db
  UserRepo.saveToken(token, id!);
  return token;
};

const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
};
const verifyAccessToken = (token: string) => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
};

const setCookie = (res: Response, { name, token, maxAge }: cookieOptions) => {
  // save accessToken to the cookies
  res.cookie(name, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge,
  });
};

const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  // save refresh token to the cookies
  setCookie(res, {
    name: "refreshToken",
    token: refreshToken!,
    maxAge: 24 * HOUR,
  });
};
const setAccessTokenCookie = (res: Response, accessToken: string) => {
  // save accessToken to the cookies
  setCookie(res, {
    name: "accessToken",
    token: accessToken!,
    maxAge: 5 * MUNITE,
  });
};

const authService = {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
  setAccessTokenCookie,
  verifyRefreshToken,
  verifyAccessToken,
};

export default authService;
