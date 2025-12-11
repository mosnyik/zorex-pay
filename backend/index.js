const express = require("express");

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

app.post("/api/register", (req, res) => {
  
  // validate using joi validate
  if (!req.body) return res.status(400).send("Body is required");
  // hash password using bcrypt
  const { name, email, phone, password } = req.body;

  // exempt password using lodash

  const user = { id: Date.now(), name, email, phone };
  users.push(user);

  res.send("User created", user);
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
