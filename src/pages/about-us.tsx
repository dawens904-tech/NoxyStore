
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
  Headphones 
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
      <div className="relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60"
          style={{
            backgroundImage: `url('/mnt/agents/upload/IMG_8724.jpeg')`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-transparent to-[#0a0a0a]" />
        
        <div className="relative z-10 px-4 py-12 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center">
                <Gamepad2 className="w-8 h-8 text-black" />
              </div>
              <span className="text-3xl font-bold italic text-yellow-400">NOXYSTORE</span>
            </div>
          </div>

          {/* About Text */}
          <h2 className="text-lg font-semibold mb-2">About us:</h2>
          <p className="text-gray-300 max-w-md mx-auto leading-relaxed mb-8">
            NoxyStore is a Secure and Trusted Game Store Chosen by Millions of Players, 
            offering game top up, item trading, and game currency trading services and more.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-yellow-400">🌿</span>
                <span className="text-2xl font-bold">150+</span>
                <span className="text-yellow-400">🌿</span>
              </div>
              <p className="text-xs text-gray-400">Games Supported on NoxyStore</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-yellow-400">🌿</span>
                <span className="text-2xl font-bold">99%</span>
                <span className="text-yellow-400">🌿</span>
              </div>
              <p className="text-xs text-gray-400">Purchases received 5-star reviews</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-yellow-400">🌿</span>
                <span className="text-2xl font-bold">5M+</span>
                <span className="text-yellow-400">🌿</span>
              </div>
              <p className="text-xs text-gray-400">Gamers' Choice</p>
            </div>
          </div>
        </div>
      </div>

      {/* What We Offer Section */}
      <div className="bg-white text-gray-900 px-4 py-12">
        <h2 className="text-2xl font-bold text-center mb-4">What does NoxyStore offer?</h2>
        <p className="text-center text-gray-600 max-w-md mx-auto mb-8">
          NoxyStore offers game top-up, game currency trading, game keys, gift cards 
          and game items for 150+ games. Safe, convenient, and efficient!
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          {/* Game Top-Up */}
          <div className="bg-gray-50 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-orange-400 rounded-xl flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold mb-2">Game Top-Up</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Safe, reliable, and cost-effective game top-up services for 80+ games.
            </p>
          </div>

          {/* Game Coins */}
          <div className="bg-gray-50 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Star className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold mb-2">Game Coins</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Simple and affordable way to get the in-game currency for 25+ games without delay.
            </p>
          </div>

          {/* Game Keys & Gift Cards */}
          <div className="bg-gray-50 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-red-400 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold mb-2">Game Keys & Gift Cards</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Secure and fast delivery gift card, supporting Apple gift cards, Steam gift cards, etc.
            </p>
          </div>

          {/* Game Items */}
          <div className="bg-gray-50 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-blue-400 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Sword className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold mb-2">Game Items</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Direct, cost-effective, and time-saving service for in-game items purchasing for popular games.
            </p>
          </div>
        </div>
      </div>

      {/* Why Choose Us Section */}
      <div className="bg-gray-100 text-gray-900 px-4 py-12">
        <h2 className="text-2xl font-bold text-center mb-4">Why choose NoxyStore?</h2>
        <p className="text-center text-gray-600 max-w-md mx-auto mb-8">
          NoxyStore continues to provide a seamless and affordable game trading experience 
          for players worldwide, enabling you to fully enjoy your favorite games. Play more and pay less.
        </p>

        <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
          {/* Best Prices */}
          <div className="text-center">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
              <BadgePercent className="w-7 h-7 text-gray-700" />
            </div>
            <h3 className="font-bold mb-2">Best Recharge Prices</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              We have the most competitive recharge prices, up to 30% off.
            </p>
          </div>

          {/* Fast Delivery */}
          <div className="text-center">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Zap className="w-7 h-7 text-gray-700" />
            </div>
            <h3 className="font-bold mb-2">Fast Delivery Time</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              We offer the fastest delivery in just 3 minutes for non-stop gaming.
            </p>
          </div>

          {/* Safe Transaction */}
          <div className="text-center">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
              <ShieldCheck className="w-7 h-7 text-gray-700" />
            </div>
            <h3 className="font-bold mb-2">100% Safe Transaction</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              We ensure professional and secure transactions with full protection of your data.
            </p>
          </div>

          {/* Professional Service */}
          <div className="text-center">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Headphones className="w-7 h-7 text-gray-700" />
            </div>
            <h3 className="font-bold mb-2">Professional Service Team</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Our customer service team is available anytime, offering fast and reliable assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
