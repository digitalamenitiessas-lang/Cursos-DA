'use client';
import { useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
type CatalogEntry = { id: string; search: string; category: string; node: ReactNode };
export function Catalog({ entries }: { entries: CatalogEntry[] }) {
  const [q, setQ] = useState(''),
    [category, setCategory] = useState('Todos');
  const categories = [...new Set(entries.map((e) => e.category))];
  const visible = entries.filter(
    (e) =>
      e.search.includes(q.toLocaleLowerCase('es').trim()) &&
      (category === 'Todos' || e.category === category),
  );
  return (
    <>
      <div className="catalog-filters">
        <label className="search-field">
          <Search />
          <span className="sr-only">Buscar cursos</span>
          <input
            value={q}
            placeholder="¿Qué querés aprender?"
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div className="filter-tabs" role="group" aria-label="Filtrar por categoría">
          {['Todos', ...categories].map((c) => (
            <button
              key={c}
              className={category === c ? 'active' : ''}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <span className="sr-only" role="status">
        {visible.length} cursos encontrados
      </span>
      <div className="course-grid">
        {visible.map((e) => (
          <div key={e.id}>{e.node}</div>
        ))}
      </div>
      {entries.length > 0 && !visible.length && (
        <div className="empty-state">
          <Search size={28} />
          <h2>No encontramos cursos con esa búsqueda.</h2>
          <p>Probá con otra palabra o explorá todas las categorías.</p>
          <button
            className="button-secondary"
            onClick={() => {
              setQ('');
              setCategory('Todos');
            }}
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </>
  );
}
