import type { NextFunction, Request, Response } from "express";
import { decode, verify } from "jsonwebtoken";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.get("authorization");

  if (!authHeader) {
    return res.status(400).json({ message: "Bad request" });
  }

  const [type, token] = authHeader.split(" ");

  if (type !== "authorization" || !token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = verify(token, process.env.JWT_SECRET!);


    (req as any).user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
