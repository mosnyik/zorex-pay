import express from "express";
import { prisma } from "./lib/prisma";
import z from "zod";
import { fromZodError } from "zod-validation-error";
import bcrypt from "bcrypt";

const app = express();

app.use(express.json());

// register

// login

// refresh token

// logout

// revoke refresh

const users = [];

app.get("/api/refresh-token", (req, res) => {
  res.send("We are live");
});

app.post("/api/register", async (req, res) => {
  const userSchame = z.object({
    first_name: z
      .string()
      .min(3, "First Name must be atleast 3 characters")
      .max(50, "First Name must not be more than 50 characters"),
    last_name: z
      .string()
      .min(3, "Last Name must be atleast 3 characters")
      .max(50, "Last Name must not be more than 50 characters"),
    email: z.email("Please provide a valid email"),
    phone: z
      .string()
      .min(7, "Please provide a valid phone number")
      .max(14, "Please provide a valid phone number"),
    password: z
      .string()
      .min(8, "Please provide a strong password")
      .max(50, "You have to make the password reasonable"),
  });
  let hashed_password;

  // validate using zod validate
  const { success, error } = await userSchame.safeParse(req.body);
  if (!success) {
    const errMsg = fromZodError(error).message;
    console.log({ errMsg });
    return res.status(400).send({
      success: false,
      data: null,
      error: "Invalid request body",
    });
  }

  const { first_name, last_name, email, phone, password } = req.body;

  // check if user exists in db
  const alreadyReg = await prisma.users.findFirst({
    where: { OR: [{ email }, { phone }] },
  });

  if (alreadyReg)
    return res
      .status(409)
      .json({ success: false, data: null, error: "User already registered" });
  try {
    const salt = await bcrypt.genSalt(12);
    hashed_password = await bcrypt.hash(password, salt);
  } catch (err) {
    console.error("Password hashing failed:", err);
    return res.status(500).json({
      success: false,
      data: null,
      error: "We have an internal error saving user",
    });
  }
  // exempt password using lodash

  // add user to db
  let user;
  try {
    user = await prisma.users.create({
      data: {
        first_name,
        last_name,
        email,
        phone,
        password_hash: hashed_password,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      data: null,
      error: "An internal error occured",
    });
  }

  res.json({ success: true, data: user, error: null });
});

app.post("/api/login", (req, res) => {
  res.send("Login endpoint");
});

app.post("/api/logout", (req, res) => {
  res.send("Login endpoint");
});

app.post("/api/revoke-token", (req, res) => {
  res.send("Login endpoint");
});

const PORT = process.env.PORT || 5500;

app.listen(PORT, () => console.log(`Server running on port ${PORT}...`));
