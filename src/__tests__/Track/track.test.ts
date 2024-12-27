import request from "supertest";
import app from "../../../src/index";
import { User } from "../../../src/models/User";
import { Artist } from "../../../src/models/Artist";
import { Album } from "../../../src/models/Album";
import { Track } from "../../../src/models/Track";
import { Organization } from "../../../src/models/Organization";
import { Op } from "sequelize";

describe("Track Management", () => {
  let adminToken: string;
  let editorToken: string;
  let viewerToken: string;
  let organizationId: string;
  let testArtistId: string;
  let testAlbumId: string;
  let testTrackId: string;

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
    await Track.destroy({ where: {} });

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

    // Create test track
    const track = await Track.create({
      name: "Test Track",
      duration: 180,
      hidden: false,
      artist_id: testArtistId,
      album_id: testAlbumId,
      organization_id: org.organization_id,
    });
    testTrackId = track.track_id;

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

  describe("GET /tracks", () => {
    it("should return all tracks with default pagination", async () => {
      const response = await request(app)
        .get("/tracks")
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 200,
        data: expect.arrayContaining([
          expect.objectContaining({
            track_id: expect.any(String),
            artist_name: expect.any(String),
            album_name: expect.any(String),
            name: expect.any(String),
            duration: expect.any(Number),
            hidden: expect.any(Boolean),
          }),
        ]),
        message: "Tracks retrieved successfully.",
        error: null,
      });
    });

    it("should handle pagination and filters", async () => {
      const response = await request(app)
        .get(
          `/tracks?limit=5&offset=0&artist_id=${testArtistId}&album_id=${testAlbumId}&hidden=false`
        )
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it("should return 401 for missing token", async () => {
      const response = await request(app).get("/tracks");

      expect(response.status).toBe(401);
    });
  });

  describe("GET /tracks/:id", () => {
    it("should return specific track", async () => {
      const response = await request(app)
        .get(`/tracks/${testTrackId}`)
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          track_id: testTrackId,
          artist_name: "Test Artist",
          album_name: "Test Album",
          name: "Test Track",
          duration: 180,
          hidden: false,
        })
      );
    });

    it("should return 404 for non-existent track", async () => {
      const response = await request(app)
        .get("/tracks/123e4567-e89b-12d3-a456-426614174000")
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe("POST /tracks/add-track", () => {
    it("should create new track as admin", async () => {
      const response = await request(app)
        .post("/tracks/add-track")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          artist_id: testArtistId,
          album_id: testAlbumId,
          name: "New Track",
          duration: 240,
          hidden: false,
        });

      expect(response.status).toBe(201);
    });

    it("should return 404 for non-existent artist", async () => {
      const response = await request(app)
        .post("/tracks/add-track")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          artist_id: "123e4567-e89b-12d3-a456-426614174000",
          album_id: testAlbumId,
          name: "New Track",
          duration: 240,
          hidden: false,
        });

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /tracks/:id", () => {
    it("should update track as editor", async () => {
      const response = await request(app)
        .put(`/tracks/${testTrackId}`)
        .set("Authorization", `Bearer ${editorToken}`)
        .send({
          name: "Updated Track Name",
          duration: 200,
        });

      expect(response.status).toBe(204);
    });

    it("should return 403 for viewers", async () => {
      const response = await request(app)
        .put(`/tracks/${testTrackId}`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({
          name: "Updated Track Name",
        });

      expect(response.status).toBe(403);
    });
  });

  describe("DELETE /tracks/:id", () => {
    it("should delete track as admin", async () => {
      const response = await request(app)
        .delete(`/tracks/${testTrackId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(
        "Track:Test Track deleted successfully."
      );
    });

    it("should return 403 for unauthorized deletion", async () => {
      const response = await request(app)
        .delete(`/tracks/${testTrackId}`)
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe("Track Workflows", () => {
    it("should handle complete track lifecycle", async () => {
      // Create track
      const createResponse = await request(app)
        .post("/tracks/add-track")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          artist_id: testArtistId,
          album_id: testAlbumId,
          name: "Lifecycle Track",
          duration: 300,
          hidden: false,
        });
      expect(createResponse.status).toBe(201);

      const trackId = createResponse.body.data.track_id;

      // Verify track exists
      const getResponse = await request(app)
        .get(`/tracks/${trackId}`)
        .set("Authorization", `Bearer ${viewerToken}`);
      expect(getResponse.status).toBe(200);

      // Update track
      const updateResponse = await request(app)
        .put(`/tracks/${trackId}`)
        .set("Authorization", `Bearer ${editorToken}`)
        .send({
          name: "Updated Lifecycle Track",
        });
      expect(updateResponse.status).toBe(204);

      // Delete track
      const deleteResponse = await request(app)
        .delete(`/tracks/${trackId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(deleteResponse.status).toBe(200);
    });
  });
});
