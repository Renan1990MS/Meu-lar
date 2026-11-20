"use client";

import React, { useEffect, useMemo, useState } from "react";

interface Conta {
  id: string;
  nome: string;
  valor: number;
  diaVencimento: number;
  pago: boolean;
  mesAno: string;
  origem?: "salario" | "vale";
}

interface UsuarioLocal {
  nome: string;
  senha: string;
}

type Origem = "salario" | "vale";
type Filtro = "todas" | "pendentes" | "pagas" | "atrasadas";

type Modal =
  | { tipo: "conta"; origem: Origem; conta?: Conta }
  | { tipo: "renda"; origem: Origem }
  | null;

const CHAVE_CONTAS = "minhas_contas_casa_v3";
const CHAVE_SALARIOS = "meus_salarios_casa_v1";
const CHAVE_VALES = "meus_vales_casa_v1";
const CHAVE_USUARIO = "meu_lar_usuario_v1";
const CHAVE_LOGADO = "meu_lar_sessao_ativa_v1";

const getMesAtual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const getDataHoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const CONTAS_INICIAIS: Conta[] = [
  { id: "1", nome: "Apartamento", valor: 1460, diaVencimento: 10, pago: false, mesAno: getMesAtual(), origem: "salario" },
  { id: "2", nome: "Água", valor: 56, diaVencimento: 15, pago: false, mesAno: getMesAtual(), origem: "vale" },
  { id: "3", nome: "Luz", valor: 220, diaVencimento: 20, pago: false, mesAno: getMesAtual(), origem: "vale" },
  { id: "4", nome: "Internet", valor: 120, diaVencimento: 25, pago: false, mesAno: getMesAtual(), origem: "vale" },
];

const moeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const nomeMes = (mes: string) => {
  if (!mes) return "";
  const [ano, numero] = mes.split("-").map(Number);
  return new Date(ano, numero - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
};

const formatarData = (dia: number, mes: string) => {
  if (!mes) return "";
  const [ano, numero] = mes.split("-").map(Number);
  const ultimoDia = new Date(ano, numero, 0).getDate();
  return `${String(Math.min(dia, ultimoDia)).padStart(2, "0")}/${String(numero).padStart(2, "0")}/${ano}`;
};

const obterStatus = (conta: Conta) => {
  if (conta.pago) return "pago";

  const atual = getMesAtual();
  const dia = new Date().getDate();

  if (conta.mesAno < atual || (conta.mesAno === atual && conta.diaVencimento < dia)) {
    return "atrasada";
  }

  return "pendente";
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Botao({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  type?: "button" | "submit";
}) {
  const estilos = {
    primary: "bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-[0.98] shadow-lg shadow-emerald-500/15",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-[0.98]",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 active:scale-[0.98]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 sm:py-2.5 text-sm font-semibold transition duration-200 cursor-pointer ${estilos[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function Indicador({
  titulo,
  valor,
  detalhe,
  cor = "white",
  icone,
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  cor?: "white" | "green" | "red" | "blue";
  icone: string;
}) {
  const cores = {
    white: "text-slate-900",
    green: "text-emerald-600",
    red: "text-red-600",
    blue: "text-blue-600",
  };

  return (
    <Card className="p-4 sm:p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">{titulo}</p>
        <span className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-base sm:text-lg">{icone}</span>
      </div>
      <p className={`mt-3 sm:mt-4 text-lg sm:text-2xl font-bold tracking-tight ${cores[cor]}`}>{valor}</p>
      {detalhe && <p className="mt-1 text-[11px] sm:text-xs text-slate-400">{detalhe}</p>}
    </Card>
  );
}

export default function ControleContas() {
  // Estados de Autenticação
  const [usuarioSalvo, setUsuarioSalvo] = useState<UsuarioLocal | null>(null);
  const [autenticado, setAutenticado] = useState(false);
  const [loginNome, setLoginNome] = useState("");
  const [loginSenha, setLoginSenha] = useState("");
  const [erroLogin, setErroLogin] = useState("");

  // Estados Financeiros
  const [todasContas, setTodasContas] = useState<Conta[]>([]);
  const [salarios, setSalarios] = useState<Record<string, number>>({});
  const [vales, setVales] = useState<Record<string, number>>({});
  const [mesSelecionado, setMesSelecionado] = useState("");
  const [carregado, setCarregado] = useState(false);

  const [modal, setModal] = useState<Modal>(null);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [origemConta, setOrigemConta] = useState<Origem>("salario");
  const [rendaInput, setRendaInput] = useState("");

  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busca, setBusca] = useState("");
  const [secaoAtiva, setSecaoAtiva] = useState<"todas" | Origem>("todas");

  useEffect(() => {
    try {
      const mesAtualStr = getMesAtual();
      setMesSelecionado(mesAtualStr);
      setDataVencimento(getDataHoje());

      // Carrega usuário e sessão
      const userJson = localStorage.getItem(CHAVE_USUARIO);
      const sessaoAtiva = localStorage.getItem(CHAVE_LOGADO);

      if (userJson) {
        const parsedUser: UsuarioLocal = JSON.parse(userJson);
        setUsuarioSalvo(parsedUser);
        setLoginNome(parsedUser.nome);
        if (sessaoAtiva === "true") {
          setAutenticado(true);
        }
      }

      // Carrega contas e rendas
      const contasSalvas = localStorage.getItem(CHAVE_CONTAS);
      const contasAntigas = localStorage.getItem("minhas_contas_casa_v2");

      if (contasSalvas) {
        setTodasContas(JSON.parse(contasSalvas));
      } else if (contasAntigas) {
        const antigas = JSON.parse(contasAntigas).map((c: Conta) => ({
          ...c,
          origem: c.origem || "salario",
        }));
        setTodasContas(antigas);
      } else {
        setTodasContas(CONTAS_INICIAIS);
      }

      const salariosSalvos = localStorage.getItem(CHAVE_SALARIOS);
      const valesSalvos = localStorage.getItem(CHAVE_VALES);

      if (salariosSalvos) setSalarios(JSON.parse(salariosSalvos));
      if (valesSalvos) setVales(JSON.parse(valesSalvos));
    } catch (erro) {
      console.error("Erro ao carregar dados:", erro);
    } finally {
      setCarregado(true);
    }
  }, []);

  useEffect(() => {
    if (carregado) localStorage.setItem(CHAVE_CONTAS, JSON.stringify(todasContas));
  }, [todasContas, carregado]);

  useEffect(() => {
    if (carregado) localStorage.setItem(CHAVE_SALARIOS, JSON.stringify(salarios));
  }, [salarios, carregado]);

  useEffect(() => {
    if (carregado) localStorage.setItem(CHAVE_VALES, JSON.stringify(vales));
  }, [vales, carregado]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErroLogin("");

    const nomeTrim = loginNome.trim();
    const senhaTrim = loginSenha.trim();

    if (!nomeTrim || !senhaTrim) {
      setErroLogin("Preencha seu nome e uma senha.");
      return;
    }

    if (!usuarioSalvo) {
      // Primeiro acesso: cria o usuário e entra
      const novoUsuario = { nome: nomeTrim, senha: senhaTrim };
      localStorage.setItem(CHAVE_USUARIO, JSON.stringify(novoUsuario));
      localStorage.setItem(CHAVE_LOGADO, "true");
      setUsuarioSalvo(novoUsuario);
      setAutenticado(true);
      setLoginSenha("");
    } else {
      // Já existe cadastro: verifica senha (e permite atualizar o nome se digitado outro)
      if (senhaTrim === usuarioSalvo.senha) {
        const usuarioAtualizado = { ...usuarioSalvo, nome: nomeTrim };
        localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuarioAtualizado));
        localStorage.setItem(CHAVE_LOGADO, "true");
        setUsuarioSalvo(usuarioAtualizado);
        setAutenticado(true);
        setLoginSenha("");
      } else {
        setErroLogin("Senha incorreta. Tente novamente.");
      }
    }
  };

  const handleLogout = () => {
    localStorage.setItem(CHAVE_LOGADO, "false");
    setAutenticado(false);
    setLoginSenha("");
  };

  const handleRedefinirAcesso = () => {
    if (!window.confirm("Deseja cadastrar um novo nome e nova senha para este aparelho?")) return;
    localStorage.removeItem(CHAVE_USUARIO);
    localStorage.setItem(CHAVE_LOGADO, "false");
    setUsuarioSalvo(null);
    setLoginNome("");
    setLoginSenha("");
    setErroLogin("");
  };

  const contasMes = useMemo(
    () => todasContas.filter((c) => c.mesAno === mesSelecionado),
    [todasContas, mesSelecionado]
  );

  const contasSalario = contasMes.filter((c) => (c.origem || "salario") === "salario");
  const contasVale = contasMes.filter((c) => c.origem === "vale");

  const salarioAtual = salarios[mesSelecionado] || 0;
  const valeAtual = vales[mesSelecionado] || 0;

  const totalSalario = contasSalario.reduce((s, c) => s + c.valor, 0);
  const totalVale = contasVale.reduce((s, c) => s + c.valor, 0);
  const totalRecebido = salarioAtual + valeAtual;
  const totalContas = totalSalario + totalVale;
  const totalPagas = contasMes.filter((c) => c.pago).reduce((s, c) => s + c.valor, 0);
  const totalPendente = totalContas - totalPagas;
  const saldoLivre = totalRecebido - totalContas;

  const quantidadePagas = contasMes.filter((c) => c.pago).length;
  const quantidadeAtrasadas = contasMes.filter((c) => obterStatus(c) === "atrasada").length;
  const quantidadePendentes = contasMes.filter((c) => obterStatus(c) === "pendente").length;

  const percentualDespesas =
    totalRecebido > 0 ? Math.min((totalContas / totalRecebido) * 100, 100) : 0;

  const mudarMes = (direcao: number) => {
    const [ano, mes] = mesSelecionado.split("-").map(Number);
    const novaData = new Date(ano, mes - 1 + direcao, 1);
    setMesSelecionado(
      `${novaData.getFullYear()}-${String(novaData.getMonth() + 1).padStart(2, "0")}`
    );
    setFiltro("todas");
    setBusca("");
    setModal(null);
  };

  const abrirConta = (origem: Origem, conta?: Conta) => {
    setModal({ tipo: "conta", origem, conta });
    setNome(conta?.nome || "");
    setValor(conta ? String(conta.valor) : "");
    setOrigemConta(conta?.origem || origem);

    if (conta) {
      const [ano, mes] = conta.mesAno.split("-").map(Number);
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const dia = Math.min(conta.diaVencimento, ultimoDia);
      setDataVencimento(`${conta.mesAno}-${String(dia).padStart(2, "0")}`);
    } else {
      setDataVencimento(`${mesSelecionado}-${origem === "salario" ? "10" : "20"}`);
    }
  };

  const abrirRenda = (origem: Origem) => {
    setRendaInput(String(origem === "salario" ? salarioAtual : valeAtual));
    setModal({ tipo: "renda", origem });
  };

  const salvarConta = (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = nome.trim();
    const valorNum = Number(valor.replace(",", "."));

    if (!nomeLimpo || !Number.isFinite(valorNum) || valorNum <= 0 || !dataVencimento) {
      alert("Preencha todos os campos corretamente.");
      return;
    }

    const [ano, mes, dia] = dataVencimento.split("-");
    const novoMes = `${ano}-${mes}`;
    const diaNum = Number(dia);

    if (modal?.tipo !== "conta") return;

    if (modal.conta) {
      setTodasContas((anteriores) =>
        anteriores.map((c) =>
          c.id === modal.conta!.id
            ? { ...c, nome: nomeLimpo, valor: valorNum, diaVencimento: diaNum, mesAno: novoMes, origem: origemConta }
            : c
        )
      );
    } else {
      const novaConta: Conta = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        nome: nomeLimpo,
        valor: valorNum,
        diaVencimento: diaNum,
        pago: false,
        mesAno: novoMes,
        origem: origemConta,
      };
      setTodasContas((anteriores) => [...anteriores, novaConta]);
    }

    setMesSelecionado(novoMes);
    setModal(null);
  };

  const salvarRenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (modal?.tipo !== "renda") return;

    const valorNum = Number(rendaInput.replace(",", "."));
    if (!Number.isFinite(valorNum) || valorNum < 0) {
      alert("Informe um valor válido.");
      return;
    }

    if (modal.origem === "salario") {
      setSalarios((ant) => ({ ...ant, [mesSelecionado]: valorNum }));
    } else {
      setVales((ant) => ({ ...ant, [mesSelecionado]: valorNum }));
    }
    setModal(null);
  };

  const alternarPago = (id: string) => {
    setTodasContas((ant) => ant.map((c) => (c.id === id ? { ...c, pago: !c.pago } : c)));
  };

  const excluirConta = (id: string) => {
    if (!window.confirm("Deseja realmente excluir esta conta?")) return;
    setTodasContas((ant) => ant.filter((c) => c.id !== id));
  };

  const importarMesAnterior = (origem: Origem) => {
    const [ano, mes] = mesSelecionado.split("-").map(Number);
    const anterior = new Date(ano, mes - 2, 1);
    const mesAnterior = `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, "0")}`;

    const contasAnteriores = todasContas.filter(
      (c) => c.mesAno === mesAnterior && (c.origem || "salario") === origem
    );

    if (!contasAnteriores.length) {
      alert("Não encontrei contas dessa categoria no mês anterior.");
      return;
    }

    const novas = contasAnteriores.map((c) => ({
      ...c,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      mesAno: mesSelecionado,
      pago: false,
      origem,
    }));

    setTodasContas((ant) => [...ant, ...novas]);

    if (origem === "salario" && !salarios[mesSelecionado] && salarios[mesAnterior]) {
      setSalarios((ant) => ({ ...ant, [mesSelecionado]: ant[mesAnterior] }));
    }
    if (origem === "vale" && !vales[mesSelecionado] && vales[mesAnterior]) {
      setVales((ant) => ({ ...ant, [mesSelecionado]: ant[mesAnterior] }));
    }
  };

  const contasFiltradas = contasMes
    .filter((c) => secaoAtiva === "todas" || (c.origem || "salario") === secaoAtiva)
    .filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase()))
    .filter((c) => {
      if (filtro === "todas") return true;
      if (filtro === "pagas") return c.pago;
      if (filtro === "atrasadas") return obterStatus(c) === "atrasada";
      return obterStatus(c) === "pendente";
    })
    .sort((a, b) => a.diaVencimento - b.diaVencimento);

  if (!carregado || !mesSelecionado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1729] text-emerald-400">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-400" />
          <p className="text-sm font-medium">Carregando painel financeiro...</p>
        </div>
      </div>
    );
  }

  // TELA DE LOGIN / ACESSO
  if (!autenticado) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#0b1729] px-4 py-10 text-white">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-400 text-3xl text-slate-950 shadow-xl shadow-emerald-400/20">
              🏠
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">
              Finanças da Casa<span className="text-emerald-400">.</span>
            </h1>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Controle Doméstico Financeiro
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8 shadow-2xl backdrop-blur-md">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white">
                {usuarioSalvo ? `Bem-vindo ao painel financeiro!` : "Criar seu acesso"}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {usuarioSalvo
                  ? "Digite sua senha para acessar o painel financeiro."
                  : "Informe seu nome e crie uma senha para personalizar seu painel."}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Seu Nome
                </label>
                <input
                  type="text"
                  placeholder="Ex: nome do usuário"
                  value={loginNome}
                  onChange={(e) => setLoginNome(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                  required
                  autoFocus={!usuarioSalvo}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {usuarioSalvo ? "Sua Senha" : "Escolha uma Senha"}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={loginSenha}
                  onChange={(e) => setLoginSenha(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                  required
                  autoFocus={!!usuarioSalvo}
                />
              </div>

              {erroLogin && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-300">
                  {erroLogin}
                </p>
              )}

              <Botao type="submit" variant="primary" className="w-full py-3.5 text-sm font-bold">
                {usuarioSalvo ? "Entrar no Painel →" : "Salvar e Acessar →"}
              </Botao>
            </form>

            {usuarioSalvo && (
              <div className="mt-5 border-t border-white/10 pt-4 text-center">
                <button
                  type="button"
                  onClick={handleRedefinirAcesso}
                  className="text-xs text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                >
                  Trocar usuário ou redefinir senha
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  const badgeStatus = {
    pago: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    pendente: "bg-amber-50 text-amber-700 border border-amber-200",
    atrasada: "bg-red-50 text-red-700 border border-red-200",
  };

  const primeiroNome = usuarioSalvo?.nome.split(" ")[0] || "Usuário";
  const inicialNome = primeiroNome.charAt(0).toUpperCase();

  return (
    <main className="min-h-screen bg-[#f4f7f8] pb-12 text-slate-800">
      {/* BARRA SUPERIOR */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b1729]/95 text-white backdrop-blur-md">
        <div className="flex w-full flex-col justify-between gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-6 lg:px-10 sm:py-5">
          {/* LINHA 1 NO MOBILE: LOGO À ESQUERDA + PERFIL DO USUÁRIO À DIREITA */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400 text-xl sm:text-2xl text-slate-950 shadow-lg shadow-emerald-400/20">
                🏠
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight">Finanças da Casa<span className="text-emerald-400">.</span></h1>
                <p className="text-[10px] sm:text-xs tracking-wide text-slate-400">CONTROLE DOMÉSTICO FAMILIAR</p>
              </div>
            </div>

            {/* PERFIL NO CANTO SUPERIOR DIREITO (MOBILE) */}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 sm:hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/20 text-xs font-bold text-emerald-400">
                {inicialNome}
              </div>
              <div className="text-left">
                <p className="max-w-[85px] truncate text-xs font-semibold text-white">{primeiroNome}</p>
                <button
                  onClick={handleLogout}
                  className="block text-[10px] text-slate-400 hover:text-red-400 cursor-pointer"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>

          {/* CONTROLES DE DATA, MÊS E PERFIL DESKTOP */}
          <div className="flex items-center justify-between gap-2 sm:justify-end sm:gap-3 lg:gap-4">
            <div className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 lg:block">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Hoje</p>
              <p className="text-sm font-medium">
                {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>

            <div className="flex w-full sm:w-auto items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
              <button onClick={() => mudarMes(-1)} className="rounded-lg px-4 py-2 text-lg text-slate-300 hover:bg-white/10 active:bg-white/20 cursor-pointer font-bold">‹</button>
              <span className="min-w-32 text-center text-sm font-semibold capitalize">{nomeMes(mesSelecionado)}</span>
              <button onClick={() => mudarMes(1)} className="rounded-lg px-4 py-2 text-lg text-slate-300 hover:bg-white/10 active:bg-white/20 cursor-pointer font-bold">›</button>
            </div>

            {/* PERFIL NO CANTO SUPERIOR DIREITO (DESKTOP) */}
            <div className="hidden sm:flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/20 text-sm font-bold text-emerald-400">
                {inicialNome}
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-white">Olá, {primeiroNome}</p>
                <button
                  onClick={handleLogout}
                  className="block text-[10px] text-slate-400 hover:text-red-400 transition cursor-pointer"
                >
                  Sair da conta
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8 px-4 py-6 sm:px-8 sm:py-8">
        {/* BOAS-VINDAS E BOTÃO PRINCIPAL */}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Visão geral</p>
            <h2 className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Controle do Mês
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Orçamento familiar de <span className="capitalize font-medium text-slate-700">{nomeMes(mesSelecionado)}</span>.
            </p>
          </div>
          <Botao onClick={() => abrirConta("salario")} className="w-full sm:w-auto">
            <span className="text-lg">＋</span> Adicionar conta
          </Botao>
        </section>

        {/* SALDO PRINCIPAL */}
        <section className="rounded-3xl bg-[#0b1729] p-5 text-white shadow-xl shadow-slate-900/10 sm:p-8">
          <div className="grid gap-6 lg:gap-8 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Saldo livre previsto (Sobra)
              </div>
              <p className={`mt-3 sm:mt-4 text-3xl sm:text-5xl font-bold tracking-tight ${saldoLivre >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {moeda(saldoLivre)}
              </p>
              <p className="mt-2 sm:mt-3 max-w-md text-xs sm:text-sm leading-relaxed text-slate-400">
                {saldoLivre >= 0
                  ? "Valor estimado que sobra após quitar todas as contas cadastradas."
                  : "Atenção: As despesas cadastradas superam a renda informada neste mês."}
              </p>

              <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
                  <p className="text-[11px] sm:text-xs text-slate-400">Total Recebido</p>
                  <p className="mt-1 text-sm sm:text-base font-bold text-white">{moeda(totalRecebido)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
                  <p className="text-[11px] sm:text-xs text-slate-400">Total Despesas</p>
                  <p className="mt-1 text-sm sm:text-base font-bold text-white">{moeda(totalContas)}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs sm:text-sm font-semibold">Comprometimento da Renda</p>
                <span className="text-base sm:text-lg font-bold text-emerald-400">{percentualDespesas.toFixed(0)}%</span>
              </div>
              <div className="mt-3 sm:mt-4 h-2.5 sm:h-3 overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300 transition-all duration-500"
                  style={{ width: `${percentualDespesas}%` }}
                />
              </div>
              <p className="mt-2.5 sm:mt-3 text-[11px] sm:text-xs leading-relaxed text-slate-400">
                {totalRecebido > 0
                  ? `${moeda(totalContas)} comprometidos de ${moeda(totalRecebido)} previstos.`
                  : "Cadastre seu salário e vale para ver o comprometimento."}
              </p>
              <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 sm:pt-5">
                <div>
                  <p className="text-[11px] sm:text-xs text-slate-400">Já Pagas</p>
                  <p className="mt-1 text-base sm:text-lg font-bold text-emerald-400">{moeda(totalPagas)}</p>
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs text-slate-400">A Pagar</p>
                  <p className="mt-1 text-base sm:text-lg font-bold text-amber-300">{moeda(totalPendente)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* INDICADORES */}
        <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <Indicador titulo="Recebido" valor={moeda(totalRecebido)} detalhe="Salário + Vale" cor="blue" icone="💰" />
          <Indicador titulo="Contas" valor={moeda(totalContas)} detalhe={`${contasMes.length} no mês`} cor="white" icone="📋" />
          <Indicador titulo="Pagas" valor={moeda(totalPagas)} detalhe={`${quantidadePagas} quitadas`} cor="green" icone="✅" />
          <Indicador titulo="Em Atraso" valor={String(quantidadeAtrasadas)} detalhe={`${quantidadePendentes} pendentes`} cor={quantidadeAtrasadas ? "red" : "green"} icone="⚠️" />
        </section>

        {/* RECEITAS (SALÁRIO E VALE) */}
        <section>
          <div className="mb-3 sm:mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Entradas</p>
              <h3 className="mt-0.5 text-lg sm:text-xl font-bold text-slate-900">Salário e Vale</h3>
            </div>
            <p className="text-xs text-slate-400 capitalize">{nomeMes(mesSelecionado)}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-blue-50 text-lg sm:text-xl">💵</div>
                  <div>
                    <p className="text-sm sm:text-base font-bold text-slate-900">Salário (Principal)</p>
                    <p className="text-[11px] sm:text-xs text-slate-400">Pagamento mensal</p>
                  </div>
                </div>
                <Botao variant="secondary" onClick={() => abrirRenda("salario")} className="px-3 py-2 text-xs sm:text-sm">Editar</Botao>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{moeda(salarioAtual)}</p>
                <div className="mt-3 sm:mt-4 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Contas vinculadas</span>
                  <span className="font-semibold text-slate-700">{moeda(totalSalario)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${salarioAtual > 0 ? Math.min((totalSalario / salarioAtual) * 100, 100) : 0}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Sobra do Salário: <strong className={salarioAtual - totalSalario >= 0 ? "text-emerald-600" : "text-red-600"}>{moeda(salarioAtual - totalSalario)}</strong>
                </p>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-violet-50 text-lg sm:text-xl">💳</div>
                  <div>
                    <p className="text-sm sm:text-base font-bold text-slate-900">Vale (Adiantamento)</p>
                    <p className="text-[11px] sm:text-xs text-slate-400">Receita quinzenal</p>
                  </div>
                </div>
                <Botao variant="secondary" onClick={() => abrirRenda("vale")} className="px-3 py-2 text-xs sm:text-sm">Editar</Botao>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{moeda(valeAtual)}</p>
                <div className="mt-3 sm:mt-4 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Contas vinculadas</span>
                  <span className="font-semibold text-slate-700">{moeda(totalVale)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all"
                    style={{ width: `${valeAtual > 0 ? Math.min((totalVale / valeAtual) * 100, 100) : 0}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Sobra do Vale: <strong className={valeAtual - totalVale >= 0 ? "text-emerald-600" : "text-red-600"}>{moeda(valeAtual - totalVale)}</strong>
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* LISTA / TABELA DE CONTAS */}
        <section>
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Despesas</p>
              <h3 className="mt-0.5 text-lg sm:text-xl font-bold text-slate-900">Lista de Contas</h3>
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2">
              <Botao variant="secondary" onClick={() => importarMesAnterior("salario")} className="px-3 py-2.5 text-xs">
                ↶ Copiar Salário
              </Botao>
              <Botao variant="secondary" onClick={() => importarMesAnterior("vale")} className="px-3 py-2.5 text-xs">
                ↶ Copiar Vale
              </Botao>
            </div>
          </div>

          <Card className="overflow-hidden">
            {/* BARRA DE FILTROS */}
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-1.5 sm:gap-2">
                {[
                  ["todas", "Todas"],
                  ["pendentes", "Pendentes"],
                  ["pagas", "Pagas"],
                  ["atrasadas", "Atrasadas"],
                ].map(([chave, label]) => (
                  <button
                    key={chave}
                    onClick={() => setFiltro(chave as Filtro)}
                    className={`rounded-xl px-2 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold transition cursor-pointer text-center ${filtro === chave ? "bg-[#0b1729] text-white shadow-md" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar conta..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 sm:w-48"
                />
                <select
                  value={secaoAtiva}
                  onChange={(e) => setSecaoAtiva(e.target.value as typeof secaoAtiva)}
                  className="w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400 cursor-pointer"
                >
                  <option value="todas">Todas as origens</option>
                  <option value="salario">Salário</option>
                  <option value="vale">Vale</option>
                </select>
              </div>
            </div>

            {/* VISUALIZAÇÃO MOBILE */}
            <div className="divide-y divide-slate-100 md:hidden">
              {contasFiltradas.map((conta) => {
                const status = obterStatus(conta);
                return (
                  <div key={conta.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-900 text-base">{conta.nome}</p>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${(conta.origem || "salario") === "salario" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"}`}>
                            {(conta.origem || "salario") === "salario" ? "Salário" : "Vale"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Vence em: <strong className="text-slate-700">{formatarData(conta.diaVencimento, conta.mesAno)}</strong>
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-base font-extrabold text-slate-900">{moeda(conta.valor)}</p>
                        <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${badgeStatus[status]}`}>
                          {status === "pago" ? "✓ Pago" : status === "atrasada" ? "Atrasada" : "Pendente"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        onClick={() => alternarPago(conta.id)}
                        className={`rounded-xl py-2.5 text-xs font-bold transition cursor-pointer ${conta.pago ? "bg-slate-100 text-slate-600" : "bg-emerald-600 text-white shadow-xs"}`}
                      >
                        {conta.pago ? "Desfazer" : "✓ Pagar"}
                      </button>
                      <button
                        onClick={() => abrirConta(conta.origem || "salario", conta)}
                        className="rounded-xl bg-blue-50 py-2.5 text-xs font-bold text-blue-700 cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => excluirConta(conta.id)}
                        className="rounded-xl bg-red-50 py-2.5 text-xs font-bold text-red-600 cursor-pointer"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })}

              {contasFiltradas.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl">🔍</div>
                  <p className="mt-3 font-semibold text-slate-700">Nenhuma conta encontrada</p>
                  <p className="mt-1 text-xs text-slate-400">Mude os filtros ou cadastre uma nova despesa.</p>
                  <button onClick={() => { setFiltro("todas"); setBusca(""); setSecaoAtiva("todas"); }} className="mt-3 text-xs font-semibold text-emerald-600 underline cursor-pointer">
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>

            {/* VISUALIZAÇÃO DESKTOP */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Conta / Despesa</th>
                    <th className="px-6 py-4">Origem</th>
                    <th className="px-6 py-4">Vencimento</th>
                    <th className="px-6 py-4">Valor</th>
                    <th className="px-6 py-4">Situação</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contasFiltradas.map((conta) => {
                    const status = obterStatus(conta);
                    return (
                      <tr key={conta.id} className="transition hover:bg-slate-50/80">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800">{conta.nome}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">Despesa doméstica</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${(conta.origem || "salario") === "salario" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"}`}>
                            {(conta.origem || "salario") === "salario" ? "Salário" : "Vale"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatarData(conta.diaVencimento, conta.mesAno)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-800">{moeda(conta.valor)}</td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${badgeStatus[status]}`}>
                            {status === "pago" ? "✓ Pago" : status === "atrasada" ? "Atrasada" : "Pendente"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => alternarPago(conta.id)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${conta.pago ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                            >
                              {conta.pago ? "Desfazer" : "Pagar"}
                            </button>
                            <button onClick={() => abrirConta(conta.origem || "salario", conta)} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 cursor-pointer">Editar</button>
                            <button onClick={() => excluirConta(conta.id)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 cursor-pointer">Excluir</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {contasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">🔍</div>
                        <p className="mt-4 font-semibold text-slate-700">Nenhuma conta encontrada</p>
                        <p className="mt-1 text-sm text-slate-400">Tente mudar os filtros de busca ou cadastre uma nova despesa.</p>
                        <button onClick={() => { setFiltro("todas"); setBusca(""); setSecaoAtiva("todas"); }} className="mt-4 text-sm font-semibold text-emerald-600 hover:underline cursor-pointer">Limpar filtros</button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col justify-between gap-1 border-t border-slate-100 bg-slate-50/70 px-4 sm:px-5 py-3.5 text-xs text-slate-500 sm:flex-row">
              <span>Exibindo {contasFiltradas.length} de {contasMes.length} contas</span>
              <span>Total listado: <strong className="text-slate-800">{moeda(contasFiltradas.reduce((a, c) => a + c.valor, 0))}</strong></span>
            </div>
          </Card>
        </section>
      </div>

      {/* MODAL DE CONTA */}
      {modal?.tipo === "conta" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4">
          <Card className="w-full max-w-md rounded-b-none sm:rounded-2xl p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {modal.conta ? "Editar Conta" : "Nova Conta"}
              </h3>
              <button onClick={() => setModal(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer">✕</button>
            </div>

            <form onSubmit={salvarConta} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Origem da Conta</label>
                <select
                  value={origemConta}
                  onChange={(e) => setOrigemConta(e.target.value as Origem)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 cursor-pointer font-medium"
                >
                  <option value="salario">Salário (Principal)</option>
                  <option value="vale">Vale (Adiantamento)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Nome da Conta</label>
                <input
                  type="text"
                  placeholder="Ex: Aluguel, Supermercado..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Data de Vencimento</label>
                <input
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 cursor-pointer"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Botao type="button" variant="secondary" onClick={() => setModal(null)} className="w-1/2">Cancelar</Botao>
                <Botao type="submit" variant="primary" className="w-1/2">Salvar Conta</Botao>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL DE RENDA */}
      {modal?.tipo === "renda" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4">
          <Card className="w-full max-w-sm rounded-b-none sm:rounded-2xl p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Editar {modal.origem === "salario" ? "Salário" : "Vale"}
              </h3>
              <button onClick={() => setModal(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer">✕</button>
            </div>

            <form onSubmit={salvarRenda} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Valor para {nomeMes(mesSelecionado)}</label>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={rendaInput}
                  onChange={(e) => setRendaInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Botao type="button" variant="secondary" onClick={() => setModal(null)} className="w-1/2">Cancelar</Botao>
                <Botao type="submit" variant="primary" className="w-1/2">Atualizar</Botao>
              </div>
            </form>
          </Card>
        </div>
      )}
    </main>
  );
}