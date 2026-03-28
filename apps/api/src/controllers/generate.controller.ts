import { Request, Response } from 'express';
import { llmService } from '../services/llm.service';
import Project from '../models/Project';

export const generateReadme = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, features, provider } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const readmeContent = await llmService.generateReadme(
      title,
      description || '',
      Array.isArray(features) ? features : [],
      provider === 'gemini' ? 'gemini' : 'groq'
    );

    // Optionally save the generation to MongoDB
    if (process.env.MONGODB_URI) {
      try {
        const newProject = new Project({
          title,
          description: description || '',
          readmeContent,
        });
        await newProject.save();
      } catch (dbError) {
        console.error('Failed to save to database:', dbError);
        // Continue and just return the content to the user
      }
    }

    res.status(200).json({ content: readmeContent });
  } catch (error: any) {
    console.error('Error generating README:', error);
    res.status(500).json({ error: error.message || 'Failed to generate README' });
  }
};

export const getProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!process.env.MONGODB_URI) {
       res.status(503).json({ error: 'Database is not connected' });
       return;
    }
    const projects = await Project.find().sort({ createdAt: -1 }).limit(10);
    res.status(200).json(projects);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve projects' });
  }
};
