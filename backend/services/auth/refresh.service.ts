import { ValidationError } from "../../errors/domain.errors";
import logger from "../../logger";
import { RefreshRepo } from "../../repository/refresh.repo";
import { UserRepo } from "../../repository/user.repo";
import authService from "./auth.service";

export type RefreshTokenShape = {
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
    throw new ValidationError("Invalid token");
  }

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
