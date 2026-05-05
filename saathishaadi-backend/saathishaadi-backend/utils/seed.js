const mongoose = require('mongoose');
const User = require('../models/User');
const Advertisement = require('../models/Advertisement');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const BIHAR_DISTRICTS = [
  'Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Nalanda',
  'Vaishali', 'Saran', 'Siwan', 'Munger', 'Begusarai', 'Samastipur',
  'Madhubani', 'Sitamarhi', 'Purnia', 'Araria',
];

const maleNames = ['Rahul Kumar', 'Amit Singh', 'Vikash Yadav', 'Rohit Sharma', 'Suresh Prasad',
  'Deepak Kumar', 'Ajay Mishra', 'Manish Tiwari', 'Santosh Gupta', 'Rajan Verma',
  'Arun Kumar', 'Praveen Singh', 'Nilesh Kumar', 'Vivek Pandey', 'Saurabh Yadav'];

const femaleNames = ['Priya Kumari', 'Anjali Singh', 'Pooja Devi', 'Sunita Yadav', 'Rekha Sharma',
  'Meena Devi', 'Geeta Kumari', 'Kavita Singh', 'Seema Devi', 'Anita Kumari',
  'Neha Singh', 'Ritu Kumari', 'Pallavi Yadav', 'Swati Mishra', 'Sapna Gupta'];

const religions = ['Hindu', 'Hindu', 'Hindu', 'Hindu', 'Muslim', 'Muslim', 'Christian'];
const hinduCastes = ['Brahmin', 'Rajput', 'Kayastha', 'Yadav', 'Kurmi', 'Bhumihar', 'Koiri'];
const professions = ['Government Job', 'Teacher', 'Engineer', 'Business', 'Doctor', 'Private Job', 'Farmer'];

const bios = [
  'Main ek simple aur seedha insaan hun. Ghar-parivar se pyaar karta/karti hun.',
  'Bihar mein rehta/rehti hun. Mehnat aur imandari mera pehla dharm hai.',
  'Sarkari naukri mein hun. Ek khushhal parivar banana chahta/chahti hun.',
  'Padha-likha hun. Jeevan mein aage badhna chahta/chahti hun saath lekar.',
  'Parivaar ke saath rahna pasand hai. Simple lifestyle follow karta/karti hun.',
];

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/saathishaadi';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected');

    // Clear existing non-admin users
    await User.deleteMany({ isAdmin: false });
    console.log('🗑️ Old users cleared');

    const users = [];
    let phoneCounter = 9800000001;

    // 15 male profiles
    for (let i = 0; i < 15; i++) {
      const religion = religions[Math.floor(Math.random() * religions.length)];
      users.push({
        phone: String(phoneCounter++),
        name: maleNames[i],
        age: Math.floor(Math.random() * 15) + 22,
        gender: 'Male',
        religion,
        caste: religion === 'Hindu' ? hinduCastes[Math.floor(Math.random() * hinduCastes.length)] : 'Sheikh',
        district: BIHAR_DISTRICTS[Math.floor(Math.random() * BIHAR_DISTRICTS.length)],
        profession: professions[Math.floor(Math.random() * professions.length)],
        bio: bios[Math.floor(Math.random() * bios.length)],
      });
    }

    // 15 female profiles
    for (let i = 0; i < 15; i++) {
      const religion = religions[Math.floor(Math.random() * religions.length)];
      users.push({
        phone: String(phoneCounter++),
        name: femaleNames[i],
        age: Math.floor(Math.random() * 12) + 20,
        gender: 'Female',
        religion,
        caste: religion === 'Hindu' ? hinduCastes[Math.floor(Math.random() * hinduCastes.length)] : 'Ansari',
        district: BIHAR_DISTRICTS[Math.floor(Math.random() * BIHAR_DISTRICTS.length)],
        profession: professions[Math.floor(Math.random() * professions.length)],
        bio: bios[Math.floor(Math.random() * bios.length)],
      });
    }

    await User.insertMany(users);
    console.log(`✅ ${users.length} dummy users created`);

    // Seed advertisements
    await Advertisement.deleteMany({});
    await Advertisement.insertMany([
      { title: '🏠 Property in Patna - 2BHK ₹25 Lakh se', position: 'top', bgColor: '#1a5276', isActive: true },
      { title: '💍 Kajal Jewellers - Sone ka Gahna', position: 'sidebar', bgColor: '#7d6608', isActive: true },
      { title: '📸 Wedding Photography | Patna | Call Now', position: 'sidebar', bgColor: '#922b21', isActive: true },
      { title: '🎒 Shadi Package - Tent, Catering Bihar', position: 'inline', bgColor: '#1b4f72', isActive: true },
      { title: '🎵 DJ & Band Baaja | Best Price Bihar', position: 'sidebar', bgColor: '#1a5276', isActive: true },
    ]);
    console.log('✅ Advertisements seeded');

    console.log('\n🎉 Seed complete!');
    console.log('📱 Test phones: 9800000001 to 9800000030');
    console.log('🔑 Test OTP: 123456');
    console.log('👑 Admin: username=admin, password=saathishaadi@admin2025');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
};

seedDatabase();
