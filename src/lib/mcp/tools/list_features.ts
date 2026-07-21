import { defineTool } from "@lovable.dev/mcp-js";

const FEATURES = [
  { title: "Smart Ingredient Search", description: "Enter ingredients you have at home and get real-time recipe suggestions from an extensive database." },
  { title: "AI Chef Assistant", description: "Personalized recipes based on your ingredients, dietary goals, and cooking style preferences." },
  { title: "Leftover Remix", description: "Transform yesterday's meals into today's inspiration with creative leftover recipe suggestions." },
  { title: "Meal Planning", description: "Plan your week with a smart calendar and never run out of meal ideas." },
  { title: "Smart Grocery Companion", description: "Auto-generates shopping lists from your pantry and meal plan, and recommends what to buy next based on health goals, habits, and upcoming needs." },
  { title: "Pantry Tracking", description: "Track expiration dates and get alerts to use ingredients before they go bad." },
];

const COMING_SOON = [
  { title: "Personalized Nutrition Engine", description: "Integrate your genetic test or nutrition profile so Fuudit personalizes ingredient and meal suggestions to your body." },
  { title: "Bio-Aware Food Suggestions", description: "Adapts to your sleep, cycle, stress, and movement data from wearables (Oura, RingConn, Apple Watch) to suggest real-time supportive meals." },
];

export default defineTool({
  name: "list_features",
  title: "List Fuudit features",
  description: "List Fuudit's current consumer features and upcoming (coming-soon) features.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [
      {
        type: "text",
        text: [
          "Available today:",
          ...FEATURES.map((f) => `- ${f.title}: ${f.description}`),
          "",
          "Coming soon:",
          ...COMING_SOON.map((f) => `- ${f.title}: ${f.description}`),
        ].join("\n"),
      },
    ],
    structuredContent: { available: FEATURES, comingSoon: COMING_SOON },
  }),
});
