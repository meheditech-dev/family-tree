import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/tree/HomePage";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "TreeMind — Home" },
      {
        name: "description",
        content:
          "Start your family tree journey with TreeMind — add members, design your tree, and explore connections.",
      },
      { property: "og:title", content: "TreeMind — Home" },
      {
        property: "og:description",
        content: "Start your family tree journey with TreeMind.",
      },
    ],
  }),
  component: HomePage,
});
