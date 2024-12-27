import request from "supertest";
import app from "../../../src/index";
import { User } from "../../../src/models/User";
import { Artist } from "../../../src/models/Artist";
import { Organization } from "../../../src/models/Organization";
import { Op } from "sequelize";

describe("Artist Management", () => {
  let adminToken: string;
  let editorToken: string;
  let viewerToken: string;
  let organizationId: string;
  let testArtistId: string;

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
    await Artist.destroy({ where: {} });

    // Create test organization
    const org = await Organization.create({
      name: "Test Organization",
      description: "Test Description",
    });
    organizationId = org.organization_id;

    // Create test users
    await User.create({
      email: "admin@example.com",
      password: "$2b$10$testHashedPassword",
      role: "Admin",
      organization_id: org.organization_id,
    });

    await User.create({
      email: "editor@example.com",
      password: "$2b$10$testHashedPassword",
      role: "Editor",
      organization_id: org.organization_id,
    });

    await User.create({
      email: "viewer@example.com",
      password: "$2b$10$testHashedPassword",
      role: "Viewer",
      organization_id: org.organization_id,
    });

    // Create test artist
    const artist = await Artist.create({
      name: "Test Artist",
      grammy: true,
      hidden: false,
      organization_id: org.organization_id,
    });
    testArtistId = artist.artist_id;

    // Get tokens
    const adminLogin = await request(app).post("/login").send({
      email: "admin@example.com",
      password: "correctPassword",
    });
    adminToken = adminLogin.body.data.token;

    const editorLogin = await request(app).post("/login").send({
      email: "editor@example.com",
      password: "correctPassword",
    });
    editorToken = editorLogin.body.data.token;

    const viewerLogin = await request(app).post("/login").send({
      email: "viewer@example.com",
      password: "correctPassword",
    });
    viewerToken = viewerLogin.body.data.token;
  });

  describe("GET /artists", () => {
    it("should return all artists with default pagination", async () => {
      const response = await request(app)
        .get("/artists")
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 200,
        data: expect.arrayContaining([
          expect.objectContaining({
            artist_id: expect.any(String),
            name: expect.any(String),
            grammy: expect.any(Boolean),
            hidden: expect.any(Boolean),
          }),
        ]),
        message: "Artists retrieved successfully.",
        error: null,
      });
    });

    it("should handle pagination and filters", async () => {
      const response = await request(app)
        .get("/artists?limit=5&offset=0&grammy=true&hidden=false")
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it("should return 401 for missing token", async () => {
      const response = await request(app).get("/artists");

      expect(response.status).toBe(401);
    });
  });

  describe("GET /artists/:id", () => {
    it("should return specific artist", async () => {
      const response = await request(app)
        .get(`/artists/${testArtistId}`)
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          artist_id: testArtistId,
          name: "Test Artist",
          grammy: true,
          hidden: false,
        })
      );
    });

    it("should return 404 for non-existent artist", async () => {
      const response = await request(app)
        .get("/artists/123e4567-e89b-12d3-a456-426614174000")
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe("POST /artists/add-artist", () => {
    it("should create new artist as admin", async () => {
      const response = await request(app)
        .post("/artists/add-artist")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "New Artist",
          grammy: false,
          hidden: false,
        });

      expect(response.status).toBe(201);
    });

    it("should return 401 for unauthorized users", async () => {
      const response = await request(app)
        .post("/artists/add-artist")
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({
          name: "New Artist",
          grammy: false,
          hidden: false,
        });

      expect(response.status).toBe(401);
    });
  });

  describe("PUT /artists/:id", () => {
    it("should update artist as editor", async () => {
      const response = await request(app)
        .put(`/artists/${testArtistId}`)
        .set("Authorization", `Bearer ${editorToken}`)
        .send({
          name: "Updated Artist Name",
          grammy: true,
        });

      expect(response.status).toBe(204);
    });

    it("should return 403 for viewers", async () => {
      const response = await request(app)
        .put(`/artists/${testArtistId}`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({
          name: "Updated Artist Name",
        });

      expect(response.status).toBe(403);
    });
  });

  describe("DELETE /artists/:id", () => {
    it("should delete artist as admin", async () => {
      const response = await request(app)
        .delete(`/artists/${testArtistId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(
        "Artist:Test Artist deleted successfully."
      );
    });

    it("should return 403 for unauthorized deletion", async () => {
      const response = await request(app)
        .delete(`/artists/${testArtistId}`)
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe("Artist Workflows", () => {
    it("should handle complete artist lifecycle", async () => {
      // Create artist
      const createResponse = await request(app)
        .post("/artists/add-artist")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Lifecycle Artist",
          grammy: true,
          hidden: false,
        });
      expect(createResponse.status).toBe(201);

      const artistId = createResponse.body.data.artist_id;

      // Verify artist exists
      const getResponse = await request(app)
        .get(`/artists/${artistId}`)
        .set("Authorization", `Bearer ${viewerToken}`);
      expect(getResponse.status).toBe(200);

      // Update artist
      const updateResponse = await request(app)
        .put(`/artists/${artistId}`)
        .set("Authorization", `Bearer ${editorToken}`)
        .send({
          name: "Updated Lifecycle Artist",
        });
      expect(updateResponse.status).toBe(204);

      // Delete artist
      const deleteResponse = await request(app)
        .delete(`/artists/${artistId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(deleteResponse.status).toBe(200);
    });
  });
});
