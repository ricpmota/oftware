'use client';



import { useMemo, useState } from 'react';

import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';

import { parseBioDataRegistro, formatBioRegistroPtBrShort } from '@/utils/bioImpedanciaDate';

import { getBioMainMetrics } from '@/utils/bioImpedanciaMetrics';

import { BioEvolutionLineChart } from '@/components/bodymap/BioEvolutionLineChart';

import { BIO_CARD, BIO_CARD_PAD, BIO_SECTION_TITLE } from '@/components/bodymap/bioImpedanciaTokens';



type TabId = 'peso' | 'gordura' | 'musculo' | 'visceral';



const TABS: { id: TabId; label: string; unit: string; color: string }[] = [

  { id: 'peso', label: 'Peso', unit: 'kg', color: '#0d9488' },

  { id: 'gordura', label: 'Gordura', unit: '%', color: '#f59e0b' },

  { id: 'musculo', label: 'Mas. Muscular', unit: 'kg', color: '#10b981' },

  { id: 'visceral', label: 'Gord. Visceral', unit: '', color: '#ef4444' },

];



export interface BioHistoryTabsProps {

  registros: BioImpedanciaRegistro[];

}



export function BioHistoryTabs({ registros }: BioHistoryTabsProps) {

  const [tab, setTab] = useState<TabId>('peso');



  const dados = useMemo(() => {

    return [...registros]

      .sort((a, b) => parseBioDataRegistro(a.dataRegistro).getTime() - parseBioDataRegistro(b.dataRegistro).getTime())

      .map((r) => {

        const m = getBioMainMetrics(r);

        return {

          data: formatBioRegistroPtBrShort(r.dataRegistro),

          peso: m.peso,

          gordura: m.percentualGordura,

          musculo: m.massaMuscularKg,

          visceral: m.gorduraVisceral,

        };

      });

  }, [registros]);



  const dataKeyMap: Record<TabId, keyof (typeof dados)[0]> = {

    peso: 'peso',

    gordura: 'gordura',

    musculo: 'musculo',

    visceral: 'visceral',

  };



  const visibleTabs = TABS.filter((t) => {

    const key = dataKeyMap[t.id];

    return dados.some((d) => d[key] != null);

  });



  if (dados.length < 2 || visibleTabs.length === 0) return null;



  const activeTab = visibleTabs.some((t) => t.id === tab) ? tab : visibleTabs[0].id;

  const activeConfig = TABS.find((t) => t.id === activeTab)!;

  const activeKey = dataKeyMap[activeTab];



  const chartData = dados.map((d) => ({

    data: d.data,

    valor: d[activeKey] as number | null,

  }));



  return (

    <div className={`${BIO_CARD} ${BIO_CARD_PAD}`}>

      <h4 className={BIO_SECTION_TITLE}>Evolução</h4>



      <div className="flex flex-wrap gap-1.5 mb-4 mt-3">

        {visibleTabs.map((t) => (

          <button

            key={t.id}

            type="button"

            onClick={() => setTab(t.id)}

            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${

              activeTab === t.id

                ? 'bg-teal-600 text-white shadow-sm'

                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'

            }`}

          >

            {t.label}

          </button>

        ))}

      </div>



      <BioEvolutionLineChart

        data={chartData}

        label={activeConfig.label}

        unit={activeConfig.unit}

        color={activeConfig.color}

      />

    </div>

  );

}

