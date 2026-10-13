'use client';

import { formatDomainPreview } from '@/lib/whiteLabel/cadastroMedicoConstants';
import {
  whiteLabelProfissaoLabel,
  whiteLabelRegistroLabel,
} from '@/lib/whiteLabel/profissao';
import type { CadastroMedicoWhiteLabel } from '@/types/cadastroMedicoWhiteLabel';

type Props = {
  cadastro: CadastroMedicoWhiteLabel;
  className?: string;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-[#E8EDED]/50">{label}</span>
      <span className="text-sm text-[#E8EDED]/90 break-words">{value}</span>
    </div>
  );
}

export function cadastroWhiteLabelDisplayName(c: CadastroMedicoWhiteLabel): string {
  const nome = [c.tratamento, c.nome, c.sobrenome].filter(Boolean).join(' ').trim();
  return nome || c.nomeMarca || c.nomeCompletoContrato || 'Sem nome';
}

export default function CadastroWhiteLabelDetailPanel({ cadastro, className = '' }: Props) {
  const dominio =
    cadastro.dominioDesejado && cadastro.extensaoDominio
      ? formatDomainPreview(cadastro.dominioDesejado, cadastro.extensaoDominio)
      : '';

  return (
    <div className={`space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 ${className}`}>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[#4CCB7A] mb-2">
          Identidade pública
        </h4>
        <DetailRow label="Nome" value={cadastroWhiteLabelDisplayName(cadastro)} />
        <DetailRow label="Profissão" value={whiteLabelProfissaoLabel(cadastro.profissao || 'medico')} />
        <DetailRow label="Marca" value={cadastro.nomeMarca} />
        <DetailRow label="Especialidade" value={cadastro.especialidade} />
        <DetailRow
          label="Cidade/UF"
          value={[cadastro.cidade, cadastro.estado].filter(Boolean).join(' / ')}
        />
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[#4CCB7A] mb-2">Domínio</h4>
        <DetailRow label="Site" value={dominio} />
        <DetailRow label="Status" value={cadastro.statusDominio} />
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[#4CCB7A] mb-2">
          Endereço de entrega
        </h4>
        <DetailRow label="CEP" value={cadastro.cepEntrega} />
        <DetailRow
          label="Endereço"
          value={[cadastro.ruaEntrega, cadastro.numeroEntrega, cadastro.complementoEntrega]
            .filter(Boolean)
            .join(', ')}
        />
        <DetailRow label="Bairro" value={cadastro.bairroEntrega} />
        <DetailRow
          label="Cidade/UF"
          value={[cadastro.cidadeEntrega, cadastro.estadoEntrega].filter(Boolean).join(' / ')}
        />
        <DetailRow label="Referência" value={cadastro.pontoReferenciaEntrega} />
        <DetailRow label="Recebedor" value={cadastro.nomeRecebedor} />
        <DetailRow label="Telefone" value={cadastro.telefoneEntrega} />
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[#4CCB7A] mb-2">
          Dados contratuais
        </h4>
        <DetailRow label="Nome completo" value={cadastro.nomeCompletoContrato} />
        <DetailRow label="CPF" value={cadastro.cpf} />
        <DetailRow label="RG" value={cadastro.rg} />
        <DetailRow label="Nascimento" value={cadastro.dataNascimento} />
        <DetailRow label="Estado civil" value={cadastro.estadoCivil} />
        <DetailRow label="Nacionalidade" value={cadastro.nacionalidade} />
        <DetailRow
          label={whiteLabelRegistroLabel(cadastro.profissao || 'medico')}
          value={[cadastro.crm, cadastro.crmUf].filter(Boolean).join(' / ')}
        />
        <DetailRow label="E-mail" value={cadastro.emailContrato} />
        <DetailRow label="WhatsApp" value={cadastro.whatsappContrato} />
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[#4CCB7A] mb-2">
          Dados financeiros
        </h4>
        <DetailRow label="Tipo pessoa" value={cadastro.tipoPessoa} />
        <DetailRow label="CNPJ" value={cadastro.cnpj} />
        <DetailRow label="Razão social" value={cadastro.razaoSocial} />
        <DetailRow label="Nome fantasia" value={cadastro.nomeFantasia} />
        <DetailRow label="E-mail financeiro" value={cadastro.emailFinanceiro} />
        <DetailRow label="Dia vencimento" value={cadastro.diaVencimento} />
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[#4CCB7A] mb-2">
          Personalização
        </h4>
        <DetailRow label="Instagram" value={cadastro.instagram} />
        <DetailRow label="Facebook" value={cadastro.facebook} />
        <DetailRow label="Site atual" value={cadastro.siteAtual} />
        <DetailRow label="Frase da marca" value={cadastro.fraseMarca} />
        <DetailRow label="Descrição" value={cadastro.descricaoProfissional} />
        <DetailRow label="Público-alvo" value={cadastro.publicoAlvo} />
        <DetailRow label="Serviços" value={cadastro.servicosDivulgacao} />
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[#4CCB7A] mb-2">Arquivos</h4>
        <DetailRow label="Enviar depois" value={cadastro.enviarDepois === 'true' ? 'Sim' : 'Não'} />
        <DetailRow label="Foto profissional" value={cadastro.fotoProfissionalUrl ? 'Anexado' : ''} />
        <DetailRow label="Logo" value={cadastro.logoUrl ? 'Anexado' : ''} />
        <DetailRow label="Capa" value={cadastro.imagemCapaUrl ? 'Anexado' : ''} />
        <DetailRow label="Documento" value={cadastro.documentoFotoUrl ? 'Anexado' : ''} />
        <DetailRow
          label="Comprovante endereço"
          value={cadastro.comprovanteEnderecoUrl ? 'Anexado' : ''}
        />
      </div>
    </div>
  );
}
