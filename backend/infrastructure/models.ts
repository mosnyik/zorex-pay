export interface userPersistenceDto {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  hashed_password: string;
  kycStatus?: "unverified" | "pending" | "verified";
  createdAt?: Date;
}
