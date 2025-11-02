'use client';

import { useState } from 'react';
import { Residente } from '@/types/auth';

interface EditResidenteFormProps {
  residente: Residente;
  onSave: (residente: Residente) => void;
  onCancel: () => void;
}

export default function EditResidenteForm({ residente, onSave, onCancel }: EditResidenteFormProps) {
  const [formData, setFormData] = useState({
    nome: residente.nome,
    nivel: residente.nivel,
    email: residente.email,
    telefone: residente.telefone || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...residente,
      ...formData
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
        <input
          type="text"
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nível</label>
        <select
          value={formData.nivel}
          onChange={(e) => setFormData({ ...formData, nivel: e.target.value as 'R1' | 'R2' | 'R3' })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
        >
          <option value="R1">R1</option>
          <option value="R2">R2</option>
          <option value="R3">R3</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
        <input
          type="tel"
          value={formData.telefone}
          onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
          placeholder="+5511999999999"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
        />
        <p className="text-xs text-gray-500 mt-1">Formato: +5511999999999 (com código do país)</p>
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
