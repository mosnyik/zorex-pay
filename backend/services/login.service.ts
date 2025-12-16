import jwt from "jsonwebtoken";
import { UserRepo } from "../repository/user.repo";
import config from "config";
import _ from "lodash";
import logger from "../logger";
import {
  userLoginSchame,
  type userLoginDto,
} from "../validators/user.login.schema";
import { LoginError } from "../errors/domain.errors";
import bcrypt from "bcrypt";
import type { userDomainDto } from "../models/user.model";

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
  UserRepo.saveToken(token, id);
  return token;
};
const login = async (payload: userLoginDto) => {
  let accessToken;
  let refreshToken;
  try {
    let loginUser = userLoginSchame.safeParse(payload);

    let user = await UserRepo.findByEmailOrPhone(
      loginUser.data?.email,
      loginUser.data?.password
    );

    if (!user) {
      logger.debug("No such user");
      throw new LoginError("Invalid email/password");
    }

    const isValidUser = await bcrypt.compare(
      payload.password,
      user?.password_hash
    );
    if (isValidUser) {
      // create jwt - access token
      accessToken = generateAccessToken(user);
      refreshToken = generateRefreshToken(user);
    }

    user = _.omit(user, ["password_hash"]);

    return {
      accessToken,
      refreshToken,
      user,
    };
  } catch (err) {
    logger.debug("There was an error", err);
    throw new LoginError("Invalid login creds");
  }
};

const loginService = {
  login,
};

export default loginService;
