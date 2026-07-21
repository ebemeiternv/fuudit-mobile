import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const ARTICLES = [
  {
    slug: "future-of-food-waste-smart-tech",
    title: "The Future of Food Waste: How Smart Tech is Redefining How We Eat",
    author: "Ebe Meitern-Vare",
    date: "2025-11-05",
    excerpt:
      "Nearly one-third of food produced globally is wasted. Discover how AI and smart tech — including Fuudit — are turning that around.",
    url: "https://fuudit.lovable.app/articles/future-of-food-waste-smart-tech",
    content: `Nearly one-third of all food produced globally never gets eaten. Behind that statistic lies more than waste — it represents lost energy, water, time, and opportunity. Food waste is not only a household inconvenience; it's a social, environmental, and economic challenge that affects every corner of the planet.

But the good news is that change is already happening. It's powered by technology, design, and the collective willingness to make small yet meaningful shifts in how we live and eat.

At Fuudit, we believe that sustainability should feel simple — not like an extra task on your to-do list. Our AI-driven food waste companion helps people track what they have at home, use ingredients smartly, and rediscover the joy of cooking sustainably.

## From Awareness to Intelligent Action

Recent years have brought a wave of innovation in food technology — Too Good To Go, OLIO, Lifesum, and others. Most tools address only one part of the problem: redistribution, calorie tracking, or meal inspiration. Fuudit takes a full-circle approach — expiration tracking, AI-based recipe suggestions, leftover remixing, and smart shopping reminders — in one intuitive Scandinavian-inspired interface.

## Insights from the Fuudit Community

Users want to reduce food waste but struggle with planning, overbuying, and knowing what to cook next. Vegetables and chicken are the most-wasted ingredients. The top motivators for change are cooking inspiration, better use of leftovers, picture recognition / fridge scanning, smart meal planning, and time savings.

## The Next Wave of Food Tech

Pantries will sync with grocery platforms for predictive shopping. Smart fridges will notify users about expiring items. Wearables (Oura, RingConn, Apple Watch) will personalize meal suggestions by mood, sleep, or hormonal balance. Fuudit's modular AI-powered architecture is designed to integrate with smart appliances, health data, and retailers.

## A Simpler, More Sustainable Future

Food waste is about how we plan, connect with food, and let technology make mindful living effortless. Fuudit helps people cook smarter, waste less, and enjoy food again — one meal at a time.

Explore Fuudit at https://www.fuudit.com — sign up for early access at https://signup.fuudit.com.`,
  },
];

export const listArticlesTool = defineTool({
  name: "list_articles",
  title: "List Fuudit articles",
  description: "List all published Fuudit articles with title, author, publish date, excerpt, and slug.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const items = ARTICLES.map(({ content, ...meta }) => meta);
    return {
      content: [
        {
          type: "text",
          text: items
            .map((a) => `- ${a.title} (${a.date}) by ${a.author}\n  slug: ${a.slug}\n  ${a.excerpt}`)
            .join("\n\n"),
        },
      ],
      structuredContent: { articles: items },
    };
  },
});

export const getArticleTool = defineTool({
  name: "get_article",
  title: "Get Fuudit article",
  description: "Fetch the full text of a Fuudit article by its slug. Use `list_articles` first to discover valid slugs.",
  inputSchema: {
    slug: z.string().min(1).describe("Article slug, e.g. 'future-of-food-waste-smart-tech'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ slug }) => {
    const article = ARTICLES.find((a) => a.slug === slug);
    if (!article) {
      return {
        content: [{ type: "text", text: `No article found with slug "${slug}". Call list_articles for available slugs.` }],
        isError: true,
      };
    }
    return {
      content: [
        {
          type: "text",
          text: `# ${article.title}\n_${article.author} — ${article.date}_\n\n${article.content}`,
        },
      ],
      structuredContent: { article },
    };
  },
});
