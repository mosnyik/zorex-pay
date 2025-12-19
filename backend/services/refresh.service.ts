import logger from "../logger";
import type { userDomainDto } from "../models/user.model";
import { RefreshRepo } from "../repository/refresh.repo";
import { UserRepo } from "../repository/user.repo";
import authService from "./auth.service";

type RefreshTokenShape = {
  id: string;
  user_id: string;
  token: string;
  is_revoked: boolean;
  created_at: Date;
  expires_at: Date;
  replaced_by_token: string | null;
};

const refresh = async (token: string) => {
  let accessToken;
  let refreshToken;

  const fetchedRefreshToken: RefreshTokenShape | null =
    await RefreshRepo.fetchRefreshToken(token);

  const user = await UserRepo.findById(fetchedRefreshToken?.user_id);

  if (fetchedRefreshToken?.is_revoked) {
    logger.debug("This token is revoked");
    return { accessToken, refreshToken };
  }
  // logger.debug({ user });

  // throw new AuthError("")

  accessToken = authService.generateAccessToken(user!);
  refreshToken = authService.generateRefreshToken(user!);

  RefreshRepo.inValidateRefreshToken(fetchedRefreshToken?.id!, refreshToken);

  return {
    accessToken,
    refreshToken,
  };
};
const refreshService = {
  refresh,
};

export default refreshService;
