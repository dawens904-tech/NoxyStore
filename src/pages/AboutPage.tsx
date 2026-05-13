/**
 * About Us Page — NoxyStore info + legal links
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";

const LINKS = [
  {
    label: "Terms of Service",
    content: "By using NoxyStore.com, you agree to our terms of service. We are an authorized Lootbar reseller providing gaming top-up services globally. All sales are final unless the product was not delivered. We reserve the right to suspend accounts that violate our policies.",
  },
  {
    label: "Privacy Policy",
    content: "NoxyStore collects only the minimum data necessary to provide our services: your email address for authentication and order notifications, and game account information (UID/Server) required to process top-ups. We never sell your data to third parties. All data is encrypted in transit and at rest.",
  },
  {
    label: "Cookie Policy",
    content: "We use essential cookies for authentication sessions and performance analytics cookies to improve our service. You can disable non-essential cookies in your browser settings. Essential cookies cannot be disabled as they are required for the site to function.",
  },
  {
    label: "About Us",
    content: "NoxyStore.com is a professional gaming top-up marketplace powered by the Lootbar.gg reseller network. We offer competitive prices, instant delivery, and 24/7 customer support for gamers worldwide. Our mission is to make gaming currency accessible and affordable for everyone.",
  },
];

function ExpandableItem({ label, content }: { label: string; content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-4 text-left"
      >
        <span className="font-medium text-gray-800">{label}</span>
        <ChevronRight size={18} className={`text-gray-400 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4">{content}</p>
        </div>
      )}
    </div>
  );
}

export function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft size={20} className="text-gray-700" /></button>
          <h1 className="font-bold text-gray-900 flex-1 text-center">About Us</h1>
          <div className="w-8" />
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-yellow-50 to-amber-100 px-4 py-10 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-black mb-1">
            <span className="text-yellow-500">NOXY</span><span className="text-gray-900">STORE</span><span className="text-yellow-500">.com</span>
          </div>
          <p className="text-sm text-gray-500">Official Gaming Top-Up Platform</p>
        </div>
      </div>

      {/* Links */}
      <div className="bg-white mt-3 divide-y divide-gray-100">
        {LINKS.map((item) => (
          <ExpandableItem key={item.label} label={item.label} content={item.content} />
        ))}
      </div>

      <div className="px-4 py-6 text-center text-xs text-gray-400">
        <p>© {new Date().getFullYear()} NoxyStore.com · All rights reserved</p>
        <p className="mt-1">Powered by Lootbar.gg Reseller Network</p>
      </div>
    </div>
  );
}
make all on this go to a page specific about go to about us page.
