require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./modules/auth/auth.routes');
const { applyCors } = require('./shared/middlewares/apply-cors');

const app = express();

app.set('trust proxy', 1);
app.use(applyCors);
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'V08.1.1 Backend Running',
    env: process.env.NODE_ENV || 'development',
  });
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRoutes);

app.use((err, req, res, next) => {
  console.error('UNHANDLED_ERROR', err);
  return res.status(500).json({
    ok: false,
    error: 'INTERNAL_SERVER_ERROR',
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
