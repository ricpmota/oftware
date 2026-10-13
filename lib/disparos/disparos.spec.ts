import { describe, expect, it } from 'vitest';
import { classifyImportedContacts, normalizeOptOutList } from '@/lib/disparos/classifyImport';
import {
  createDisparoCampaign,
  estimateDurationMinutes,
  formatEstimatedDuration,
  pauseDisparoCampaign,
  renderDisparoMessage,
  resumeDisparoCampaign,
  resolveCampaignPhone,
} from '@/lib/disparos/campaign';
import { parseCsv, suggestColumnMapping } from '@/lib/disparos/parseCsv';
import { normalizeDisparoPhone } from '@/lib/disparos/normalizeDisparoPhone';
import { toPrimeiroNome } from '@/lib/disparos/primeiroNome';
import { initialDisparosWhatsappView } from '@/lib/disparos/whatsappView';
import { DISPAROS_SESSION_ID } from '@/lib/disparos/constants';

describe('primeiro nome', () => {
  it('capitaliza sem remover acentos', () => {
    expect(toPrimeiroNome('JOSÉ DA SILVA')).toBe('José');
    expect(toPrimeiroNome('MARIA EDUARDA SOUZA')).toBe('Maria');
    expect(toPrimeiroNome('joão pedro')).toBe('João');
    expect(toPrimeiroNome('ANA')).toBe('Ana');
    expect(toPrimeiroNome('  josé   ')).toBe('José');
  });
});

describe('csv', () => {
  it('lê ponto e vírgula e sugere colunas sem exigir o título exato', () => {
    const parsed = parseCsv('Cliente;Celular;WhatsApp 2\nJosé da Silva;11999998888;11888887777\n');
    expect(parsed.headers).toEqual(['Cliente', 'Celular', 'WhatsApp 2']);
    expect(suggestColumnMapping(parsed.headers)).toEqual({
      nome: 'Cliente',
      telefone1: 'Celular',
      telefone2: 'WhatsApp 2',
    });
  });

  it('preserva vírgula dentro de aspas', () => {
    const parsed = parseCsv('Nome,Telefone\n"Silva, José",11988887777\n');
    expect(parsed.rows[0]?.[0]).toBe('Silva, José');
  });
});

describe('classificação', () => {
  const parsed = parseCsv(
    [
      'Nome,Telefone 1,Telefone 2',
      'JOSÉ DA SILVA,11999998888,',
      'MARIA,11 99999-8888,11888887777',
      'ANA,,',
      'PEDRO,123,',
      'LIA,21977776666,',
    ].join('\n'),
  );
  const mapping = suggestColumnMapping(parsed.headers);

  it('separa válidos, duplicados, inválidos e sem telefone', () => {
    const { contacts, summary } = classifyImportedContacts({
      importId: 'imp',
      parsed,
      mapping,
    });
    expect(summary.total).toBe(5);
    expect(summary.validos).toBe(2);
    expect(summary.invalidos).toBe(1);
    expect(summary.duplicados).toBe(1);
    expect(summary.semTelefone).toBe(1);
    expect(parsed.rows).toHaveLength(5);
    expect(contacts[0]?.primeiroNome).toBe('José');
    expect(contacts[0]?.telefone1.original).toBe('11999998888');
    expect(contacts[0]?.telefone1.normalized).toBe('5511999998888');
    expect(contacts[1]?.status).toBe('duplicado');
    expect(contacts[2]?.status).toBe('sem_telefone');
    expect(contacts[3]?.status).toBe('invalido');
    expect(contacts[4]?.status).toBe('valido');
  });

  it('marca opt-out sem apagar o telefone original', () => {
    const blocked = normalizeOptOutList('5511999998888');
    const { contacts } = classifyImportedContacts({
      importId: 'imp',
      parsed,
      mapping,
      optOut: blocked,
    });
    expect(contacts[0]?.optOut).toBe(true);
    expect(contacts[0]?.telefone1.original).toBe('11999998888');
  });
});

