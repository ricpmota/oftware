'use client';

import { useState } from 'react';
import { Local } from '@/types/auth';

interface EditLocalFormProps {
  local: Local;
  onSave: (local: Local) => void;
  onCancel: () => void;
}

export default function EditLocalForm({ local, onSave, onCancel }: EditLocalFormProps) {
  const [formData, setFormData] = useState({
    nome: local.nome
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...local,
      ...formData
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Local</label>
        <input
          type="text"
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
          required
        />
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
