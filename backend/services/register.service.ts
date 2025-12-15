import { userSchame, type userInputDto } from "../validators/user.schema";
import { fromZodError } from "zod-validation-error";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import _ from "lodash";
import { UserRepo } from "../repository/user.repo";
import { ConflictError, ValidationError } from "../errors/domain.errors";
import type { userPersistenceDto } from "../infrastructure/models";

// this is the worker, he executes the work like business logic

const register = async (payload: userInputDto) => {
  let hashed_password;
  // validate using zod validate
  const { success, error } = userSchame.safeParse(payload);
  if (!success) {
    // make a validation error
    const errMsg = fromZodError(error).message;
    console.log({ errMsg });
    throw new ValidationError("Invalid user");
  }

  const { email, phone, password } = payload;

  // check if user exists in db
  const alreadyReg = await prisma.users.findFirst({
    where: { OR: [{ email }, { phone }] },
  });

  if (alreadyReg)
    // add conflict error
    throw new ConflictError("User already registered");

  const salt = await bcrypt.genSalt(12);
  hashed_password = await bcrypt.hash(password, salt);

  let userPayload: userPersistenceDto = {
    ...payload,
    hashed_password: hashed_password,
  };

  const cleanPayload = _.omit(userPayload, ["password"]) as userPersistenceDto;
  const user = await UserRepo.create(cleanPayload);

  return user;
};

const registerService = {
  register,
};

export default registerService;
