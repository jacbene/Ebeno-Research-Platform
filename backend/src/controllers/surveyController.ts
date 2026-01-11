import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma, ProjectRole, QuestionType } from '@prisma/client';

// Helper to check for editor/owner permissions
const checkSurveyPermission = async (surveyId: string, userId: string, roles: ProjectRole[] = [ProjectRole.OWNER, ProjectRole.EDITOR]) => {
    const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
    if (!survey) return { success: false, message: 'Enquête non trouvée' };

    const member = await prisma.projectMember.findFirst({
        where: { projectId: survey.projectId, userId, role: { in: roles } },
    });
    if (!member) return { success: false, message: 'Action non autorisée' };

    return { success: true, survey };
};


export const createSurvey = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { projectId, title, description } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    if (!projectId || !title) {
      return res.status(400).json({ message: 'ID de projet et titre requis' });
    }

    const member = await prisma.projectMember.findFirst({ 
        where: { projectId, userId, role: { in: [ProjectRole.OWNER, ProjectRole.EDITOR] } } 
    });
    if (!member) {
      return res.status(403).json({ message: 'Accès non autorisé pour créer une enquête' });
    }

    const survey = await prisma.survey.create({
      data: {
        title,
        description,
        project: { connect: { id: projectId } },
        createdBy: { connect: { id: userId } } // Corrected: Added createdBy
      },
    });

    res.status(201).json({ success: true, data: survey });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

export const getProjectSurveys = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { projectId } = req.params;

        if (!userId) {
            return res.status(401).json({ message: 'Non authentifié' });
        }

        const member = await prisma.projectMember.findFirst({ where: { projectId, userId } });
        if (!member) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }

        const surveys = await prisma.survey.findMany({
            where: { projectId },
            include: { _count: { select: { questions: true, responses: true } } }
        });

        res.status(200).json({ success: true, data: surveys });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
};

export const getSurvey = async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;

    const survey = await prisma.survey.findUnique({ 
        where: { id: surveyId },
        include: { questions: { orderBy: { order: 'asc' } }, project: { select: { id: true, title: true } } } 
    });

    if (!survey) {
        return res.status(404).json({ message: 'Enquête non trouvée' });
    }

    res.status(200).json({ success: true, data: survey });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

export const updateSurvey = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { surveyId } = req.params;
    const { title, description } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const permission = await checkSurveyPermission(surveyId, userId);
    if (!permission.success) {
        return res.status(403).json({ message: permission.message });
    }
    
    const updatedSurvey = await prisma.survey.update({
      where: { id: surveyId },
      data: { title, description },
    });

    res.status(200).json({ success: true, data: updatedSurvey });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

export const deleteSurvey = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { surveyId } = req.params;

        if (!userId) {
            return res.status(401).json({ message: 'Non authentifié' });
        }
        
        const permission = await checkSurveyPermission(surveyId, userId);
        if (!permission.success) {
            return res.status(403).json({ message: permission.message });
        }

        await prisma.survey.delete({ where: { id: surveyId } });

        res.status(200).json({ success: true, message: 'Enquête supprimée' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
};

// ==================== Questions ====================

export const addQuestion = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { surveyId } = req.params;
        const { text, questionType, options } = req.body;

        if (!userId) return res.status(401).json({ message: 'Non authentifié' });
        if (!text || !questionType) return res.status(400).json({ message: 'Texte et type de question requis' });

        const permission = await checkSurveyPermission(surveyId, userId);
        if (!permission.success) return res.status(403).json({ message: permission.message });

        const maxOrder = await prisma.question.aggregate({
            where: { surveyId },
            _max: { order: true }
        });

        const question = await prisma.question.create({
            data: {
                text,
                questionType,
                options: options || [],
                survey: { connect: { id: surveyId } },
                order: (maxOrder._max.order ?? 0) + 1
            }
        });
        res.status(201).json({ success: true, data: question });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
};

export const updateQuestion = async (req: Request, res: Response) => {
     try {
        const userId = req.user?.id;
        const { surveyId, questionId } = req.params;
        const { text, questionType, options, order } = req.body;

        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        const permission = await checkSurveyPermission(surveyId, userId);
        if (!permission.success) return res.status(403).json({ message: permission.message });

        const updatedQuestion = await prisma.question.update({
            where: { id: questionId },
            data: { text, questionType, options, order }
        });
        res.status(200).json({ success: true, data: updatedQuestion });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
};

export const deleteQuestion = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { surveyId, questionId } = req.params;

        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        const permission = await checkSurveyPermission(surveyId, userId);
        if (!permission.success) return res.status(403).json({ message: permission.message });

        await prisma.question.delete({ where: { id: questionId }});
        res.status(200).json({ success: true, message: "Question supprimée" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
};


// ==================== Responses ====================

export const submitResponse = async (req: Request, res: Response) => {
    try {
        const respondentId = req.user?.id; // Optional: can be anonymous
        const { surveyId } = req.params;
        const { answers } = req.body; // answers: [{ questionId: string, value: any }]

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ message: "Le champ 'answers' est requis" });
        }
        
        const createData: Prisma.SurveyResponseCreateInput = {
            survey: { connect: { id: surveyId } }
        };

        if (respondentId) {
            createData.user = { connect: { id: respondentId } };
        }

        const surveyResponse = await prisma.surveyResponse.create({ data: createData });

        const answerData = answers.map(answer => ({
            responseId: surveyResponse.id,
            questionId: answer.questionId,
            value: answer.value
        }));

        await prisma.answer.createMany({
            data: answerData,
        });

        res.status(201).json({ success: true, message: "Réponse enregistrée" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
};

export const getSurveyResponses = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { surveyId } = req.params;

        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        const permission = await checkSurveyPermission(surveyId, userId, [ProjectRole.OWNER, ProjectRole.EDITOR, ProjectRole.VIEWER]);
        if (!permission.success) return res.status(403).json({ message: permission.message });

        const responses = await prisma.surveyResponse.findMany({
            where: { surveyId },
            include: {
                user: { select: { id: true, profile: true } },
                answers: { include: { question: { select: { text: true, questionType: true } } } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({ success: true, data: responses });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
};
