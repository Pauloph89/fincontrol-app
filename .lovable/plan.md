

# Plano de Expansao do FinControl - Fase 1

Dado o tamanho da expansao (10 modulos), o plano sera dividido em 2 fases. Esta Fase 1 cobre os 5 modulos operacionais mais criticos. A Fase 2 (Relatorios, Configuracoes, Automacoes avancadas) sera implementada na sequencia.

---

## Fase 1 - Modulos Incluidos

1. Melhorias no Modulo de Comissoes
2. Upgrade do Modulo de Despesas
3. Fluxo de Caixa Projetado
4. Conciliacao Financeira
5. Dashboard Executivo Avancado

---

## 1. Alteracoes no Banco de Dados

### Tabela `commissions` - adicionar colunas:
- `billing_date` (date, nullable) - data de faturamento alternativa
- `status` (text, default 'ativa') - ativa, cancelada

### Tabela `commission_installments` - adicionar coluna:
- `notes` (text, nullable) - observacoes por parcela
- Atualizar status para aceitar 'cancelado'

### Tabela `expenses` - adicionar colunas:
- `recurrence` (text, nullable) - mensal, trimestral, anual, null=sem recorrencia
- `recurrence_end_date` (date, nullable)
- `parent_expense_id` (uuid, nullable, FK para expenses) - vincular despesas recorrentes

### Nova tabela `expense_categories`:
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `name` (text, NOT NULL)
- `created_at` (timestamptz)
- RLS: usuario ve/edita apenas suas categorias

### Nova tabela `bank_entries` (conciliacao):
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `date` (date, NOT NULL)
- `description` (text, NOT NULL)
- `value` (numeric, NOT NULL)
- `type` (text) - entrada/saida
- `account` (text) - cnpj/pessoal
- `reconciled` (boolean, default false)
- `commission_installment_id` (uuid, nullable, FK)
- `expense_id` (uuid, nullable, FK)
- `receipt_url` (text, nullable)
- `created_at`, `updated_at`
- RLS: usuario ve/edita apenas seus registros

### Nova tabela `audit_log`:
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `table_name` (text)
- `record_id` (uuid)
- `action` (text) - create, update, delete
- `old_data` (jsonb, nullable)
- `new_data` (jsonb, nullable)
- `created_at`
- RLS: usuario ve apenas seu historico

### Storage bucket `receipts`:
- Para upload de comprovantes (PDF/imagem)
- Politica: usuario acessa apenas seus arquivos

---

## 2. Modulo de Comissoes - Melhorias

### Parcelas flexiveis (CommissionForm):
- Adicionar campo "Numero de parcelas" (1-12) com select
- Opcoes rapidas de intervalo: 30/45/60/75/90/120 dias entre parcelas
- Preview das parcelas antes de salvar
- Calcular datas automaticamente baseado na data da venda ou faturamento

### Edicao de comissao:
- Novo componente `CommissionEditDialog`
- Permitir editar todos os campos da comissao
- Ao alterar valor/percentual, recalcular parcelas nao recebidas
- Registrar alteracoes no audit_log

### CommissionsList melhorada:
- Botao de editar em cada comissao
- Status "Cancelado" nas parcelas
- Filtros por fabrica, cliente, periodo
- Busca por numero de pedido

---

## 3. Modulo de Despesas - Upgrade

### Categorias personalizadas:
- Novo hook `useExpenseCategories` para CRUD de categorias
- No ExpenseForm, permitir criar categoria inline
- Categorias padrao pre-cadastradas + custom do usuario

### Recorrencia automatica:
- Campo recorrencia no ExpenseForm (mensal/trimestral/anual)
- Ao cadastrar despesa recorrente, gerar proximas ocorrencias automaticamente (ate 12 meses)
- Link visual entre despesas recorrentes

### Edicao e exclusao:
- Componente `ExpenseEditDialog`
- Excluir despesa individual ou serie recorrente

### Upload de comprovante:
- Usar storage bucket `receipts`
- Botao de upload na lista de despesas
- Preview/download do comprovante

