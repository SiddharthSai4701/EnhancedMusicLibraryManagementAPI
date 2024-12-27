import request from "supertest";
import app from "../../../src/index";
import { User } from "../../../src/models/User";
import { Organization } from "../../../src/models/Organization";
import { Op } from "sequelize";

describe("Logout Route Tests", () => {
  let authToken: string;

  beforeEach(async () => {
    const testOrg = await Organization.findOne({
      where: { name: "Test Organization" },
    });
    await User.destroy({
      where: {
        organization_id: {
          [Op.in]: testOrg ? [testOrg.organization_id] : [],
        },
      },
    });
    await Organization.destroy({ where: { name: "Test Organization" } });

    // Create test organization and user
    const org = await Organization.create({
      name: "Test Organization",
      description: "Test Description",
    });

    await User.create({
      email: "test@example.com",
      password: "$2b$10$testHashedPassword",
      role: "Admin",
      organization_id: org.organization_id,
    });

    // Login to get auth token
    const loginResponse = await request(app).post("/login").send({
      email: "test@example.com",
      password: "correctPassword",
    });

    authToken = loginResponse.body.data.token;
  });

  describe("Successful Logout", () => {
    it("should successfully logout user", async () => {
      const response = await request(app)
        .get("/logout")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 200,
        data: null,
        message: "User logged out successfully.",
        error: null,
      });
    });
  });

  describe("Error Scenarios", () => {
    it("should return 400 for invalid request format", async () => {
      const response = await request(app)
        .get("/logout")
        .set("Authorization", "InvalidTokenFormat");

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        status: 400,
        data: null,
        message: "Bad Request",
        error: null,
      });
    });
  });
});
