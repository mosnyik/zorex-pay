const express = require("express");
const route = express();

route.post("/", (req, res) => {
  res.send("from auth route");
});

module.exports = route;
