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

    const { summary, context } = await repoService.analyzeRepo(repoUrl);
    res.status(200).json({ summary, context });
  } catch (error: any) {
    console.error('Error analyzing repository:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze repository' });
  }
};

export const getRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { analysis, provider } = req.body;
    const apiKey = req.headers['x-api-key'] as string;
    const user = (req as any).user;

    if (!user && !apiKey) {
      res.status(401).json({ error: 'Unauthorized: No user session or API key provided' });
      return;
    }

    // analysis here could be just summary or full analysis
    const recommendations = await llmService.getRecommendations(
      analysis.summary || analysis,
      provider === 'gemini' ? 'gemini' : 'groq',
      apiKey
    );

    res.status(200).json(recommendations);
  } catch (error: any) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: error.message || 'Failed to get recommendations' });
  }
};

export const generateReadme = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, features, provider, repoUrl, analysis, tone, shields, additionalContext, generateNested, persona } = req.body;
    const user = (req as any).user;

    const apiKey = req.headers['x-api-key'] as string;
    if (!user && !apiKey) {
      res.status(401).json({ error: 'Unauthorized: No user session or API key provided' });
      return;
    }

    if (!title && !repoUrl) {
      res.status(400).json({ error: 'Title or Repository URL is required' });
      return;
    }

    let finalAnalysis = analysis;
    
    if (repoUrl && (!finalAnalysis || !finalAnalysis.summary)) {
      try {
        finalAnalysis = await repoService.analyzeRepo(repoUrl);
      } catch (err) {
        console.warn('On-the-fly analysis failed, proceeding without it:', err);
      }
    }

    if (!finalAnalysis || !finalAnalysis.summary) {
      res.status(400).json({ error: 'Analysis data is required for generation' });
      return;
    }

    const readmeContent = await llmService.generateReadme(
      finalAnalysis,
      provider === 'gemini' ? 'gemini' : 'groq',
      {
        sections: features,
        tone,
        shields,
        additionalContext,
        apiKey,
        persona
      }
    );

    let readmes: { path: string, content: string }[] = [];
    if (generateNested && finalAnalysis.summary.tree) {
      readmes = await llmService.generateNestedReadmes(
        finalAnalysis,
        provider === 'gemini' ? 'gemini' : 'groq',
        {
          sections: features,
          tone,
          shields,
          additionalContext,
          apiKey
        }
      );
    }

    if (process.env.MONGODB_URI && user) {
      try {
        const newProject = new Project({
          userId: user._id,
          title: finalAnalysis.summary.name || 'Untitled',
          description: finalAnalysis.summary.framework?.name || 'Project',
          readmeContent,
        });
        await newProject.save();
      } catch (dbError) {
        console.error('Failed to save to database:', dbError);
      }
    }

    res.status(200).json({ content: readmeContent, readmes });
  } catch (error: any) {
    console.error('Error generating README:', error);
    res.status(500).json({ error: error.message || 'Failed to generate README' });
  }
};

export const generateStream = async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider, repoUrl, analysis, tone, shields, additionalContext, generateNested, features, persona } = req.body;
    const user = (req as any).user;
    const apiKey = req.headers['x-api-key'] as string;

    if (!user && !apiKey) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let finalAnalysis = analysis;
    if (repoUrl && (!finalAnalysis || !finalAnalysis.summary)) {
      finalAnalysis = await repoService.analyzeRepo(repoUrl);
    }

    if (!finalAnalysis || !finalAnalysis.summary) {
      res.status(400).json({ error: 'Analysis data is required' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const stream = llmService.generateReadmeStream(
      finalAnalysis,
      provider === 'gemini' ? 'gemini' : 'groq',
      {
        sections: features,
        tone,
        shields,
        additionalContext,
        apiKey,
        persona
      }
    );

    let fullContent = '';
    for await (const chunk of stream) {
      fullContent += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    let readmes: { path: string, content: string }[] = [];
    if (generateNested && finalAnalysis.summary.tree) {
      readmes = await llmService.generateNestedReadmes(
        finalAnalysis,
        provider === 'gemini' ? 'gemini' : 'groq',
        { sections: features, tone, shields, additionalContext, apiKey }
      );
    }

    res.write(`data: ${JSON.stringify({ done: true, content: fullContent, readmes })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Streaming error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
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
    const apiKey = req.headers['x-api-key'] as string;
    const user = (req as any).user;

    if (!user && !apiKey) {
      res.status(401).json({ error: 'Unauthorized: No user session or API key provided' });
      return;
    }

    if (!text || text.trim().length === 0) {
      res.status(400).json({ error: 'Text to improve is required' });
      return;
    }

    const improvedContent = await llmService.improveContent(
      text,
      provider === 'gemini' ? 'gemini' : 'groq',
      apiKey
    );

    res.status(200).json({ content: improvedContent });
  } catch (error: any) {
    console.error('Error improving content:', error);
    res.status(500).json({ error: error.message || 'Failed to improve content' });
  }
};
