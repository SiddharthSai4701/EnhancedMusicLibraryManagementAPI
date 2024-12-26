"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./config/db"));
require("reflect-metadata");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
const PORT = process.env.PORT || 3000;
db_1.default
    .sync({ alter: true }) // Automatically sync schema; use `{force: true}` in development to reset DB
    .then(() => console.log("Database connected successfully"))
    .catch((err) => console.error("Database connection failed:", err));
app.get("/", (req, res) => { res.send("Music Library API is running!"); });
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
exports.default = app;