describe('telefone do disparo', () => {
  const options = { defaultDdd: '83' };

  it('normaliza celular sem DDD, com DDD, com 55 e com sinal de +', () => {
    expect(normalizeDisparoPhone('986110117', options)).toMatchObject({
      original: '986110117',
      normalized: '5583986110117',
      display: '+55 83 98611-0117',
      usedDefaultDdd: true,
    });
    expect(normalizeDisparoPhone('83986110117', options).normalized).toBe('5583986110117');
    expect(normalizeDisparoPhone('5583986110117', options)).toMatchObject({
      normalized: '5583986110117',
      alreadyHadCountry: true,
      usedDefaultDdd: false,
    });
    expect(normalizeDisparoPhone('+55 83 98611-0117', options)).toMatchObject({
      original: '+55 83 98611-0117',
      normalized: '5583986110117',
    });
  });

  it('trata fixo de 8 dígitos sem confundir com celular', () => {
    expect(normalizeDisparoPhone('3237-5780', options)).toMatchObject({
      original: '3237-5780',
      normalized: '558332375780',
      display: '+55 83 3237-5780',
      usedDefaultDdd: true,
    });
  });

  it('não inventa DDD quando o campo está vazio', () => {
    expect(normalizeDisparoPhone('986110117', { defaultDdd: '' }).outcome).toBe('falta_ddd');
    expect(normalizeDisparoPhone('32375780').outcome).toBe('falta_ddd');
  });

  it('deduplica formatos diferentes do mesmo número', () => {
    const parsed = parseCsv(
      [
        'Nome,Telefone 1',
        'ANYELLE,(83) 98611-0117',
        'ALINE,83 98611-0117',
        'CARMELO,986110117',
        'LIA,+55 83 98611-0117',
      ].join('\n'),
    );
    const phoneOptions = { defaultDdd: '83' };
    const { contacts, summary } = classifyImportedContacts({
      importId: 'imp',
      parsed,
      mapping: { nome: 'Nome', telefone1: 'Telefone 1', telefone2: '' },
      phoneOptions,
    });
    expect(parsed.rows).toHaveLength(4);
    expect(contacts.map((contact) => contact.telefone1.normalized)).toEqual([
      '5583986110117',
      '5583986110117',
      '5583986110117',
      '5583986110117',
    ]);
    expect(summary.validos).toBe(1);
    expect(summary.duplicados).toBe(3);
    expect(summary.telefonesComDddPadrao).toBe(1);
    expect(summary.telefonesJaComDdd).toBe(2);
    expect(summary.telefonesJaComPais).toBe(1);
    expect(contacts[0]?.telefone1.original).toBe('(83) 98611-0117');
    expect(contacts[2]?.telefone1.display).toBe('+55 83 98611-0117');
  });

  it('opt-out usa a mesma normalização do CSV', () => {
    const parsed = parseCsv('Nome,Telefone 1\nANYELLE,986110117\n');
    const phoneOptions = { defaultDdd: '83' };
    const { contacts } = classifyImportedContacts({
      importId: 'imp',
      parsed,
      mapping: { nome: 'Nome', telefone1: 'Telefone 1', telefone2: '' },
      optOut: normalizeOptOutList('+55 (83) 98611-0117', phoneOptions),
      phoneOptions,
    });
    expect(contacts[0]?.status).toBe('opt_out');
    expect(contacts[0]?.telefone1.original).toBe('986110117');
    expect(contacts[0]?.telefone1.normalized).toBe('5583986110117');
  });
});

describe('campanha', () => {
  it('estima 33h 18min para 1000 destinatários a cada 2 minutos', () => {
    expect(estimateDurationMinutes(1000, 2)).toBe(1998);
    expect(formatEstimatedDuration(1000, 2)).toBe('aproximadamente 33h 18min');
  });

  it('substitui {nome} pelo primeiro nome', () => {
    expect(renderDisparoMessage('Olá, {nome}! Tudo bem?', 'José')).toBe('Olá, José! Tudo bem?');
  });

  it('usa um único telefone por pessoa', () => {
    const { contacts } = classifyImportedContacts({
      importId: 'imp',
      parsed: parseCsv('Nome,Telefone 1,Telefone 2\nJOSÉ,11999998888,11888887777\n'),
      mapping: { nome: 'Nome', telefone1: 'Telefone 1', telefone2: 'Telefone 2' },
    });
    const contact = contacts[0]!;
    expect(resolveCampaignPhone(contact, 'telefone1').phone).toBe('5511999998888');
    expect(resolveCampaignPhone(contact, 'telefone1_ou_telefone2').phone).toBe('5511999998888');
    const campaign = createDisparoCampaign({
      contacts,
      selectedIds: new Set(),
      draft: {
        audience: 'validos',
        phoneChoice: 'telefone1_ou_telefone2',
        messageTemplate: 'Olá, {nome}',
        intervalMinutes: 2,
        name: 'Teste',
      },
      importId: 'imp',
      connection: initialDisparosWhatsappView(),
      now: new Date('2026-10-05T15:00:00.000Z'),
    });
    expect(campaign.items).toHaveLength(1);
    expect(campaign.items[0]?.status).toBe('pending');
    expect(campaign.items[0]?.telefone).toBe('5511999998888');
    expect(campaign.remetente.sessionId).toBe(DISPAROS_SESSION_ID);
    expect(campaign.status).toBe('preparando');
    const resumed = resumeDisparoCampaign(pauseDisparoCampaign(campaign));
    expect(resumed.status).toBe('em_andamento');
    expect(resumed.items[0]?.status).toBe('pending');
    expect(resumed.totals.sent).toBe(0);
  });
});
