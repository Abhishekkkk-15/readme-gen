import { Request, Response } from 'express';
import { llmService, type LlmProvider } from '../services/llm.service';
import Project from '../models/Project';
import { repoService } from '../services/repo.service';
import { config } from 'dotenv';
import { getStoredApiKey, markStoredApiKeyUsed } from '../utils/api-key-store';

config();

const normalizeProvider = (value: unknown): LlmProvider => {
  if (value === 'gemini') return 'gemini';
  if (value === 'openai') return 'openai';
  return 'groq';
};

const getPlatformApiKey = (provider: LlmProvider) => {
  if (provider === 'openai') return process.env.OPENAI_API_KEY;
  if (provider === 'gemini') return process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  return process.env.GROQ_API_KEY;
};

const resolveExecutionMode = async (
  req: Request,
  provider: LlmProvider,
): Promise<{ apiKey?: string; mode: 'platform' | 'byok' }> => {
  const requestedMode = req.body?.keyMode;
  const headerKey = req.headers['x-api-key'] as string | undefined;
  if (headerKey?.trim()) {
    return { apiKey: headerKey.trim(), mode: 'byok' };
  }

  const user = (req as any).user;
  if (requestedMode === 'platform') {
    if (!user) {
      throw new Error('Authentication is required for platform-hosted usage');
    }
    if (user.plan !== 'pro') {
      throw new Error('Upgrade to Pro to use platform-hosted API billing');
    }
    if (!getPlatformApiKey(provider)) {
      throw new Error(`Platform ${provider} credentials are not configured`);
    }
    return { mode: 'platform' };
  }

  if (!user) {
    return { apiKey: undefined, mode: 'byok' };
  }

  const storedKey = getStoredApiKey(user, provider);
  if (!storedKey) {
    if (requestedMode === 'byok') {
      throw new Error(`No stored ${provider} API key found for this account`);
    }

    if (user.plan === 'pro' && getPlatformApiKey(provider)) {
      return { mode: 'platform' };
    }

    return { apiKey: undefined, mode: 'byok' };
  }

  markStoredApiKeyUsed(user, provider);
  await user.save();
  return { apiKey: storedKey, mode: 'byok' };
};

const checkAndResetUsage = async (user: any) => {
  const now = new Date();
  const lastReset = new Date(user.usage.lastResetDate);

  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    user.usage.generationsUsed = 0;
    user.usage.tokensUsed = 0;
    user.usage.lastResetDate = now;
    await user.save();
  }
  return user;
};

const shouldEnforceUsageLimits = (
  user: any,
  mode: 'platform' | 'byok',
): boolean => Boolean(user) && mode === 'platform';

export const analyzeRepository = async (req: Request, res: Response): Promise<void> => {
  try {
    const { repoUrl, manualImportantFiles = [] } = req.body;
    if (!repoUrl) {
      res.status(400).json({ error: 'Repository URL is required' });
      return;
    }

    const { summary, context } = await repoService.analyzeRepo(repoUrl, manualImportantFiles);
    res.status(200).json({ summary, context });
  } catch (error: any) {
    console.error('Error analyzing repository:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze repository' });
  }
};

export const getRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { analysis, provider, modelId } = req.body;
    const normalizedProvider = normalizeProvider(provider);
    const { apiKey } = await resolveExecutionMode(req, normalizedProvider);
    const user = (req as any).user;

    if (!user && !apiKey) {
      res.status(401).json({ error: 'Unauthorized: No user session or API key provided' });
      return;
    }

    // analysis here could be just summary or full analysis
    const recommendations = await llmService.getRecommendations(
      analysis.summary || analysis,
      normalizedProvider,
      apiKey,
      modelId,
    );

    res.status(200).json(recommendations);
  } catch (error: any) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: error.message || 'Failed to get recommendations' });
  }
};

