import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import App from "../App";

describe("TalkHire App Smoke Test", () => {
  it("renders Landing Page without crashing", () => {
    render(<App />);
    expect(screen.getByText(/Master High-Stakes Tech Interviews/i)).toBeDefined();
    expect(screen.getAllByText(/Services & Features/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Founder/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Aravind/i).length).toBeGreaterThan(0);
  });
});
