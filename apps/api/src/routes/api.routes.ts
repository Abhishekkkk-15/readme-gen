import { Router } from 'express';
import passport from 'passport';
import { generateReadme, getProjects, analyzeRepository, improveSection } from '../controllers/generate.controller';

const router = Router();

// Endpoint for analyzing a GitHub repository (requires authentication)
router.post('/analyze', passport.authenticate('jwt', { session: false }), analyzeRepository);

// Endpoint for generating a README (requires authentication)
router.post('/generate', passport.authenticate('jwt', { session: false }), generateReadme);

// Endpoint for improving a README section (requires authentication)
router.post('/improve', passport.authenticate('jwt', { session: false }), improveSection);

// Endpoint for fetching recent generations (requires authentication)
router.get('/projects', passport.authenticate('jwt', { session: false }), getProjects);

export default router;
