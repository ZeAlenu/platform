import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  it("renders the ZeAlenu wordmark and Hebrew nav", () => {
    render(<SiteHeader />);
    expect(screen.getByText("זה עלינו")).toBeInTheDocument();
    expect(screen.getByText("מחקרים")).toBeInTheDocument();
    expect(screen.getByText("חוקרים")).toBeInTheDocument();
    expect(screen.getByText("אודות")).toBeInTheDocument();
  });
});
