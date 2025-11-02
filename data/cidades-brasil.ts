// Estados e cidades principais do Brasil
export const estadosCidades = {
  'AC': { nome: 'Acre', cidades: ['Rio Branco', 'Cruzeiro do Sul'] },
  'AL': { nome: 'Alagoas', cidades: ['Maceió', 'Arapiraca', 'Palmeira dos Índios'] },
  'AP': { nome: 'Amapá', cidades: ['Macapá', 'Santana'] },
  'AM': { nome: 'Amazonas', cidades: ['Manaus', 'Parintins', 'Itacoatiara'] },
  'BA': { nome: 'Bahia', cidades: ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Juazeiro'] },
  'CE': { nome: 'Ceará', cidades: ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Sobral', 'Crato'] },
  'DF': { nome: 'Distrito Federal', cidades: ['Brasília', 'Ceilândia', 'Taguatinga', 'Plano Piloto', 'Samambaia'] },
  'ES': { nome: 'Espírito Santo', cidades: ['Vitória', 'Vila Velha', 'Cariacica', 'Serra', 'Cachoeiro de Itapemirim'] },
  'GO': { nome: 'Goiás', cidades: ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia'] },
  'MA': { nome: 'Maranhão', cidades: ['São Luís', 'Imperatriz', 'Caxias', 'Timon', 'Codó'] },
  'MT': { nome: 'Mato Grosso', cidades: ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Cáceres', 'Sinop'] },
  'MS': { nome: 'Mato Grosso do Sul', cidades: ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã'] },
  'MG': { nome: 'Minas Gerais', cidades: ['Belo Horizonte', 'Contagem', 'Uberlândia', 'Juiz de Fora', 'Betim'] },
  'PA': { nome: 'Pará', cidades: ['Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Paragominas'] },
  'PB': { nome: 'Paraíba', cidades: ['João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux'] },
  'PR': { nome: 'Paraná', cidades: ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel'] },
  'PE': { nome: 'Pernambuco', cidades: ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina'] },
  'PI': { nome: 'Piauí', cidades: ['Teresina', 'Parnaíba', 'Picos', 'Piripiri', 'Floriano'] },
  'RJ': { nome: 'Rio de Janeiro', cidades: ['Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Niterói'] },
  'RN': { nome: 'Rio Grande do Norte', cidades: ['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Macaíba'] },
  'RS': { nome: 'Rio Grande do Sul', cidades: ['Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Canoas', 'Santa Maria'] },
  'RO': { nome: 'Rondônia', cidades: ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena', 'Cacoal'] },
  'RR': { nome: 'Roraima', cidades: ['Boa Vista', 'Rorainópolis', 'Caracaraí'] },
  'SC': { nome: 'Santa Catarina', cidades: ['Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Chapecó'] },
  'SP': { nome: 'São Paulo', cidades: ['São Paulo', 'Guarulhos', 'Campinas', 'São Bernardo do Campo', 'Santo André', 'Osasco', 'Ribeirão Preto', 'Sorocaba', 'Santos', 'Mauá'] },
  'SE': { nome: 'Sergipe', cidades: ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana', 'São Cristóvão'] },
  'TO': { nome: 'Tocantins', cidades: ['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional', 'Paraíso do Tocantins'] }
};

export type EstadoSigla = keyof typeof estadosCidades;

export const estadosList = Object.entries(estadosCidades).map(([sigla, data]) => ({
  sigla,
  nome: data.nome
}));

