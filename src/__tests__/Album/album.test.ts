import request from "supertest";
import app from "../../../src/index";
import { User } from "../../../src/models/User";
import { Artist } from "../../../src/models/Artist";
import { Album } from "../../../src/models/Album";
import { Organization } from "../../../src/models/Organization";
import { Op } from "sequelize";

describe("Album Management", () => {
  let adminToken: string;
  let editorToken: string;
  let viewerToken: string;
  let organizationId: string;
  let testArtistId: string;
  let testAlbumId: string;

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
    await Album.destroy({ where: {} });

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

    // Create test album
    const album = await Album.create({
      name: "Test Album",
      year: 2023,
      hidden: false,
      artist_id: testArtistId,
      organization_id: org.organization_id,
    });
    testAlbumId = album.album_id;

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

  describe("GET /albums", () => {
    it("should return all albums with default pagination", async () => {
      const response = await request(app)
        .get("/albums")
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 200,
        data: expect.arrayContaining([
          expect.objectContaining({
            album_id: expect.any(String),
            artist_name: expect.any(String),
            name: expect.any(String),
            year: expect.any(Number),
            hidden: expect.any(Boolean),
          }),
        ]),
        message: "Albums retrieved successfully.",
        error: null,
      });
    });

    it("should handle pagination and filters", async () => {
      const response = await request(app)
        .get(
          "/albums?limit=5&offset=0&artist_id=" + testArtistId + "&hidden=false"
        )
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it("should return 401 for missing token", async () => {
      const response = await request(app).get("/albums");

      expect(response.status).toBe(401);
    });
  });

  describe("GET /albums/:id", () => {
    it("should return specific album", async () => {
      const response = await request(app)
        .get(`/albums/${testAlbumId}`)
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          album_id: testAlbumId,
          artist_name: "Test Artist",
          name: "Test Album",
          year: 2023,
          hidden: false,
        })
      );
    });

    it("should return 404 for non-existent album", async () => {
      const response = await request(app)
        .get("/albums/123e4567-e89b-12d3-a456-426614174000")
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe("POST /albums/add-album", () => {
    it("should create new album as admin", async () => {
      const response = await request(app)
        .post("/albums/add-album")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          artist_id: testArtistId,
          name: "New Album",
          year: 2024,
          hidden: false,
        });

      expect(response.status).toBe(201);
    });

    it("should return 404 for non-existent artist", async () => {
      const response = await request(app)
        .post("/albums/add-album")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          artist_id: "123e4567-e89b-12d3-a456-426614174000",
          name: "New Album",
          year: 2024,
          hidden: false,
        });

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /albums/:id", () => {
    it("should update album as editor", async () => {
      const response = await request(app)
        .put(`/albums/${testAlbumId}`)
        .set("Authorization", `Bearer ${editorToken}`)
        .send({
          name: "Updated Album Name",
          year: 2025,
        });

      expect(response.status).toBe(204);
    });

    it("should return 403 for viewers", async () => {
      const response = await request(app)
        .put(`/albums/${testAlbumId}`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({
          name: "Updated Album Name",
        });

      expect(response.status).toBe(403);
    });
  });

  describe("DELETE /albums/:id", () => {
    it("should delete album as admin", async () => {
      const response = await request(app)
        .delete(`/albums/${testAlbumId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(
        "Album:Test Album deleted successfully."
      );
    });

    it("should return 403 for unauthorized deletion", async () => {
      const response = await request(app)
        .delete(`/albums/${testAlbumId}`)
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe("Album Workflows", () => {
    it("should handle complete album lifecycle", async () => {
      // Create album
      const createResponse = await request(app)
        .post("/albums/add-album")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          artist_id: testArtistId,
          name: "Lifecycle Album",
          year: 2024,
          hidden: false,
        });
      expect(createResponse.status).toBe(201);

      const albumId = createResponse.body.data.album_id;

      // Verify album exists
      const getResponse = await request(app)
        .get(`/albums/${albumId}`)
        .set("Authorization", `Bearer ${viewerToken}`);
      expect(getResponse.status).toBe(200);

      // Update album
      const updateResponse = await request(app)
        .put(`/albums/${albumId}`)
        .set("Authorization", `Bearer ${editorToken}`)
        .send({
          name: "Updated Lifecycle Album",
        });
      expect(updateResponse.status).toBe(204);

      // Delete album
      const deleteResponse = await request(app)
        .delete(`/albums/${albumId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(deleteResponse.status).toBe(200);
    });
  });
});
