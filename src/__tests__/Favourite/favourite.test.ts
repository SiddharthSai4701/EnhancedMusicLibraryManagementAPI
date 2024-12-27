import request from "supertest";
import app from "../../../src/index";
import { User } from "../../../src/models/User";
import { Artist } from "../../../src/models/Artist";
import { Album } from "../../../src/models/Album";
import { Track } from "../../../src/models/Track";
import { Favorite } from "../../../src/models/Favourite";
import { Organization } from "../../../src/models/Organization";
import { Op } from "sequelize";

describe("Favorites Management", () => {
  let userToken: string;
  let userId: string;
  let organizationId: string;
  let testArtistId: string;
  let testAlbumId: string;
  let testTrackId: string;
  let testFavoriteId: string;

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
    await Favorite.destroy({ where: {} });

    // Create test organization
    const org = await Organization.create({
      name: "Test Organization",
      description: "Test Description",
    });
    organizationId = org.organization_id;

    // Create test user
    const user = await User.create({
      email: "user@example.com",
      password: "$2b$10$testHashedPassword",
      role: "Viewer",
      organization_id: org.organization_id,
    });
    userId = user.user_id;

    // Create test artist, album, and track
    const artist = await Artist.create({
      name: "Test Artist",
      grammy: true,
      hidden: false,
      organization_id: org.organization_id,
    });
    testArtistId = artist.artist_id;

    const album = await Album.create({
      name: "Test Album",
      year: 2023,
      hidden: false,
      artist_id: testArtistId,
      organization_id: org.organization_id,
    });
    testAlbumId = album.album_id;

    const track = await Track.create({
      name: "Test Track",
      duration: 180,
      hidden: false,
      artist_id: testArtistId,
      album_id: testAlbumId,
      organization_id: org.organization_id,
    });
    testTrackId = track.track_id;

    // Create test favorite
    const favorite = await Favorite.create({
      user_id: userId,
      category: "artist",
      item_id: testArtistId,
      organization_id: org.organization_id,
    });
    testFavoriteId = favorite.favorite_id;

    // Get token
    const loginResponse = await request(app).post("/login").send({
      email: "user@example.com",
      password: "correctPassword",
    });
    userToken = loginResponse.body.data.token;
  });

  describe("GET /favorites/:category", () => {
    it("should return user's favorites by category", async () => {
      const response = await request(app)
        .get("/favorites/artist")
        .set("Authorization", `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 200,
        data: expect.arrayContaining([
          expect.objectContaining({
            favorite_id: expect.any(String),
            category: "artist",
            item_id: testArtistId,
            name: "Test Artist",
            created_at: expect.any(String),
          }),
        ]),
        message: "Favorites retrieved successfully.",
        error: null,
      });
    });

    it("should handle pagination", async () => {
      const response = await request(app)
        .get("/favorites/artist?limit=5&offset=0")
        .set("Authorization", `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it("should return 400 for invalid category", async () => {
      const response = await request(app)
        .get("/favorites/invalid")
        .set("Authorization", `Bearer ${userToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe("POST /favorites/add-favorite", () => {
    it("should add album to favorites", async () => {
      const response = await request(app)
        .post("/favorites/add-favorite")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          category: "album",
          item_id: testAlbumId,
        });

      expect(response.status).toBe(201);
    });

    it("should return 404 for non-existent item", async () => {
      const response = await request(app)
        .post("/favorites/add-favorite")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          category: "track",
          item_id: "123e4567-e89b-12d3-a456-426614174000",
        });

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /favorites/remove-favorite/:id", () => {
    it("should remove item from favorites", async () => {
      const response = await request(app)
        .delete(`/favorites/remove-favorite/${testFavoriteId}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Favorite removed successfully.");
    });

    it("should return 404 for non-existent favorite", async () => {
      const response = await request(app)
        .delete(
          "/favorites/remove-favorite/123e4567-e89b-12d3-a456-426614174000"
        )
        .set("Authorization", `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe("Favorite Workflows", () => {
    it("should handle complete favorite lifecycle", async () => {
      // Add to favorites
      const addResponse = await request(app)
        .post("/favorites/add-favorite")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          category: "track",
          item_id: testTrackId,
        });
      expect(addResponse.status).toBe(201);

      const favoriteId = addResponse.body.data.favorite_id;

      // Verify favorite exists
      const getResponse = await request(app)
        .get("/favorites/track")
        .set("Authorization", `Bearer ${userToken}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            item_id: testTrackId,
          }),
        ])
      );

      // Remove from favorites
      const deleteResponse = await request(app)
        .delete(`/favorites/remove-favorite/${favoriteId}`)
        .set("Authorization", `Bearer ${userToken}`);
      expect(deleteResponse.status).toBe(200);
    });
  });
});
