import express from "express";
import request from "supertest";
import { v1Router } from "../../../routes/v1";

describe("x402 removal", () => {
  it("does not expose the v1 x402 search route", async () => {
    const app = express();
    app.use(express.json());
    app.use("/v1", v1Router);

    const response = await request(app)
      .post("/v1/x402/search")
      .send({ query: "firecrawl" });

    expect(response.statusCode).toBe(404);
  });
});
