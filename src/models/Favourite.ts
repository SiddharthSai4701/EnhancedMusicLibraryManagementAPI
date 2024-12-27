import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
import { Organization } from "./Organization";
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

  @ForeignKey(() => Organization)
  @Column({ type: DataType.UUID, allowNull: false })
  organization_id!: string;

  @BelongsTo(() => Organization)
  organization!: Organization;
}
