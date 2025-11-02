'use client';

import { useState } from 'react';
import { Servico, Local } from '@/types/auth';

interface EditServicoFormProps {
  servico: Servico;
  locais: Local[];
  onSave: (servico: Servico) => void;
  onCancel: () => void;
}

export default function EditServicoForm({ servico, locais, onSave, onCancel }: EditServicoFormProps) {
  const [formData, setFormData] = useState({
    nome: servico.nome,
    localId: servico.localId
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...servico,
      ...formData
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Serviço</label>
        <input
          type="text"
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
        <select
          value={formData.localId}
          onChange={(e) => setFormData({ ...formData, localId: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
          required
        >
          <option value="">Selecione um local</option>
          {locais.map((local) => (
            <option key={local.id} value={local.id}>
              {local.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
        >
          Salvar
        </button>
      </div>
    </form>
  );
}
