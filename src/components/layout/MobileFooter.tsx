import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Award, Clock, Plus, Minus, ChevronRight, ExternalLink } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import TrustpilotReviews from '@/components/features/TrustpilotReviews';

// ── Carousel Data ──────────────────────────────────────────
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

// ── Smooth Auto-Scrolling Logo Carousel ──────────────────
function MobileCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    let animationId: number;
    let scrollPos = 0;
    const speed = 0.5;
    
    const animate = () => {
      scrollPos += speed;
      if (scrollPos >= el.scrollWidth / 2) scrollPos = 0;
      el.scrollLeft = scrollPos;
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const duplicatedLogos = [...carouselLogos, ...carouselLogos];

  return (
    <div className="overflow-hidden w-full py-4 bg-white dark:bg-gray-950 border-y border-gray-100 dark:border-gray-800">
      <div 
        ref={scrollRef}
        className="flex gap-10 overflow-x-hidden"
        style={{ scrollBehavior: 'auto' }}
      >
        {duplicatedLogos.map((logo, i) => (
          <img
            key={i}
            src={logo}
            className="h-7 w-auto object-contain opacity-60 hover:opacity-100 transition-opacity duration-300 flex-shrink-0 grayscale hover:grayscale-0"
            alt="Payment partner"
            loading="lazy"
          />
        ))}
      </div>
    </div>
  );
}

// ── Feature Card Component ───────────────────────────────
interface FeatureCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
}

