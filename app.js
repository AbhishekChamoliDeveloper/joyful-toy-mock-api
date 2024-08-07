const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'chamoli';

app.use(cors());
app.use(bodyParser.json());

mongoose.connect('mongodb+srv://abhishekchamoli007:abhishekchamoli007@cluster0.zrz3s0u.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
  name: String,
  mobileNumber: String,
  email: { type: String, unique: true },
  password: String,
  isAdmin: { type: Boolean, default: false }
});

const toySchema = new mongoose.Schema({
  name: String,
  description: String,
  price: String,
  image: String 
});

const User = mongoose.model('User', userSchema);
const Toy = mongoose.model('Toy', toySchema);

const seedToys = async () => {
  const toyData = [
    { id: '1', name: 'Teddy Bear', description: 'A soft and cuddly teddy bear perfect for all ages.', price: '₹1,299', image: 'https://m.media-amazon.com/images/I/516wYjXDmgL._AC_UL320_.jpg' },
    { id: '2', name: 'Lego Set', description: 'A creative Lego set to build anything you imagine.', price: '₹2,499', image: 'https://m.media-amazon.com/images/I/71BhjB5fxuL._AC_UL320_.jpg' },
    { id: '3', name: 'Remote Control Car', description: 'Fast and fun remote control car for outdoor play.', price: '₹3,199', image: 'https://m.media-amazon.com/images/I/71oLyiFeseL._AC_UL320_.jpg' },
    { id: '4', name: 'Doll House', description: 'A beautiful doll house with furniture and accessories.', price: '₹4,499', image: 'https://m.media-amazon.com/images/I/71E+LENb8ML._AC_UL320_.jpg' },
    { id: '5', name: 'Puzzle Game', description: 'A challenging puzzle game to enhance cognitive skills.', price: '₹799', image: 'https://m.media-amazon.com/images/I/81bw9TVkwfL._AC_UL320_.jpg' }
  ];

  await Toy.deleteMany({});
  await Toy.insertMany(toyData);
};

seedToys().catch(err => console.error('Error seeding toys:', err));

app.post('/register', async (req, res) => {
  const { name, mobileNumber, email, password } = req.body;

  if (!name || !mobileNumber || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 8);
    const newUser = new User({ name, mobileNumber, email, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ email: newUser.email, isAdmin: newUser.isAdmin }, SECRET_KEY, { expiresIn: '1h' });

    res.status(201).json({ message: 'User registered successfully', token });
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ message: 'Error registering user', error: err.message });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ email: user.email, isAdmin: user.isAdmin }, SECRET_KEY, { expiresIn: '1h' });

    res.status(200).json({ token });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ message: 'Error logging in', error: err.message });
  }
});

app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Password reset instructions sent' });
  } catch (err) {
    console.error('Error processing password reset:', err);
    res.status(500).json({ message: 'Error processing password reset', error: err.message });
  }
});

app.get('/toys', async (req, res) => {
  try {
    const toys = await Toy.find();
    res.status(200).json(toys);
  } catch (err) {
    console.error('Error fetching toys data:', err);
    res.status(500).json({ message: 'Error fetching toys data', error: err.message });
  }
});

app.get('/toys/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const toy = await Toy.findById(id);
    if (!toy) {
      return res.status(404).json({ message: 'Toy not found' });
    }
    res.status(200).json(toy);
  } catch (err) {
    console.error('Error fetching toy data:', err);
    res.status(500).json({ message: 'Error fetching toy data', error: err.message });
  }
});

app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !user.isAdmin) {
      return res.status(400).json({ message: 'Admin not found' });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ email: user.email, isAdmin: user.isAdmin }, SECRET_KEY, { expiresIn: '1h' });

    res.status(200).json({ token });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ message: 'Error logging in', error: err.message });
  }
});

app.post('/admin/toys', async (req, res) => {
  const { name, description, price, image } = req.body;

  try {
    const newToy = new Toy({ name, description, price, image });
    await newToy.save();
    res.status(201).json({ message: 'Toy added successfully' });
  } catch (err) {
    console.error('Error adding toy:', err);
    res.status(500).json({ message: 'Error adding toy', error: err.message });
  }
});

app.delete('/admin/toys/:id', async (req, res) => {
  const { id } = req.params;

  console.log(id);

  try {
    await Toy.findByIdAndDelete(id);
    res.status(200).json({ message: 'Toy deleted successfully' });
  } catch (err) {
    console.error('Error deleting toy:', err);
    res.status(500).json({ message: 'Error deleting toy', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
