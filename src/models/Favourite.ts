import { Table, Column, Model, DataType } from "sequelize-typescript";

@Table({ tableName: "favorites", timestamps: false })
export class Favorite extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  favorite_id!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  category!: "artist" | "album" | "track";

  @Column({ type: DataType.UUID, allowNull: false })
  item_id!: string;
}
