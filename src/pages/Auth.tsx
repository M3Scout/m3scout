import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowLeft, Loader2, Mail, Lock, User } from "lucide-react";
import { useAuth } from "@/hooks/authContext";
import { toast } from "sonner";
import { z } from "zod";
import logoM3 from "@/assets/logo-m3.png";
import { motion } from "framer-motion";

const emailSchema = z.string().email("E-mail inválido");
const passwordSchema = z.string().min(6, "Senha deve ter no mínimo 6 caracteres");

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bootMessage, setBootMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Show post-boot message (e.g., forced login after getSession timeout)
  useEffect(() => {
    try {
      const msg = sessionStorage.getItem("m3_auth_boot_message");
      if (msg) {
        setBootMessage(msg);
        sessionStorage.removeItem("m3_auth_boot_message");
        toast.error(msg);
      }
    } catch {
      // ignore
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      const from = (location.state as any)?.from?.pathname || "/app";
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, location]);
  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    const emailResult = emailSchema.safeParse(formData.email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(formData.password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    if (!isLogin && !formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("E-mail ou senha incorretos");
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success("Login realizado com sucesso!");
      } else {
        const { error } = await signUp(formData.email, formData.password, formData.name);
        if (error) {
          if (error.message.includes("User already registered")) {
            toast.error("Este e-mail já está cadastrado");
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success("Conta criada com sucesso! Você já pode acessar o sistema.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when typing
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070910]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#070910] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle red glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/[0.08] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/[0.05] rounded-full blur-[100px]" />
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '64px 64px'
          }}
        />
      </div>

      {/* Back Button - Mobile */}
      <Link 
        to="/" 
        className="absolute top-4 left-4 z-20 md:hidden p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        aria-label="Voltar para o site"
      >
        <ArrowLeft className="w-5 h-5 text-white/70" />
      </Link>

      {/* Left Side - Branding (Desktop Only) */}
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] flex-col justify-center items-center p-12 relative">
        <div className="max-w-md text-center">
          <motion.img 
            src={logoM3} 
            alt="M3 Scout" 
            className="h-16 lg:h-20 w-auto mx-auto mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          />
          <motion.h1 
            className="text-3xl lg:text-4xl font-bold text-white mb-4 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Football Intelligence.
            <br />
            <span className="text-primary">Not Opinion.</span>
          </motion.h1>
          <motion.p 
            className="text-white/50 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Plataforma de análise e gestão de atletas
          </motion.p>
        </div>

        {/* Back Link - Desktop */}
        <Link 
          to="/" 
          className="absolute bottom-8 left-8 inline-flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o site
        </Link>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 min-h-screen md:min-h-0">
        <motion.div 
          className="w-full max-w-[400px] relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Mobile Logo */}
          <div className="flex justify-center mb-8 md:hidden">
            <img src={logoM3} alt="M3 Scout" className="h-10 w-auto" width={100} height={40} />
          </div>

          {/* Card */}
          <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-white/[0.06] shadow-2xl shadow-black/50">
            {bootMessage && (
              <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {bootMessage}
              </div>
            )}
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {isLogin ? "Entrar na M3 Scout" : "Criar sua conta"}
              </h2>
              <p className="text-white/50 text-sm mt-1.5">
                {isLogin 
                  ? "Acesse sua conta para continuar" 
                  : "Preencha os dados para começar"
                }
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Field (Sign Up Only) */}
              {!isLogin && (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-medium text-white/60 uppercase tracking-wider">
                    Nome Completo
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30" />
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                      required={!isLogin}
                      placeholder="Seu nome"
                      className={`
                        h-12 pl-11 pr-4 w-full
                        bg-zinc-800/50 border-white/[0.06] rounded-xl
                        text-white placeholder:text-white/30
                        transition-all duration-200
                        focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:bg-zinc-800/70
                        ${errors.name ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''}
                      `}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-xs text-red-400 mt-1">{errors.name}</p>
                  )}
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-white/60 uppercase tracking-wider">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    required
                    placeholder="seu@email.com"
                    className={`
                      h-12 pl-11 pr-4 w-full
                      bg-zinc-800/50 border-white/[0.06] rounded-xl
                      text-white placeholder:text-white/30
                      transition-all duration-200
                      focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:bg-zinc-800/70
                      ${errors.email ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''}
                    `}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-400 mt-1">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-white/60 uppercase tracking-wider">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    required
                    placeholder="••••••••"
                    className={`
                      h-12 pl-11 pr-12 w-full
                      bg-zinc-800/50 border-white/[0.06] rounded-xl
                      text-white placeholder:text-white/30
                      transition-all duration-200
                      focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:bg-zinc-800/70
                      ${errors.password ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''}
                    `}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4.5 h-4.5" />
                    ) : (
                      <Eye className="w-4.5 h-4.5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-400 mt-1">{errors.password}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={loading}
                className="
                  w-full h-12 mt-2
                  bg-primary hover:bg-primary/90 
                  text-white font-semibold
                  rounded-xl
                  shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  active:scale-[0.98]
                "
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isLogin ? "Entrando..." : "Criando conta..."}
                  </>
                ) : (
                  isLogin ? "Entrar" : "Criar Conta"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.06]" />
              </div>
            </div>

            {/* Toggle Login/Signup */}
            <div className="text-center">
              <span className="text-white/40 text-sm">
                {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}
              </span>{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="text-primary hover:text-primary/80 font-medium text-sm transition-colors"
              >
                {isLogin ? "Criar conta" : "Entrar"}
              </button>
            </div>
          </div>

          {/* Footer text */}
          <p className="text-center text-white/30 text-xs mt-6">
            © {new Date().getFullYear()} M3 Agency. Todos os direitos reservados.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
