const express = require('express');
const router = express.Router();

const Page = require('../models/Page');

const defaultPages = {
  'privacy-policy': {
    title: 'Privacy Policy',
    subtitle: 'Aapki privacy aur data safety hamari priority hai.',
    content: 'SaathiShaadi par aapka profile data sirf matrimonial matching ke liye use hota hai.\nAapka phone, email aur private details bina permission ke public nahi dikhaya jata.\nProposal accept hone ke baad hi users ek dusre se chat ya call kar sakte hain.\nAap kabhi bhi apna profile update ya support team se deletion request kar sakte hain.',
  },
  terms: {
    title: 'Terms of Use',
    subtitle: 'Platform use karne ke basic niyam.',
    content: 'Users ko apni sahi jaankari deni hogi. Fake profile, spam ya abusive behavior allowed nahi hai.\nSaathiShaadi matching platform hai; final decision aur verification user ki zimmedari hai.\nAdmin harmful, fake, duplicate ya policy-violating profiles ko block/delete kar sakta hai.\nPlatform ka misuse karne par account suspend kiya ja sakta hai.',
  },
  contact: {
    title: 'Contact Us',
    subtitle: 'Help chahiye? Hamse sampark karein.',
    content: 'Email: help@saathishaadi.in\nPhone: 9999999999\nAddress: Patna, Bihar, India 800001\nSupport timing: Monday to Saturday, 10 AM to 6 PM',
  },
  about: {
    title: 'About Us',
    subtitle: 'Bihar ke families ke liye simple aur safe vivah portal.',
    content: 'SaathiShaadi Bihar focused matrimonial platform hai jahan verified profiles browse kiye ja sakte hain.\nHamari priority safe proposals, privacy-first chat aur local community matching hai.\nPlatform Hindu, Muslim, Christian aur dusre communities ke liye inclusive matching support karta hai.',
  },
  'hindu-vivah': {
    title: 'Hindu Vivah',
    subtitle: 'Bihar ke Hindu profiles ke liye focused matching.',
    content: 'Religion, caste, district aur age filters ke saath suitable Hindu profiles browse karein.',
  },
  'muslim-nikah': {
    title: 'Muslim Nikah',
    subtitle: 'Bihar ke Muslim families ke liye nikah matching.',
    content: 'Community, district aur age preferences ke hisab se Muslim profiles explore karein.',
  },
  'christian-match': {
    title: 'Christian Match',
    subtitle: 'Christian matrimonial profiles ke liye dedicated page.',
    content: 'Verified Christian profiles dekhein aur suitable match ko proposal bhejein.',
  },
  'all-religions': {
    title: 'All Religions',
    subtitle: 'Har community ke liye respectful matrimonial matching.',
    content: 'SaathiShaadi par multiple religions aur communities ke profiles available hain.',
  },
};

router.get('/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug || '').toLowerCase();
    const page = await Page.findOne({ slug, isActive: true }).lean();
    const data = page || defaultPages[slug];

    if (!data) return res.status(404).json({ message: 'Page nahi mila' });

    res.json({
      slug,
      title: data.title,
      subtitle: data.subtitle || '',
      content: String(data.content || '').split('\n').filter(Boolean),
      updatedAt: data.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ message: 'Page load error' });
  }
});

module.exports = router;
