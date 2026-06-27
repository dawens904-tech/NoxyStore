import { Shield, Headphones, CreditCard, Plus, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import TrustpilotReviews from '@/components/features/TrustpilotReviews';
import { useTranslation } from '@/hooks/useTranslation';

const carouselLogos = [
  "/images/IMG_8408.webp",
  "/images/IMG_8730.png",
  "/images/IMG_8731.png",
  "/images/IMG_8732.jpeg",
  "/images/IMG_8733.png",
  "/images/IMG_8734.png",
  "/images/IMG_8735.png",
  "/images/IMG_8726.webp",
  "/images/IMG_8729.webp",
  "/images/IMG_8736.jpeg",
  "/images/IMG_8738.jpeg",
  "/images/IMG_8727.webp",
  "/images/IMG_8728.webp",
  "/images/IMG_8737.png"
];

function MobileCarousel() {
  return (
    <div className="overflow-hidden w-full py-3 bg-white">
      <div className="flex animate-scroll gap-8">
        {carouselLogos.concat(carouselLogos).map((logo, i) => (
          <img
            key={i}
            src={logo}
            className="h-6 w-auto object-contain opacity-80 hover:opacity-100 transition flex-shrink-0"
            alt=""
          />
        ))}
      </div>
    </div>
  );
}

export function MobileFooter() {
  const { t } = useTranslation();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const siteNavLinks = [
    { name: 'Genshin Impact Top Up 🔥', href: '/game/1003' },
    { name: 'Free Fire Top Up', href: '/game/1002' },
    { name: 'PUBG Mobile Top Up', href: '/game/1004' },
    { name: t('allGames'), href: '/categories' },
  ];

  const serviceLinks = [
    { name: t('aboutUs'), href: '/about-us' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Privacy Policy', href: '/privacy' },
    { name: t('helpCenter'), href: '/support' },
  ];

  const businessLinks = [
    { name: t('affiliateProgram'), href: '/affiliate' },
    { name: 'I Want to Open a Store', href: '/affiliate' },
    { name: 'Sell on NoxyStore', href: '/affiliate' },
    { name: 'API Docs', href: '/about' },
  ];

  const partnerLinks = [
    { name: 'Lootbar.gg', href: 'https://lootbar.gg/' },
    { name: 'Keygold.gg', href: 'https://keygold.gg/' },
  ];

  return (
    <footer className="lg:hidden bg-white">
      {/* Why Choose Us - Clean white, no borders */}
      <div className="bg-white px-4 py-8">
        <h2 className="text-lg font-bold mb-6 text-gray-900">Why Choose Us?</h2>
        <div className="space-y-5">
          {/* Card 1 - 100% Safe Transaction */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded bg-gray-100">
              <Shield className="h-6 w-6 text-gray-700" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-bold text-base mb-1 text-gray-900">100% Safe Transaction</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                We ensure efficient, professional, and secure transactions with full protection of your data—100% safe.
              </p>
            </div>
          </div>

          {/* Card 2 - 24/7 Customer Service */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded bg-gray-100">
              <Headphones className="h-6 w-6 text-gray-700" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-bold text-base mb-1 text-gray-900">24/7 Customer Service</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Our reliable customer service team is available anytime, offering fast and convenient assistance before, during, and after your purchase.
              </p>
            </div>
          </div>

          {/* Card 3 - Full Refund Guarantee */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded bg-gray-100">
              <CreditCard className="h-6 w-6 text-gray-700" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-bold text-base mb-1 text-gray-900">Full Refund Guarantee</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                LootBar offers most competitive prices and efficient delivery. If goods are undelivered or unusable, we promise a 100% refund and financial security.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trustpilot */}
      <div className="px-4 py-5 border-y bg-white">
        <TrustpilotReviews />
      </div>

      {/* Payment Methods Carousel */}
      <div className="border-y">
        <MobileCarousel />
      </div>

      {/* Collapsible sections */}
      <div className="bg-white">
        {[
          { key: "navigation", label: t('allGames'), links: siteNavLinks, isExternal: false },
          { key: "services", label: "Services", links: serviceLinks, isExternal: false },
          { key: "business", label: "Business", links: businessLinks, isExternal: false },
          { key: "partners", label: "Partners", links: partnerLinks, isExternal: true },
        ].map(({ key, label, links, isExternal }) => (
          <div key={key} className="border-b">
            <button 
              onClick={() => toggleSection(key)} 
              className="w-full flex items-center justify-between px-4 py-4 font-semibold text-gray-900"
            >
              <span>{label}</span>
              {expandedSection === key ? <Minus className="h-4 w-4 text-gray-500" /> : <Plus className="h-4 w-4 text-gray-500" />}
            </button>
            {expandedSection === key && (
              <div className="px-4 pb-4 space-y-3">
                {links.map((link, idx) => (
                  isExternal ? (
                    <a 
                      key={idx} 
                      href={link.href} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {link.name}
                    </a>
                  ) : (
                    <Link 
                      key={idx} 
                      to={link.href} 
                      className="block text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {link.name}
                    </Link>
                  )
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Follow Us - Square icons */}
      <div className="px-4 py-6 bg-white">
        <h3 className="font-bold mb-4 text-gray-900">Follow Us</h3>
        <div className="flex gap-3">
          <a href="https://discord.gg/NUpGeKrKK" className="w-10 h-10 bg-[#5865F2] hover:bg-[#4752C4] rounded flex items-center justify-center transition-colors">
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
          </a>
          <a href="https://x.com/DawensH91377" className="w-10 h-10 bg-black hover:bg-gray-800 rounded flex items-center justify-center transition-colors">
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21.543 7.104c.014.211.014.423.014.636 0 6.507-4.954 14.01-14.01 14.01v-.003A13.94 13.94 0 0 1 0 19.539a9.88 9.88 0 0 0 7.287-2.041 4.93 4.93 0 0 1-4.6-3.42 4.916 4.916 0 0 0 2.223-.084A4.926 4.926 0 0 1 .96 9.167v-.062a4.887 4.887 0 0 0 2.235.616A4.928 4.928 0 0 1 1.67 3.148a13.98 13.98 0 0 0 10.15 5.144 4.929 4.929 0 0 1 8.39-4.49 9.868 9.868 0 0 0 3.128-1.196 4.941 4.941 0 0 1-2.165 2.724A9.828 9.828 0 0 0 24 4.555a10.019 10.019 0 0 1-2.457 2.549z"/>
            </svg>
          </a>
          <a href="https://www.youtube.com/@NoxyStore.com_Official" className="w-10 h-10 bg-[#FF0000] hover:bg-[#CC0000] rounded flex items-center justify-center transition-colors">
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </a>
        </div>
      </div>

      {/* Copyright */}
      <div className="px-4 py-6 text-center text-xs text-gray-500 bg-white border-t">
        <p>&copy; {new Date().getFullYear()} NoxyStore.com — Official Gaming Top-Up Platform</p>
      </div>
    </footer>
  );
}
