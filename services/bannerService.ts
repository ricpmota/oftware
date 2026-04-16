import { db } from '@/lib/firebase';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, orderBy, query, Timestamp } from 'firebase/firestore';
import { Banner, BannerContent } from '@/types/banner';

const COLLECTION_NAME = 'banners';

export class BannerService {
  // Buscar todos os banners ordenados por ordem
  static async getAllBanners(): Promise<Banner[]> {
    try {
      console.log('BannerService.getAllBanners: Iniciando busca...');
      const q = query(collection(db, COLLECTION_NAME), orderBy('ordem', 'asc'));
      const querySnapshot = await getDocs(q);
      console.log('BannerService.getAllBanners: Encontrados', querySnapshot.docs.length, 'banners');
      
      const banners = querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Parsear conteudoJson se for string
        let conteudoJson = data.conteudoJson;
        if (typeof conteudoJson === 'string') {
          try {
            conteudoJson = JSON.parse(conteudoJson);
          } catch (e) {
            console.error('Erro ao parsear conteudoJson:', e);
            conteudoJson = undefined;
          }
        }
        
        return {
          id: doc.id,
          ...data,
          conteudoJson: conteudoJson,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          atualizadoEm: data.atualizadoEm?.toDate() || new Date(),
        } as Banner;
      });
      
      console.log('BannerService.getAllBanners: Banners processados:', banners.length);
      return banners;
    } catch (error) {
      console.error('Erro ao buscar banners:', error);
      // Se for erro de permissão, retornar array vazio em vez de lançar erro
      if (error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied') {
        console.warn('Permissão negada ao buscar banners. Verifique as regras do Firestore.');
        return [];
      }
      throw error;
    }
  }

  // Buscar apenas banners ativos (opcionalmente filtrado por local)
  static async getBannersAtivos(local?: 'home' | 'meta'): Promise<Banner[]> {
    try {
      console.log('BannerService.getBannersAtivos: Buscando banners para local:', local);
      const banners = await this.getAllBanners();
      console.log('BannerService.getBannersAtivos: Total de banners encontrados:', banners.length);
      
      let filtered = banners.filter(banner => {
        const isAtivo = banner.ativo === true;
        console.log(`Banner ${banner.id}: ativo=${isAtivo}, local=${banner.local || 'meta'}`);
        return isAtivo;
      });
      console.log('BannerService.getBannersAtivos: Banners ativos:', filtered.length);
      
      // Filtrar por local se especificado
      if (local) {
        filtered = filtered.filter(banner => {
          // Se o banner não tem local definido, considerar como 'meta' (compatibilidade com banners antigos)
          const bannerLocal = banner.local || 'meta';
          const matches = bannerLocal === local;
          console.log(`Banner ${banner.id}: local=${bannerLocal}, esperado=${local}, match=${matches}`);
          return matches;
        });
        console.log('BannerService.getBannersAtivos: Banners filtrados por local:', filtered.length);
      }
      
      const sorted = filtered.sort((a, b) => a.ordem - b.ordem);
      console.log('BannerService.getBannersAtivos: Banners finais ordenados:', sorted.length);
      return sorted;
    } catch (error) {
      console.error('Erro ao buscar banners ativos:', error);
      // Se for erro de permissão, retornar array vazio
      if (error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied') {
        console.warn('Permissão negada ao buscar banners ativos. Verifique as regras do Firestore.');
        return [];
      }
      throw error;
    }
  }

  // Buscar banner por ID
  static async getBannerById(id: string): Promise<Banner | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Parsear conteudoJson se for string (caso o Firestore tenha serializado)
        let conteudoJson = data.conteudoJson;
        if (typeof conteudoJson === 'string') {
          try {
            conteudoJson = JSON.parse(conteudoJson);
          } catch (e) {
            console.error('Erro ao parsear conteudoJson:', e);
            conteudoJson = undefined;
          }
        }
        
        const banner = {
          id: docSnap.id,
          ...data,
          conteudoJson: conteudoJson,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          atualizadoEm: data.atualizadoEm?.toDate() || new Date(),
        } as Banner;
        
        // Garantir que o formato está definido
        if (!banner.formato) {
          banner.formato = banner.conteudoJson ? 'json' : banner.conteudoHtml ? 'html' : 'json';
        }

        return banner;
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar banner:', error);
      throw error;
    }
  }

  // Criar ou atualizar banner
  static async createOrUpdateBanner(banner: Banner | Omit<Banner, 'id'>, userId?: string): Promise<string> {
    try {
      // Remover campos undefined (Firestore não aceita undefined)
      const cleanBanner = (obj: any): any => {
        const cleaned: any = {};
        for (const key in obj) {
          if (obj[key] !== undefined) {
            if (typeof obj[key] === 'object' && obj[key] !== null && !(obj[key] instanceof Date) && !Array.isArray(obj[key])) {
              cleaned[key] = cleanBanner(obj[key]);
            } else {
              cleaned[key] = obj[key];
            }
          }
        }
        return cleaned;
      };

      const bannerData = cleanBanner(banner);
      
      let bannerRef;
      
      if ('id' in banner && banner.id) {
        // Atualizar banner existente
        bannerRef = doc(db, COLLECTION_NAME, banner.id);
        await setDoc(bannerRef, {
          ...bannerData,
          atualizadoEm: Timestamp.now(),
          criadoPor: userId || banner.criadoPor,
        }, { merge: true });
        return banner.id;
      } else {
        // Criar novo banner
        bannerRef = doc(collection(db, COLLECTION_NAME));
        const agora = Timestamp.now();
        await setDoc(bannerRef, {
          ...bannerData,
          criadoEm: agora,
          atualizadoEm: agora,
          criadoPor: userId,
        });
        return bannerRef.id;
      }
    } catch (error) {
      console.error('Erro ao salvar banner:', error);
      throw error;
    }
  }

  // Deletar banner
  static async deleteBanner(id: string): Promise<void> {
    try {
      const bannerRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(bannerRef);
    } catch (error) {
      console.error('Erro ao deletar banner:', error);
      throw error;
    }
  }
}
