
import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  Heart,
  ChevronRight,
  ShieldCheck,
  LayoutDashboard,
  BookOpen,
  History,
  ArrowLeft,
  Mail
} from 'lucide-react';
import { api } from '../api';
import { User as UserType } from '../types';

interface LoginProps {
  onLogin: (user: UserType) => void;
}

type AuthView = 'login' | 'recover' | 'success';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [view, setView] = useState<AuthView>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [recoverEmail, setRecoverEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    api.login(username, password)
      .then((data: any) => {
        onLogin(data.user);
      })
      .catch((err: Error) => {
        setError(err.message || 'Credenciais inválidas. Verifique seu usuário e senha.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleRecover = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setView('success');
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F8FAFC] overflow-hidden font-sans">
      
      {/* LADO ESQUERDO: FORMULÁRIO */}
      <div className="w-full lg:w-[40%] flex flex-col justify-center p-8 sm:p-12 xl:p-20 relative bg-white z-10 shadow-xl">
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg">M</div>
          <h1 className="text-xl font-black text-slate-900 tracking-tighter">MFC Gestão</h1>
        </div>

        <div className="max-w-md w-full mx-auto animate-in fade-in duration-500">
          {view === 'login' && (
            <>
              <header className="mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest mb-4 border border-blue-100/50">
                  <ShieldCheck className="w-3.5 h-3.5" /> Acesso Administrativo
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Painel de Gestão</h2>
                <p className="text-slate-500 font-medium text-sm">
                  Utilize seu acesso para gerenciar membros e tesouraria.
                </p>
              </header>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuário</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                    </div>
                    <input
                      type="text"
                      required
                      className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600 focus:bg-white transition-all font-semibold text-sm shadow-sm"
                      placeholder="Identificador"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-end px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Senha</label>
                    <button 
                      type="button" 
                      onClick={() => setView('recover')}
                      className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                    >
                      Recuperar
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="block w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600 focus:bg-white transition-all font-semibold text-sm shadow-sm"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-300 hover:text-blue-600 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 text-red-600 text-xs font-bold animate-in fade-in zoom-in-95 duration-200">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group w-full flex items-center justify-center gap-2 py-4 bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Entrar no Sistema
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {view === 'recover' && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <header className="mb-10">
                <button 
                  onClick={() => setView('login')}
                  className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors text-[10px] font-black uppercase tracking-widest mb-6 group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Voltar ao login
                </button>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Recuperar Acesso</h2>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">
                  Informe o e-mail cadastrado para enviarmos as instruções de nova senha.
                </p>
              </header>

              <form onSubmit={handleRecover} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Cadastro</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                    </div>
                    <input
                      type="email"
                      required
                      className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600 focus:bg-white transition-all font-semibold text-sm shadow-sm"
                      placeholder="exemplo@mfc.org"
                      value={recoverEmail}
                      onChange={(e) => setRecoverEmail(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Enviar Link
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {view === 'success' && (
            <div className="text-center animate-in zoom-in-95 duration-500 py-10">
              <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-green-100 shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-4">E-mail Enviado</h2>
              <p className="text-slate-500 font-medium text-sm leading-relaxed mb-10 px-4">
                Verifique sua caixa de entrada para continuar o processo de recuperação.
              </p>
              <button 
                onClick={() => setView('login')}
                className="w-full py-4 bg-slate-50 text-slate-600 font-black rounded-xl border border-slate-200 hover:bg-slate-100 transition-all uppercase tracking-widest text-xs"
              >
                Voltar ao Login
              </button>
            </div>
          )}
</div>
      </div>

      {/* LADO DIREITO: PROPÓSITO DO SISTEMA */}
      <div className="hidden lg:flex w-[60%] bg-blue-600 relative overflow-hidden items-center justify-center p-20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950"></div>
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/5 rounded-full -mr-96 -mt-96 blur-3xl"></div>
        
        <div className="relative z-10 max-w-xl w-full text-white">
          <div className="flex items-center gap-4 mb-12 animate-in fade-in slide-in-from-left duration-700">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-blue-700 font-black text-3xl shadow-2xl rotate-3">M</div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter leading-none mb-1 text-white">MFC Gestão</h1>
              <p className="text-blue-200 font-bold uppercase tracking-[0.3em] text-[10px]">Movimento Familiar Cristão</p>
            </div>
          </div>

          <h3 className="text-4xl font-black tracking-tight leading-[1.15] mb-10 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100">
            Organizando o hoje para cuidar melhor da <br /><span className="text-blue-300">nossa comunidade.</span>
          </h3>

          <div className="grid grid-cols-1 gap-8 mb-12 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                <Users className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <h4 className="font-black text-sm uppercase tracking-widest mb-1 text-white">Gestão de MFCistas</h4>
                <p className="text-blue-100/60 text-xs leading-relaxed font-medium">Fim das fichas de papel. Cadastro centralizado de jovens, adultos e 3ª idade para melhor acompanhamento.</p>
              </div>
            </div>
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                <BookOpen className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <h4 className="font-black text-sm uppercase tracking-widest mb-1 text-white">Tesouraria Digital</h4>
                <p className="text-blue-100/60 text-xs leading-relaxed font-medium">Substituição de cadernos e planilhas isoladas por um controle financeiro unificado para cada Equipe Base.</p>
              </div>
            </div>
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                <LayoutDashboard className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <h4 className="font-black text-sm uppercase tracking-widest mb-1 text-white">Praticidade Real</h4>
                <p className="text-blue-100/60 text-xs leading-relaxed font-medium">Acesso rápido às informações que realmente importam para os coordenadores de cidade e de equipe.</p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-300">
             <Heart className="w-6 h-6 text-red-400 fill-red-400/20" />
             <p className="text-xs font-bold text-blue-100/60 italic uppercase tracking-wider">
               Ferramenta de Apoio à Missão do MFC
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;


