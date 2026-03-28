import { Request, Response } from 'express';
import { llmService } from '../services/llm.service';
import Project from '../models/Project';
import { repoService } from '../services/repo.service';
import { config } from 'dotenv';

config();

export const analyzeRepository = async (req: Request, res: Response): Promise<void> => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) {
      res.status(400).json({ error: 'Repository URL is required' });
      return;
    }

    const analysis = await repoService.analyzeRepo(repoUrl);
    res.status(200).json(analysis);
  } catch (error: any) {
    console.error('Error analyzing repository:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze repository' });
  }
};

export const getRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { analysis, provider } = req.body;
    if (!analysis) {
      res.status(400).json({ error: 'Analysis data is required for recommendations' });
      return;
    }

    const recommendations = await llmService.getRecommendations(
      analysis,
      provider === 'gemini' ? 'gemini' : 'groq'
    );

    res.status(200).json(recommendations);
  } catch (error: any) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: error.message || 'Failed to get recommendations' });
  }
};

export const generateReadme = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, features, provider, repoUrl, analysis, tone, shields, additionalContext } = req.body;
    const user = (req as any).user;

    if (!title && !repoUrl) {
      res.status(400).json({ error: 'Title or Repository URL is required' });
      return;
    }

    let finalAnalysis = analysis;

    // If repoUrl is provided but no analysis, perform analysis on the fly
    if (repoUrl && !finalAnalysis) {
      try {
        finalAnalysis = await repoService.analyzeRepo(repoUrl);
      } catch (err) {
        console.warn('On-the-fly analysis failed, proceeding without it:', err);
      }
    }

    if (!finalAnalysis) {
      res.status(400).json({ error: 'Analysis data is required for generation' });
      return;
    }

    const readmeContent = await llmService.generateReadme(
      finalAnalysis,
      provider === 'gemini' ? 'gemini' : 'groq',
      {
        sections: features, // 'features' from frontend map to the array of section names
        tone,
        shields,
        additionalContext
      }
    );


    // Save the generation to MongoDB associated with the user
    if (process.env.MONGODB_URI && user) {
      try {
        const newProject = new Project({
          userId: user._id,
          title: finalAnalysis.name || 'Untitled',
          description: finalAnalysis.framework?.name || 'Project',
          readmeContent,
        });
        await newProject.save();
      } catch (dbError) {
        console.error('Failed to save to database:', dbError);
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
    const user = (req as any).user;
    if (!process.env.MONGODB_URI) {
      res.status(503).json({ error: 'Database is not connected' });
      return;
    }
    const projects = await Project.find({ userId: user?._id }).sort({ createdAt: -1 }).limit(10);
    res.status(200).json(projects);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve projects' });
  }
};
export const improveSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, provider } = req.body;

    if (!text || text.trim().length === 0) {
      res.status(400).json({ error: 'Text to improve is required' });
      return;
    }

    const improvedContent = await llmService.improveContent(
      text,
      provider === 'gemini' ? 'gemini' : 'groq'
    );

    res.status(200).json({ content: improvedContent });
  } catch (error: any) {
    console.error('Error improving content:', error);
    res.status(500).json({ error: error.message || 'Failed to improve content' });
  }
};