---

## 4. Fluxo de Caixa Projetado (novo modulo)

### Pagina `src/pages/CashFlow.tsx`:
- Consolidar automaticamente parcelas de comissao + despesas
- 4 visoes: diario, semanal, mensal, anual
- Saldo atual calculado: (comissoes recebidas) - (despesas pagas)
- Saldo projetado: saldo atual + (comissoes previstas) - (despesas previstas)

### Componentes:
- `CashFlowTimeline` - linha do tempo com entradas/saidas por dia
- `CashFlowProjection` - grafico de area com projecao anual
- `CashFlowSummary` - cards com saldo atual, projetado, risco
- Destaque visual para meses com risco (saldo negativo projetado)

### Separacao por status:
- Previsto (azul)
- Recebido/Pago (verde)
- Atrasado (vermelho)

---

## 5. Conciliacao Financeira (novo modulo)

### Pagina `src/pages/Reconciliation.tsx`:
- Registro manual de entradas bancarias
- Lista de entradas com status conciliado/pendente/divergente
- Associar entrada bancaria a uma parcela de comissao ou despesa
- Ao conciliar comissao: atualizar status da parcela para "recebido"
- Ao conciliar despesa: atualizar status para "pago"

### Componentes:
- `BankEntryForm` - formulario de registro de entrada
- `ReconciliationList` - lista com filtros (conta, status, periodo)
- `ReconciliationMatch` - dialog para associar entrada a comissao/despesa
- Upload de comprovante por entrada

### Indicadores visuais:
- Verde: conciliado
- Amarelo: pendente
- Vermelho: divergente (valor diferente do previsto)

---

## 6. Dashboard Executivo Avancado

### Novos KPIs:
- Inadimplencia (total atrasado)
- Previsao 90 dias (receitas - despesas nos proximos 90 dias)

### Novos graficos:
- Evolucao mensal (receitas vs despesas ultimos 12 meses) - grafico de linhas
- Projecao de caixa (proximos 6 meses) - grafico de area

### Seletor de periodo:
- Mes atual, mes anterior, ano completo, intervalo personalizado
- Filtrar todos os KPIs e graficos pelo periodo selecionado

### Painel de alertas melhorado:
- Agrupamento por tipo (comissoes/despesas)
- Contagem por severidade
- Link direto para o registro

---

## Secao Tecnica - Estrutura de Arquivos

```text
src/
  hooks/
    useCommissions.ts        (expandir: edicao, parcelas flexiveis)
    useExpenses.ts           (expandir: recorrencia, edicao)
    useExpenseCategories.ts  (novo)
    useBankEntries.ts        (novo)
    useCashFlow.ts           (novo)
    useAuditLog.ts           (novo)
  components/
    commissions/
      CommissionForm.tsx     (expandir parcelas flexiveis)
      CommissionsList.tsx    (expandir filtros, edicao)
      CommissionEditDialog.tsx (novo)
    expenses/
      ExpenseForm.tsx        (expandir recorrencia, categorias)
      ExpensesList.tsx       (expandir upload, edicao)
      ExpenseEditDialog.tsx  (novo)
      CategoryManager.tsx    (novo)
    cashflow/
      CashFlowTimeline.tsx   (novo)
      CashFlowProjection.tsx (novo)
      CashFlowSummary.tsx    (novo)
    reconciliation/
      BankEntryForm.tsx      (novo)
      ReconciliationList.tsx (novo)
      ReconciliationMatch.tsx(novo)
    dashboard/
      KpiCards.tsx           (expandir KPIs)
      DashboardCharts.tsx    (expandir graficos)
      AlertsPanel.tsx        (expandir)
      PeriodSelector.tsx     (novo)
  pages/
    CashFlow.tsx             (novo)
    Reconciliation.tsx       (novo)
    Dashboard.tsx            (expandir)
```

A Fase 2 cobrira: Relatorios (PDF/Excel), Configuracoes (logo, empresa, fabricas, usuarios), e preparacao de APIs para integracoes futuras.

