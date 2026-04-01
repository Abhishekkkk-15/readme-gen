import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import {
  getProviderLabel,
  normalizeStoredProvider,
  removeStoredApiKey,
  sanitizeUserApiKeys,
  upsertEncryptedApiKey,
} from '../utils/api-key-store';

const router = Router();

// Helper to sign JWT
const signToken = (user: any) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '7d',
  });
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user = await User.create({
      email,
      password: hashedPassword,
      displayName: displayName || email.split('@')[0],
      provider: 'local',
    });

    const token = signToken(user);
    res.status(201).json({ token, user: sanitizeUserApiKeys(user) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', { session: false }, (err: any, user: any, info: any) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info.message });

    const token = signToken(user);
    res.json({ token, user: sanitizeUserApiKeys(user) });
  })(req, res, next);
});

// Google Auth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const token = signToken(req.user);
    // Redirect back to frontend with token in query param (for simplicity in this demo)
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}`);
  }
);

// GitHub Auth
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const token = signToken(req.user);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}`);
  }
);

// Get current user
router.get('/me', passport.authenticate('jwt', { session: false }), (req: any, res) => {
  res.json(sanitizeUserApiKeys(req.user));
});

router.post('/keys', passport.authenticate('jwt', { session: false }), async (req: any, res) => {
  try {
    const provider = normalizeStoredProvider(req.body?.provider);
    const rawKey = String(req.body?.key || '').trim();

    if (!provider) {
      return res.status(400).json({ error: 'Valid provider is required' });
    }

    if (!rawKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    upsertEncryptedApiKey(req.user, provider, rawKey);
    await req.user.save();

    res.status(200).json({
      message: `${getProviderLabel(provider)} key saved`,
      user: sanitizeUserApiKeys(req.user),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save API key' });
  }
});

router.delete('/keys/:provider', passport.authenticate('jwt', { session: false }), async (req: any, res) => {
  try {
    const provider = normalizeStoredProvider(req.params.provider);

    if (!provider) {
      return res.status(400).json({ error: 'Valid provider is required' });
    }

    removeStoredApiKey(req.user, provider);
    await req.user.save();

    res.status(200).json({
      message: `${getProviderLabel(provider)} key removed`,
      user: sanitizeUserApiKeys(req.user),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to remove API key' });
  }
});

export default router;
