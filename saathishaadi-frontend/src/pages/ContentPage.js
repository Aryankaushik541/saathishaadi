import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

const fallbackPages = {
  'privacy-policy': {
    title: 'Privacy Policy',
    subtitle: 'Aapki privacy aur data safety hamari priority hai.',
    content: [
      'SaathiShaadi par aapka profile data sirf matrimonial matching ke liye use hota hai.',
      'Aapka phone, email aur private details bina permission ke public nahi dikhaya jata.',
      'Proposal accept hone ke baad hi users ek dusre se chat ya call kar sakte hain.',
      'Aap kabhi bhi apna profile update ya support team se deletion request kar sakte hain.',
    ],
  },
  terms: {
    title: 'Terms of Use',
    subtitle: 'Platform use karne ke basic niyam.',
    content: [
      'Users ko apni sahi jaankari deni hogi. Fake profile, spam ya abusive behavior allowed nahi hai.',
      'SaathiShaadi matching platform hai; final decision aur verification user ki zimmedari hai.',
      'Admin harmful, fake, duplicate ya policy-violating profiles ko block/delete kar sakta hai.',
      'Platform ka misuse karne par account suspend kiya ja sakta hai.',
    ],
  },
  contact: {
    title: 'Contact Us',
    subtitle: 'Help chahiye? Hamse sampark karein.',
    content: [
      'Email: help@saathishaadi.in',
      'Phone: 9999999999',
      'Address: Patna, Bihar, India 800001',
      'Support timing: Monday to Saturday, 10 AM to 6 PM',
    ],
  },
  about: {
    title: 'About Us',
    subtitle: 'Bihar ke families ke liye simple aur safe vivah portal.',
    content: [
      'SaathiShaadi Bihar focused matrimonial platform hai jahan verified profiles browse kiye ja sakte hain.',
      'Hamari priority safe proposals, privacy-first chat aur local community matching hai.',
      'Platform Hindu, Muslim, Christian aur dusre communities ke liye inclusive matching support karta hai.',
    ],
  },
  'hindu-vivah': {
    title: 'Hindu Vivah',
    subtitle: 'Bihar ke Hindu profiles ke liye focused matching.',
    content: ['Religion, caste, district aur age filters ke saath suitable Hindu profiles browse karein.'],
  },
  'muslim-nikah': {
    title: 'Muslim Nikah',
    subtitle: 'Bihar ke Muslim families ke liye nikah matching.',
    content: ['Community, district aur age preferences ke hisab se Muslim profiles explore karein.'],
  },
  'christian-match': {
    title: 'Christian Match',
    subtitle: 'Christian matrimonial profiles ke liye dedicated page.',
    content: ['Verified Christian profiles dekhein aur suitable match ko proposal bhejein.'],
  },
  'all-religions': {
    title: 'All Religions',
    subtitle: 'Har community ke liye respectful matrimonial matching.',
    content: ['SaathiShaadi par multiple religions aur communities ke profiles available hain.'],
  },
};

const ContentPage = () => {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.get(`/pages/${slug}`)
      .then(res => {
        if (mounted) setPage(res.data);
      })
      .catch(() => {
        if (mounted) {
          setPage(fallbackPages[slug] || null);
          if (!fallbackPages[slug]) toast.error('Page load nahi hua');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [slug]);

  if (loading) return <div className="loader" />;

  if (!page) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <h1 style={styles.title}>Page nahi mila</h1>
          <p style={styles.text}>Ye page abhi available nahi hai.</p>
          <Link to="/" style={styles.button}>Home par jayein</Link>
        </section>
      </main>
    );
  }

  const content = Array.isArray(page.content)
    ? page.content
    : String(page.content || '').split('\n').filter(Boolean);

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <Link to="/" style={styles.back}>← Home</Link>
        <h1 style={styles.title}>{page.title}</h1>
        {page.subtitle && <p style={styles.subtitle}>{page.subtitle}</p>}
        <div style={styles.content}>
          {content.map((line, index) => (
            <p key={index} style={styles.text}>{line}</p>
          ))}
        </div>
      </section>
    </main>
  );
};

const styles = {
  page: { maxWidth: 920, margin: '0 auto', padding: '36px 20px' },
  card: { background: 'white', borderRadius: 14, padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #f0e0d0' },
  back: { display: 'inline-block', marginBottom: 18, color: '#c0392b', textDecoration: 'none', fontFamily: "'Hind', sans-serif", fontWeight: 600 },
  title: { fontFamily: "'Playfair Display', serif", fontSize: 34, color: '#1a0a0a', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#7a5c52', fontFamily: "'Hind', sans-serif", marginBottom: 24 },
  content: { borderTop: '1px solid #f0e0d0', paddingTop: 22 },
  text: { fontSize: 15, lineHeight: 1.8, color: '#4d3430', fontFamily: "'Hind', sans-serif", marginBottom: 14 },
  button: { display: 'inline-block', marginTop: 12, background: '#c0392b', color: 'white', padding: '10px 18px', borderRadius: 8, textDecoration: 'none', fontFamily: "'Hind', sans-serif", fontWeight: 600 },
};

export default ContentPage;
