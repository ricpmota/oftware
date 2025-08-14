# Oftware - Sistema de Gestão Clínica Oftalmológica

Sistema completo de assistência oftalmológica para médicos, otimizado para máxima performance e experiência do usuário.

## Otimizações de Performance Implementadas

### **Carregamento Otimizado**
- **Lazy Loading** de componentes não críticos
- **Code Splitting** automático com Next.js
- **Suspense** para loading states otimizados
- **Dynamic Imports** para módulos sob demanda

### **Otimização de Imagens**
- **Lazy Loading** para todas as imagens não críticas
- **fetchPriority** para recursos importantes
- **decoding="async"** para melhor performance
- **Cache otimizado** com Service Worker

### **Firebase Otimizado**
- **Lazy Initialization** do Analytics
- **Singleton Pattern** para apps Firebase
- **Emuladores** apenas em desenvolvimento
- **Error Handling** robusto

### **Build e Bundle**
- **Webpack SplitChunks** para vendor bundles
- **CSS Minification** com cssnano
- **Tree Shaking** automático
- **Compressão Gzip** habilitada

### **Cache e Service Worker**
- **Estratégias de Cache** inteligentes
- **Static First** para recursos estáticos
- **Network First** para dados dinâmicos
- **Stale While Revalidate** para otimização

### **SEO e Performance**
- **Sitemap XML** otimizado
- **Robots.txt** configurado
- **Meta tags** otimizadas
- **PWA Manifest** completo

## Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build otimizado
npm run build

# Build com análise
npm run build:analyze

# Build para exportação
npm run build:export

# Limpeza e otimização
npm run optimize

# Produção
npm run start:prod

# Linting
npm run lint
npm run lint:fix

# Type checking
npm run type-check
```

## PWA Features

- **Offline Support** com Service Worker
- **App-like Experience** com manifest.json
- **Home Screen Installation**
- **Background Sync**
- **Push Notifications** (preparado)

## Configurações de Performance

### Next.js
- `optimizeCss: true`
- `swcMinify: true`
- `compress: true`
- Headers de cache otimizados

### Tailwind CSS
- Purge CSS em produção
- Otimizações de core plugins
- Animações otimizadas

### TypeScript
- Target ES2020
- Strict mode habilitado
- Otimizações de compilação

## Métricas de Performance

- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms

## Compatibilidade

- **Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS 14+, Android 10+
- **PWA**: Suporte completo
- **Offline**: Funcionalidade básica

## Monitoramento

- **Web Vitals** integrados
- **Performance API** habilitada
- **Error Tracking** com Firebase
- **Analytics** lazy loaded

## Deploy

```bash
# Build para produção
npm run build

# Deploy com Vercel
vercel --prod

# Deploy estático
npm run build:export
```

## Changelog

### v1.0.0 - Performance Release
- Lazy loading implementado
- Code splitting otimizado
- Imagens otimizadas
- Build otimizado
- PWA melhorado
- SEO otimizado

## Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## Suporte

Para suporte técnico ou dúvidas sobre performance:
- Email: suporte@oftware.com
- WhatsApp: +55 (11) 99999-9999
- Website: https://oftware.com

---

**Desenvolvido com amor para a comunidade oftalmológica brasileira**