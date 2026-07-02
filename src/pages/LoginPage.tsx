import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Eye, EyeOff, X, Loader2, ChevronRight, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { toast } from "sonner";

type LoginView = "main" | "email" | "otp" | "setPassword" | "verifyEmail" | "forgotPassword";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, signInWithGoogle, signInWithDiscord, sendOtp, verifyOtp, setPassword: setAccountPassword, signInWithPassword } = useAuth();
  const { t } = useTranslation();

  const [view, setView] = useState<LoginView>("main");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [resendTimer, setResendTimer] = useState(55);

  const handleClose = () => navigate(-1);

  // Countdown timer for resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (view === "verifyEmail" && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [view, resendTimer]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast.error(err.message || "Google login failed");
    }
  };

  const handleDiscordLogin = async () => {
    try {
      await signInWithDiscord();
    } catch (err: any) {
      toast.error(err.message || "Discord login failed");
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Please enter your email"); return; }
    setIsLoading(true);
    try {
      await sendOtp(email);
      setView("verifyEmail");
      setResendTimer(55);
      toast.success("Verification email sent!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) { toast.error("Please enter the verification code"); return; }
    setIsLoading(true);
    try {
      await verifyOtp(email, otp);
      if (isRegister) {
        setView("setPassword");
      } else {
        toast.success("Logged in successfully!");
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setIsLoading(true);
    try {
      await setAccountPassword(password, email.split("@")[0]);
      toast.success("Account created successfully! Welcome to NoxyStore!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to set password");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { toast.error("Please fill in all fields"); return; }
    setIsLoading(true);
    try {
      await signInWithPassword(email, password);
      toast.success("Welcome back!");
      navigate("/");
    } catch (err: any) {
      if (err.message?.includes("Invalid login credentials")) {
        toast.error("Wrong email or password. Try sending a verification code.");
      } else {
        toast.error(err.message || "Login failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Please enter your email"); return; }
    setIsLoading(true);
    try {
      await sendOtp(email);
      setView("verifyEmail");
      setResendTimer(55);
      toast.success("Password reset link sent to your email!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset link");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Social Login Buttons (Photo 1 style: circular icons top) ───
  const SocialLoginButtons = () => (
    <div className="flex items-center justify-center gap-4 mb-6">
      {/* Google - opens right */}
      <button
        onClick={handleGoogleLogin}
        className="w-11 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-sm"
        title="Google"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      </button>

      {/* Facebook */}
      <button
        onClick={() => toast.info("Facebook login coming soon!")}
        className="w-11 h-11 rounded-full bg-[#1877F2] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-sm"
        title="Facebook"
      >
        <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      </button>

      {/* Discord */}
      <button
        onClick={handleDiscordLogin}
        className="w-11 h-11 rounded-full bg-[#5865F2] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-sm"
        title="Discord"
      >
        <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
      </button>

      {/* Apple */}
      <button
        onClick={() => toast.info("Apple login coming soon!")}
        className="w-11 h-11 rounded-full bg-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-sm"
        title="Apple"
      >
        <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
      </button>
    </div>
  );

  // ─── Divider ───
  const Divider = () => (
    <div className="flex items-center gap-3 mb-6">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-sm text-gray-400">Or</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );

  // ─── Email Input (Photo 1 style) ───
  const EmailInput = () => (
    <div className="space-y-2">
      <p className="text-center text-sm text-gray-400">Please enter a valid email address</p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter email address"
        className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
        autoFocus
      />
      {isRegister && (
        <p className="text-xs text-red-500">Enter email address</p>
      )}
      <button
        onClick={handleSendOtp}
        disabled={isLoading || !email.trim()}
        className="w-full py-3.5 rounded-xl bg-yellow-400 text-black font-bold text-base hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        {isLoading ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Processing...</span> : "Next →"}
      </button>
    </div>
  );

  // ─── Password Login (Photo 2 style) ───
  const PasswordLogin = () => (
    <div className="space-y-4">
      <div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
          readOnly
        />
      </div>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Please enter your password"
          className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all pr-12"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setView("forgotPassword")}
          className="text-sm text-orange-400 hover:text-orange-500 font-medium"
        >
          Forgot Password?
        </button>
      </div>
      <button
        onClick={handlePasswordLogin}
        disabled={isLoading}
        className="w-full py-3.5 rounded-xl bg-yellow-400 text-black font-bold text-base hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        {isLoading ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Logging in...</span> : "Login"}
      </button>
    </div>
  );

  // ─── Verify Email (Photo 3 style) ───
  const VerifyEmailStep = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Verify Email</h2>
      <p className="text-sm text-gray-500">Verification email sent to: <span className="font-medium text-gray-700">{email}</span></p>
      <button
        onClick={handleSendOtp}
        disabled={isLoading || resendTimer > 0}
        className="w-full py-3.5 rounded-xl bg-yellow-400 text-black font-bold text-base hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Verification Email"}
      </button>
      <div className="flex items-start gap-2 bg-orange-50 rounded-lg p-3">
        <span className="text-orange-500 mt-0.5">!</span>
        <p className="text-xs text-orange-600 leading-relaxed">
          Click the link in the verification email to complete registration. Check spam folder if not received
        </p>
      </div>
    </div>
  );

  // ─── Forgot Password ───
  const ForgotPasswordStep = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
      <p className="text-sm text-gray-500">Enter your email to receive a password reset link</p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
        autoFocus
      />
      <button
        onClick={handleForgotPassword}
        disabled={isLoading || !email.trim()}
        className="w-full py-3 rounded-lg bg-yellow-400 text-black font-bold hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isLoading ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Sending...</span> : "Send Reset Link"}
      </button>
    </div>
  );

  // ─── OTP Step ───
  const OtpStep = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
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
          className="w-full px-4 py-3 rounded-lg border border-gray-200 text-center text-2xl tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
          autoFocus
          maxLength={6}
        />
      </div>
      <button
        onClick={handleVerifyOtp}
        disabled={isLoading}
        className="w-full py-3 rounded-lg bg-yellow-400 text-black font-bold hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isLoading ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Verifying...</span> : "Verify Code"}
      </button>
      <button type="button" onClick={handleSendOtp} className="w-full text-center text-sm text-gray-500 py-1 hover:text-gray-700">
        Resend code
      </button>
    </div>
  );

  // ─── Set Password Step ───
  const SetPasswordStep = () => (
    <div className="space-y-4">
      <div className="bg-green-50 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
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
            className="w-full px-4 py-3 rounded-lg border border-gray-200 pr-12 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
            autoFocus
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <button
        onClick={handleSetPassword}
        disabled={isLoading}
        className="w-full py-3 rounded-lg bg-yellow-400 text-black font-bold hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isLoading ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Creating...</span> : "Create Account"}
      </button>
    </div>
  );

  // ─── Legal Footer ───
  const Legal = () => (
    <p className="text-center text-xs text-gray-400 leading-relaxed">
      By registering or logging in, you agree to our{" "}
      <button className="underline hover:text-gray-600">Privacy Policy</button> /{" "}
      <button className="underline hover:text-gray-600">Terms of Service</button> /{" "}
      <button className="underline hover:text-gray-600">Cookie Policy</button>
    </p>
  );

  // ─── Main Login Modal (Photo 1 style) ───
  const MainLogin = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Sign In/Register</h2>
      <SocialLoginButtons />
      <Divider />
      <EmailInput />
      <Legal />
    </div>
  );

  // ─── Email/Password View (Photo 2 style) ───
  const EmailPasswordView = () => (
    <div className="space-y-4">
      <button onClick={() => setView("main")} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium">
        <ArrowLeft size={16} /> Back
      </button>
      <h2 className="text-2xl font-bold text-gray-900">Login</h2>
      <PasswordLogin />
      <Legal />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blurred backdrop - page behind is visible but blurred */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />
      
      {/* Modal — solid white on desktop, full page on mobile */}
      <div className="relative bg-white w-full min-h-screen flex flex-col justify-center sm:min-h-0 sm:block sm:max-w-md sm:mx-4 sm:rounded-2xl sm:shadow-2xl overflow-y-auto p-8">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          <X size={16} className="text-gray-500" />
        </button>

        {view === "main" && <MainLogin />}
        {view === "email" && <EmailPasswordView />}
        {view === "otp" && (
          <>
            <button onClick={() => setView("email")} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm font-medium">
              <ArrowLeft size={16} /> Back
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Enter Code</h2>
            <OtpStep />
          </>
        )}
        {view === "setPassword" && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Set Password</h2>
            <SetPasswordStep />
          </>
        )}
        {view === "verifyEmail" && (
          <>
            <button onClick={() => setView("main")} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm font-medium">
              <ArrowLeft size={16} /> Back
            </button>
            <VerifyEmailStep />
            <div className="mt-4">
              <Legal />
            </div>
          </>
        )}
        {view === "forgotPassword" && (
          <>
            <button onClick={() => setView("email")} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm font-medium">
              <ArrowLeft size={16} /> Back
            </button>
            <ForgotPasswordStep />
          </>
        )}
      </div>
    </div>
  );
}
