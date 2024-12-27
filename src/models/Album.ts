import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { Artist } from "./Artist";
import { Organization } from "./Organization";

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

  @ForeignKey(() => Organization)
  @Column({ type: DataType.UUID, allowNull: false })
  organization_id!: string;

  @BelongsTo(() => Organization)
  organization!: Organization;
}
