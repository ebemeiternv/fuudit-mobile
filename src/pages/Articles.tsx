import ArticleCard from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const Articles = () => {
  const articles = [
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
    },
    {
      title: "Budget-Friendly Grocery Shopping Tips",
      description: "Smart strategies to save money while still buying nutritious, quality ingredients for your family.",
      image: "https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?w=800&h=600&fit=crop",
      slug: "budget-grocery-shopping"
    },
    {
      title: "Seasonal Eating: A Guide to Fresh Produce",
      description: "Discover which fruits and vegetables are in season and how to incorporate them into your meals.",
      image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&h=600&fit=crop",
      slug: "seasonal-eating-guide"
    },
    {
      title: "Quick Healthy Snacks for the Whole Family",
      description: "Nutritious and delicious snack ideas that everyone will love, ready in minutes.",
      image: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800&h=600&fit=crop",
      slug: "healthy-snacks"
    }
  ];

  return (
    <div className="min-h-screen">
      <header className="bg-primary text-primary-foreground py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <Button variant="ghost" size="sm" className="mb-4 text-primary-foreground hover:bg-primary-foreground/10" asChild>
            <a href="/">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </a>
          </Button>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Articles & Resources</h1>
          <p className="text-lg text-primary-foreground/90 max-w-2xl">
            Expert tips, recipes, and guides to help you eat better, waste less, and save more
          </p>
        </div>
      </header>

      <main className="py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <ArticleCard key={article.slug} {...article} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Articles;
