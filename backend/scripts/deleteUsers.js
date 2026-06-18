require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const emails = ['25r21a67h4@mlrit.ac.in', '25r21a04b6@mlrit.ac.in', '25r21a04c4@mlrit.ac.in', '25r21a6706@mlrit.ac.in', '25r21a05ge@mlrit.ac.in', '25r21a05fl@mlrit.ac.in', '25r21a05f1@mlrit.ac.in'];

async function deleteUsers() {
  let uri = process.env.MONGODB_URI;
  if (uri.includes('localhost')) uri = uri.replace(/localhost/g, '127.0.0.1');
  await mongoose.connect(uri);
  console.log('Connected to DB');

  for (const email of emails) {
    const user = await User.findOne({ email: new RegExp('^' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
    if (user) {
      console.log('Found:', user.name, '-', user.email, '- ID:', user._id);
      await User.deleteOne({ _id: user._id });
      console.log('  -> DELETED');
    } else {
      console.log('Not found:', email);
    }
  }

  await mongoose.disconnect();
  console.log('Done');
}

deleteUsers().catch(e => { console.error(e); process.exit(1); });
