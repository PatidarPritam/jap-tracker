import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jap Tracker",
    short_name: "Jap Tracker",
    description:
      "Track your daily jap and sankalp progress — count malas, keep your streak, and stay steady in sadhana.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff8f1",
    theme_color: "#e87d1e",
    categories: ["lifestyle", "health"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
