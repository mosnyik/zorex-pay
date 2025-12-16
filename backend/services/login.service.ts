import bcrypt from "bcrypt";
import _ from "lodash";
import { LoginError } from "../errors/domain.errors";
import logger from "../logger";
import { UserRepo } from "../repository/user.repo";
import {
  userLoginSchame,
  type userLoginDto,
} from "../validators/user.login.schema";
import authService from "./auth.service";

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
      accessToken = authService.generateAccessToken(user);

      // create jwt - refresh token
      refreshToken = authService.generateRefreshToken(user);
    }

   let cleanUser = _.omit(user, ["password_hash"]);

    return {
      accessToken,
      refreshToken,
      cleanUser,
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
