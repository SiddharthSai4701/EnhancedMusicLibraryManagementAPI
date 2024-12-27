import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
import { Organization } from "./Organization";
@Table({ tableName: "artists", timestamps: false })
export class Artist extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  artist_id!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  name!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  grammy!: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  hidden!: boolean;

  @ForeignKey(() => Organization)
  @Column({ type: DataType.UUID, allowNull: false })
  organization_id!: string;

  @BelongsTo(() => Organization)
  organization!: Organization;
}
