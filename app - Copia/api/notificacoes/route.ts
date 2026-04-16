import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';

// Configuração Firebase para API
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Inicializar Firebase se ainda não foi inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export async function POST(request: NextRequest) {
  try {
    console.log('📧 API: Recebendo requisição de notificação...');
    
    const body = await request.json();
    console.log('📝 API: Dados recebidos:', body);
    
    const { residenteEmail, residenteNome, titulo, mensagem, tipo, criadoPor } = body;
    
    // Validar dados obrigatórios
    if (!residenteEmail || !residenteNome || !titulo || !mensagem || !tipo || !criadoPor) {
      console.error('❌ API: Dados obrigatórios faltando');
      return NextResponse.json(
        { error: 'Dados obrigatórios faltando' },
        { status: 400 }
      );
    }
    
    const notificacaoData = {
      residenteEmail,
      residenteNome,
      titulo,
      mensagem,
      tipo,
      lida: false,
      criadoPor,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('💾 API: Salvando no Firestore:', notificacaoData);
    console.log('🔍 API: Tentando acessar coleção "notificacoes"...');
    
    const notificacoesCollection = collection(db, 'notificacoes');
    console.log('✅ API: Coleção obtida:', !!notificacoesCollection);
    
    const docRef = await addDoc(notificacoesCollection, notificacaoData);
    console.log('🎉 API: Notificação criada com sucesso! ID:', docRef.id);
    
    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: 'Notificação criada com sucesso'
    });
    
  } catch (error) {
    console.error('❌ API: Erro ao criar notificação:', error);
    console.error('❌ API: Tipo do erro:', typeof error);
    console.error('❌ API: Mensagem do erro:', (error as any)?.message);
    console.error('❌ API: Stack trace:', (error as any)?.stack);
    
    return NextResponse.json(
      { 
        error: 'Erro ao criar notificação',
        details: (error as any)?.message,
        type: typeof error
      },
      { status: 500 }
    );
  }
}

// GET - Buscar notificações de um residente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const residenteEmail = searchParams.get('residenteEmail');
    const onlyUnread = searchParams.get('onlyUnread') === 'true';
    
    if (!residenteEmail) {
      return NextResponse.json(
        { error: 'residenteEmail é obrigatório' },
        { status: 400 }
      );
    }
    
    console.log(`📊 API: Buscando notificações para ${residenteEmail}, apenas não lidas: ${onlyUnread}`);
    
    let q;
    if (onlyUnread) {
      q = query(
        collection(db, 'notificacoes'),
        where('residenteEmail', '==', residenteEmail),
        where('lida', '==', false),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'notificacoes'),
        where('residenteEmail', '==', residenteEmail),
        orderBy('createdAt', 'desc')
      );
    }
    
    const snapshot = await getDocs(q);
    const notificacoes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ API: Encontradas ${notificacoes.length} notificações`);
    
    return NextResponse.json({
      success: true,
      notificacoes,
      count: notificacoes.length
    });
    
  } catch (error) {
    console.error('❌ API: Erro ao buscar notificações:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao buscar notificações',
        details: (error as any)?.message
      },
      { status: 500 }
    );
  }
}

// PUT - Marcar como lida
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, action } = body;
    
    if (!notificationId || !action) {
      return NextResponse.json(
        { error: 'notificationId e action são obrigatórios' },
        { status: 400 }
      );
    }
    
    if (action === 'mark_read') {
      await updateDoc(doc(db, 'notificacoes', notificationId), {
        lida: true,
        updatedAt: new Date()
      });
      
      console.log(`✅ API: Notificação ${notificationId} marcada como lida`);
      
      return NextResponse.json({
        success: true,
        message: 'Notificação marcada como lida'
      });
    }
    
    return NextResponse.json(
      { error: 'Ação não reconhecida' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('❌ API: Erro ao atualizar notificação:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao atualizar notificação',
        details: (error as any)?.message
      },
      { status: 500 }
    );
  }
}

// DELETE - Excluir notificação
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    
    if (!notificationId) {
      return NextResponse.json(
        { error: 'ID da notificação é obrigatório' },
        { status: 400 }
      );
    }
    
    await deleteDoc(doc(db, 'notificacoes', notificationId));
    console.log(`✅ API: Notificação ${notificationId} excluída`);
    
    return NextResponse.json({
      success: true,
      message: 'Notificação excluída com sucesso'
    });
    
  } catch (error) {
    console.error('❌ API: Erro ao excluir notificação:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao excluir notificação',
        details: (error as any)?.message
      },
      { status: 500 }
    );
  }
}
