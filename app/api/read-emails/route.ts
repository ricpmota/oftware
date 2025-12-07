import { NextRequest, NextResponse } from 'next/server';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { promisify } from 'util';

interface EmailMessage {
  uid: number;
  subject: string;
  from: string;
  to: string;
  date: Date;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    // Verificar se as credenciais do Zoho estão configuradas
    if (!process.env.ZOHO_EMAIL || !process.env.ZOHO_PASSWORD) {
      console.error('❌ Credenciais não configuradas:', {
        hasEmail: !!process.env.ZOHO_EMAIL,
        hasPassword: !!process.env.ZOHO_PASSWORD,
      });
      return NextResponse.json(
        { error: 'Credenciais do Zoho Mail não configuradas. Configure ZOHO_EMAIL e ZOHO_PASSWORD no .env.local' },
        { status: 500 }
      );
    }

    console.log('📧 Iniciando leitura de e-mails do Zoho...');

    // Obter parâmetros da query string
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // Configurar conexão IMAP do Zoho
    const imap = new Imap({
      user: process.env.ZOHO_EMAIL,
      password: process.env.ZOHO_PASSWORD,
      host: 'imap.zoho.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 10000, // 10 segundos para conectar
      authTimeout: 10000, // 10 segundos para autenticar
    });

    // Promisificar métodos do IMAP
    const connect = promisify(imap.connect.bind(imap));
    const openBox = promisify(imap.openBox.bind(imap));
    const search = promisify(imap.search.bind(imap));
    const fetch = promisify(imap.fetch.bind(imap));
    const end = promisify(imap.end.bind(imap));

    // Conectar ao servidor com timeout
    console.log('🔌 Conectando ao servidor IMAP...');
    const connectPromise = connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout ao conectar ao servidor IMAP')), 15000)
    );
    await Promise.race([connectPromise, timeoutPromise]);
    console.log('✅ Conectado com sucesso');

    // Abrir caixa de entrada
    console.log('📂 Abrindo caixa de entrada...');
    await openBox('INBOX', true); // true = somente leitura
    console.log('✅ Caixa de entrada aberta');

    // Buscar e-mails
    const searchCriteria = unreadOnly ? ['UNSEEN'] : ['ALL'];
    console.log('🔍 Buscando e-mails...', { criteria: searchCriteria });
    const uids = await search(searchCriteria);
    console.log(`📬 Encontrados ${uids?.length || 0} e-mails`);

    if (!uids || uids.length === 0) {
      await end();
      return NextResponse.json({ emails: [], count: 0 });
    }

    // Limitar quantidade de e-mails
    const limitedUids = uids.slice(-limit).reverse(); // Mais recentes primeiro

    // Buscar e-mails usando Promise
    const emails: EmailMessage[] = await new Promise((resolve, reject) => {
      const fetchOptions = {
        bodies: '',
        struct: true,
      };

      const emails: EmailMessage[] = [];
      let processedCount = 0;
      const totalEmails = limitedUids.length;

      const fetchStream = imap.fetch(limitedUids, fetchOptions);

      fetchStream.on('message', (msg) => {
        let emailData: Partial<EmailMessage> = {};
        let buffer = '';

        msg.once('attributes', (attrs) => {
          emailData.uid = attrs.uid;
        });

        msg.on('body', (stream) => {
          stream.on('data', (chunk) => {
            buffer += chunk.toString('utf8');
          });
        });

        msg.once('end', async () => {
          try {
            const parsed = await simpleParser(buffer);
            const email: EmailMessage = {
              uid: emailData.uid || 0,
              subject: parsed.subject || '(Sem assunto)',
              from: parsed.from?.text || 'Desconhecido',
              to: parsed.to?.text || '',
              date: parsed.date || new Date(),
              text: parsed.text || '',
              html: parsed.html || '',
              attachments: parsed.attachments?.map((att) => ({
                filename: att.filename || 'anexo',
                contentType: att.contentType || 'application/octet-stream',
                size: att.size || 0,
              })),
            };
            emails.push(email);
            processedCount++;

            // Quando todos os e-mails forem processados
            if (processedCount === totalEmails) {
              // Ordenar por data (mais recentes primeiro)
              emails.sort((a, b) => b.date.getTime() - a.date.getTime());
            }
          } catch (parseError) {
            console.error('Erro ao processar e-mail:', parseError);
            processedCount++;
          }
        });
      });

      fetchStream.once('error', (err) => {
        reject(err);
      });

      fetchStream.once('end', async () => {
        // Aguardar um pouco para garantir que todos os e-mails foram processados
        await new Promise((r) => setTimeout(r, 1000));
        await end();
        // Ordenar por data (mais recentes primeiro)
        emails.sort((a, b) => b.date.getTime() - a.date.getTime());
        resolve(emails);
      });
    });

    return NextResponse.json({
      emails,
      count: emails.length,
    });
  } catch (error) {
    console.error('❌ Erro ao ler e-mails:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Detalhes do erro:', {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : 'Unknown',
    });
    
    return NextResponse.json(
      {
        error: 'Erro ao ler e-mails',
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack }),
      },
      { status: 500 }
    );
  }
}

