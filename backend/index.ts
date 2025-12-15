import error from "./middleware/errors";
import express from "express";
import register from "./routes/route.register";
import logger from "./logger";

const app = express();

app.use(express.json());
app.use("/api/register", register);

app.use(error);

const PORT = process.env.PORT || 5500;

app.listen(PORT, () => logger.info(`Server running on port ${PORT}...`));
