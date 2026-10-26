import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DetailsDrawer } from "@/components/tree/DetailsDrawer";
import { getState, normalizeRelations, setState } from "@/lib/tree/store";
import { makeSeed } from "@/lib/tree/seed";
import type { Member } from "@/lib/tree/types";

const initial = getState();

const family: Member[] = [
  { id: "father", name: "Father", gender: "male", birthYear: 1950 },
  { id: "mother", name: "Mother", gender: "female", birthYear: 1952, spouseIds: ["father"] },
  {
    id: "eldest",
    name: "Eldest son",
    gender: "male",
    birthYear: 1975,
    parentIds: ["father", "mother"],
  },
  {
    id: "middle",
    name: "Middle daughter",
    gender: "female",
    birthYear: 1980,
    parentIds: ["father", "mother"],
  },
  {
    id: "youngest",
    name: "Youngest son",
    gender: "male",
    birthYear: 1985,
    parentIds: ["father", "mother"],
  },
];

beforeEach(() => {
  setState(
    () => ({
      members: normalizeRelations(family),
      settings: { ...initial.settings, language: "en" },
      ui: { ...initial.ui, detailsId: "middle" },
    }),
    false,
  );
});

afterEach(() => {
  cleanup();
  setState(() => initial, false);
});

describe("details drawer birth order", () => {
  it("shows the member's own place in the sibling group", () => {
    render(<DetailsDrawer />);
    expect(screen.getByText("Birth order")).toBeInTheDocument();
    expect(screen.getByText("2nd daughter")).toBeInTheDocument();
  });

  it("lists every sibling oldest first with their relative age", () => {
    const { container } = render(<DetailsDrawer />);
    const list = container.querySelector<HTMLElement>("[data-sibling-order]")!;
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Eldest son");
    expect(items[0]).toHaveTextContent("Elder brother");
    expect(items[0]).toHaveTextContent("Eldest son");
    expect(items[1]).toHaveTextContent("Youngest son");
    expect(items[1]).toHaveTextContent("Younger brother");
  });

  it("localizes the birth-order labels in Bengali", () => {
    setState((state) => ({ settings: { ...state.settings, language: "bn" } }), false);
    render(<DetailsDrawer />);
    expect(screen.getByText("জন্ম ক্রম")).toBeInTheDocument();
    expect(screen.getByText("২য় মেয়ে")).toBeInTheDocument();
  });

  it("shows no sibling order for a member without parents", () => {
    setState((state) => ({ ui: { ...state.ui, detailsId: "father" } }), false);
    const { container } = render(<DetailsDrawer />);
    expect(container.querySelector("[data-sibling-order]")).toBeNull();
  });

  it("renders without siblings for a single-child family", () => {
    setState(
      () => ({
        members: normalizeRelations([
          { id: "p", name: "Parent", gender: "male" },
          { id: "c", name: "Solo", gender: "female", birthYear: 2000, parentIds: ["p"] },
        ]),
        ui: { ...initial.ui, detailsId: "c" },
      }),
      false,
    );
    render(<DetailsDrawer />);
    expect(screen.getByText("Only child")).toBeInTheDocument();
    expect(screen.getByText("No siblings")).toBeInTheDocument();
  });

  it("keeps the seed family working", () => {
    setState(
      () => ({
        members: normalizeRelations(makeSeed()),
        ui: { ...initial.ui, detailsId: "m8" },
      }),
      false,
    );
    render(<DetailsDrawer />);
    expect(screen.getByText("2nd son")).toBeInTheDocument();
  });
});
