import type { userDomainDto } from "../models/user.model";
import { UserRepo } from "../repository/user.repo";
import jwt from "jsonwebtoken";

const ACCESS_TOKEN_SECRET: string = "jwtPrivateKey";
// config.get("jwtPrivateKey");
const REFRESH_TOKEN_SECRET: string = "jwtRefreshTokenSecretKey";
// config.get("jwtRefreshTokenSecretKey");

const generateAccessToken = (user: userDomainDto) => {
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

const authService = {
  generateAccessToken,
  generateRefreshToken,
};

export default authService;
