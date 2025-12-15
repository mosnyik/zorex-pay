import type { Request, Response } from "express";
import registerService from "../services/register.service";
import { handleHttpError } from "./error.handler";

// this would be concerned with executing the route and deligate the business logic to services
export const registerUser = async (req: Request, res: Response) => {
  try {
    const user = await registerService.register(req.body);
    return res.status(201).json({
      success: true,
      data: user,
      error: null,
    });
  } catch (err) {
    // console.log("There is an error");
    return handleHttpError(err, res);
  }
};
