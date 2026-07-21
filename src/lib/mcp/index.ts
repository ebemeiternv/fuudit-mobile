import { defineMcp } from "@lovable.dev/mcp-js";
import getAppInfo from "./tools/get_app_info";
import listFeatures from "./tools/list_features";
import listBusinessOfferings from "./tools/list_business_offerings";
import { listArticlesTool, getArticleTool } from "./tools/articles";

export default defineMcp({
  name: "fuudit-mcp",
  title: "Fuudit",
  version: "0.1.0",
  instructions:
    "Public MCP server for Fuudit — a playful, AI-powered kitchen assistant that helps people reduce food waste, plan meals, and get recipes from what's in their pantry. Use these tools to answer questions about Fuudit's product, its B2B offerings, and its published articles.",
  tools: [getAppInfo, listFeatures, listBusinessOfferings, listArticlesTool, getArticleTool],
});
