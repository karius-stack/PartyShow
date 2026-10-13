import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { preparePhoto } from './device.ts';

export function RegisterForm({ deviceId }: { deviceId: string }) {
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setPhoto(await preparePhoto(file));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!photo || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('deviceId', deviceId);
      body.append('name', name.trim());
      body.append('photo', photo, 'photo.jpg');
      const res = await fetch('/api/participants', { method: 'POST', body });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      // Ved suksess bytter siden til bekreftelsen når socketen melder at vi er registrert.
      if (!res.ok) setError(json.error ?? 'Registreringen feilet – prøv igjen');
    } catch {
      setError('Fikk ikke kontakt med serveren – prøv igjen');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="p-card p-register" onSubmit={submit}>
      <h1 className="p-title">Bli med i kåringen!</h1>
      <p className="p-text">Skriv navnet ditt og ta et bilde av deg selv – gjerne i hele kostymet.</p>

      <label className="p-field">
        Navn
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" required />
      </label>

      <div className="p-photo">
        {preview ? <img src={preview} alt="Bildet ditt" /> : <span className="p-photo-empty">🎃</span>}
      </div>

      <div className="p-row">
        <label className="p-btn p-btn-secondary">
          {photo ? 'Ta nytt bilde' : 'Ta bilde'}
          <input type="file" accept="image/*" capture="user" hidden onChange={onFile} />
        </label>
        <label className="p-btn p-btn-ghost">
          Velg fra galleri
          <input type="file" accept="image/*" hidden onChange={onFile} />
        </label>
      </div>

      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="p-btn p-btn-primary" disabled={busy || !photo || !name.trim()}>
        {busy ? 'Sender …' : 'Registrer meg'}
      </button>
    </form>
  );
}
