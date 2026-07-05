import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as XLSX from 'xlsx';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  CalendarDays,
  Download,
  Plus,
  RefreshCw,
  Trash2,
  UserPlus,
  Wallet,
} from 'lucide-react';
import './styles.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`);
  });
}

const STORAGE_KEY = 'controle-gastos-react-lancamentos';
const PESSOAS_STORAGE_KEY = 'controle-gastos-react-pessoas';

const listasCategorias = {
  Saida: ['Alimentacao', 'Transporte', 'Moradia', 'Lazer', 'Saude', 'Educacao', 'Outros'],
  Entrada: ['Salario', 'Aluguel', 'Investimentos', 'Outros'],
};

const labelsCategorias = {
  Alimentacao: 'Alimentacao',
  Transporte: 'Transporte',
  Moradia: 'Moradia',
  Lazer: 'Lazer',
  Saude: 'Saude',
  Educacao: 'Educacao',
  Outros: 'Outros',
  Salario: 'Salario',
  Aluguel: 'Aluguel',
  Investimentos: 'Investimentos',
};

const listasPagamentos = {
  Saida: ['Dinheiro', 'Cartao de Credito', 'Cartao de Debito', 'Pix', 'Boleto', 'Verocard'],
  Entrada: ['Deposito Bancario', 'Pix', 'Dinheiro', 'Boleto'],
};

const labelsPagamentos = {
  Dinheiro: 'Dinheiro',
  'Cartao de Credito': 'Cartao de Credito',
  'Cartao de Debito': 'Cartao de Debito',
  Pix: 'Pix',
  Boleto: 'Boleto',
  Verocard: 'Verocard',
  'Deposito Bancario': 'Deposito Bancario',
};

function hojeISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(
    hoje.getDate(),
  ).padStart(2, '0')}`;
}

function mesAtual() {
  return hojeISO().slice(0, 7);
}

function carregarLancamentos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function carregarPessoas() {
  try {
    return JSON.parse(localStorage.getItem(PESSOAS_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function salvarLancamentos(lancamentos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lancamentos));
}

function salvarPessoas(pessoas) {
  localStorage.setItem(PESSOAS_STORAGE_KEY, JSON.stringify(pessoas));
}

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(dataISO) {
  if (!dataISO) return 'Sem data';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarMes(mesISO) {
  if (mesISO === 'todos') return 'Todos os meses';
  const [ano, mes] = mesISO.split('-');
  return new Date(Number(ano), Number(mes) - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

function normalizarValor(valorTexto) {
  const texto = String(valorTexto).trim().replace(/\s/g, '').replace(',', '.');
  const numero = Number.parseFloat(texto);
  return Number.isFinite(numero) ? numero : 0;
}

function App() {
  const [abaAtiva, setAbaAtiva] = useState('form');
  const [tipo, setTipo] = useState('Saida');
  const [data, setData] = useState(hojeISO());
  const [pessoa, setPessoa] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [valor, setValor] = useState('');
  const [alerta, setAlerta] = useState(null);
  const [lancamentos, setLancamentos] = useState(carregarLancamentos);
  const [pessoas, setPessoas] = useState(carregarPessoas);
  const [mesFiltro, setMesFiltro] = useState(mesAtual());
  const [pessoaFiltro, setPessoaFiltro] = useState('todos');

  const resumoGeral = useMemo(() => calcularResumo(lancamentos), [lancamentos]);

  const mesesDisponiveis = useMemo(() => {
    const meses = new Set(lancamentos.map((item) => item.data?.slice(0, 7)).filter(Boolean));
    meses.add(mesAtual());
    return [...meses].sort((a, b) => b.localeCompare(a));
  }, [lancamentos]);

  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter((item) => {
      const passaMes = mesFiltro === 'todos' || item.data?.startsWith(mesFiltro);
      const passaPessoa = pessoaFiltro === 'todos' || item.pessoa === pessoaFiltro;
      return passaMes && passaPessoa;
    });
  }, [lancamentos, mesFiltro, pessoaFiltro]);

  const resumoFiltrado = useMemo(() => calcularResumo(lancamentosFiltrados), [lancamentosFiltrados]);

  const historico = useMemo(() => {
    return [...lancamentosFiltrados].sort((a, b) => b.registradoEm - a.registradoEm);
  }, [lancamentosFiltrados]);

  const despesasPorCategoria = useMemo(() => {
    const totais = lancamentosFiltrados.reduce((acc, item) => {
      if (item.valor >= 0) return acc;
      const categoriaItem = labelsCategorias[item.categoria] || item.categoria || 'Outros';
      acc[categoriaItem] = (acc[categoriaItem] || 0) + Math.abs(item.valor);
      return acc;
    }, {});

    return Object.entries(totais)
      .map(([categoriaItem, total]) => ({ categoria: categoriaItem, total }))
      .sort((a, b) => b.total - a.total);
  }, [lancamentosFiltrados]);

  const maiorDespesaCategoria = useMemo(() => {
    return despesasPorCategoria.reduce((maior, item) => Math.max(maior, item.total), 0);
  }, [despesasPorCategoria]);

  const entradasPorCategoria = useMemo(() => {
    const totais = lancamentosFiltrados.reduce((acc, item) => {
      if (item.valor < 0) return acc;
      const categoriaItem = labelsCategorias[item.categoria] || item.categoria || 'Outros';
      acc[categoriaItem] = (acc[categoriaItem] || 0) + item.valor;
      return acc;
    }, {});

    return Object.entries(totais)
      .map(([categoriaItem, total]) => ({ categoria: categoriaItem, total }))
      .sort((a, b) => b.total - a.total);
  }, [lancamentosFiltrados]);

  const maiorEntradaCategoria = useMemo(() => {
    return entradasPorCategoria.reduce((maior, item) => Math.max(maior, item.total), 0);
  }, [entradasPorCategoria]);

  function calcularResumo(lista) {
    return lista.reduce(
      (acc, item) => {
        acc.saldo += item.valor;
        if (item.valor >= 0) acc.totalEntradas += item.valor;
        else acc.totalSaidas += Math.abs(item.valor);
        return acc;
      },
      { totalEntradas: 0, totalSaidas: 0, saldo: 0 },
    );
  }

  function trocarTipo(novoTipo) {
    setTipo(novoTipo);
    setCategoria('');
    setFormaPagamento('');
  }

  function cadastrarPessoa() {
    const nome = novoNome.trim();
    if (!nome) return;

    const pessoaExistente = pessoas.find((item) => item.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR'));
    if (pessoaExistente) {
      setPessoa(pessoaExistente);
      setNovoNome('');
      setAlerta({ tipo: 'sucesso', texto: 'Nome selecionado.' });
      return;
    }

    const proximasPessoas = [...pessoas, nome].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    setPessoas(proximasPessoas);
    salvarPessoas(proximasPessoas);
    setPessoa(nome);
    setNovoNome('');
    setAlerta({ tipo: 'sucesso', texto: 'Nome cadastrado e selecionado.' });
  }

  function registrarLancamento(event) {
    event.preventDefault();
    setAlerta(null);

    if (!data || !pessoa || !categoria || !formaPagamento || !valor) {
      setAlerta({ tipo: 'erro', texto: 'Preencha nome, data, categoria, forma de pagamento e valor.' });
      return;
    }

    const valorNumero = normalizarValor(valor);
    if (valorNumero <= 0) {
      setAlerta({ tipo: 'erro', texto: 'Informe um valor maior que zero.' });
      return;
    }

    const novoLancamento = {
      id: crypto.randomUUID(),
      tipo,
      data,
      pessoa,
      categoria,
      descricao: descricao.trim(),
      formaPagamento,
      valor: tipo === 'Saida' ? valorNumero * -1 : valorNumero,
      registradoEm: Date.now(),
    };

    const proximosLancamentos = [...lancamentos, novoLancamento];
    setLancamentos(proximosLancamentos);
    salvarLancamentos(proximosLancamentos);

    setTipo('Saida');
    setPessoa('');
    setCategoria('');
    setDescricao('');
    setFormaPagamento('');
    setValor('');
    setData(hojeISO());
    setAlerta({ tipo: 'sucesso', texto: 'Lancamento registrado com sucesso.' });
  }

  function removerLancamento(id) {
    const proximosLancamentos = lancamentos.filter((item) => item.id !== id);
    setLancamentos(proximosLancamentos);
    salvarLancamentos(proximosLancamentos);
  }

  function exportarExcel() {
    const linhas = historico.map((item) => ({
      Data: formatarData(item.data),
      Pessoa: item.pessoa || 'Sem pessoa',
      Categoria: labelsCategorias[item.categoria] || item.categoria,
      Descricao: item.descricao,
      'Forma de Pagamento': labelsPagamentos[item.formaPagamento] || item.formaPagamento,
      Valor: item.valor,
      'Data de Registro': new Date(item.registradoEm).toLocaleString('pt-BR'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(linhas);
    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 28 },
      { wch: 22 },
      { wch: 14 },
      { wch: 22 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Extrato');

    const mesArquivo = mesFiltro === 'todos' ? 'todos-os-meses' : mesFiltro;
    const pessoaArquivo = pessoaFiltro === 'todos' ? 'todas-as-pessoas' : pessoaFiltro.replace(/\s+/g, '-').toLowerCase();
    XLSX.writeFile(workbook, `controle-de-gastos-${mesArquivo}-${pessoaArquivo}.xlsx`);
  }

  return (
    <main className="page-shell">
      <section className="app-shell" aria-label="Controle de Gastos 2.0">
        <header className="topbar">
          <div>
            <p className="eyebrow">Controle de Gastos 2.0</p>
            <h1>Meus lancamentos</h1>
          </div>
          <div className="saldo-pill">
            <Wallet size={18} />
            <span>{formatarMoeda(resumoGeral.saldo)}</span>
          </div>
        </header>

        <nav className="tabs-nav" aria-label="Abas principais">
          <button className={abaAtiva === 'form' ? 'tab-btn active' : 'tab-btn'} onClick={() => setAbaAtiva('form')}>
            <Plus size={18} />
            <span>Novo</span>
          </button>
          <button
            className={abaAtiva === 'extrato' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setAbaAtiva('extrato')}
          >
            <CalendarDays size={18} />
            <span>Extrato</span>
          </button>
          <button
            className={abaAtiva === 'grafico' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setAbaAtiva('grafico')}
          >
            <BarChart3 size={18} />
            <span>Grafico</span>
          </button>
        </nav>

        {abaAtiva === 'form' ? (
          <form className="panel" onSubmit={registrarLancamento}>
            <div className="panel-heading">
              <h2>Novo lancamento</h2>
              <div className={tipo === 'Entrada' ? 'type-badge entrada' : 'type-badge saida'}>
                {tipo === 'Entrada' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                <span>{tipo === 'Entrada' ? 'Entrada' : 'Saida'}</span>
              </div>
            </div>

            {alerta && <div className={`alert ${alerta.tipo}`}>{alerta.texto}</div>}

            <div className="field-group">
              <label htmlFor="tipo">Tipo de lancamento *</label>
              <select id="tipo" value={tipo} onChange={(event) => trocarTipo(event.target.value)}>
                <option value="Saida">Saida (Despesa)</option>
                <option value="Entrada">Entrada (Receita)</option>
              </select>
            </div>

            <div className="field-grid">
              <div className="field-group">
                <label htmlFor="data">Data *</label>
                <input id="data" type="date" value={data} onChange={(event) => setData(event.target.value)} />
              </div>
              <div className="field-group">
                <label htmlFor="valor">Valor (R$) *</label>
                <input
                  id="valor"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valor}
                  onChange={(event) => setValor(event.target.value)}
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="categoria">Categoria / Fonte *</label>
              <select id="categoria" value={categoria} onChange={(event) => setCategoria(event.target.value)}>
                <option value="">Selecione...</option>
                {listasCategorias[tipo].map((item) => (
                  <option key={item} value={item}>
                    {labelsCategorias[item] || item}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="descricao">Descricao</label>
              <input
                id="descricao"
                placeholder="Ex: salario mensal, supermercado..."
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
              />
            </div>

            <div className="field-group">
              <label htmlFor="formaPagamento">Forma de pagamento *</label>
              <select
                id="formaPagamento"
                value={formaPagamento}
                onChange={(event) => setFormaPagamento(event.target.value)}
              >
                <option value="">Selecione...</option>
                {listasPagamentos[tipo].map((item) => (
                  <option key={item} value={item}>
                    {labelsPagamentos[item] || item}
                  </option>
                ))}
              </select>
            </div>

            <div className="person-block">
              <div className="field-group">
                <label htmlFor="pessoa">Nome *</label>
                <select id="pessoa" value={pessoa} onChange={(event) => setPessoa(event.target.value)}>
                  <option value="">Selecione...</option>
                  {pessoas.map((nome) => (
                    <option key={nome} value={nome}>
                      {nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="add-person-row">
                <input
                  aria-label="Novo nome"
                  placeholder="Cadastrar novo nome"
                  value={novoNome}
                  onChange={(event) => setNovoNome(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      cadastrarPessoa();
                    }
                  }}
                />
                <button className="small-action-btn" type="button" onClick={cadastrarPessoa} title="Cadastrar nome">
                  <UserPlus size={18} />
                  <span>Cadastrar</span>
                </button>
              </div>
            </div>

            <button className="primary-btn" type="submit">
              <Plus size={18} />
              <span>Registrar lancamento</span>
            </button>
          </form>
        ) : abaAtiva === 'extrato' ? (
          <section className="panel">
            <div className="panel-heading">
              <h2>Resumo financeiro</h2>
              <button className="icon-btn" onClick={exportarExcel} title="Baixar Excel" disabled={!historico.length}>
                <Download size={18} />
              </button>
            </div>

            <div className="filter-row">
              <div className="field-group filter-field">
                <label htmlFor="mesFiltro">Mes do extrato</label>
                <select id="mesFiltro" value={mesFiltro} onChange={(event) => setMesFiltro(event.target.value)}>
                  <option value="todos">Todos os meses</option>
                  {mesesDisponiveis.map((mes) => (
                    <option key={mes} value={mes}>
                      {formatarMes(mes)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group filter-field">
                <label htmlFor="pessoaFiltro">Pessoa</label>
                <select id="pessoaFiltro" value={pessoaFiltro} onChange={(event) => setPessoaFiltro(event.target.value)}>
                  <option value="todos">Todas as pessoas</option>
                  {pessoas.map((nome) => (
                    <option key={nome} value={nome}>
                      {nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="dashboard">
              <ResumoCard label="Entradas" valor={resumoFiltrado.totalEntradas} status="positivo" />
              <ResumoCard label="Saidas" valor={resumoFiltrado.totalSaidas} status="negativo" />
              <ResumoCard
                label="Saldo"
                valor={resumoFiltrado.saldo}
                status={resumoFiltrado.saldo >= 0 ? 'positivo' : 'negativo'}
                destaque
              />
            </div>

            <div className="extrato-header">
              <h3>Historico</h3>
              <button className="ghost-btn" onClick={() => setLancamentos(carregarLancamentos())}>
                <RefreshCw size={16} />
                <span>Atualizar</span>
              </button>
            </div>

            <div className="lista-container">
              {historico.length ? (
                historico.map((item) => (
                  <article
                    className={item.valor >= 0 ? 'extrato-item cartao-entrada' : 'extrato-item cartao-saida'}
                    key={item.id}
                  >
                    <div className="item-info">
                      <div className="item-categoria">{labelsCategorias[item.categoria] || item.categoria}</div>
                      <div className="item-desc">{item.descricao || 'Sem descricao'}</div>
                      <div className="item-meta">
                        {item.pessoa || 'Sem pessoa'} - {formatarData(item.data)} -{' '}
                        {labelsPagamentos[item.formaPagamento] || item.formaPagamento}
                      </div>
                    </div>
                    <div className="item-actions">
                      <strong className={item.valor >= 0 ? 'valor-positivo' : 'valor-negativo'}>
                        {formatarMoeda(item.valor)}
                      </strong>
                      <button className="delete-btn" onClick={() => removerLancamento(item.id)} title="Remover">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="estado-vazio">
                  Nenhum lancamento para os filtros selecionados.
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="panel">
            <div className="panel-heading">
              <h2>Despesas por categoria</h2>
              <div className="type-badge saida">
                <BarChart3 size={16} />
                <span>{formatarMoeda(resumoFiltrado.totalSaidas)}</span>
              </div>
            </div>

            <div className="filter-row">
              <div className="field-group filter-field">
                <label htmlFor="mesFiltroGrafico">Mes do grafico</label>
                <select id="mesFiltroGrafico" value={mesFiltro} onChange={(event) => setMesFiltro(event.target.value)}>
                  <option value="todos">Todos os meses</option>
                  {mesesDisponiveis.map((mes) => (
                    <option key={mes} value={mes}>
                      {formatarMes(mes)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group filter-field">
                <label htmlFor="pessoaFiltroGrafico">Pessoa</label>
                <select
                  id="pessoaFiltroGrafico"
                  value={pessoaFiltro}
                  onChange={(event) => setPessoaFiltro(event.target.value)}
                >
                  <option value="todos">Todas as pessoas</option>
                  {pessoas.map((nome) => (
                    <option key={nome} value={nome}>
                      {nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {despesasPorCategoria.length ? (
              <div className="chart-panel" aria-label="Grafico de despesas por categoria">
                <div className="column-chart">
                  {despesasPorCategoria.map((item) => {
                    const altura = maiorDespesaCategoria ? Math.max((item.total / maiorDespesaCategoria) * 100, 8) : 0;
                    return (
                      <div className="chart-column" key={item.categoria}>
                        <div className="bar-value">{formatarMoeda(item.total)}</div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ height: `${altura}%` }} />
                        </div>
                        <div className="bar-label">{item.categoria}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="estado-vazio">Nenhuma despesa para montar o grafico.</div>
            )}

            <div className="chart-section-heading">
              <h2>Entradas por categoria</h2>
              <div className="type-badge entrada">
                <BarChart3 size={16} />
                <span>{formatarMoeda(resumoFiltrado.totalEntradas)}</span>
              </div>
            </div>

            {entradasPorCategoria.length ? (
              <div className="chart-panel" aria-label="Grafico de entradas por categoria">
                <div className="column-chart">
                  {entradasPorCategoria.map((item) => {
                    const altura = maiorEntradaCategoria ? Math.max((item.total / maiorEntradaCategoria) * 100, 8) : 0;
                    return (
                      <div className="chart-column" key={item.categoria}>
                        <div className="bar-value entrada">{formatarMoeda(item.total)}</div>
                        <div className="bar-track">
                          <div className="bar-fill entrada" style={{ height: `${altura}%` }} />
                        </div>
                        <div className="bar-label">{item.categoria}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="estado-vazio">Nenhuma entrada para montar o grafico.</div>
            )}
          </section>
        )}
      </section>
    </main>
  );
}

function ResumoCard({ label, valor, status, destaque = false }) {
  return (
    <div className={destaque ? 'dash-card dash-saldo' : 'dash-card'}>
      <small>{label}</small>
      <strong className={status === 'positivo' ? 'valor-positivo' : 'valor-negativo'}>{formatarMoeda(valor)}</strong>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
