import { Shield, Award, Clock, ChevronDown, ChevronUp, Plus, Minus } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Footer from './Footer';
import { useLanguageStore } from '@/stores/languageStore';
import TrustpilotReviews from '@/components/features/TrustpilotReviews';
import { t } from '@/lib/translations';

declare global {
  interface Window {
    Trustpilot?: any;
  }
}

export default function MobileFooter() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const { language } = useLanguageStore();

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  useEffect(() => {
    if (window.Trustpilot) {
      window.Trustpilot.loadFromElement(
        document.querySelector('.trustpilot-widget'),
        true
      );
    }
  }, []);

  const siteNavLinks = [
    { name: 'Genshin Impact Top Up 🔥', href: '/product/genshin-genesis' },
    { name: 'Honkai Star Rail Top Up', href: '/product/honkai-express' },
    { name: 'FC 26 Coins', href: '/product/fc26-points' },
    { name: 'iTunes Gift Card US', href: '/gift-card/itunes-gift-card-us' },
  ];

  const serviceLinks = [
    { name: t('aboutUs', language), href: '/about' },
    { name: t('terms', language), href: '/terms' },
    { name: t('privacy', language), href: '/privacy' },
    { name: 'FAQ', href: '/faq' },
  ];

  const businessLinks = [
    { name: 'Affiliate Program', href: '/affiliate' },
    { name: 'I Want to Open a Store', href: '/traffic-alliance' },
    { name: 'Sell on NoxyStore', href: '/reseller' },
    { name: 'Api Docs', href: '/api-docs' },
  ];

  const partnerLinks = [
    { name: 'SafeShell VPN', href: 'https://www.safeshellvpn.com/' },
    { name: 'GearUP Booster', href: 'https://www.gearupbooster.com/' },
  ];

  return (
    <footer className="lg:hidden bg-background border-t">
      {/* Why Choose Us Section */}
      <div className="bg-gray-50 dark:bg-gray-900/30 px-4 py-8">
        <h2 className="text-lg font-bold mb-6">Why Choose Us?</h2>
        
        <div className="space-y-4">
          <div className="bg-white dark:bg-card border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold mb-1">100% Safe Transaction</h3>
                <p className="text-xs text-muted-foreground">
                  We ensure efficient, professional, and secure transactions with full protection of your data—100% safe.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-card border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold mb-1">24/7 Customer Service</h3>
                <p className="text-xs text-muted-foreground">
                  Our reliable customer service team is available anytime, offering fast and convenient assistance before, during, and after your purchase.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-card border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Award className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold mb-1">Full Refund Guarantee</h3>
                <p className="text-xs text-muted-foreground">
                  NoxyStore offers most competitive prices and efficient delivery. If goods are undelivered or unusable, we promise a 100% refund and financial security.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="px-4 py-6 border-b">
        <div className="flex flex-wrap justify-center items-center gap-4 opacity-60">
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-5" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/b/b7/MasterCard_Logo.svg" alt="Mastercard" className="h-5" />
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
          </svg>
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 16.97a.599.599 0 0 1-.665.355c-.176-.044-4.318-1.107-9.744-.91-.485.018-.885-.352-.903-.834-.019-.482.352-.885.834-.903 5.917-.215 10.395.988 10.579 1.039a.601.601 0 0 1 .355.665z"/>
          </svg>
        </div>
      </div>

      {/* Trustpilot Badge */}
      <div className="px-4 py-5 border-b bg-background">
        <div
          className="trustpilot-widget"
          data-locale="en-US"
          data-template-id="56278e9abfbbba0bdcd568bc"
          data-businessunit-id="6957ec3e74cf034e3abd2cfb"
          data-style-height="52px"
          data-style-width="100%"
          data-token="08edcd60-e52f-4637-9f1b-879188348ba2"
        >
          <a
            href="https://www.trustpilot.com/review/noxystore.com"
            target="_blank"
            rel="noopener"
          >
            Trustpilot
          </a>
        </div>
      </div>

      {/* Site Navigation */}
      <div className="border-b">
        <button
          onClick={() => toggleSection("navigation")}
          className="w-full flex items-center justify-between px-4 py-4 font-semibold"
        >
          <span>Site Navigation</span>
          {expandedSection === "navigation" ? (
            <Minus className="h-5 w-5" />
          ) : (
            <Plus className="h-5 w-5" />
          )}
        </button>

        {expandedSection === "navigation" && (
          <div className="px-4 pb-4 space-y-2">
            {siteNavLinks.map((link, idx) => (
              <Link
                key={idx}
                to={link.href}
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                {link.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Services */}
      <div className="border-b">
        <button
          onClick={() => toggleSection("services")}
          className="w-full flex items-center justify-between px-4 py-4 font-semibold"
        >
          <span>Services</span>
          {expandedSection === "services" ? (
            <Minus className="h-5 w-5" />
          ) : (
            <Plus className="h-5 w-5" />
          )}
        </button>

        {expandedSection === "services" && (
          <div className="px-4 pb-4 space-y-2">
            {serviceLinks.map((link, idx) => (
              <Link
                key={idx}
                to={link.href}
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                {link.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Business */}
      <div className="border-b">
        <button
          onClick={() => toggleSection("business")}
          className="w-full flex items-center justify-between px-4 py-4 font-semibold"
        >
          <span>Business</span>
          {expandedSection === "business" ? (
            <Minus className="h-5 w-5" />
          ) : (
            <Plus className="h-5 w-5" />
          )}
        </button>

        {expandedSection === "business" && (
          <div className="px-4 pb-4 space-y-2">
            {businessLinks.map((link, idx) => (
              <Link
                key={idx}
                to={link.href}
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                {link.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Partners */}
      <div className="border-b">
        <button
          onClick={() => toggleSection("partners")}
          className="w-full flex items-center justify-between px-4 py-4 font-semibold"
        >
          <span>Partners</span>
          {expandedSection === "partners" ? (
            <Minus className="h-5 w-5" />
          ) : (
            <Plus className="h-5 w-5" />
          )}
        </button>

        {expandedSection === "partners" && (
          <div className="px-4 pb-4 space-y-2">
            {partnerLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.href}
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                {link.name}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Follow Us */}
      <div className="px-4 py-6 border-b">
        <h3 className="font-bold mb-4">Follow Us</h3>
        <div className="flex gap-3">
          <a href="https://discord.gg/KGqhbqRS" className="w-10 h-10 bg-[#5865F2] hover:bg-[#4752C4] rounded-full flex items-center justify-center transition-colors">
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </a>
          <a href="#" className="w-10 h-10 bg-black hover:bg-gray-800 rounded-full flex items-center justify-center transition-colors">
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
            </svg>
          </a>
          <a href="https://x.com/DawensH91377" className="w-10 h-10 bg-black hover:bg-gray-800 rounded-full flex items-center justify-center transition-colors">
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21.543 7.104c.014.211.014.423.014.636 0 6.507-4.954 14.01-14.01 14.01v-.003A13.94 13.94 0 0 1 0 19.539a9.88 9.88 0 0 0 7.287-2.041a4.93 4.93 0 0 1-4.6-3.42a4.916 4.916 0 0 0 2.223-.084A4.926 4.926 0 0 1 .96 9.167v-.062a4.887 4.887 0 0 0 2.235.616A4.928 4.928 0 0 1 1.67 3.148a13.98 13.98 0 0 0 10.15 5.144a4.929 4.929 0 0 1 8.39-4.49a9.868 9.868 0 0 0 3.128-1.196a4.941 4.941 0 0 1-2.165 2.724A9.828 9.828 0 0 0 24 4.555a10.019 10.019 0 0 1-2.457 2.549z"/>
            </svg>
          </a>
          <a href="https://www.youtube.com/@NoxyStore.com_Official" className="w-10 h-10 bg-[#FF0000] hover:bg-[#CC0000] rounded-full flex items-center justify-center transition-colors">
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </a>
        </div>
      </div>

      {/* Copyright */}
      <div className="px-4 py-6 text-center text-xs text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} NoxyStore.com - Official Gaming Top-Up Platform</p>
      </div>
    </footer>
  );
}