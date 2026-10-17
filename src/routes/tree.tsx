import { createFileRoute } from "@tanstack/react-router";
import { TreePage } from "@/components/tree/TreePage";

export const Route = createFileRoute("/tree")({
  head: () => ({
    meta: [
      { title: "TreeMind — বংশবৃক্ষ" },
      { name: "description", content: "Explore and design your family tree in Bangla or English with TreeMind." },
      { property: "og:title", content: "TreeMind — বংশবৃক্ষ" },
      { property: "og:description", content: "Explore and design your family tree in Bangla or English with TreeMind." },
    ],
  }),
  component: TreePage,
});
