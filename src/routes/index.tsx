import { createFileRoute } from "@tanstack/react-router";
import { SolarSimulation } from "@/components/SolarSimulation";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Tandem Cell Lab — Silicon × Perovskite" },
      { name: "description", content: "Explore a layered silicon–perovskite solar cell, follow electrons and holes, and connect a selectable external circuit." },
      { property: "og:title", content: "Tandem Cell Lab — Interactive Solar Simulation" },
      { property: "og:description", content: "Experiment with light, temperature, carrier recombination and external loads in an interactive 3D solar lab." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SolarSimulation,
});
