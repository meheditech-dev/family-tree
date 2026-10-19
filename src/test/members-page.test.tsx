import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MembersPage } from "@/components/tree/MembersPage";
import { getState, normalizeRelations, setState } from "@/lib/tree/store";
import { makeSeed } from "@/lib/tree/seed";

vi.mock("@/components/tree/ExportMenu", () => ({
  ExportMenu: ({ onClose }: { onClose: () => void }) => <button onClick={onClose}>Close export</button>,
}));

const initial = getState();

beforeEach(() => {
  setState(() => ({
    members: normalizeRelations(makeSeed()),
    settings: { ...initial.settings, language: "en" },
    ui: { ...initial.ui },
  }), false);
});

afterEach(() => {
  cleanup();
  setState(() => initial, false);
});

describe("members page", () => {
  it("opens the board with every member and correct generation counts", () => {
    const { container } = render(<MembersPage />);
    expect(screen.getByRole("button", { name: "Board", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelectorAll("[data-member-id]")).toHaveLength(23);
    expect(within(screen.getByRole("region", { name: "3rd Generation" })).getByText("13", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Showing 23 of 23 members")).toBeInTheDocument();
  });

  it("filters living members without renumbering generations and clears filters", () => {
    render(<MembersPage />);
    fireEvent.click(screen.getByRole("button", { name: "Living only" }));
    expect(screen.queryByText("আব্দুল করিম")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "1st Generation" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "2nd Generation" })).toBeInTheDocument();
    expect(screen.getByText("Showing 21 of 23 members")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "All members" }));
    expect(screen.getByText("আব্দুল করিম")).toBeInTheDocument();
  });

  it("combines gender and relation filters and recovers from no matches", () => {
    const { container } = render(<MembersPage />);
    fireEvent.change(screen.getByRole("combobox", { name: "Gender" }), { target: { value: "female" } });
    const women = getState().members.filter((member) => member.gender === "female");
    expect(container.querySelectorAll("[data-member-id]")).toHaveLength(women.length);
    fireEvent.change(screen.getByRole("combobox", { name: "Relation type" }), { target: { value: "son" } });
    expect(screen.getByText("No members match these filters")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(container.querySelectorAll("[data-member-id]")).toHaveLength(23);
  });

  it("preserves filters across board, grid and sortable list views", () => {
    const { container } = render(<MembersPage />);
    fireEvent.change(screen.getByRole("combobox", { name: "Relation type" }), { target: { value: "son" } });
    fireEvent.click(screen.getByRole("button", { name: "Grid", exact: true }));
    expect(container.querySelectorAll("[data-member-id]")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "List", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Birth year", exact: true }));
    expect(container.querySelectorAll("[data-member-id]")[0]).toHaveAttribute("data-member-id", "m3");
    fireEvent.click(screen.getByRole("button", { name: "Birth year", exact: true }));
    expect(container.querySelectorAll("[data-member-id]")[0]).toHaveAttribute("data-member-id", "m5");
    fireEvent.click(screen.getByRole("button", { name: "Board", exact: true }));
    expect(container.querySelectorAll("[data-member-id]")).toHaveLength(2);
  });

  it("opens the existing profile and add-member actions", () => {
    render(<MembersPage />);
    fireEvent.click(screen.getByRole("button", { name: /আব্দুল করিম/ }));
    expect(getState().ui.detailsId).toBe("m1");
    fireEvent.click(screen.getByRole("button", { name: "Add member" }));
    expect(getState().ui.modal).toEqual({ mode: "add", relation: "root" });
    fireEvent.click(screen.getByRole("button", { name: "Export", exact: true }));
    expect(screen.getByRole("button", { name: "Export", exact: true })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Close export" }));
    expect(screen.getByRole("button", { name: "Export", exact: true })).toHaveAttribute("aria-expanded", "false");
  });

  it("renders an empty tree without loading sample data", () => {
    setState(() => ({ members: [] }), false);
    render(<MembersPage />);
    expect(screen.getByText("No one has been added yet")).toBeInTheDocument();
    expect(screen.getByText("Showing 0 of 0 members")).toBeInTheDocument();
    expect(getState().members).toHaveLength(0);
  });

  it("localizes view labels, counts and generations in Bengali", () => {
    render(<MembersPage />);
    act(() => setState((state) => ({ settings: { ...state.settings, language: "bn" } }), false));
    expect(screen.getByRole("button", { name: "বোর্ড", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "৩য় প্রজন্ম" })).toBeInTheDocument();
    expect(screen.getByText("২৩ জনের মধ্যে ২৩ জন দেখানো হচ্ছে")).toBeInTheDocument();
  });
});
