import { createFileRoute } from "@tanstack/react-router";
import { FamilyPage } from "@/components/tree/FamilyPage";

export const Route = createFileRoute("/family")({
  head: () => ({
    meta: [
      { title: "TreeMind — ফ্যামিলি" },
      {
        name: "description",
        content: "View a summary of your family members, their relationships, and descendants.",
      },
      { property: "og:title", content: "TreeMind — ফ্যামিলি" },
      {
        property: "og:description",
        content: "View a summary of your family members, their relationships, and descendants.",
      },
    ],
  }),
  component: FamilyPage,
});
