import express from "express";
import dotenv from "dotenv";
import sequelize from "./config/db";
import "reflect-metadata";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

sequelize
  .sync({ alter: true }) // Automatically sync schema; use `{force: true}` in development to reset DB
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("Database connection failed:", err));

app.get("/", (req, res) => {res.send("Music Library API is running!")});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

export default app;
