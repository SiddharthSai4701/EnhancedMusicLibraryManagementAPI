import { Sequelize } from "sequelize-typescript";
import { User } from "../models/User";
import { Artist } from "../models/Artist";
import { Album } from "../models/Album";
import { Track } from "../models/Track";
import { Favorite } from "../models/Favourite";

const sequelize = new Sequelize({
  dialect: "postgres",
  host: process.env.DATABASE_HOST || "localhost",
  database: process.env.DATABASE_NAME || "music_library",
  username: process.env.DATABASE_USER || "user",
  password: process.env.DATABASE_PASSWORD || "password",
  models: [User, Artist, Album, Track, Favorite], // Ensure all models are listed here
  logging: false,
});

export default sequelize;
