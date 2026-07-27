import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import BusinessModal from "@/components/BusinessModal";

type NavLink = {
  label: string;
  href: string;
  external?: boolean;
  onClick?: () => void;
};

const scrollTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

const PublicNav = () => {
  const [open, setOpen] = useState(false);
  const [businessOpen, setBusinessOpen] = useState(false);

  const primary: NavLink[] = [
    { label: "Features", href: "#features", onClick: undefined },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Articles", href: "/articles" },
    { label: "For Businesses", href: "#business" },
  ];

  const handleClick = (link: NavLink) => (e: React.MouseEvent) => {
    setOpen(false);
    if (link.href.startsWith("#")) {
      if (link.label === "For Businesses") {
        e.preventDefault();
        setBusinessOpen(true);
        return;
      }
      scrollTo(link.href.slice(1))(e);
    }
    // /articles is a real route — let it navigate normally.
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full border-b border-sage-100/60 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70"
        role="banner"
      >
        <nav
          className="container mx-auto flex items-center justify-between px-6 py-4"
          aria-label="Primary"
        >
          <Link
            to="/"
            className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 rounded-md"
            aria-label="Fuudit — home"
          >
            <img
              src="/lovable-uploads/43e3a289-72ad-479c-bcac-b38053e385e7.png"
              alt=""
              className="h-8 w-8"
              width={32}
              height={32}
              loading="eager"
              decoding="async"
            />
            <span className="text-xl font-bold text-nordic-800 tracking-tight">
              fuudit
            </span>
          </Link>

          {/* Desktop */}
          <ul className="hidden md:flex items-center gap-1">
            {primary.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  onClick={handleClick(link)}
                  className="px-3 py-2 text-sm font-medium text-nordic-700 hover:text-sage-700 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="ghost"
              asChild
              className="text-nordic-700 hover:text-sage-700 font-medium"
            >
              <Link to="/auth?mode=signin">Sign in</Link>
            </Button>
            <Button
              asChild
              className="bg-sage-600 hover:bg-sage-700 text-white font-medium rounded-xl"
            >
              <Link to="/auth?mode=signup">Get Started</Link>
            </Button>
          </div>

          {/* Mobile trigger */}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl border border-sage-200 text-nordic-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {/* Mobile menu */}
        {open && (
          <div
            id="mobile-menu"
            className="md:hidden border-t border-sage-100 bg-white"
          >
            <ul className="container mx-auto px-6 py-3 space-y-1">
              {primary.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={handleClick(link)}
                    className="block px-3 py-3 text-base font-medium text-nordic-800 rounded-lg hover:bg-sage-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li className="pt-2 border-t border-sage-100 flex gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="flex-1 border-sage-300 text-nordic-700"
                >
                  <Link to="/auth?mode=signin" onClick={() => setOpen(false)}>
                    Sign in
                  </Link>
                </Button>
                <Button
                  asChild
                  className="flex-1 bg-sage-600 hover:bg-sage-700 text-white"
                >
                  <Link to="/auth?mode=signup" onClick={() => setOpen(false)}>
                    Get Started
                  </Link>
                </Button>
              </li>
            </ul>
          </div>
        )}
      </header>

      <BusinessModal
        isOpen={businessOpen}
        onClose={() => setBusinessOpen(false)}
      />
    </>
  );
};

export default PublicNav;
