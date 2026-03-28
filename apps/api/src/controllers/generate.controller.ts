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

export const generateReadme = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, features, provider, repoUrl, analysis } = req.body;
    const user = (req as any).user;
    
    if (!title && !repoUrl) {
      res.status(400).json({ error: 'Title or Repository URL is required' });
      return;
    }

    let finalMetadata = analysis;
    let finalTitle = title;
    let finalDescription = description;

    // If repoUrl is provided but no analysis, perform analysis on the fly
    if (repoUrl && !finalMetadata) {
      try {
        const repoAnalysis = await repoService.analyzeRepo(repoUrl);
        finalMetadata = {
          structure: repoAnalysis.structure,
          functions: repoAnalysis.functions,
          variables: repoAnalysis.variables,
        };
        if (!finalTitle) finalTitle = repoAnalysis.projectName;
        if (!finalDescription) finalDescription = repoAnalysis.description;
      } catch (err) {
        console.warn('On-the-fly analysis failed, proceeding without it:', err);
      }
    }

    const readmeContent = await llmService.generateReadme(
      finalTitle || 'Project',
      finalDescription || '',
      Array.isArray(features) ? features : [],
      provider === 'gemini' ? 'gemini' : 'groq',
      finalMetadata
    );

    // Save the generation to MongoDB associated with the user
    if (process.env.MONGODB_URI && user) {
      try {
        const newProject = new Project({
          userId: user._id,
          title: finalTitle || 'Untitled',
          description: finalDescription || '',
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
