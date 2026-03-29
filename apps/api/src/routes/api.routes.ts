import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { generateReadme, generateStream, getProjects, analyzeRepository, improveSection, getRecommendations } from '../controllers/generate.controller';

const router = Router();

// Middleware for optional JWT authentication
const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('jwt', { session: false }, (err: any, user: any) => {
    if (user) {
      req.user = user;
    }
    next();
  })(req, res, next);
};

// Endpoint for analyzing a GitHub repository (requires authentication)
router.post('/analyze', passport.authenticate('jwt', { session: false }), analyzeRepository);

// Endpoint for getting AI structure recommendations (Optional auth, CLI safe)
router.post('/recommendations', optionalAuth, getRecommendations);

// Endpoint for generating a README (Optional auth, CLI safe)
router.post('/generate', optionalAuth, generateReadme);

// NEW: Endpoint for streaming a README generation (SSE)
router.post('/generate/stream', optionalAuth, (req, res, next) => {
  // Add generateStream to the controllers import if not already there
  next();
}, require('../controllers/generate.controller').generateStream);

// Endpoint for improving a README section (Optional auth, CLI safe)
router.post('/improve', optionalAuth, improveSection);

// Endpoint for fetching recent generations (Strict auth)
router.get('/projects', passport.authenticate('jwt', { session: false }), getProjects);

export default router;
