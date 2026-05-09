import { Shield, Clock, Award, Plus, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function MobileFooter() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const siteNavLinks = [
    { name: 'All Games', href: '/games' },
    { name: 'Categories', href: '/categories' },
    { name: 'Support', href: '/support' },
  ];

  const serviceLinks = [
    { name: 'About Us', href: '/about' },
    { name: 'Terms of Service', href: '/about' },
    { name: 'Privacy Policy', href: '/about' },
    { name: 'Cookie Policy', href: '/about' },
  ];

  const businessLinks = [
    { name: 'Affiliate Program', href: '#' },
    { name: 'Sell on NoxyStore', href: '#' },
  ];

  const partnerLinks = [
    { name: 'Lootbar.gg', href: 'https://lootbar.gg/' },
  ];

  return (
    <footer className="lg:hidden bg-white border-t">
      {/* Why Choose Us Section */}
      <div className="bg-gray-50 px-4 py-8">
        <h2 className="text-lg font-bold mb-6">Why Choose Us?</h2>
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold mb-1">100% Safe Transaction</h3>
                <p className="text-xs text-gray-500">
                  We ensure efficient, professional, and secure transactions with full protection of your data—100% safe.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold mb-1">24/7 Customer Service</h3>
                <p className="text-xs text-gray-500">
                  Our reliable customer service team is available anytime.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Award className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold mb-1">Full Refund Guarantee</h3>
                <p className="text-xs text-gray-500">
                  If goods are undelivered or unusable, we promise a 100% refund.
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
          <img src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Paypal_2014_logo.png" alt="PayPal" className="h-4" />
        </div>
      </div>

      {/* Site Navigation */}
      <div className="border-b">
        <button onClick={() => toggleSection("navigation")} className="w-full flex items-center justify-between px-4 py-4 font-semibold">
          <span>Site Navigation</span>
          {expandedSection === "navigation" ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </button>
        {expandedSection === "navigation" && (
          <div className="px-4 pb-4 space-y-2">
            {siteNavLinks.map((link) => (
              <Link key={link.name} to={link.href} className="block text-sm text-gray-500 hover:text-gray-800">{link.name}</Link>
            ))}
          </div>
        )}
      </div>

      {/* Services */}
      <div className="border-b">
        <button onClick={() => toggleSection("services")} className="w-full flex items-center justify-between px-4 py-4 font-semibold">
          <span>Services</span>
          {expandedSection === "services" ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </button>
        {expandedSection === "services" && (
          <div className="px-4 pb-4 space-y-2">
            {serviceLinks.map((link) => (
              <Link key={link.name} to={link.href} className="block text-sm text-gray-500 hover:text-gray-800">{link.name}</Link>
            ))}
          </div>
        )}
      </div>

      {/* Business */}
      <div className="border-b">
        <button onClick={() => toggleSection("business")} className="w-full flex items-center justify-between px-4 py-4 font-semibold">
          <span>Business</span>
          {expandedSection === "business" ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </button>
        {expandedSection === "business" && (
          <div className="px-4 pb-4 space-y-2">
            {businessLinks.map((link) => (
              <a key={link.name} href={link.href} className="block text-sm text-gray-500 hover:text-gray-800">{link.name}</a>
            ))}
          </div>
        )}
      </div>

      {/* Partners */}
      <div className="border-b">
        <button onClick={() => toggleSection("partners")} className="w-full flex items-center justify-between px-4 py-4 font-semibold">
          <span>Partners</span>
          {expandedSection === "partners" ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </button>
        {expandedSection === "partners" && (
          <div className="px-4 pb-4 space-y-2">
            {partnerLinks.map((link) => (
              <a key={link.name} href={link.href} className="block text-sm text-gray-500 hover:text-gray-800">{link.name}</a>
            ))}
          </div>
        )}
      </div>

      {/* Follow Us */}
      <div className="px-4 py-6 border-b">
        <h3 className="font-bold mb-4">Follow Us</h3>
        <div className="flex gap-3">
          <a href="https://discord.gg/NUpGeKrKK" className="w-10 h-10 bg-[#5865F2] rounded-full flex items-center justify-center">
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
          </a>
          <a href="https://x.com/DawensH91377" className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21.543 7.104c.014.211.014.423.014.636 0 6.507-4.954 14.01-14.01 14.01v-.003A13.94 13.94 0 0 1 0 19.539a9.88 9.88 0 0 0 7.287-2.041a4.93 4.93 0 0 1-4.6-3.42a4.916 4.916 0 0 0 2.223-.084A4.926 4.926 0 0 1 .96 9.167v-.062a4.887 4.887 0 0 0 2.235.616A4.928 4.928 0 0 1 1.67 3.148a13.98 13.98 0 0 0 10.15 5.144a4.929 4.929 0 0 1 8.39-4.49a9.868 9.868 0 0 0 3.128-1.196a4.941 4.941 0 0 1-2.165 2.724A9.828 9.828 0 0 0 24 4.555a10.019 10.019 0 0 1-2.457 2.549z"/>
            </svg>
          </a>
          <a href="https://www.youtube.com/@NoxyStore.com_Official" className="w-10 h-10 bg-[#FF0000] rounded-full flex items-center justify-center">
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </a>
        </div>
      </div>

      {/* Copyright */}
      <div className="px-4 py-6 text-center text-xs text-gray-500">
        <p>&copy; {new Date().getFullYear()} NoxyStore.com - Official Gaming Top-Up Platform</p>
      </div>
    </footer>
  );
}
