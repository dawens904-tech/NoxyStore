import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Check, ChevronRight, X, Info } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import inviteReward from "@/assets/invite-reward.png";
import couponSave5 from "@/assets/coupon-save5.png";
import { toast } from "sonner";

interface ReferralData {
  code: string;
  short_code: string;
  users_invited: number;
  orders_completed: number;
  total_spending: number;
}

interface TaskMilestone {
  label: string;
  target: number;
  current: number;
  reward: string;
  rewardImg: string;
}

interface TaskGroup {
  key: string;
  title: string;
  description: string;
  rewardImg: string;
  rewardLabel: string;
  milestones: TaskMilestone[];
  groupProgress: { current: number; total: number };
}

// Social platform SVGs
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.843L1.254 2.25H8.08l4.257 5.629L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.079.11 18.1.128 18.11a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

function generateReferralCode(userId: string) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seed = userId.replace(/-/g, "").slice(0, 8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    const idx = parseInt(seed[i] || "0", 16) % chars.length;
    code += chars[idx];
  }
  return code;
}

function generateShortCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function InvitePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [useShorter, setUseShorter] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskGroup | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showTaskInfo, setShowTaskInfo] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { navigate("/login"); return; }
    loadOrCreateReferral();
  }, [isAuthenticated]);

  const loadOrCreateReferral = async () => {
    if (!user?.email || !user?.id) return;
    const { data } = await supabase
      .from("referral_codes")
      .select("*")
      .eq("user_email", user.email)
      .single();

    if (data) {
      setReferral(data as ReferralData);
    } else {
      const code = generateReferralCode(user.id);
      const shortCode = generateShortCode();
      const { data: created } = await supabase
        .from("referral_codes")
        .insert({
          user_id: user.id,
          user_email: user.email,
          code,
          short_code: shortCode,
          users_invited: 0,
          orders_completed: 0,
          total_spending: 0,
        })
        .select()
        .single();
      if (created) setReferral(created as ReferralData);
    }
  };

  const inviteLink = useShorter
    ? `https://noxystore.gg/s/${referral?.short_code || "..."}`
    : `https://noxystore.gg?share_token=${referral?.code || "..."}&utm_source=copy&utm_campaign=p_invite&utm_medium=social`;

  const shareText = `Sign up on NoxyStore.gg using my link to claim 2 coupons that can save up to $20! Buy safe game top-up, game items, and game coins here with fast delivery and great price! ${inviteLink}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: string) => {
    const encoded = encodeURIComponent(shareText);
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encoded}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}&quote=${encoded}`,
      whatsapp: `https://wa.me/?text=${encoded}`,
      discord: `https://discord.com/channels/@me`,
    };
    if (urls[platform]) window.open(urls[platform], "_blank");
  };

  const usersInvited = referral?.users_invited || 0;
  const ordersCompleted = referral?.orders_completed || 0;
  const totalSpending = referral?.total_spending || 0;

  const taskGroups: TaskGroup[] = [
    {
      key: "invite_master",
      title: "Invite Master",
      description: "Invite new users to join NoxyStore and become an Invite Master!",
      rewardImg: couponSave5,
      rewardLabel: "SAVE $5",
      groupProgress: { current: usersInvited, total: 5 },
      milestones: [
        { label: "Invite 1 new user to sign up", target: 1, current: Math.min(usersInvited, 1), reward: "8% OFF Coupon", rewardImg: couponSave5 },
        { label: "Invite 2 new user to sign up", target: 2, current: Math.min(usersInvited, 2), reward: "8% OFF Coupon", rewardImg: couponSave5 },
        { label: "Invite 3 new user to sign up", target: 3, current: Math.min(usersInvited, 3), reward: "8% OFF Coupon", rewardImg: couponSave5 },
        { label: "Invite 5 new user to sign up", target: 5, current: Math.min(usersInvited, 5), reward: "10% OFF Coupon", rewardImg: couponSave5 },
        { label: "Invite 10 new user to sign up", target: 10, current: Math.min(usersInvited, 10), reward: "10% OFF Coupon", rewardImg: couponSave5 },
      ],
    },
    {
      key: "slow_steady_basic",
      title: "Slow and Steady – Basic",
      description: "Earn rewards as your invited users reach these purchasing milestones!",
      rewardImg: couponSave5,
      rewardLabel: "SAVE $5",
      groupProgress: { current: ordersCompleted, total: 3 },
      milestones: [
        { label: "5 new users each complete an order (min. $5)", target: 5, current: Math.min(ordersCompleted, 5), reward: "8% OFF Coupon", rewardImg: couponSave5 },
        { label: "New users complete a total of 5 orders (min. $5 each)", target: 5, current: Math.min(ordersCompleted, 5), reward: "8% OFF Coupon", rewardImg: couponSave5 },
        { label: "New users spend a total of $60", target: 60, current: Math.min(totalSpending, 60), reward: "SAVE $3 Coupon", rewardImg: couponSave5 },
      ],
    },
    {
      key: "slow_steady_advanced",
      title: "Slow and Steady – Advanced",
      description: "Will your invited users keep spending and unlock even more rewards for you?",
      rewardImg: couponSave5,
      rewardLabel: "SAVE $15",
      groupProgress: { current: ordersCompleted, total: 3 },
      milestones: [
        { label: "8 new users each complete an order (min. $5)", target: 8, current: Math.min(ordersCompleted, 8), reward: "12% OFF Coupon", rewardImg: couponSave5 },
        { label: "New users complete a total of 15 orders (min. $5 each)", target: 15, current: Math.min(ordersCompleted, 15), reward: "10% OFF Coupon", rewardImg: couponSave5 },
        { label: "5 new users each spend at least $60", target: 5, current: 0, reward: "SAVE $10 Coupon", rewardImg: couponSave5 },
      ],
    },
  ];

  const socialPlatforms = [
    { key: "twitter", label: "X", icon: <XIcon />, bg: "bg-black", text: "text-white" },
    { key: "facebook", label: "Facebook", icon: <FacebookIcon />, bg: "bg-[#1877F2]", text: "text-white" },
    { key: "whatsapp", label: "WhatsApp", icon: <WhatsAppIcon />, bg: "bg-[#25D366]", text: "text-white" },
    { key: "discord", label: "Discord", icon: <DiscordIcon />, bg: "bg-[#5865F2]", text: "text-white" },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="hidden lg:block"><DesktopHeader /></div>
      <div className="lg:hidden"><Header showBack title="Invite for Coupons" /></div>

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-24 lg:pb-8">
        {/* Hero banner */}
        <div className="bg-yellow-400 rounded-2xl p-5 mb-5 relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h2 className="font-black text-gray-900 text-lg leading-tight mb-1">
                Invite new users to sign up and make orders to earn multiple rewards!
              </h2>
              <p className="text-gray-700 text-sm">The more users you invite the more rewards you could earn!</p>
              <button
                onClick={() => setShowRules(true)}
                className="flex items-center gap-1 text-blue-700 font-semibold text-sm mt-2 hover:underline"
              >
                Click here to view the rules <ChevronRight size={14} />
              </button>
            </div>
            <img src={inviteReward} alt="Invite rewards" className="w-24 h-24 object-contain flex-shrink-0" />
          </div>
        </div>

        {/* Social share */}
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-center gap-6 mb-5">
            {socialPlatforms.map((p) => (
              <button
                key={p.key}
                onClick={() => handleShare(p.key)}
                className="flex flex-col items-center gap-2"
              >
                <div className={`w-12 h-12 ${p.bg} rounded-full flex items-center justify-center ${p.text} shadow-md hover:scale-105 transition-transform`}>
                  {p.icon}
                </div>
                <span className="text-xs text-gray-600 font-medium">{p.label}</span>
              </button>
            ))}
          </div>

          {/* Link */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-500 font-mono truncate">
              {inviteLink}
            </div>
            <button
              onClick={handleCopy}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              {copied ? <Check size={16} /> : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              )}
              Copy Link
            </button>
          </div>

          {/* Short link toggle */}
          <button
            onClick={() => setUseShorter(!useShorter)}
            className="flex items-center gap-2 text-sm text-gray-600"
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${useShorter ? "bg-yellow-400 border-yellow-400" : "border-gray-300"}`}>
              {useShorter && <Check size={11} className="text-black" />}
            </div>
            Share with a shorter link
          </button>
        </div>

        {/* Invite Progress */}
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <h3 className="font-black text-gray-900 text-base mb-4">Invite Progress Overview</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-black text-orange-500">{usersInvited}</p>
              <p className="text-xs text-gray-500 mt-0.5">Users Invited</p>
            </div>
            <div>
              <p className="text-2xl font-black text-orange-500">{ordersCompleted}</p>
              <p className="text-xs text-gray-500 mt-0.5">Orders Completed</p>
            </div>
            <div>
              <p className="text-2xl font-black text-orange-500">${totalSpending.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Spending</p>
            </div>
          </div>
        </div>

        {/* Task & Reward */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-yellow-400 rounded-full" />
            <h3 className="font-black text-gray-900 text-base">Task &amp; Reward</h3>
            <button onClick={() => setShowTaskInfo(true)} className="text-gray-400 hover:text-gray-600">
              <Info size={16} />
            </button>
          </div>

          <div className="space-y-3">
            {taskGroups.map((group) => (
              <div key={group.key} className="border border-gray-100 rounded-2xl p-4 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute right-0 top-0 w-24 h-24 opacity-5">
                  <img src={couponSave5} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h4 className="font-black text-gray-900 text-sm">{group.title}</h4>
                    <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{group.description}</p>
                    <button
                      onClick={() => toast.info("Rewards will be sent to your coupon wallet after claiming.")}
                      className="mt-2 bg-yellow-200 hover:bg-yellow-300 text-yellow-800 font-bold text-xs px-4 py-1.5 rounded-xl transition-colors"
                    >
                      Claim
                    </button>
                  </div>
                  <img src={group.rewardImg} alt="reward" className="w-14 h-14 object-contain flex-shrink-0" />
                </div>
                <button
                  onClick={() => setSelectedTask(group)}
                  className="flex items-center justify-between w-full mt-3 pt-3 border-t border-gray-100 text-left"
                >
                  <span className="text-sm text-gray-600">
                    Group Progress: {group.groupProgress.current} / {group.groupProgress.total}
                  </span>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-500 mt-4 leading-relaxed">
            The more users you invite the more rewards you could earn!{" "}
            <button onClick={() => setShowRules(true)} className="text-blue-500 font-semibold">
              Click here to view the rule
            </button>
          </p>
        </div>
      </div>

      {/* Task detail modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedTask(null)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={() => setSelectedTask(null)}><X size={20} className="text-gray-700" /></button>
              <h3 className="font-black text-gray-900 text-base">{selectedTask.title}</h3>
              <div className="w-6" />
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600 mb-4">
                Group Progress: {selectedTask.groupProgress.current} / {selectedTask.groupProgress.total}
              </p>
              <div className="space-y-3">
                {selectedTask.milestones.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-3 border border-gray-100 rounded-2xl p-4">
                    <img src={m.rewardImg} alt="coupon" className="w-14 h-14 object-contain rounded-xl flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">{m.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Progress: {m.current} / {m.target}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task & Reward info modal */}
      {showTaskInfo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowTaskInfo(false)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={() => setShowTaskInfo(false)}><X size={20} className="text-gray-700" /></button>
              <h3 className="font-black text-gray-900 text-base">Task &amp; Reward</h3>
              <div className="w-6" />
            </div>
            <div className="px-5 py-5 space-y-4 text-gray-700 text-sm leading-relaxed">
              <p>In this module, you will see multiple task groups, each consisting of several small task units with different rewards. You can click on the reward image on the task card to learn more about the specific rewards for each task.</p>
              <p>By inviting new users and encouraging them to place orders, you can progress in the tasks, unlocking corresponding rewards as you reach certain milestones. Once you complete all tasks within a group, you will receive the ultimate reward for that group, recognizing your outstanding performance in attracting new users!</p>
              <p className="font-semibold">Please note:</p>
              <p>Rewards are not automatically issued — we will send the corresponding rewards to your NoxyStore account in the form of coupons only after you click to claim them. Remember to use them within 30 days of claiming!</p>
            </div>
            <div className="px-5 pb-6">
              <button onClick={() => setShowTaskInfo(false)} className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-4 rounded-2xl">Ok</button>
            </div>
          </div>
        </div>
      )}

      {/* Program Rules modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRules(false)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={() => setShowRules(false)}><X size={20} className="text-gray-700" /></button>
              <h3 className="font-black text-gray-900 text-base">Program Rules</h3>
              <div className="w-6" />
            </div>
            <div className="px-5 py-5 space-y-4 text-gray-700 text-sm leading-relaxed">
              <p>In this program, you can invite new users to sign up through the share component at the top of the page. You'll earn various rewards by completing milestone tasks based on the number of users you invite and their spending. The more users you invite and the more they spend, the more rewards you'll unlock.</p>
              <div>
                <p className="font-bold text-gray-900 mb-2">Rules</p>
                <p className="mb-3">1. Any new user who signs up using your link will receive 2 coupons, each up to a maximum save of $10.</p>
                <p className="mb-3">2. For all users who <span className="text-orange-500 font-semibold">sign up through your link</span>, their sign-ups and purchases will count toward your invite task progress once the orders are successfully completed. There may be a slight delay in processing, but rest assured—every valid new user will be counted.</p>
                <p className="mb-3">3. For orders with refunds or partial refunds, your task progress settlement will be based on the user's final order completion status and the actual amount paid.</p>
                <p className="mb-3">4. Each invited user can only be counted once toward your progress. Duplicate accounts or fraudulent activities will be disqualified.</p>
                <p>5. NoxyStore reserves the right to modify or terminate this program at any time with prior notice.</p>
              </div>
            </div>
            <div className="px-5 pb-6">
              <button onClick={() => setShowRules(false)} className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-4 rounded-2xl">Ok</button>
            </div>
          </div>
        </div>
      )}

      <div className="lg:hidden"><BottomNav /></div>
    </div>
  );
}
