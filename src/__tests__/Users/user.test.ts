import request from "supertest";
import app from "../../../src/index";
import { User } from "../../../src/models/User";
import { Organization } from "../../../src/models/Organization";
import { Op } from "sequelize";

describe("User Management", () => {
  let adminToken: string;
  let organizationId: string;

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
  });

  describe("Authentication", () => {
    describe("Signup", () => {
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
      });

      it("should validate organization name during first signup", async () => {
        const response = await request(app).post("/signup").send({
          email: "admin@example.com",
          password: "securePassword123",
        });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain("organization_name");
      });

      it("should reject signup with existing email", async () => {
        await request(app).post("/signup").send({
          email: "test@example.com",
          password: "password123",
          organization_name: "Test Org",
        });

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
    });

    describe("Login", () => {
      beforeEach(async () => {
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
      });

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

      it("should reject invalid email", async () => {
        const response = await request(app).post("/login").send({
          email: "nonexistent@example.com",
          password: "anyPassword",
        });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("User not found.");
      });

      it("should require email field", async () => {
        const response = await request(app).post("/login").send({
          password: "password123",
        });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain("email");
      });
    });

    describe("Logout", () => {
      beforeEach(async () => {
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

        const loginResponse = await request(app).post("/login").send({
          email: "test@example.com",
          password: "correctPassword",
        });
        adminToken = loginResponse.body.data.token;
      });

      it("should successfully logout user", async () => {
        const response = await request(app)
          .get("/logout")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          status: 200,
          data: null,
          message: "User logged out successfully.",
          error: null,
        });
      });

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

  describe("User Management", () => {
    describe("GET /users", () => {
      it("should return all users for admin with default pagination", async () => {
        const response = await request(app)
          .get("/users")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          status: 200,
          data: expect.arrayContaining([
            expect.objectContaining({
              user_id: expect.any(String),
              email: expect.any(String),
              role: expect.any(String),
              created_at: expect.any(String),
            }),
          ]),
          message: "Users retrieved successfully.",
          error: null,
        });
      });

      it("should handle pagination parameters", async () => {
        const response = await request(app)
          .get("/users?limit=5&offset=0&role=Editor")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBeLessThanOrEqual(5);
      });

      it("should return 401 for unauthorized access", async () => {
        const response = await request(app).get("/users");

        expect(response.status).toBe(401);
      });
    });

    describe("POST /users/add-user", () => {
      it("should allow admin to create new user", async () => {
        const response = await request(app)
          .post("/users/add-user")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            email: "newuser@example.com",
            password: "password123",
            role: "Editor",
          });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe("User created successfully.");
      });

      it("should prevent creating admin users", async () => {
        const response = await request(app)
          .post("/users/add-user")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            email: "newadmin@example.com",
            password: "password123",
            role: "Admin",
          });

        expect(response.status).toBe(403);
      });

      it("should return 409 for existing email", async () => {
        const response = await request(app)
          .post("/users/add-user")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            email: "test@example.com",
            password: "password123",
            role: "Editor",
          });

        expect(response.status).toBe(409);
      });
    });

    describe("PUT /users/update-password", () => {
      it("should update user password", async () => {
        const response = await request(app)
          .put("/users/update-password")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            old_password: "correctPassword",
            new_password: "newPassword123",
          });

        expect(response.status).toBe(204);
      });

      it("should reject incorrect old password", async () => {
        const response = await request(app)
          .put("/users/update-password")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            old_password: "wrongPassword",
            new_password: "newPassword123",
          });

        expect(response.status).toBe(403);
      });
    });

    describe("DELETE /users/:id", () => {
      let testUserId: string;

      beforeEach(async () => {
        const user = await User.create({
          email: "todelete@example.com",
          password: "$2b$10$testHashedPassword",
          role: "Editor",
          organization_id: organizationId!,
        });
        testUserId = user.user_id;
      });

      it("should allow admin to delete user", async () => {
        const response = await request(app)
          .delete(`/users/${testUserId}`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("User deleted successfully.");
      });

      it("should return 404 for non-existent user", async () => {
        const response = await request(app)
          .delete("/users/123e4567-e89b-12d3-a456-426614174000")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(404);
      });
    });
  });
});
