import React from 'react';

export interface CallItem {
  id: string;
  name: string;
  time: string;
  direction?: 'incoming' | 'outgoing';
  video?: boolean;
  avatarUrl?: string | null;
}

export interface CallsProps {
  items?: CallItem[];
  onStartCall?: (video: boolean) => void;
  onCallAgain?: (call: CallItem) => void;
  className?: string;
}

export const Calls: React.FC<CallsProps> = ({ items = [], onStartCall, onCallAgain, className = '' }) => (
  <section className={`calls-screen ${className}`} aria-label="Calls">
    <header className="status-screen-header">
      <div>
        <span className="eyebrow-label">Stay connected</span>
        <h2>Calls</h2>
      </div>
      {onStartCall && <button type="button" className="status-create" onClick={() => onStartCall(false)} aria-label="Start a call">☎</button>}
    </header>
    <div className="call-start-options">
      <button type="button" onClick={() => onStartCall?.(false)}><span>☎</span><strong>Voice call</strong><small>Audio calls are ready when you are</small></button>
      <button type="button" onClick={() => onStartCall?.(true)}><span>▣</span><strong>Video call</strong><small>Start a face-to-face conversation</small></button>
    </div>
    <div className="call-history" role="list">
      {items.length === 0 && <p className="empty">Your recent calls will appear here.</p>}
      {items.map((call) => (
        <button type="button" className="call-row" key={call.id} onClick={() => onCallAgain?.(call)} role="listitem">
          <span className="status-avatar">{call.avatarUrl ? <img src={call.avatarUrl} alt="" /> : call.name.charAt(0).toUpperCase()}</span>
          <span><strong>{call.name}</strong><small>{call.direction === 'incoming' ? '↙ Incoming' : '↗ Outgoing'} · {call.time}</small></span>
          <span className="call-kind" aria-label={call.video ? 'Video call' : 'Voice call'}>{call.video ? '▣' : '☎'}</span>
        </button>
      ))}
    </div>
  </section>
);

export default Calls;
