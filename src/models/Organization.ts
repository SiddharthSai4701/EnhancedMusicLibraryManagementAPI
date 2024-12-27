import { Table, Column, Model, DataType, HasMany } from "sequelize-typescript";
import { User } from "./User";
import { Artist } from "./Artist";
import { Album } from "./Album";
import { Favorite } from "./Favourite";
import { Track } from "./Track";

@Table({ tableName: "organizations", timestamps: false })
export class Organization extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  organization_id!: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  name!: string;

  @Column({ type: DataType.STRING })
  description!: string;

  @Column({ type: DataType.UUID, unique: true })
  admin_id!: string;

  @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
  created_at!: Date;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  active!: boolean;

  @HasMany(() => User)
  users!: User[];

  @HasMany(() => Artist)
  artists!: Artist[];

  @HasMany(() => Album)
  albums!: Album[];

  @HasMany(() => Track)
  tracks!: Track[];

  @HasMany(() => Favorite)
  favorites!: Favorite[];
}