function FeatureCard({ icon, iconBg, title, description }: FeatureCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-300 active:scale-[0.98]">
      <div className="flex items-start gap-3.5">
        <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-sm mb-1 leading-tight">{title}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

// ── Accordion Section ────────────────────────────────────
interface AccordionSectionProps {
  label: string;
  links: Array<{ name: string; href: string }>;
  isExternal: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

function AccordionSection({ label, links, isExternal, isOpen, onToggle }: AccordionSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen, links]);

  return (
    <div className="border-b border-gray-100 dark:border-gray-800">
      <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 active:bg-gray-50 dark:active:bg-gray-900/50 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-sm">{label}</span>
        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          {isOpen ? <Minus className="h-4 w-4 text-gray-400" /> : <Plus className="h-4 w-4 text-gray-400" />}
        </div>
      </button>
      
      <div 
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ height }}
      >
        <div ref={contentRef} className="px-5 pb-4 space-y-1">
          {links.map((link, idx) => (
            isExternal ? (
              <a 
                key={idx} 
                href={link.href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-between py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors group"
              >
                <span>{link.name}</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
              </a>
            ) : (
              <Link 
                key={idx} 
                to={link.href} 
                className="flex items-center justify-between py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors group"
              >
                <span>{link.name}</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
              </Link>
            )
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Social Icon Button ───────────────────────────────────
function SocialButton({ href, bg, hoverBg, children, label }: {
  href: string;
  bg: string;
  hoverBg: string;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <a 
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`w-11 h-11 ${bg} ${hoverBg} rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 shadow-sm`}
    >
      {children}
    </a>
  );
}

// ── Main Footer Component ────────────────────────────────
export function MobileFooter() {
  const { t } = useTranslation();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const sections = [
    {
      key: "navigation",
      label: t('allGames') || 'Games',
      links: [
        { name: 'Genshin Impact Top Up 🔥', href: '/game/1003' },
        { name: 'Free Fire Top Up', href: '/game/1002' },
        { name: 'PUBG Mobile Top Up', href: '/game/1004' },
        { name: t('allGames') || 'All Games', href: '/categories' },
      ],
      isExternal: false
    },
    {
      key: "services",
      label: "Services",
      links: [
        { name: t('aboutUs') || 'About Us', href: '/about-us' },
        { name: 'Terms of Service', href: '/terms' },
        { name: 'Privacy Policy', href: '/privacy' },
        { name: t('helpCenter') || 'Help Center', href: '/support' },
      ],
      isExternal: false
    },
    {
      key: "business",
      label: "Business",
      links: [
        { name: t('affiliateProgram') || 'Affiliate Program', href: '/affiliate' },
        { name: 'I Want to Open a Store', href: '/affiliate' },
        { name: 'Sell on NoxyStore', href: '/affiliate' },
        { name: 'API Docs', href: '/about' },
      ],
      isExternal: false
    },
    {
      key: "partners",
      label: "Partners",
      links: [
        { name: 'Lootbar.gg', href: 'https://lootbar.gg/' },
        { name: 'Keygold.gg', href: 'https://keygold.gg/' },
      ],
      isExternal: true
    }
  ];

  const features = [
    {
      icon: <Shield className="h-5 w-5 text-emerald-600" />,
      iconBg: "bg-emerald-50 dark:bg-emerald-950/30",
      title: `100% ${t('safeReliable') || 'Safe & Reliable'}`,
      description: "Efficient, professional, and secure transactions with full data protection."
    },
    {
      icon: <Clock className="h-5 w-5 text-blue-600" />,
      iconBg: "bg-blue-50 dark:bg-blue-950/30",
      title: t('support247') || '24/7 Support',
      description: "Support team available anytime before, during, and after your purchase."
    },
    {
      icon: <Award className="h-5 w-5 text-amber-600" />,
      iconBg: "bg-amber-50 dark:bg-amber-950/30",
      title: "Full Refund Guarantee",
      description: "If goods are undelivered or unusable, we promise a 100% refund."
    }
  ];

  return (
    <footer className="lg:hidden bg-gray-50 dark:bg-gray-950">
      {/* ── Why Choose Us ── */}
      <section className="px-4 py-8">
        <h2 className="text-lg font-bold mb-5 text-gray-900 dark:text-gray-100">
          {t('whyChooseUs') || 'Why Choose Us'}
        </h2>
        <div className="space-y-3">
          {features.map((feature, i) => (
            <FeatureCard key={i} {...feature} />
          ))}
        </div>
      </section>

      {/* ── Trustpilot Reviews ── */}
      <section className="px-4 py-6 bg-white dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800">
        <TrustpilotReviews />
      </section>

      {/* ── Payment Methods ── */}
      <MobileCarousel />

      {/* ── Navigation Accordion ── */}
      <nav className="bg-white dark:bg-gray-900" aria-label="Footer navigation">
        {sections.map(({ key, label, links, isExternal }) => (
          <AccordionSection
            key={key}
            label={label}
            links={links}
            isExternal={isExternal}
            isOpen={expandedSection === key}
            onToggle={() => toggleSection(key)}
          />
        ))}
      </nav>

      {/* ── Social Links ── */}
      <section className="px-5 py-8 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
        <h3 className="font-semibold text-sm mb-4 text-gray-900 dark:text-gray-100">
          {t('liveSupport') || 'Live Support'}
        </h3>
        <div className="flex gap-3">
          <SocialButton 
            href="https://discord.gg/NUpGeKrKK" 
            bg="bg-[#5865F2]" 
            hoverBg="hover:bg-[#4752C4]"
            label="Discord"
          >
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
          </SocialButton>

          <SocialButton 
            href="https://x.com/DawensH91377" 
            bg="bg-black" 
            hoverBg="hover:bg-gray-800"
            label="X (Twitter)"
          >
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </SocialButton>

          <SocialButton 
            href="https://www.youtube.com/@NoxyStore.com_Official" 
            bg="bg-[#FF0000]" 
            hoverBg="hover:bg-[#CC0000]"
            label="YouTube"
          >
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </SocialButton>
        </div>
      </section>

      {/* ── Copyright ── */}
      <div className="px-4 py-6 text-center bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
          &copy; {new Date().getFullYear()} NoxyStore.com<br/>
          <span className="text-gray-300 dark:text-gray-600">Official Gaming Top-Up Platform</span>
        </p>
      </div>
    </footer>
  );
}

