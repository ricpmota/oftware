export interface BannerContentSection {
  type: 'text' | 'heading' | 'image' | 'button' | 'list' | 'video' | 'divider';
  content?: string;
  text?: string;
  heading?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  imageUrl?: string;
  imageAlt?: string;
  buttonText?: string;
  buttonLink?: string;
  buttonStyle?: 'primary' | 'secondary' | 'outline';
  items?: string[];
  videoUrl?: string;
  style?: {
    backgroundColor?: string;
    textColor?: string;
    padding?: string;
    margin?: string;
    textAlign?: 'left' | 'center' | 'right';
    fontSize?: string;
  };
}

export interface BannerContent {
  sections: BannerContentSection[];
  styles?: {
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
    maxWidth?: string;
  };
}

export interface Banner {
  id: string;
  titulo: string;
  imagemUrl: string;
  conteudoHtml?: string; // Mantido para compatibilidade com banners antigos
  conteudoJson?: BannerContent; // Novo formato estruturado
  formato: 'html' | 'json'; // Tipo de conteúdo
  local: 'home' | 'meta'; // Local onde o banner será exibido
  ativo: boolean;
  ordem: number;
  criadoEm: Date;
  atualizadoEm: Date;
  criadoPor?: string;
}
