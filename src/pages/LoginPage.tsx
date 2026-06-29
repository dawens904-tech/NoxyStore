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
  const { login, signInWithGoogle, sendOtp, verifyOtp, setPassword: setAccountPassword, signInWithPassword } = useAuth();
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

      {/* LINE — photo placeholder (replace src with your LINE logo image) */}
      <button
        onClick={() => toast.info("LINE login coming soon!")}
        className="w-11 h-11 rounded-full overflow-hidden border border-gray-200 hover:scale-105 active:scale-95 transition-transform shadow-sm bg-[#00C300] flex items-center justify-center"
        title="LINE"
      >
        {/* Replace this img src with your LINE logo photo */}
        <img
          src="/images/line-logo.png"
          alt="LINE"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.innerHTML += '<svg class="w-5 h-5" fill="white" viewBox="0 0 24 24"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855-3.016c.26 0 .514.027.758.076.246.048.45.187.45.187s-.146.125-.24.203c-.094.078-.344.14-.344.14s-.14-.016-.26-.016c-.12 0-.36.047-.36.047v2.66c0 .345-.282.63-.63.63-.35 0-.63-.285-.63-.63V7.11c0-.345.28-.63.63-.63h.626zm-2.53 0c.348 0 .63.285.63.63v4.049c0 .345-.282.63-.63.63-.35 0-.63-.285-.63-.63V7.477c0-.345.28-.63.63-.63zm-2.846 0c.349 0 .63.285.63.63v2.056l1.768-2.133c.17-.204.43-.33.71-.33.28 0 .54.126.71.33.17.205.19.48.05.71l-1.36 1.64 1.518 2.04c.14.19.12.465-.05.67-.17.205-.43.33-.71.33-.28 0-.54-.125-.71-.33L10.5 10.52V11.5c0 .345-.281.63-.63.63-.35 0-.63-.285-.63-.63V7.477c0-.345.28-.63.63-.63zm-2.845 0c.348 0 .63.285.63.63v4.049c0 .345-.282.63-.63.63-.35 0-.63-.285-.63-.63V7.477c0-.345.28-.63.63-.63zm-2.53 0c.348 0 .63.285.63.63v.397h.63c.349 0 .63.284.63.63 0 .344-.281.629-.63.629h-.63v1.393h1.26c.349 0 .63.284.63.63 0 .344-.281.629-.63.629H2.63c-.35 0-.63-.285-.63-.629V7.477c0-.345.28-.63.63-.63h1.63zm15.18 5.79c0 3.046-3.07 5.524-6.86 5.524-1.17 0-2.27-.255-3.23-.703l-2.36 1.42c-.2.12-.44.03-.5-.2-.06-.23.09-.47.31-.52l1.96-.5c-1.57-1.17-2.58-2.87-2.58-4.78 0-3.05 3.07-5.53 6.86-5.53 3.79 0 6.86 2.48 6.86 5.53z"/></svg>';
          }}
        />
      </button>

      {/* Apple — photo placeholder (replace src with your Apple logo image) */}
      <button
        onClick={() => toast.info("Apple login coming soon!")}
        className="w-11 h-11 rounded-full overflow-hidden border border-gray-200 hover:scale-105 active:scale-95 transition-transform shadow-sm bg-black flex items-center justify-center"
        title="Apple"
      >
        {/* Replace this img src with your Apple logo photo */}
        <img
          src="/images/apple-logo.png"
          alt="Apple"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.innerHTML += '<svg class="w-5 h-5" fill="white" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>';
          }}
        />
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
        className="w-full py-3 rounded-lg bg-gray-100 text-gray-400 font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isLoading ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Processing...</span> : "Next"}
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
        className="w-full py-3 rounded-lg bg-gray-100 text-gray-400 font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
        className="w-full py-3 rounded-lg bg-gray-100 text-gray-400 font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {resendTimer > 0 ? `Resend Verification Email(${resendTimer})` : "Resend Verification Email"}
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
      
      {/* Modal container — large square, glass frosted effect */}
      <div className="relative bg-white/90 backdrop-blur-2xl rounded-2xl border border-white/60 shadow-2xl w-full max-w-md mx-4 p-8" style={{ minHeight: '440px' }}>
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
