import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useParams, Navigate } from "react-router-dom";
import foodWasteImage from "@/assets/food-waste-smart-tech.jpg";

const ArticleDetail = () => {
  const { slug } = useParams();

  const articles = {
    "future-of-food-waste-smart-tech": {
      title: "The Future of Food Waste: How Smart Tech is Redefining How We Eat",
      author: "Ebe Meitern-Vare",
      date: "November 5, 2025",
      image: foodWasteImage,
      content: `Nearly one-third of all food produced globally never gets eaten. Behind that statistic lies more than waste — it represents lost energy, water, time, and opportunity. Food waste is not only a household inconvenience; it's a social, environmental, and economic challenge that affects every corner of the planet.

But the good news is that change is already happening. It's powered by technology, design, and the collective willingness to make small yet meaningful shifts in how we live and eat.

At Fuudit, we believe that sustainability should feel simple — not like an extra task on your to-do list. Our AI-driven food waste companion helps people track what they have at home, use ingredients smartly, and rediscover the joy of cooking sustainably.

You can explore Fuudit at [www.fuudit.com](https://www.fuudit.com) or sign up for early access at [signup.fuudit.com](https://signup.fuudit.com).

## From Awareness to Intelligent Action

In recent years, the world has seen an impressive wave of innovation in food technology. Platforms like Too Good To Go, OLIO, and Lifesum have each made a real impact — connecting communities, saving surplus meals, and bringing intelligent recipe recommendations into our daily lives.

However, most of these tools address only one part of the problem. Some focus on redistribution, others on calorie tracking or meal inspiration. What has been missing is a full-circle approach — one that looks at the entire household journey from purchase to plate to leftovers.

This is where Fuudit is different. It doesn't simply help you plan your meals; it helps you rethink your relationship with food. It brings together expiration tracking, AI-based recipe suggestions, leftover remixing, and smart shopping reminders — all in one intuitive, Scandinavian-inspired interface.

## Insights from the Fuudit Community

Our recent community survey confirmed just how universal the food waste challenge has become. Most of the respondents said they want to reduce food waste but struggle with everyday obstacles: lack of planning, overbuying, and uncertainty about what to cook next.

Vegetables and meat — especially chicken — are the most commonly wasted ingredients, while leftovers often sit unused because people lack inspiration or reminders.

When asked what they need, users emphasized five main motivators:

- Cooking inspiration
- Better use of leftovers
- Picture recognition or fridge scanning
- Smart meal planning
- Convenience and time savings

The early traction speaks volumes. Fuudit already has 103 sign-ups, strong engagement from Nordic and Baltic users, and growing interest from English-speaking markets like the UK and US. On social media, the concept has reached over 65,000 viewers on TikTok, with hundreds of users saying they would use Fuudit immediately.

The message is clear: people are ready for intelligent, design-driven solutions that make sustainable living easier.

## The Next Wave of Food Tech

As technology becomes more integrated into our daily routines, the next decade will bring an even closer relationship between smart data and conscious living. Food waste reduction will be one of the most human-centered applications of this shift.

Future systems will go beyond manual tracking. Pantries will sync with grocery platforms to generate predictive shopping lists. Smart fridges will notify users when something is nearing expiry and suggest creative ways to use it. Wearables such as Oura, RingConn, and Apple Watch will personalize meal suggestions based on mood, sleep, or hormonal balance. And localized ecosystems will connect consumers directly to nearby producers or composting partners — closing the loop in sustainable food living.

Fuudit is designed with this future in mind. Its modular, AI-powered architecture is ready to integrate with smart appliances, health data, and even retailers. It's not just a recipe platform — it's evolving into a full-scale wellbeing and sustainability assistant for modern households.

## A Simpler, More Sustainable Future

Food waste is not only about what we throw away. It's about how we plan, how we connect with food, and how technology can make mindful living feel effortless.

Fuudit was created to make everyday conscious eating simple, sustainable, and full of inspiration. It encourages people to cook smarter, waste less, and enjoy food again — without guilt or overthinking.

Together, we can transform the way we eat, cook, and care for the planet — one meal at a time.

Explore Fuudit at [www.fuudit.com](https://www.fuudit.com)

Sign up for early access at [signup.fuudit.com](https://signup.fuudit.com)`
    }
  };

  const article = slug ? articles[slug as keyof typeof articles] : null;

  if (!article) {
    return <Navigate to="/articles" replace />;
  }

  return (
    <div className="min-h-screen">
      <header className="bg-primary text-primary-foreground py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <Button variant="ghost" size="sm" className="mb-4 text-primary-foreground hover:bg-primary-foreground/10" asChild>
            <a href="/articles">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Articles
            </a>
          </Button>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            {article.title}
          </h1>
        </div>
      </header>

      <main className="py-12 px-4">
        <article className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
            <span className="font-medium">{article.author}</span>
            <span>•</span>
            <time dateTime="2025-11-05">{article.date}</time>
          </div>

          <div className="aspect-video overflow-hidden rounded-lg mb-8">
            <img 
              src={article.image} 
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="prose prose-lg max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-li:text-muted-foreground">
            {article.content.split('\n\n').map((paragraph, index) => {
              if (paragraph.startsWith('## ')) {
                return <h2 key={index} className="text-2xl font-bold mt-8 mb-4">{paragraph.replace('## ', '')}</h2>;
              } else if (paragraph.startsWith('- ')) {
                const items = paragraph.split('\n- ').map(item => item.replace('- ', ''));
                return (
                  <ul key={index} className="list-disc pl-6 my-4 space-y-2">
                    {items.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                );
              } else {
                // Handle links in markdown format [text](url)
                const parts = paragraph.split(/(\[.*?\]\(.*?\))/g);
                return (
                  <p key={index} className="mb-4 leading-relaxed">
                    {parts.map((part, i) => {
                      const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
                      if (linkMatch) {
                        return (
                          <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {linkMatch[1]}
                          </a>
                        );
                      }
                      return part;
                    })}
                  </p>
                );
              }
            })}
          </div>
        </article>
      </main>
    </div>
  );
};

export default ArticleDetail;
