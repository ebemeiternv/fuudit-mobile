import { Button } from "@/components/ui/button";
import ArticleCard from "./ArticleCard";
import { BookOpen } from "lucide-react";

const ArticlesPreviewSection = () => {
  const featuredArticles = [
    {
      title: "10 Easy Meal Prep Ideas for Busy Weekdays",
      description: "Save time and reduce food waste with these simple meal prep strategies that work for any schedule.",
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop",
      slug: "meal-prep-ideas"
    },
    {
      title: "How to Reduce Food Waste at Home",
      description: "Practical tips and tricks to minimize food waste in your kitchen while saving money on groceries.",
      image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&h=600&fit=crop",
      slug: "reduce-food-waste"
    },
    {
      title: "Understanding Food Expiration Dates",
      description: "Learn the difference between 'best before' and 'use by' dates to make informed decisions about food safety.",
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=600&fit=crop",
      slug: "expiration-dates-guide"
    }
  ];

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-4xl font-bold mb-4">Latest Articles</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover tips, recipes, and insights to help you make the most of your meals
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {featuredArticles.map((article) => (
            <ArticleCard key={article.slug} {...article} />
          ))}
        </div>

        <div className="text-center">
          <Button size="lg" asChild>
            <a href="/articles">
              View All Articles
              <BookOpen className="ml-2 h-5 w-5" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ArticlesPreviewSection;
