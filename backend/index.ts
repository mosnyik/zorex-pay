import error from "./middleware/errors";
import express from "express";
import register from "./routes/route.register";
import login from "./routes/route.login";
import logger from "./logger";
import cors from "cors";

const app = express();

app.use(express.json());
app.use("/api/register", register);
app.use("/api/login", login);

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(error);

const PORT = process.env.PORT || 5500;

app.listen(PORT, () => logger.info(`Server running on port ${PORT}...`));
