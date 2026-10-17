import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/tree/HomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TreeMind — হোম" },
      { name: "description", content: "Start your family tree journey with TreeMind." },
      { property: "og:title", content: "TreeMind — হোম" },
      { property: "og:description", content: "Start your family tree journey with TreeMind." },
    ],
  }),
  component: HomePage,
});
