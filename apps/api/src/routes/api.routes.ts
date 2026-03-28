import { Router } from 'express';
import { generateReadme, getProjects } from '../controllers/generate.controller';

const router = Router();

// Endpoint for generating a README
router.post('/generate', generateReadme);

// Endpoint for fetching recent generations
router.get('/projects', getProjects);

export default router;
