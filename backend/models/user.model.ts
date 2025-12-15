export interface userDomainDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passWordHash: string;
  kycStatus?: "unverified" | "pending" | "verified";
  createdAt?: Date;
}
