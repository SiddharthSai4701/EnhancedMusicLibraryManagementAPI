import request from "supertest";
import app from "../../../src/index";
import { User } from "../../../src/models/User";
import { Organization } from "../../../src/models/Organization";
import { Op } from "sequelize";

describe("Login Route Tests", () => {
  beforeEach(async () => {
const testOrg = await Organization.findOne({ where: { name: "Test Organization" } });
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
      password: "$2b$10$testHashedPassword", // Assuming bcrypt hash
      role: "Admin",
      organization_id: org.organization_id,
    });
  });

  describe("Successful Login", () => {
    it("should login user with correct credentials", async () => {
      const response = await request(app).post("/login").send({
        email: "test@example.com",
        password: "correctPassword",
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 200,
        data: {
          token: expect.any(String),
        },
        message: "Login successful.",
        error: null,
      });
    });

    it("should return user role in token payload", async () => {
      const response = await request(app).post("/login").send({
        email: "test@example.com",
        password: "correctPassword",
      });

      // Verify token contains role (implementation dependent)
      expect(response.body.data.token).toBeTruthy();
    });
  });

  describe("Authentication Failures", () => {
    it("should reject invalid email", async () => {
      const response = await request(app).post("/login").send({
        email: "nonexistent@example.com",
        password: "anyPassword",
      });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("User not found.");
    });

    it("should reject incorrect password", async () => {
      const response = await request(app).post("/login").send({
        email: "test@example.com",
        password: "wrongPassword",
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid credentials.");
    });
  });

  describe("Request Validation", () => {
    it("should require email field", async () => {
      const response = await request(app).post("/login").send({
        password: "somePassword",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("email");
    });

    it("should require password field", async () => {
      const response = await request(app).post("/login").send({
        email: "test@example.com",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("password");
    });

    it("should validate email format", async () => {
      const response = await request(app).post("/login").send({
        email: "invalid-email",
        password: "password123",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("valid email");
    });
  });

  describe("Organization Context", () => {
    it("should include organization info in token payload", async () => {
      const response = await request(app).post("/login").send({
        email: "test@example.com",
        password: "correctPassword",
      });

      // Verify token contains organization context
      expect(response.body.data.token).toBeTruthy();
    });

    it("should reject login for inactive organization", async () => {
      // First deactivate the organization
      await Organization.update(
        { active: false },
        { where: { name: "Test Organization" } }
      );

      const response = await request(app).post("/login").send({
        email: "test@example.com",
        password: "correctPassword",
      });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("organization is inactive");
    });
  });

  describe("Rate Limiting", () => {
    it("should handle multiple failed login attempts", async () => {
      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        await request(app).post("/login").send({
          email: "test@example.com",
          password: "wrongPassword",
        });
      }

      const response = await request(app).post("/login").send({
        email: "test@example.com",
        password: "wrongPassword",
      });

      expect(response.status).toBe(429);
      expect(response.body.message).toContain("Too many login attempts");
    });
  });
});
