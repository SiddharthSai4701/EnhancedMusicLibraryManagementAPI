import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
} from "sequelize-typescript";
import { Artist } from "./Artist";
import { Album } from "./Album";

@Table({ tableName: "tracks", timestamps: false })
export class Track extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  track_id!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  name!: string;

  @Column({ type: DataType.INTEGER })
  duration!: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  hidden!: boolean;

  @ForeignKey(() => Artist)
  @Column({ type: DataType.UUID })
  artist_id!: string;

  @ForeignKey(() => Album)
  @Column({ type: DataType.UUID })
  album_id!: string;
}
