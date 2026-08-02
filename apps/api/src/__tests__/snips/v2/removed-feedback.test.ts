import request from "supertest";
import { TEST_API_URL } from "../lib";

describe("Removed feedback endpoints", () => {
  it.each([
    "/v2/feedback",
    "/v2/search/00000000-0000-7000-8000-000000000000/feedback",
  ])("does not expose POST %s", async path => {
    const response = await request(TEST_API_URL).post(path).send({});

    expect(response.statusCode).toBe(404);
  });
});
