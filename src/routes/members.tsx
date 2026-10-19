import { createFileRoute } from "@tanstack/react-router";
import { MembersPage } from "@/components/tree/MembersPage";

export const Route = createFileRoute("/members")({
  head: () => ({
    meta: [
      { title: "সদস্য তালিকা — TreeMind" },
      {
        name: "description",
        content: "Browse your TreeMind family by generation in board, list, and grid views.",
      },
      { property: "og:title", content: "সদস্য তালিকা — TreeMind" },
      {
        property: "og:description",
        content: "Browse your TreeMind family by generation in board, list, and grid views.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MembersPage,
});
