# LinkShort - TODO

## Banco de Dados e Schema
- [x] Criar tabela de links com campos: id, shortCode, originalUrl, customAlias, password, expiresAt, ogTitle, ogDescription, ogImage, createdAt, updatedAt
- [x] Criar tabela de cliques com campos: id, linkId, timestamp, userAgent, ipAddress, country, city, device, referrer, createdAt
- [x] Criar índices para performance em shortCode e customAlias

## API REST
- [x] Endpoint POST /api/links - criar novo link encurtado
- [x] Endpoint GET /api/links - listar todos os links do usuário
- [x] Endpoint GET /api/links/:id - obter detalhes de um link específico
- [x] Endpoint GET /api/links/:id/stats - obter estatísticas de cliques
- [x] Endpoint PUT /api/links/:id - atualizar link (alias, password, expiration, OG tags)
- [x] Endpoint DELETE /api/links/:id - deletar link
- [x] Autenticação via Bearer token para todos os endpoints

## Redirecionamento e Open Graph
- [x] Criar rota dinâmica para /:shortCode que detecta user-agent do Facebook
- [x] Implementar detecção de Facebook bot (facebookexternalhit, Facebot)
- [x] Servir Open Graph tags customizadas para bots do Facebook
- [x] Redirecionar usuários reais para URL de destino com status 301
- [x] Registrar clique no banco de dados com metadados

## Painel de Gerenciamento
- [x] Dashboard com resumo de links totais, cliques totais, links ativos
- [x] Listagem de links com paginação, busca e filtros
- [x] Página de detalhes do link com estatísticas
- [x] Formulário para criar novo link com alias, password, expiration, OG tags
- [ ] Geração de QR Code para cada link
- [x] Editar link existente
- [x] Deletar link com confirmação
- [ ] Exportar dados de links e estatísticas

## Analytics e Rastreamento
- [x] Rastreamento de cliques com timestamp
- [x] Geolocalização por IP (país e cidade)
- [x] Detecção de dispositivo (mobile, tablet, desktop)
- [x] Rastreamento de referrer
- [ ] Gráficos de cliques por data
- [x] Gráficos de cliques por país
- [x] Gráficos de cliques por dispositivo
- [x] Tabela de últimos cliques com detalhes

## Autenticação
- [x] Integrar com Manus OAuth já configurado
- [x] Proteger endpoints de API com autenticação
- [x] Gerar API keys para usuários
- [x] Gerenciar API keys no painel

## Configuração Vercel
- [x] Criar vercel.json com configurações de build e deploy
- [x] Configurar variáveis de ambiente para produção
- [x] Integração com GitHub para CI/CD
- [ ] Testar deploy na Vercel

## UI/UX
- [x] Design responsivo para mobile, tablet e desktop
- [x] Tema consistente com componentes shadcn/ui
- [x] Feedback visual para ações (toasts, loading states)
- [ ] Acessibilidade (WCAG 2.1)
- [x] Documentação de API

## Testes
- [ ] Testes unitários para funções de geração de short codes
- [ ] Testes de API endpoints
- [ ] Testes de detecção de Facebook bot
- [ ] Testes de redirecionamento
