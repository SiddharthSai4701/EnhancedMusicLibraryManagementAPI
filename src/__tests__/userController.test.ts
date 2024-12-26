import request from "supertest";
import app from "../../src/index"; // Ensure app is exported from `index.ts`

describe("User API Tests", () => {
  it("should return a welcome message", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toBe("Music Library API is running!");
  });
});
