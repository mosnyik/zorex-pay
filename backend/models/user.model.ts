export interface userDomainDto {
  id?: string;
  firstName?: string;
  lastName?: string;
  userName?: string;
  email?: string;
  phone?: string;
  passWordHash?: string;
  kycStatus?: "unverified" | "pending" | "verified";
  createdAt?: Date;
}

export interface userPersistenceDto {
  first_name?: string;
  last_name?: string;
  user_name: string;
  email?: string;
  phone?: string;
  password_hash?: string;
  kyc_status?: "UNVERFIED" | "PENDING" | "VERIFIED";
  created_at?: Date;
}
