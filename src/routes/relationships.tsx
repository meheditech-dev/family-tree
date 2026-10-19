import { createFileRoute } from "@tanstack/react-router";
import { RelationshipsPage } from "@/components/tree/RelationshipsPage";

export const Route = createFileRoute("/relationships")({
  head: () => ({
    meta: [
      { title: "সম্পর্ক — TreeMind" },
      {
        name: "description",
        content: "Couples and parent–child relationships in your TreeMind family tree.",
      },
      { property: "og:title", content: "সম্পর্ক — TreeMind" },
      {
        property: "og:description",
        content: "Couples and parent–child relationships in your TreeMind family tree.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RelationshipsPage,
});
