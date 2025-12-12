import express from "express";
import { prisma } from "./lib/prisma";

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
  // validate using joi validate
  // hash password using bcrypt
  const { first_name, last_name, email, phone, password } = req.body;
  if (!first_name || !last_name || !email || !phone || !password)
    return res.status(400).send("Body is required");

  // add user to db
  const user = await prisma.users.create({
    data: {
      first_name,
      last_name,
      email,
      phone,
      password_hash: password,
    },
  });
  // exempt password using lodash

  res.send(`User created: ${user}`);
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