export const generateReadme = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, features, provider, repoUrl, analysis, tone, shields, additionalContext, generateNested, persona, heroImageUrl, manualImportantFiles = [], readmeTemplate, templateId, templateBody, writeMode, modelId } = req.body;
    const user = (req as any).user;
    const normalizedProvider = normalizeProvider(provider);

    const { apiKey, mode } = await resolveExecutionMode(req, normalizedProvider);
    if (!user && !apiKey) {
      res.status(401).json({ error: 'Unauthorized: No user session or API key provided' });
      return;
    }

    if (shouldEnforceUsageLimits(user, mode)) {
      await checkAndResetUsage(user);
      if (user.plan === 'free') {
        if (user.usage.generationsUsed >= user.usage.generationsLimit) {
          res.status(403).json({ error: 'Monthly generation limit reached' });
          return;
        }
        if (user.usage.tokensUsed >= user.usage.tokensLimit) {
          res.status(403).json({ error: 'Monthly token limit reached' });
          return;
        }
      }
    }

    if (!title && !repoUrl) {
      res.status(400).json({ error: 'Title or Repository URL is required' });
      return;
    }

    let finalAnalysis = analysis;
    
    if (repoUrl && (!finalAnalysis || !finalAnalysis.summary)) {
      try {
        finalAnalysis = await repoService.analyzeRepo(repoUrl, manualImportantFiles);
      } catch (err) {
        console.warn('On-the-fly analysis failed, proceeding without it:', err);
      }
    }

    if (!finalAnalysis || !finalAnalysis.summary) {
      res.status(400).json({ error: 'Analysis data is required for generation' });
      return;
    }

    const readmeTemplateOpt =
      readmeTemplate?.body != null && String(readmeTemplate.body).trim()
        ? { id: readmeTemplate.id as string | undefined, body: String(readmeTemplate.body) }
        : templateBody != null && String(templateBody).trim()
          ? { id: templateId as string | undefined, body: String(templateBody) }
          : undefined;

    const result = await llmService.generateReadme(
      finalAnalysis,
      normalizedProvider,
      {
        sections: features,
        tone,
        shields,
        additionalContext,
        apiKey,
        modelId,
        persona,
        heroImageUrl,
        readmeTemplate: readmeTemplateOpt,
        writeMode,
      }
    );

    const readmeContent = result.content;
    let totalTokens = result.tokens;

    let readmes: { path: string, content: string, tokens: number }[] = [];
    if (generateNested && finalAnalysis.summary.tree) {
      readmes = await llmService.generateNestedReadmes(
        finalAnalysis,
        normalizedProvider,
        {
          sections: features,
          tone,
          shields,
          additionalContext,
          apiKey
        }
      );
      totalTokens += readmes.reduce((acc, r) => acc + r.tokens, 0);
    }

    if (process.env.MONGODB_URI && user) {
      try {
        const newProject = new Project({
          userId: user._id,
          title: finalAnalysis.summary.name || 'Untitled',
          description: finalAnalysis.summary.framework?.name || 'Project',
          readmeContent,
          tokensUsed: totalTokens,
          modelId,
          executionMode: mode,
        });
        await newProject.save();

        if (shouldEnforceUsageLimits(user, mode)) {
          user.usage.generationsUsed += 1;
          user.usage.tokensUsed += totalTokens;
          await user.save();
        }
      } catch (dbError) {
        console.error('Failed to save to database:', dbError);
      }
    }

    res.status(200).json({
      content: readmeContent,
      readmes,
      meta: {
        tokensUsed: totalTokens,
        executionMode: mode,
        modelId: modelId || null,
        usage: shouldEnforceUsageLimits(user, mode) ? user?.usage : null,
      },
    });
  } catch (error: any) {
    console.error('Error generating README:', error);
    res.status(500).json({ error: error.message || 'Failed to generate README' });
  }
};

