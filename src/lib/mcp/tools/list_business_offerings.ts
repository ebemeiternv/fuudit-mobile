import { defineTool } from "@lovable.dev/mcp-js";

const OFFERINGS = [
  {
    segment: "Restaurants & Catering",
    pitch: "Cut food waste and boost margins with AI-powered menu & stock optimization.",
    features: [
      "Real-time AI-powered inventory & waste tracking",
      "Menu optimization based on available stock",
      "Dynamic pricing suggestions to move soon-to-expire stock",
      "Staff-facing AI assistant for recipe and portion adjustments",
    ],
  },
  {
    segment: "Grocery Retail",
    pitch: "Engage customers with smart expiry alerts, recipe tie-ins, and sustainable stock flow.",
    features: [
      "Smart expiry alerts to move short-dated stock",
      "Recipe tie-ins that turn inventory into inspiration",
      "Sustainable stock flow guidance",
    ],
  },
  {
    segment: "Corporate Wellbeing",
    pitch: "Bring smarter, healthier, waste-free food to your workplace.",
    features: [
      "Personalized meal recommendations for employees",
      "Waste-aware canteen and catering planning",
      "Wellbeing-focused nutrition programs",
    ],
  },
  {
    segment: "Smart Tech Partners",
    pitch: "Turn every kitchen device into a food-waste-fighting assistant.",
    features: [
      "API/SDK for smart fridges, ovens, and kitchen appliances",
      "Recipe & inventory intelligence for connected devices",
    ],
  },
  {
    segment: "Hospitality & Multi-Location Chains",
    pitch: "Optimize food operations across all outlets with centralized AI-driven insights.",
    features: [
      "Unified inventory dashboards across all locations",
      "Predictive ordering to reduce overstocking",
      "Insights on usage patterns, costs, and waste reduction ROI",
    ],
  },
];

export default defineTool({
  name: "list_business_offerings",
  title: "List Fuudit for Businesses offerings",
  description: "List Fuudit's B2B segments (restaurants, retail, corporate wellbeing, smart tech, hospitality chains) with their pitches and feature highlights.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [
      {
        type: "text",
        text: OFFERINGS.map(
          (o) => `## ${o.segment}\n${o.pitch}\n${o.features.map((f) => `- ${f}`).join("\n")}`,
        ).join("\n\n") + "\n\nContact: hello@fuudit.com",
      },
    ],
    structuredContent: { offerings: OFFERINGS, contactEmail: "hello@fuudit.com" },
  }),
});
