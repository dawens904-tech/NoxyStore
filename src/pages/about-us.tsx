
import React from 'react';
import { 
  Gamepad2, 
  DollarSign, 
  Star, 
  Gift, 
  Sword, 
  BadgePercent, 
  Zap, 
  ShieldCheck, 
  Headphones,
  Wheat
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* Real headers — mobile + desktop */}
      <div className="lg:hidden"><Header showMenu /></div>
      <div className="hidden lg:block"><DesktopHeader /></div>

      {/* Hero Section with Background */}
      <div className="relative overflow-hidden" style={{ minHeight: '420px' }}>
        {/* Background Image */}
        <img
          src="/images/IMG_8724.JPG"
          alt="NoxyStore background"
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        {/* Gradient overlay — lighter at top so image shows, dark at bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/30 via-[#0a0a0a]/20 to-[#0a0a0a]" />

        {/* Content — pushed to top */}
        <div className="relative z-10 px-4 pt-5 pb-32 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center shadow-lg">
                <Gamepad2 className="w-6 h-6 text-black" />
              </div>
              <span className="text-2xl font-bold italic text-yellow-400 drop-shadow-lg">NOXYSTORE</span>
            </div>
          </div>

          {/* About Text */}
          <h2 className="text-base font-semibold mb-1 drop-shadow">About us:</h2>
          <p className="text-gray-200 text-sm max-w-sm mx-auto leading-relaxed drop-shadow">
            NoxyStore is a Secure and Trusted Game Store Chosen by Millions of Players, 
            offering game top up, item trading, and game currency trading services and more.
          </p>
        </div>
      </div>

      {/* Stats Section - below the hero image */}
      <div className="bg-[#0a0a0a] px-4 py-6">
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Wheat className="w-3 h-3 text-gray-500" />
              <span className="text-xl font-bold text-white">150+</span>
              <Wheat className="w-3 h-3 text-gray-500" />
            </div>
            <p className="text-[10px] text-gray-400">Games Supported on NoxyStore</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Wheat className="w-3 h-3 text-gray-500" />
              <span className="text-xl font-bold text-white">99%</span>
              <Wheat className="w-3 h-3 text-gray-500" />
            </div>
            <p className="text-[10px] text-gray-400">Purchases received 5-star reviews</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Wheat className="w-3 h-3 text-gray-500" />
              <span className="text-xl font-bold text-white">5M+</span>
              <Wheat className="w-3 h-3 text-gray-500" />
            </div>
            <p className="text-[10px] text-gray-400">Gamers' Choice</p>
          </div>
        </div>
      </div>

      {/* What We Offer Section */}
      <div className="bg-white text-gray-900 px-4 py-10">
        <h2 className="text-xl font-bold text-center mb-3">What does NoxyStore offer?</h2>
        <p className="text-center text-gray-600 text-sm max-w-sm mx-auto mb-6">
          NoxyStore offers game top-up, game currency trading, game keys, gift cards 
          and game items for 150+ games. Safe, convenient, and efficient!
        </p>

        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          {/* Game Top-Up */}
          <div className="bg-gray-50 rounded-2xl p-5 text-center">
            <div className="w-10 h-10 bg-orange-400 rounded-xl flex items-center justify-center mx-auto mb-2">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-sm mb-1">Game Top-Up</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Safe, reliable, and cost-effective game top-up services for 80+ games.
            </p>
          </div>

          {/* Game Coins */}
          <div className="bg-gray-50 rounded-2xl p-5 text-center">
            <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Star className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-sm mb-1">Game Coins</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Simple and affordable way to get the in-game currency for 25+ games without delay.
            </p>
          </div>

          {/* Game Keys & Gift Cards */}
          <div className="bg-gray-50 rounded-2xl p-5 text-center">
            <div className="w-10 h-10 bg-red-400 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-sm mb-1">Game Keys & Gift Cards</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Secure and fast delivery gift card, supporting Apple gift cards, Steam gift cards, etc.
            </p>
          </div>

          {/* Game Items */}
          <div className="bg-gray-50 rounded-2xl p-5 text-center">
            <div className="w-10 h-10 bg-blue-400 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Sword className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-sm mb-1">Game Items</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Direct, cost-effective, and time-saving service for in-game items purchasing for popular games.
            </p>
          </div>
        </div>
      </div>

      {/* Why Choose Us Section */}
      <div className="bg-gray-100 text-gray-900 px-4 py-10">
        <h2 className="text-xl font-bold text-center mb-3">Why choose NoxyStore?</h2>
        <p className="text-center text-gray-600 text-sm max-w-sm mx-auto mb-6">
          NoxyStore continues to provide a seamless and affordable game trading experience 
          for players worldwide, enabling you to fully enjoy your favorite games. Play more and pay less.
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
          {/* Best Prices */}
          <div className="text-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
              <BadgePercent className="w-6 h-6 text-gray-700" />
            </div>
            <h3 className="font-bold text-sm mb-1">Best Recharge Prices</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              We have the most competitive recharge prices, up to 30% off.
            </p>
          </div>

          {/* Fast Delivery */}
          <div className="text-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
              <Zap className="w-6 h-6 text-gray-700" />
            </div>
            <h3 className="font-bold text-sm mb-1">Fast Delivery Time</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              We offer the fastest delivery in just 3 minutes for non-stop gaming.
            </p>
          </div>

          {/* Safe Transaction */}
          <div className="text-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
              <ShieldCheck className="w-6 h-6 text-gray-700" />
            </div>
            <h3 className="font-bold text-sm mb-1">100% Safe Transaction</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              We ensure professional and secure transactions with full protection of your data.
            </p>
          </div>

          {/* Professional Service */}
          <div className="text-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
              <Headphones className="w-6 h-6 text-gray-700" />
            </div>
            <h3 className="font-bold text-sm mb-1">Professional Service Team</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Our customer service team is available anytime, offering fast and reliable assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
make this better in desktop and also fix img lan poul paret.
