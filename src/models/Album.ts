import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
} from "sequelize-typescript";
import { Artist } from "./Artist";

@Table({ tableName: "albums", timestamps: false })
export class Album extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  album_id!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  name!: string;

  @Column({ type: DataType.INTEGER })
  year!: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  hidden!: boolean;

  @ForeignKey(() => Artist)
  @Column({ type: DataType.UUID })
  artist_id!: string;
}
