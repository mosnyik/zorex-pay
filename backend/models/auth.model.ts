import { datetime } from "zod/v4/core/regexes.cjs";

export interface cookieOptions {
  name: string;
  token: string;
  maxAge: number;
}

interface refreshTokenPersistenceDto {
  user_id: String;
  token: String;
  is_revoked: Boolean;
  created_at: Date;
  expires_at: Date;
  replaced_by_token: String;
}