export const generateStream = async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider, repoUrl, analysis, tone, shields, additionalContext, generateNested, features, persona, heroImageUrl, manualImportantFiles = [], readmeTemplate, templateId, templateBody, writeMode, modelId } = req.body;
    const user = (req as any).user;
    const normalizedProvider = normalizeProvider(provider);
    const { apiKey, mode } = await resolveExecutionMode(req, normalizedProvider);

    if (!user && !apiKey) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (shouldEnforceUsageLimits(user, mode)) {
      await checkAndResetUsage(user);
      if (user.plan === 'free') {
        if (user.usage.generationsUsed >= user.usage.generationsLimit) {
          res.status(403).json({ error: 'Monthly generation limit reached' });
          return;
        }
        if (user.usage.tokensUsed >= user.usage.tokensLimit) {
          res.status(403).json({ error: 'Monthly token limit reached' });
          return;
        }
      }
    }

    let finalAnalysis = analysis;
    if (repoUrl && (!finalAnalysis || !finalAnalysis.summary)) {
      finalAnalysis = await repoService.analyzeRepo(repoUrl, manualImportantFiles);
    }

    if (!finalAnalysis || !finalAnalysis.summary) {
      res.status(400).json({ error: 'Analysis data is required' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const readmeTemplateStream =
      readmeTemplate?.body != null && String(readmeTemplate.body).trim()
        ? { id: readmeTemplate.id as string | undefined, body: String(readmeTemplate.body) }
        : templateBody != null && String(templateBody).trim()
          ? { id: templateId as string | undefined, body: String(templateBody) }
          : undefined;

    const stream = llmService.generateReadmeStream(
      finalAnalysis,
      normalizedProvider,
      {
        sections: features,
        tone,
        shields,
        additionalContext,
        apiKey,
        modelId,
        persona,
        heroImageUrl,
        readmeTemplate: readmeTemplateStream,
        writeMode,
      }
    );

    let fullContent = '';
    for await (const chunk of stream) {
      fullContent += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    let readmes: { path: string, content: string, tokens: number }[] = [];
    let extraTokens = 0;
    if (generateNested && finalAnalysis.summary.tree) {
      readmes = await llmService.generateNestedReadmes(
        finalAnalysis,
        normalizedProvider,
        { sections: features, tone, shields, additionalContext, apiKey }
      );
      extraTokens = readmes.reduce((acc, r) => acc + r.tokens, 0);
    }

    const totalTokens = Math.ceil(fullContent.length / 4) + extraTokens;

    if (process.env.MONGODB_URI && user) {
      try {
        const newProject = new Project({
          userId: user._id,
          title: finalAnalysis.summary.name || 'Untitled',
          description: finalAnalysis.summary.framework?.name || 'Project',
          readmeContent: fullContent,
          tokensUsed: totalTokens,
          modelId,
          executionMode: mode,
        });
        await newProject.save();
      } catch (dbError) {
        console.error('Failed to save streamed project to database:', dbError);
      }
    }

    if (shouldEnforceUsageLimits(user, mode)) {
       user.usage.generationsUsed += 1;
       user.usage.tokensUsed += totalTokens;
       await user.save();
    }

    res.write(`data: ${JSON.stringify({
      done: true,
      content: fullContent,
      readmes,
      meta: {
        tokensUsed: totalTokens,
        executionMode: mode,
        modelId: modelId || null,
        usage: shouldEnforceUsageLimits(user, mode) ? user?.usage : null,
      },
    })}\n\n`);
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
    const { text, provider, instruction, userInstruction, modelId } = req.body;
    const normalizedProvider = normalizeProvider(provider);
    const { apiKey, mode } = await resolveExecutionMode(req, normalizedProvider);
    const user = (req as any).user;

    if (!user && !apiKey) {
      res.status(401).json({ error: 'Unauthorized: No user session or API key provided' });
      return;
    }

    if (shouldEnforceUsageLimits(user, mode)) {
      await checkAndResetUsage(user);
      if (user.plan === 'free' && user.usage.tokensUsed >= user.usage.tokensLimit) {
        res.status(403).json({ error: 'Monthly token limit reached' });
        return;
      }
    }

    if (!text || text.trim().length === 0) {
      res.status(400).json({ error: 'Text to improve is required' });
      return;
    }

    const improveHint =
      typeof instruction === 'string'
        ? instruction
        : typeof userInstruction === 'string'
          ? userInstruction
          : undefined;

    const result = await llmService.improveContent(
      text,
      normalizedProvider,
      apiKey,
      improveHint,
      modelId,
    );

    if (shouldEnforceUsageLimits(user, mode)) {
      user.usage.tokensUsed += result.tokens;
      await user.save();
    }

    res.status(200).json({
      content: result.content,
      meta: {
        tokensUsed: result.tokens,
        executionMode: mode,
        modelId: modelId || null,
        usage: shouldEnforceUsageLimits(user, mode) ? user?.usage : null,
      },
    });
  } catch (error: any) {
    console.error('Error improving content:', error);
    res.status(500).json({ error: error.message || 'Failed to improve content' });
  }
};
