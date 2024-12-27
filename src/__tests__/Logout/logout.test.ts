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
    it("should logout user with valid token", async () => {
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

    it("should invalidate token after logout", async () => {
      // First logout
      await request(app)
        .get("/logout")
        .set("Authorization", `Bearer ${authToken}`);

      // Try using same token
      const response = await request(app)
        .get("/artists")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe("Authentication Validation", () => {
    it("should reject request without token", async () => {
      const response = await request(app).get("/logout");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Unauthorized Access");
    });

    it("should reject request with invalid token", async () => {
      const response = await request(app)
        .get("/logout")
        .set("Authorization", "Bearer invalid_token");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid token");
    });

    it("should reject request with malformed authorization header", async () => {
      const response = await request(app)
        .get("/logout")
        .set("Authorization", "InvalidFormat Token");

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Bad Request");
    });
  });

  describe("Multiple Devices", () => {
    it("should handle logout from multiple sessions", async () => {
      // Login from another device
      const secondLoginResponse = await request(app).post("/login").send({
        email: "test@example.com",
        password: "correctPassword",
      });

      const secondToken = secondLoginResponse.body.data.token;

      // Logout from first device
      await request(app)
        .get("/logout")
        .set("Authorization", `Bearer ${authToken}`);

      // Second token should still be valid
      const response = await request(app)
        .get("/artists")
        .set("Authorization", `Bearer ${secondToken}`);

      expect(response.status).toBe(200);
    });
  });
});
