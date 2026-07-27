import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What is Fuudit?",
    a: "Fuudit is a kitchen companion that keeps track of what's in your pantry, learns how you cook and shop, and helps you decide what to make with what you already have — so less food goes to waste.",
  },
  {
    q: "Is Fuudit free?",
    a: "Fuudit is free to use during beta. No credit card is required to create an account.",
  },
  {
    q: "Can I use Fuudit on my phone?",
    a: "Yes. Fuudit works today in any mobile browser. Installable iPhone and Android experiences are coming in a later phase.",
  },
  {
    q: "What does AI Chef do?",
    a: "AI Chef is a conversational assistant that suggests recipes based on your pantry, dietary preferences and the time you have. You review each suggestion before adding it to your plan.",
  },
  {
    q: "How does Fuudit learn my habits?",
    a: "Every time you add, edit, consume or discard an item, Fuudit updates a private, per-user profile with your preferred storage, quantity, unit and expiry choices. It uses those to prefill the form next time. Suggestions always remain editable.",
  },
  {
    q: "Can other users see my pantry?",
    a: "No. Your pantry, meal plan, grocery list and learning data are private to your account. Household sharing is planned but not yet enabled.",
  },
  {
    q: "Is a native iPhone or Android app available?",
    a: "Not yet. Fuudit currently runs as a mobile-optimised web app. An installable home-screen experience is planned for the next phase.",
  },
];

const FAQ = () => (
  <section
    id="faq"
    aria-labelledby="faq-heading"
    className="bg-white py-20 md:py-24"
  >
    <div className="container mx-auto px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-sage-700 mb-3">
            FAQ
          </p>
          <h2
            id="faq-heading"
            className="text-3xl md:text-4xl font-bold text-nordic-800 text-balance"
          >
            Answers to the common questions
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
            <AccordionItem
              key={f.q}
              value={`item-${i}`}
              className="border-sage-100"
            >
              <AccordionTrigger className="text-left text-nordic-800 font-semibold hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-nordic-600 leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  </section>
);

export default FAQ;
