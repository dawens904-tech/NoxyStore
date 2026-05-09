
import { Link, useLocation } from 'react-router-dom';
import { Shield, Headphones, CreditCard } from 'lucide-react';
import MobileFooter from './MobileFooter';
import TrustpilotReviews from '@/components/features/TrustpilotReviews';

export default function Footer() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isMyAccountPage = location.pathname === '/my-account';

  if (isMyAccountPage) {
    return null;
  }

  if (isHomePage) {
    return (
      <>
        <MobileFooter />
        <TrustpilotReviews />
        <DesktopFooter />
      </>
    );
  }

  return <DesktopFooter />;
}

function DesktopFooter() {
  return (
    <footer className="hidden lg:block bg-background border-t mt-24">
      {/* Why Choose Us Section */}
      <div className="bg-gray-50 dark:bg-gray-900/30 py-12">
        <div className="container mx-auto px-6">
          <h2 className="text-2xl font-bold mb-8">Why Choose Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white dark:bg-card border rounded-lg">
                <Shield className="h-8 w-8" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">100% Safe Transaction</h3>
                <p className="text-sm text-muted-foreground">
                  We ensure efficient, professional, and secure transactions with full protection of your data—100% safe.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-white dark:bg-card border rounded-lg">
                <Headphones className="h-8 w-8" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">24/7 Customer Service</h3>
                <p className="text-sm text-muted-foreground">
                  Our reliable customer service team is available anytime, offering fast and convenient assistance before, during, and after your purchase.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-white dark:bg-card border rounded-lg">
                <CreditCard className="h-8 w-8" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">Full Refund Guarantee</h3>
                <p className="text-sm text-muted-foreground">
                  NoxyStore offers most competitive prices and efficient delivery. If goods are undelivered or unusable, we promise a 100% refund and financial security.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-6 py-12">
        {/* Payment Methods */}
        <div className="flex flex-wrap items-center justify-center gap-4 py-8 border-y">
          <img src="https://cdn.worldvectorlogo.com/logos/visa-2.svg" alt="Visa" className="h-6 opacity-60" />
          <img src="https://files.catbox.moe/otuili.png" alt="Mastercard" className="h-6 opacity-60" />
          <img src="https://files.catbox.moe/wes6op.jpeg" alt="JCB" className="h-6 opacity-60" />
          <img src="https://files.catbox.moe/pqnaqa.jpeg" alt="Amex" className="h-6 opacity-60" />
          <img src="https://files.catbox.moe/509hhb.jpeg" alt="Discover" className="h-6 opacity-60" />
          <img src="https://files.catbox.moe/6o4ob0.png" alt="PayPal" className="h-6 opacity-60" />
          <img src="https://files.catbox.moe/z36scq.png" alt="Apple Pay" className="h-6 opacity-60" />
          <img src="https://files.catbox.moe/rbu95l.png" alt="Google Pay" className="h-6 opacity-60" />
        </div>

        {/* Footer Links */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
          <div>
            <h3 className="font-bold mb-4">Site Navigation</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/genshin-impact-top-up" className="hover:text-foreground transition-colors">Genshin Impact Top Up 🔥</Link></li>
              <li><Link to="/honkai-star-rail" className="hover:text-foreground transition-colors">Honkai Star Rail Top Up</Link></li>
              <li><Link to="/fc26" className="hover:text-foreground transition-colors">FC 26 Coins</Link></li>
              <li><Link to="/itunes-gift-card-us" className="hover:text-foreground transition-colors">iTunes Gift Card US</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4">Services</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4">Business</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/affiliate" className="hover:text-foreground transition-colors">Affiliate Program</Link></li>
              <li><Link to="/traffic-alliance" className="hover:text-foreground transition-colors">I Want to Open a Store</Link></li>
              <li><Link to="/reseller" className="hover:text-foreground transition-colors">Sell on NoxyStore</Link></li>
               <li><Link to="/api-docs" className="hover:text-foreground transition-colors">Api-Docs</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4">Partners</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="https://lootbar.gg/" className="hover:text-foreground transition-colors">Lootbar.gg</a></li>
              <li><a href="https://keygold.gg/" className="hover:text-foreground transition-colors">Keygold.gg</a></li>
            </ul>
          </div>
        </div>

        {/* Social */}
        <div className="mt-12">
          <div>
            <h3 className="font-bold mb-4">Follow Us</h3>
            <div className="flex gap-3">
              <a href="https://discord.gg/NUpGeKrKK" className="w-10 h-10 bg-[#5865F2] hover:bg-[#4752C4] rounded-full flex items-center justify-center transition-colors">
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
        </div> {/* Closing tag for the div that starts on line 75, which wraps Social section */}

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} NoxyStore.com - Official Gaming Top-Up Platform</p>
        </div>
      </div>
    </footer>
  );
}
The Footer.tsx currently has a default export but some files import it as a named export `{ Footer }`. Please audit all import statements and unify to use the same export style (either all default or all named) so there are no mismatch errors.
