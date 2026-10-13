import { useEffect, useState, type FormEvent } from 'react';
import type { AwardCategory } from '../../shared/types.ts';
import { useAwards } from './context.ts';

function CategoryRow({ category, isFirst, isLast }: { category: AwardCategory; isFirst: boolean; isLast: boolean }) {
  const { send } = useAwards();
  const [title, setTitle] = useState(category.title);
  useEffect(() => setTitle(category.title), [category.title]);

  const commitTitle = () => {
    if (title.trim() && title.trim() !== category.title) void send('category:rename', category.id, title);
    else setTitle(category.title);
  };

  return (
    <li className="admin-list-row">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-label="Nominasjon"
        maxLength={60}
      />
      <button className="btn btn-small" disabled={isFirst} onClick={() => send('category:move', category.id, -1)} aria-label="Flytt opp">
        ↑
      </button>
      <button className="btn btn-small" disabled={isLast} onClick={() => send('category:move', category.id, 1)} aria-label="Flytt ned">
        ↓
      </button>
      <button
        className="btn btn-small btn-danger"
        onClick={() => {
          if (confirm(`Slette «${category.title}»? Alle stemmer i nominasjonen slettes også.`)) void send('category:delete', category.id);
        }}
      >
        Slett
      </button>
    </li>
  );
}

export function CategoriesEditor() {
  const { state, send } = useAwards();
  const [title, setTitle] = useState('');

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (await send('category:create', title)) setTitle('');
  };

  return (
    <div className="admin-card">
      <h3>Nominasjoner</h3>
      <form className="admin-row" onSubmit={add}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="F.eks. Kveldens beste kostyme"
          maxLength={60}
          autoFocus
        />
        <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
          Legg til
        </button>
      </form>
      <p className="admin-hint">
        Rekkefølgen her er rekkefølgen i kåringen.
        {state.phase !== 'registration' &&
          ' Nomineringen er startet – legger du til en nominasjon nå, må alle inn og nominere i den også.'}
      </p>
      <ul className="admin-list">
        {state.categories.map((c, i) => (
          <CategoryRow key={c.id} category={c} isFirst={i === 0} isLast={i === state.categories.length - 1} />
        ))}
      </ul>
    </div>
  );
}
