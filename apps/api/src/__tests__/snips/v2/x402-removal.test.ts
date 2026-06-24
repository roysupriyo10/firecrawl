import express from "express";
import request from "supertest";
import { v2Router } from "../../../routes/v2";

describe("x402 removal", () => {
  it("does not expose the v2 x402 search route", async () => {
    const app = express();
    app.use(express.json());
    app.use("/v2", v2Router);

    const response = await request(app)
      .post("/v2/x402/search")
      .send({ query: "firecrawl" });

    expect(response.statusCode).toBe(404);
  });
});
