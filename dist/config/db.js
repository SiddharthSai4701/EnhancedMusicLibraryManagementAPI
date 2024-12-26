"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_typescript_1 = require("sequelize-typescript");
const User_1 = require("../models/User");
const Artist_1 = require("../models/Artist");
const Album_1 = require("../models/Album");
const Track_1 = require("../models/Track");
const Favourite_1 = require("../models/Favourite");
const sequelize = new sequelize_typescript_1.Sequelize({
    dialect: "postgres",
    host: process.env.DATABASE_HOST || "localhost",
    database: process.env.DATABASE_NAME || "music_library",
    username: process.env.DATABASE_USER || "user",
    password: process.env.DATABASE_PASSWORD || "password",
    models: [User_1.User, Artist_1.Artist, Album_1.Album, Track_1.Track, Favourite_1.Favorite], // Ensure all models are listed here
    logging: false,
});
exports.default = sequelize;
