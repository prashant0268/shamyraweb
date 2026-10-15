import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

/** Printable 4×6 insert card for corporate gift boxes. /internal/prints/insert?code=GIFT-ACME&company=Acme&pct=15 */
export default function GiftInsert() {
  const [p] = useSearchParams();
  const code = p.get('code') || 'GIFT-CODE';
  const company = p.get('company') || '';
  const pct = p.get('pct') || '15';
  const copies = Math.min(12, Math.max(1, Number(p.get('copies') || 1)));
  const url = `https://kindflames.com/?code=${encodeURIComponent(code)}`;
  return (
    <div style={{ fontFamily: 'Karla, system-ui, sans-serif', background: '#fff', color: '#1E231D', padding: 16 }}>
      <style>{`@page { size: 4in 6in; margin: 0 } @media print { .nav { display: none } .card { page-break-after: always; margin: 0 } }`}</style>
      <div className="nav" style={{ marginBottom: 12, fontSize: 13 }}>Print at 4×6 in. Use <code>?copies=N</code> for several cards. <button onClick={() => window.print()} style={{ marginLeft: 8 }}>Print</button></div>
      {Array.from({ length: copies }).map((_, i) => (
        <div className="card" key={i} style={{ width: '4in', height: '6in', border: '1px solid #ddd', padding: '0.4in', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box', background: '#F3F1EC', marginBottom: 12 }}>
          <div style={{ textAlign: 'center' }}><img src="/img/logo-512.png" alt="" style={{ width: 56 }} /><div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 26, fontWeight: 700, marginTop: 6 }}>Kind Flames</div><div style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: '#6B7266' }}>Hand-poured in New Jersey</div></div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, lineHeight: 1.2 }}>{company ? `A gift from ${company}.` : 'A gift, poured by hand.'}</div>
            <p style={{ fontSize: 13, color: '#6B7266', margin: '8px 0 0' }}>Trim the wick to ¼″, let the first burn reach the edge of the jar, and enjoy.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', borderRadius: 10, padding: 12 }}>
            <QRCodeSVG value={url} size={84} />
            <div><div style={{ fontSize: 12, color: '#6B7266' }}>Loved it? Take <b>{pct}% off</b> your own order</div><div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 22, fontWeight: 700, letterSpacing: '.04em' }}>{code}</div><div style={{ fontSize: 11, color: '#6B7266' }}>kindflames.com</div></div>
          </div>
        </div>
      ))}
    </div>
  );
}
