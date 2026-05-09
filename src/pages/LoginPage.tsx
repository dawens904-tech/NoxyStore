import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Eye, EyeOff, X, Loader2, ChevronRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore, mapSupabaseUser } from "@/stores/authStore";
import { useTranslation } from "@/hooks/useTranslation";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { toast } from "sonner";

type LoginView = "main" | "email" | "otp" | "setPassword";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { t } = useTranslation();

  const [view, setView] = useState<LoginView>("main");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");

  const handleClose = () => navigate(-1);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { access_type: "offline", prompt: "consent" },
        skipBrowserRedirect: false,
      },
    });
    if (error) toast.error(error.message);
  };

  // Only listen to auth changes - don't re-navigate if already logged in
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("email", session.user.email)
          .single();
        const role = roleData?.role || "user";
        const authUser = mapSupabaseUser(session.user, role);
        login(authUser);
        useAuthStore.getState().syncOrdersFromDB(session.user.email!);
        toast.success(`Welcome back, ${authUser.nickname}!`);
        navigate("/");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Please enter your email"); return; }
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setIsLoading(false);
    if (error) { toast.error(error.message); return; }
    setView("otp");
    toast.success("Verification code sent to your email!");
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) { toast.error("Please enter the verification code"); return; }
    setIsLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otp.trim(), type: "email" });
    setIsLoading(false);
    if (error) { toast.error(error.message); return; }
    if (isRegister) {
      setView("setPassword");
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setIsLoading(true);
    const username = email.split("@")[0];
    const { error } = await supabase.auth.updateUser({ password, data: { username } });
    setIsLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account created successfully!");
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { toast.error("Please fill in all fields"); return; }
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setIsLoading(false);
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Wrong email or password. Try sending a verification code.");
      } else {
        toast.error(error.message);
      }
    }
  };

  const EmailStep = () => (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">{t("email")}</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="input-field"
          autoFocus
          required
        />
      </div>
      {!isRegister && (
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">{t("password")}</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="input-field pr-12"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      )}
      <button
        onClick={isRegister ? handleSendOtp : handlePasswordLogin}
        disabled={isLoading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {isLoading ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : (isRegister ? "Send Verification Code" : t("login"))}
      </button>
      {!isRegister && (
        <button
          type="button"
          onClick={handleSendOtp}
          disabled={isLoading}
          className="w-full text-center text-sm text-yellow-600 font-semibold py-2 hover:text-yellow-700"
        >
          Login with verification code instead
        </button>
      )}
    </div>
  );

  const OtpStep = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-2xl p-3 text-sm text-blue-700">
        Verification code sent to <span className="font-bold">{email}</span>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
          Verification Code
        </label>
        <input
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Enter 4-6 digit code"
          className="input-field text-center text-2xl tracking-widest font-bold"
          autoFocus
          maxLength={6}
        />
      </div>
      <button
        onClick={handleVerifyOtp}
        disabled={isLoading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {isLoading ? <><Loader2 size={16} className="animate-spin" /> Verifying...</> : "Verify Code"}
      </button>
      <button type="button" onClick={handleSendOtp} className="w-full text-center text-sm text-gray-500 py-1">
        Resend code
      </button>
    </div>
  );

  const SetPasswordStep = () => (
    <div className="space-y-4">
      <div className="bg-green-50 rounded-2xl p-3 text-sm text-green-700 flex items-center gap-2">
        <span className="text-green-500">✓</span> Email verified! Set a password for your account.
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Create Password</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 6 characters"
            className="input-field pr-12"
            autoFocus
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <button
        onClick={handleSetPassword}
        disabled={isLoading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {isLoading ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : "Create Account"}
      </button>
    </div>
  );

  const SocialButtons = () => (
    <div className="space-y-3">
      {[
        { label: "Log in with Google", bg: "bg-white border-2 border-gray-200 text-gray-800", icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        ), badge: "Last login", isGoogle: true },
        { label: "Log in with Apple", bg: "bg-black text-white", icon: <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg> },
        { label: "Log in with Facebook", bg: "bg-[#1877F2] text-white", icon: <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
        { label: "Log in with Email", bg: "bg-yellow-400 text-black", icon: <Mail className="w-5 h-5" />, isEmail: true },
      ].map((btn) => (
        <button
          key={btn.label}
          onClick={() => {
            if ((btn as any).isEmail) { setView("email"); }
            else if ((btn as any).isGoogle) { handleGoogleLogin(); }
            else { toast.info("Currently only Google and Email login are supported."); }
          }}
          className={`w-full flex items-center justify-center relative ${btn.bg} rounded-2xl py-4 px-5 font-bold hover:opacity-90 transition-all active:scale-[0.99]`}
        >
          <span className="absolute left-4">{btn.icon}</span>
          <span>{btn.label}</span>
          {btn.badge && <span className="absolute right-4 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">{btn.badge}</span>}
        </button>
      ))}
    </div>
  );

  const TrustBadges = () => (
    <div className="flex items-center justify-center gap-5 pt-4 border-t border-gray-100">
      {[{ value: "4.9", label: "Trustpilot 30K+\nReviews", icon: "★" }, { value: "30%", label: "Up to 30% OFF" }, { value: "10M+", label: "Gamers' Choice" }].map((item, i) => (
        <div key={i} className="flex items-center gap-5">
          {i > 0 && <div className="h-6 w-px bg-gray-200" />}
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              {item.icon && <span className="text-yellow-500 text-sm">{item.icon}</span>}
              <span className="font-bold text-sm text-gray-800">{item.value}</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5 whitespace-pre-line">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const Legal = () => (
    <p className="text-center text-xs text-gray-400 leading-relaxed">
      By registering or logging in, you agree to our{" "}
      <button className="underline hover:text-gray-600">Privacy Policy</button> /{" "}
      <button className="underline hover:text-gray-600">Terms of Service</button> /{" "}
      <button className="underline hover:text-gray-600">Cookie Policy</button>
    </p>
  );

  const DesktopLogin = () => (
    <div className="hidden lg:block min-h-screen bg-[#f5f5f5]">
      <DesktopHeader />
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 p-8 relative">
          <button onClick={handleClose} className="absolute top-5 right-5 w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X size={18} className="text-gray-700" />
          </button>

          {view === "main" && (
            <>
              <h2 className="text-2xl font-black text-gray-900 mb-2">{t("loginSignup")}</h2>
              <p className="text-sm text-gray-500 mb-6">Welcome to NoxyStore — your gaming top-up marketplace</p>
              <div className="flex items-center justify-center gap-6 mb-6">
                {[
                  { provider: "Google", icon: <svg viewBox="0 0 24 24" className="w-8 h-8"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>, badge: true, isGoogle: true },
                  { provider: "Apple", icon: <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center"><svg fill="white" viewBox="0 0 24 24" className="w-5 h-5"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg></div> },
                  { provider: "Facebook", icon: <div className="w-10 h-10 bg-[#1877F2] rounded-full flex items-center justify-center"><svg fill="white" viewBox="0 0 24 24" className="w-5 h-5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></div> },
                  { provider: "Email", icon: <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center"><Mail size={20} className="text-black" /></div>, isEmail: true },
                ].map(({ provider, icon, badge, isEmail, isGoogle }) => (
                  <div key={provider} className="relative flex flex-col items-center">
                    <button
                      onClick={() => {
                        if (isEmail) { setView("email"); }
                        else if (isGoogle) { handleGoogleLogin(); }
                        else { toast.info("Currently only Google and Email login are supported."); }
                      }}
                      className="hover:scale-105 active:scale-95 transition-transform"
                    >
                      {icon}
                    </button>
                    {badge && (
                      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">Last login</span>
                    )}
                  </div>
                ))}
                <button className="w-10 h-10 border-2 border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50">
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              </div>
              <div className="mt-4">
                <Legal />
              </div>
              <div className="mt-5">
                <TrustBadges />
              </div>
            </>
          )}

          {view === "email" && (
            <>
              <button onClick={() => setView("main")} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm font-medium">
                <ArrowLeft size={16} /> Back
              </button>
              <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
                <button onClick={() => setIsRegister(false)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${!isRegister ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>Login</button>
                <button onClick={() => setIsRegister(true)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${isRegister ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>Register</button>
              </div>
              <EmailStep />
            </>
          )}

          {view === "otp" && (
            <>
              <button onClick={() => setView("email")} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm font-medium">
                <ArrowLeft size={16} /> Back
              </button>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Enter Code</h2>
              <OtpStep />
            </>
          )}

          {view === "setPassword" && (
            <>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Set Password</h2>
              <SetPasswordStep />
            </>
          )}
        </div>
      </div>
    </div>
  );

  const MobileLogin = () => (
    <div className="lg:hidden min-h-screen">
      {view === "main" && (
        <div className="bg-[#FDFDF5] min-h-screen relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-60" />
          <div className="absolute top-20 left-0 w-24 h-24 bg-yellow-50 rounded-full -translate-x-1/2 opacity-80" />
          <div className="relative px-5 pt-8 pb-8">
            <button onClick={handleClose} className="absolute top-6 left-5 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-gray-200">
              <X size={18} className="text-gray-700" />
            </button>
            <div className="text-center pt-2 mb-6">
              <div className="font-black text-4xl">
                <span className="text-yellow-500">NOXY</span><span className="text-gray-900">STORE</span><span className="text-yellow-500">.gg</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-5 mb-8">
              {[{ value: "4.9", label: "Trustpilot 30K+\nReviews", icon: "★" }, { value: "30%", label: "Up to 30% OFF" }, { value: "10M+", label: "Gamers' Choice" }].map((item, idx) => (
                <div key={idx} className="flex items-center gap-5">
                  {idx > 0 && <div className="h-8 w-px bg-gray-200" />}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {item.icon && <span className="text-yellow-500 text-sm">{item.icon}</span>}
                      <span className="font-bold text-sm text-gray-800">{item.value}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 whitespace-pre-line">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <SocialButtons />
            <button className="w-full text-center mt-4 text-sm text-gray-500 font-medium flex items-center justify-center gap-2">
              Other login options <ChevronRight size={14} className="text-gray-400" />
            </button>
            <div className="mt-8">
              <Legal />
            </div>
          </div>
        </div>
      )}

      {(view === "email" || view === "otp" || view === "setPassword") && (
        <div className="bg-white min-h-screen">
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-yellow-50 to-white" />
          <div className="relative px-5 pt-6">
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => view === "email" ? navigate(-1) : setView(view === "otp" ? "email" : "otp")} className="text-gray-700 p-1">
                <ArrowLeft size={20} />
              </button>
              <div className="font-black text-2xl text-center">
                <span className="text-yellow-500">NOXY</span><span className="text-gray-900">STORE</span>
              </div>
              <div className="w-8" />
            </div>

            {view === "email" && (
              <>
                <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
                  <button onClick={() => setIsRegister(false)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${!isRegister ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>Login</button>
                  <button onClick={() => setIsRegister(true)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${isRegister ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>Register</button>
                </div>
                <EmailStep />
              </>
            )}
            {view === "otp" && (
              <>
                <h2 className="text-2xl font-black text-gray-900 mb-1">Enter Code</h2>
                <p className="text-gray-500 text-sm mb-6">Sent to {email}</p>
                <OtpStep />
              </>
            )}
            {view === "setPassword" && (
              <>
                <h2 className="text-2xl font-black text-gray-900 mb-1">Set Password</h2>
                <p className="text-gray-500 text-sm mb-6">Almost done!</p>
                <SetPasswordStep />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <DesktopLogin />
      <MobileLogin />
    </>
  );
}
