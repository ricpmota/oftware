# Oftware - Sistema de Gestão Clínica

Sistema completo de gestão clínica oftalmológica desenvolvido com Next.js, React e TypeScript.

## 🚀 Tecnologias

- **Next.js 15** - Framework React com App Router
- **React 19** - Biblioteca para interfaces
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Framework CSS utilitário
- **Firebase** - Backend e autenticação
- **Vercel** - Deploy e hospedagem

## 📋 Funcionalidades

### Módulos Clínicos
- **Refração** - Exame de refração completo
- **Glaucoma** - Avaliação e monitoramento
- **Retina** - Exames de retina
- **Alerta Clínico** - Sistema de alertas médicos
- **Assinatura Digital** - Prescrições digitais
- **Perfil Médico** - Configuração de perfil profissional

### Gestão de Pacientes
- Cadastro e histórico de pacientes
- Formulários de entrada de dados
- Análise clínica avançada
- Guia de ajuste subjetivo

## 🛠️ Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/oftware.git

# Entre na pasta
cd oftware

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local

# Execute em desenvolvimento
npm run dev
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env.local` com as seguintes variáveis:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
```

## 📦 Scripts Disponíveis

- `npm run dev` - Executa em modo desenvolvimento
- `npm run build` - Gera build de produção
- `npm run start` - Executa build de produção
- `npm run lint` - Executa linter

## 🌐 Deploy

O projeto está configurado para deploy automático no Vercel conectado ao domínio [oftware.com.br](https://oftware.com.br).

### Deploy Manual

```bash
# Build do projeto
npm run build

# Deploy no Vercel
vercel --prod
```

## 📁 Estrutura do Projeto

```
oftware/
├── app/                    # App Router do Next.js
├── components/             # Componentes React
├── lib/                    # Configurações (Firebase, etc.)
├── services/               # Serviços de API
├── types/                  # Definições TypeScript
├── utils/                  # Utilitários e helpers
└── public/                 # Arquivos estáticos
```

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

Para suporte, entre em contato através do site [oftware.com.br](https://oftware.com.br)

---

Desenvolvido com ❤️ para a comunidade oftalmológica 