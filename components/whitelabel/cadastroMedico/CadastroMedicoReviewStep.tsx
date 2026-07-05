'use client';

import {
  CADASTRO_MEDICO_STEP_TITLES,
  ESTADOS_BR_OPTIONS,
  formatDomainPreview,
} from '@/lib/whiteLabel/cadastroMedicoConstants';

type FormState = Record<string, string>;

function Row({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:gap-2 py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm font-medium text-slate-500 sm:w-40 shrink-0">{label}</span>
      <span className="text-sm text-slate-800 break-words">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-2">{title}</h3>
      {children}
    </div>
  );
}

export default function CadastroMedicoReviewStep({ form }: { form: FormState }) {
  const dominio =
    form.dominioDesejado && form.extensaoDominio
      ? formatDomainPreview(form.dominioDesejado, form.extensaoDominio)
      : '';

  return (
    <div className="space-y-4">
      <label className="block text-lg sm:text-xl font-semibold text-slate-900 mb-2 leading-snug">
        {CADASTRO_MEDICO_STEP_TITLES[6]}
      </label>
      <p className="text-sm text-slate-500 mb-4">Revise todas as informações antes de concluir.</p>

      <Section title="Identidade pública">
        <Row label="Nome" value={`${form.tratamento} ${form.nome} ${form.sobrenome}`.trim()} />
        <Row label="Marca" value={form.nomeMarca} />
        <Row label="Especialidade" value={form.especialidade} />
        <Row label="Local" value={[form.cidade, form.estado].filter(Boolean).join(' / ')} />
      </Section>

      <Section title="Domínio">
        <Row label="Site" value={dominio} />
        <Row label="Extensão" value={form.extensaoDominio} />
        <Row label="Status" value={form.statusDominio} />
      </Section>

      <Section title="Endereço de entrega">
        <Row label="CEP" value={form.cepEntrega} />
        <Row
          label="Endereço"
          value={[form.ruaEntrega, form.numeroEntrega, form.complementoEntrega].filter(Boolean).join(', ')}
        />
        <Row label="Bairro" value={form.bairroEntrega} />
        <Row
          label="Cidade/UF"
          value={[form.cidadeEntrega, form.estadoEntrega].filter(Boolean).join(' / ')}
        />
        <Row label="Referência" value={form.pontoReferenciaEntrega} />
        <Row label="Recebedor" value={form.nomeRecebedor} />
        <Row label="Telefone" value={form.telefoneEntrega} />
      </Section>

      <Section title="Dados contratuais">
        <Row label="Nome completo" value={form.nomeCompletoContrato} />
        <Row label="CPF" value={form.cpf} />
        <Row label="RG" value={form.rg} />
        <Row label="Nascimento" value={form.dataNascimento} />
        <Row label="Estado civil" value={form.estadoCivil} />
        <Row label="Nacionalidade" value={form.nacionalidade} />
        <Row label="CRM" value={`${form.crm} / ${form.crmUf}`} />
        <Row label="E-mail" value={form.emailContrato} />
        <Row label="WhatsApp" value={form.whatsappContrato} />
        {form.usarMesmoEnderecoEntrega === 'nao' && (
          <>
            <Row label="CEP contrato" value={form.cepContrato} />
            <Row
              label="Endereço contrato"
              value={[form.ruaContrato, form.numeroContrato, form.complementoContrato].filter(Boolean).join(', ')}
            />
            <Row label="Bairro" value={form.bairroContrato} />
            <Row
              label="Cidade/UF"
              value={[form.cidadeContrato, form.estadoContrato].filter(Boolean).join(' / ')}
            />
          </>
        )}
      </Section>

      <Section title="Dados financeiros">
        <Row label="Tipo" value={form.tipoPessoa === 'juridica' ? 'Jurídica' : 'Física'} />
        {form.tipoPessoa === 'juridica' && (
          <>
            <Row label="CNPJ" value={form.cnpj} />
            <Row label="Razão social" value={form.razaoSocial} />
            <Row label="Nome fantasia" value={form.nomeFantasia} />
            <Row label="E-mail financeiro" value={form.emailFinanceiro} />
          </>
        )}
        <Row label="Vencimento" value={form.diaVencimento ? `Dia ${form.diaVencimento}` : ''} />
      </Section>

      <Section title="Arquivos">
        <Row label="Enviar depois" value={form.enviarDepois === 'true' ? 'Sim' : 'Não'} />
        <Row label="Foto profissional" value={form.fotoProfissionalUrl ? 'Anexado' : '—'} />
        <Row label="Logo" value={form.logoUrl ? 'Anexado' : '—'} />
        <Row label="Capa" value={form.imagemCapaUrl ? 'Anexado' : '—'} />
        <Row label="Documento c/ foto" value={form.documentoFotoUrl ? 'Anexado' : '—'} />
        <Row label="Comprovante endereço" value={form.comprovanteEnderecoUrl ? 'Anexado' : '—'} />
      </Section>
    </div>
  );
}

export { ESTADOS_BR_OPTIONS };
