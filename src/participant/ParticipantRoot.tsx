import { useEffect, useState } from 'react';
import type { Participant, ParticipantView } from '../../shared/types.ts';
import { createParticipantSocket, useParticipantConnection, type ParticipantSocket } from '../lib/socket.ts';
import { PortraitCard } from '../screen/awards/PortraitCard.tsx';
import '../screen/awards/awards.css';
import { getTheme } from '../themes/index.ts';
import { getDeviceId } from './device.ts';
import './participant.css';
import { RegisterForm } from './RegisterForm.tsx';
import { FinalVote, NominationWizard } from './Voting.tsx';

function Message({ title, text, me }: { title: string; text?: string; me?: Participant | null }) {
  return (
    <div className="p-card p-center">
      {me && (
        <div className="p-me" style={{ '--portrait-w': '11rem' } as React.CSSProperties}>
          <PortraitCard participant={me} showName={false} />
        </div>
      )}
      <h1 className="p-title">{title}</h1>
      {text && <p className="p-text">{text}</p>}
    </div>
  );
}

function Content({ view, socket, deviceId }: { view: ParticipantView; socket: ParticipantSocket; deviceId: string }) {
  const { me, phase } = view;
  const [editing, setEditing] = useState(false);

  if (!me) {
    if (view.registrationOpen) return <RegisterForm deviceId={deviceId} />;
    if (phase === 'ceremony' && view.current) return <FinalVote view={view} me={null} socket={socket} />;
    return <Message title="Registreringen er stengt" text="Registreringen stengte da nomineringen startet – følg med på storskjermen!" />;
  }

  switch (phase) {
    case 'registration':
      return (
        <Message
          me={me}
          title={`Du er registrert, ${me.name}!`}
          text={
            me.imageStatus === 'pending'
              ? 'Vi tryller litt med bildet ditt … Se etter deg på storskjermen! Nomineringen starter snart.'
              : 'Se etter deg på storskjermen! Nomineringen starter snart.'
          }
        />
      );
    case 'nominating': {
      const complete = view.categories.every((c) => view.myNominations[c.id] !== undefined);
      if (complete && !editing) {
        return (
          <div className="p-card p-center">
            <h1 className="p-title">Takk for nominasjonene!</h1>
            <p className="p-text">Nå venter vi på at alle andre blir ferdige. Kåringen starter snart.</p>
            <button className="p-btn p-btn-ghost" onClick={() => setEditing(true)}>
              Endre nominasjonene
            </button>
          </div>
        );
      }
      return <NominationWizard view={view} me={me} socket={socket} onDone={() => setEditing(false)} />;
    }
    case 'ceremony':
      if (!view.current) return <Message title="Kåringen starter!" text="Følg med på storskjermen – du stemmer her når finalistene vises." />;
      return <FinalVote view={view} me={me} socket={socket} />;
    case 'finished':
      return <Message me={me} title="Takk for at du var med! 🎃" text="Se alle vinnerne på storskjermen." />;
  }
}

export function ParticipantRoot() {
  const [deviceId] = useState(getDeviceId);
  const [socket, setSocket] = useState<ParticipantSocket | null>(null);
  useEffect(() => {
    const s = createParticipantSocket(deviceId);
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [deviceId]);
  const { view, connected } = useParticipantConnection(socket);
  const theme = getTheme(view?.show.themeId ?? 'default');

  return (
    <div className={`participant theme-${theme.id}`} style={theme.vars}>
      <header className="p-header">{view?.show.name ?? 'PartyShow'}</header>
      <main className="p-main">
        {view && socket ? (
          <Content view={view} socket={socket} deviceId={deviceId} />
        ) : (
          <p className="p-text p-center">Kobler til …</p>
        )}
      </main>
      {view && !connected && <div className="p-offline">Mistet kontakten – prøver igjen …</div>}
    </div>
  );
}
