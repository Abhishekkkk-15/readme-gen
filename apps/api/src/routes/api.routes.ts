import { Router } from 'express';
import passport from 'passport';
import { generateReadme, getProjects } from '../controllers/generate.controller';

const router = Router();

// Endpoint for generating a README (requires authentication)
router.post('/generate', passport.authenticate('jwt', { session: false }), generateReadme);

// Endpoint for fetching recent generations (requires authentication)
router.get('/projects', passport.authenticate('jwt', { session: false }), getProjects);

export default router;
