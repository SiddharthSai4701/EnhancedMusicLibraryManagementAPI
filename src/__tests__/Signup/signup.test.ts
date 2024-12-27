import request from "supertest";
import app from "../../../src/index";
import { User } from "../../../src/models/User";
import { Organization } from "../../../src/models/Organization";
import { Op } from "sequelize";

describe("Signup Route Tests", () => {
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
  });

  describe("First User Signup (Admin)", () => {
    it("should create first user as Admin with new organization", async () => {
      const response = await request(app).post("/signup").send({
        email: "admin@example.com",
        password: "securePassword123",
        organization_name: "Test Organization",
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        status: 201,
        data: null,
        message: "User created successfully.",
        error: null,
      });

      const user = await User.findOne({
        where: { email: "admin@example.com" },
      });
      expect(user?.role).toBe("Admin");

      const org = await Organization.findOne({
        where: { name: "Test Organization" },
      });
      expect(org).toBeTruthy();
      expect(org?.admin_id).toBe(user?.user_id);
    });

    it("should validate organization name during first signup", async () => {
      const response = await request(app).post("/signup").send({
        email: "admin@example.com",
        password: "securePassword123",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("organization_name");
    });
  });

  describe("Regular User Signup Validation", () => {
    it("should reject signup with existing email", async () => {
      // First create a user
      await request(app).post("/signup").send({
        email: "test@example.com",
        password: "password123",
        organization_name: "Test Org",
      });

      // Try to create another user with same email
      const response = await request(app).post("/signup").send({
        email: "test@example.com",
        password: "differentPassword",
      });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe("Email already exists.");
    });

    it("should validate email format", async () => {
      const response = await request(app).post("/signup").send({
        email: "invalid-email",
        password: "password123",
        organization_name: "Test Org",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("valid email");
    });

    it("should validate password strength", async () => {
      const response = await request(app).post("/signup").send({
        email: "valid@example.com",
        password: "123",
        organization_name: "Test Org",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("password");
    });
  });

  describe("Request Body Validation", () => {
    it("should require email field", async () => {
      const response = await request(app).post("/signup").send({
        password: "password123",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("email");
    });

    it("should require password field", async () => {
      const response = await request(app).post("/signup").send({
        email: "test@example.com",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("password");
    });
  });

  describe("Organization Association", () => {
    it("should associate user with existing organization", async () => {
      // First create admin user and organization
      await request(app).post("/signup").send({
        email: "admin@org.com",
        password: "adminPass123",
        organization_name: "Existing Org",
      });

      const org = await Organization.findOne({
        where: { name: "Existing Org" },
      });

      // Create regular user in same organization
      const response = await request(app).post("/signup").send({
        email: "user@org.com",
        password: "userPass123",
        organization_id: org?.organization_id,
      });

      expect(response.status).toBe(201);

      const user = await User.findOne({ where: { email: "user@org.com" } });
      expect(user?.organization_id).toBe(org?.organization_id);
      expect(user?.role).toBe("Viewer");
    });

    it("should validate organization existence", async () => {
      const response = await request(app).post("/signup").send({
        email: "user@example.com",
        password: "password123",
        organization_id: "123e4567-e89b-12d3-a456-426614174000",
      });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain("Organization not found");
    });
  });
});
