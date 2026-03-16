# 💼 FinControl

> Sistema inteligente de gestão financeira para representantes comerciais

![Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Lovable-purple.svg)

<p align="center">
  <img src="https://via.placeholder.com/800x400/0891B2/ffffff?text=FinControl+Dashboard" alt="FinControl Dashboard">
</p>

## 🎯 Sobre o Projeto

O **FinControl** é um sistema de gestão financeira desenvolvido especificamente para a realidade de **representantes comerciais**, onde a receita vem exclusivamente de comissões sobre vendas.

Diferente de sistemas genéricos, o FinControl entende as particularidades deste modelo de negócio:
- Comissões pagas por lote de faturamento
- Múltiplas fábricas com prazos diferentes
- Necessidade de conciliar pedidos, faturamentos e recebimentos

## ✨ Funcionalidades Principais

### 📊 Dashboard Inteligente
Visualização em tempo real de:
- Vendas do período
- Pedidos em andamento
- Comissões previstas vs. recebidas
- Evolução mensal
- Projeções de 90 dias

### 👥 CRM & Funil de Vendas
- Gestão completa de leads
- Acompanhamento de oportunidades
- Integração com RD Station CRM
- Controle de follow-ups

### 💰 Gestão de Comissões
- **Faturamento por lotes**: Sistema único que permite vincular múltiplos lotes a um mesmo pedido
- **Comissões proporcionais**: Cálculo automático baseado no valor de cada lote
- **Parcelas independentes**: Cada lote gera suas próprias parcelas conforme prazo da fábrica
- Controle de recebimentos

### 📈 Controle de Pedidos
- Cadastro completo de orders
- Vinculação com clientes e fábricas
- Status de faturamento
- Histórico detalhado

### 💳 Fluxo de Caixa
- Projeções baseadas em prazos reais
- Entrada prevista vs. realizada
- Análise de períodos
- Conciliação bancária automatizada

### 📑 Relatórios & Importação
- Importação automática de relatórios financeiros
- Parser inteligente de PDFs
- Validação de dados
- Conciliação automática

## 🚀 Diferenciais Técnicos

| Funcionalidade | Descrição |
|---|---|
| **Billing por Lotes** | Sistema proprietário para faturamento parcial com comissões proporcionais |
| **Multi-tenant** | Arquitetura preparada para múltiplos usuários com isolamento de dados |
| **Import Engine** | Motor de importação que processa PDFs e extrai dados estruturados |
| **Auto-conciliation** | Algoritmo que cruza lançamentos bancários com comissões esperadas |
| **Smart Projections** | Previsões baseadas em histórico + prazos das fábricas |

## 🛠️ Stack Tecnológica
```
Frontend:
├── React 18 + TypeScript
├── Tailwind CSS
├── Shadcn/ui Components
└── React Query

Backend & Infra:
├── Lovable Platform
├── Supabase (Database)
└── Edge Functions

Integrações:
├── RD Station CRM API
└── PDF Processing
```

## 🏗️ Arquitetura
```
fincontrol/
├── src/
│   ├── components/     # Componentes React reutilizáveis
│   ├── pages/          # Páginas do sistema
│   │   ├── Dashboard
│   │   ├── CRM
│   │   ├── Orders
│   │   ├── Commissions
│   │   └── Reports
│   ├── hooks/          # Custom hooks
│   ├── lib/            # Utilidades e helpers
│   ├── services/       # Integrações e APIs
│   └── types/          # Definições TypeScript
└── ...
```

## 🎨 Interface

Design moderno e intuitivo com foco em:
- ✅ Usabilidade
- ✅ Responsividade (desktop + mobile)
- ✅ Acessibilidade
- ✅ Performance

### Telas Principais:
1. Dashboard com métricas em tempo real
2. CRM com gestão de funil
3. Cadastro de fábricas e clientes
4. Gestão de pedidos
5. Controle de comissões por lote
6. Importação de relatórios financeiros
7. Gestão de despesas
8. Conciliação bancária
9. Fluxo de caixa
10. Projeções financeiras
11. Relatórios consolidados
12. Configurações do sistema

## 📦 Instalação

> **Nota**: Este é um projeto desenvolvido na plataforma Lovable. Para executar localmente, você precisará das credenciais apropriadas.
```bash
# Clone o repositório
git clone (https://github.com/Pauloph89/fincontrol-app)

# Entre na pasta
cd fincontrol

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# Execute o projeto
npm run dev
```

## 🔐 Segurança

- ✅ Autenticação obrigatória
- ✅ Controle de acesso por usuário
- ✅ Dados criptografados
- ✅ Backups automáticos
- ✅ Isolamento de dados por tenant

## 📈 Roadmap

### ✅ Concluído (v1.0)
- [x] Sistema de autenticação
- [x] Dashboard com métricas
- [x] CRM básico
- [x] Gestão de pedidos
- [x] Sistema de faturamento por lotes
- [x] Cálculo de comissões proporcionais
- [x] Importação de relatórios
- [x] Conciliação bancária
- [x] Fluxo de caixa e projeções

### 🚧 Em Desenvolvimento (v1.1)
- [ ] Melhorias na interface de billing por lotes
- [ ] Filtro por período em Orders
- [ ] Totalizadores nos relatórios
- [ ] PDF upload para despesas
- [ ] Otimizações de performance

### 🔮 Futuro (v2.0)
- [ ] App mobile nativo
- [ ] API pública para integrações
- [ ] BI e analytics avançado
- [ ] Machine learning para previsões
- [ ] Integração com mais CRMs

## 📊 Status do Projeto
```
Total de Telas: 16
Funcionalidades Core: 100%
Testes: Em andamento
Deploy: Lovable Platform
Usuários Ativos: Uso interno
```

## 🤝 Contribuindo

Este é um projeto proprietário desenvolvido para uso específico. Caso tenha interesse em implementar algo similar para seu negócio, fique à vontade para usar como inspiração!

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 👨‍💼 Autor

**Paulo** - Representante Comercial  
Desenvolvido para atender as necessidades reais do dia-a-dia comercial.

---

<p align="center">
  Feito com ❤️ usando <a href="https://lovable.dev">Lovable</a>
</p>

<p align="center">
  <sub>💡 Sistema desenvolvido por um representante comercial, para representantes comerciais.</sub>
</p>
