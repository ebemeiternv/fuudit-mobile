import ArticleCard from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import foodWasteImage from "@/assets/food-waste-smart-tech.jpg";

const Articles = () => {
  const articles = [
    {
      title: "The Future of Food Waste: How Smart Tech is Redefining How We Eat",
      description: "Discover how AI-driven technology is transforming our relationship with food, making sustainable living simple and accessible for everyone.",
      image: foodWasteImage,
      slug: "future-of-food-waste-smart-tech"
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
