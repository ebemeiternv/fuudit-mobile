import { useState } from "react";
import { Link } from "react-router-dom";
import BusinessModal from "@/components/BusinessModal";

const Footer = () => {
  const [businessOpen, setBusinessOpen] = useState(false);

  return (
    <footer
      className="bg-nordic-900 text-nordic-200 py-14"
      aria-labelledby="footer-heading"
    >
      <h2 id="footer-heading" className="sr-only">
        Site footer
      </h2>
      <div className="container mx-auto px-6">
        <div className="grid gap-10 md:grid-cols-4 max-w-6xl mx-auto">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img
                src="/lovable-uploads/43e3a289-72ad-479c-bcac-b38053e385e7.png"
                alt=""
                className="h-7 w-7"
                width={28}
                height={28}
                loading="lazy"
                decoding="async"
              />
              <span className="text-lg font-bold text-white">fuudit</span>
            </div>
            <p className="text-sm text-nordic-300 max-w-xs leading-relaxed">
              A kitchen companion that remembers — helping households cook
              smarter and waste less.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-widest mb-3">
              Product
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/auth?mode=signup"
                  className="hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 rounded"
                >
                  Get Started
                </Link>
              </li>
              <li>
                <Link
                  to="/auth?mode=signin"
                  className="hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 rounded"
                >
                  Sign in
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setBusinessOpen(true)}
                  className="hover:text-white text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 rounded"
                >
                  For Businesses
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-widest mb-3">
              Resources
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/articles"
                  className="hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 rounded"
                >
                  Articles
                </Link>
              </li>
              <li>
                <a
                  href="#faq"
                  className="hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 rounded"
                >
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@fuudit.com"
                  className="hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 rounded"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-widest mb-3">
              Legal
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="mailto:hello@fuudit.com?subject=Privacy%20policy"
                  className="hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 rounded"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@fuudit.com?subject=Terms"
                  className="hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 rounded"
                >
                  Terms
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-nordic-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-nordic-400">
          <p>© {new Date().getFullYear()} Fuudit. All rights reserved.</p>
          <p>Made in the Nordics · hello@fuudit.com</p>
        </div>
      </div>

      <BusinessModal
        isOpen={businessOpen}
        onClose={() => setBusinessOpen(false)}
      />
    </footer>
  );
};

export default Footer;
