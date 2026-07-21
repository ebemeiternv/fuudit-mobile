import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "get_app_info",
  title: "Get app info",
  description: "Return a high-level description of Fuudit — what it is, who it's for, and where to try it.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [
      {
        type: "text",
        text: [
          "Fuudit — your playful and smart kitchen assistant.",
          "Tagline: From pantry to plate — no waste, just taste.",
          "",
          "Fuudit helps home cooks reduce food waste, plan meals, track their pantry, and get AI-powered recipe inspiration based on what they already have at home. A B2B offering (Fuudit for Businesses) covers restaurants & catering, grocery retail, corporate wellbeing, smart tech partners, and hospitality / multi-location chains.",
          "",
          "Discover the MVP: https://www.fuudit.com",
          "Waiting list / signup: https://signup.fuudit.com",
        ].join("\n"),
      },
    ],
    structuredContent: {
      name: "Fuudit",
      tagline: "From pantry to plate — no waste, just taste.",
      mvpUrl: "https://www.fuudit.com",
      signupUrl: "https://signup.fuudit.com",
      businessContact: "hello@fuudit.com",
    },
  }),
});
