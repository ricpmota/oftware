'use client';

import { VideoSubject } from '@/types/videoLibrary';

interface SearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedSubject: string;
  onSubjectChange: (subject: string) => void;
  availableSubjects: VideoSubject[];
}

/**
 * Componente de busca e filtros
 */
export default function SearchAndFilters({
  searchQuery,
  onSearchChange,
  selectedSubject,
  onSubjectChange,
  availableSubjects,
}: SearchAndFiltersProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
      {/* Barra de busca */}
      <div>
        <label htmlFor="search" className="block text-xs font-medium text-gray-700 mb-1">
          Buscar por nome
        </label>
        <input
          id="search"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Digite o nome do vídeo..."
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {/* Filtros */}
      <div>
        {/* Filtro por assunto */}
        <div>
          <label htmlFor="subject-filter" className="block text-xs font-medium text-gray-700 mb-1">
            Filtrar por assunto
          </label>
          <select
            id="subject-filter"
            value={selectedSubject}
            onChange={(e) => onSubjectChange(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="">Todos os assuntos</option>
            {availableSubjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
