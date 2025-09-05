const mongoose = require('mongoose');

const HomeCleaningDB = mongoose.createConnection(
  'mongodb://localhost:27017/HomeCleaningDB',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Connection events
HomeCleaningDB.on('connected', () => {
  console.log('✅ MongoDB connected to HomeCleaningDB');
});

HomeCleaningDB.on('error', (err) => {
  console.error('❌ MongoDB Connection Error:', err);
});

HomeCleaningDB.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

module.exports = HomeCleaningDB;
