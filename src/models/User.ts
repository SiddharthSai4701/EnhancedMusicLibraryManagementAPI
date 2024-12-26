import { Table, Column, Model, DataType } from "sequelize-typescript";

@Table({ tableName: "users", timestamps: false })
export class User extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  user_id!: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  email!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  password!: string;

  @Column({
    type: DataType.ENUM("Admin", "Editor", "Viewer"),
    allowNull: false,
  })
  role!: "Admin" | "Editor" | "Viewer";
}
