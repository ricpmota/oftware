// Script temporário para testar envio de e-mails de aplicação
const { EmailAplicacaoService } = require('../services/emailAplicacaoService');

async function testarEmails() {
  console.log('🚀 Iniciando teste de envio de e-mails automáticos...\n');
  
  try {
    const resultado = await EmailAplicacaoService.processarEnviosAutomaticos();
    
    console.log('\n✅ Processamento concluído!');
    console.log(`📧 E-mails enviados: ${resultado.enviados}`);
    console.log(`❌ Erros: ${resultado.erros}`);
    
    if (resultado.detalhes.length > 0) {
      console.log('\n📋 Detalhes:');
      resultado.detalhes.forEach((detalhe, index) => {
        console.log(`\n${index + 1}. ${detalhe.aplicacao.pacienteNome}`);
        console.log(`   Tipo: ${detalhe.tipo === 'antes' ? 'E-mail Antes' : 'E-mail Dia'}`);
        console.log(`   Data aplicação: ${new Date(detalhe.aplicacao.dataAplicacao).toLocaleDateString('pt-BR')}`);
        console.log(`   Status: ${detalhe.sucesso ? '✅ Enviado' : '❌ Falhou'}`);
        if (detalhe.erro) {
          console.log(`   Erro: ${detalhe.erro}`);
        }
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro ao processar e-mails:', error);
    process.exit(1);
  }
}

testarEmails();

