CREATE TYPE "CollaborationSessionType" AS ENUM ('DOCUMENT', 'MEMO', 'ARTICLE', 'REPORT');

CREATE TABLE "CollaborationSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "CollaborationSessionType" NOT NULL,
    "content" TEXT DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "projectId" TEXT NOT NULL,
    "documentId" TEXT,
    "createdById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "shareLink" TEXT UNIQUE,
    "lastActivity" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollaborationSession_pkey" PRIMARY KEY ("id")
);

-- Table de jonction pour les participants
CREATE TABLE "_CollaborationSessionParticipants" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CollaborationSessionParticipants_AB_pkey" PRIMARY KEY ("A","B")
);

-- Évaluation par les pairs
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "ReviewDecision" AS ENUM ('ACCEPT', 'MINOR_REVISION', 'MAJOR_REVISION', 'REJECT');

CREATE TABLE "PeerReviewSubmission" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT,
    "documentId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'SUBMITTED',
    "deadline" TIMESTAMP(3),
    "isBlindReview" BOOLEAN NOT NULL DEFAULT true,
    "isDoubleBlind" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeerReviewSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PeerReview" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "score" INTEGER,
    "comments" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "recommendations" TEXT[],
    "status" "ReviewStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeerReview_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PeerReview_submissionId_reviewerId_key" UNIQUE ("submissionId", "reviewerId")
);

-- Table de jonction pour les évaluateurs
CREATE TABLE "_PeerReviewSubmissionReviewers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PeerReviewSubmissionReviewers_AB_pkey" PRIMARY KEY ("A","B")
);

-- Table d'activité pour les analytics
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT,
    "entityType" TEXT,
    "projectId" TEXT,
    "userId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- Table pour les requêtes IA
CREATE TABLE "AIRequest" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "prompt" TEXT,
    "response" TEXT,
    "status" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "responseTime" INTEGER,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIRequest_pkey" PRIMARY KEY ("id")
);

-- Ajout des contraintes de clé étrangère
ALTER TABLE "CollaborationSession" ADD CONSTRAINT "CollaborationSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CollaborationSession" ADD CONSTRAINT "CollaborationSession_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CollaborationSession" ADD CONSTRAINT "CollaborationSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "_CollaborationSessionParticipants" ADD CONSTRAINT "_CollaborationSessionParticipants_A_fkey" FOREIGN KEY ("A") REFERENCES "CollaborationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CollaborationSessionParticipants" ADD CONSTRAINT "_CollaborationSessionParticipants_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PeerReviewSubmission" ADD CONSTRAINT "PeerReviewSubmission_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PeerReviewSubmission" ADD CONSTRAINT "PeerReviewSubmission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PeerReviewSubmission" ADD CONSTRAINT "PeerReviewSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PeerReview" ADD CONSTRAINT "PeerReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "PeerReviewSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PeerReview" ADD CONSTRAINT "PeerReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "_PeerReviewSubmissionReviewers" ADD CONSTRAINT "_PeerReviewSubmissionReviewers_A_fkey" FOREIGN KEY ("A") REFERENCES "PeerReviewSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_PeerReviewSubmissionReviewers" ADD CONSTRAINT "_PeerReviewSubmissionReviewers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Activity" ADD CONSTRAINT "Activity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AIRequest" ADD CONSTRAINT "AIRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AIRequest" ADD CONSTRAINT "AIRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Création des index pour les performances
CREATE INDEX "CollaborationSession_projectId_idx" ON "CollaborationSession"("projectId");
CREATE INDEX "CollaborationSession_createdById_idx" ON "CollaborationSession"("createdById");
CREATE INDEX "CollaborationSession_isActive_idx" ON "CollaborationSession"("isActive");

CREATE INDEX "PeerReviewSubmission_projectId_idx" ON "PeerReviewSubmission"("projectId");
CREATE INDEX "PeerReviewSubmission_submittedById_idx" ON "PeerReviewSubmission"("submittedById");
CREATE INDEX "PeerReviewSubmission_status_idx" ON "PeerReviewSubmission"("status");

CREATE INDEX "PeerReview_submissionId_idx" ON "PeerReview"("submissionId");
CREATE INDEX "PeerReview_reviewerId_idx" ON "PeerReview"("reviewerId");

CREATE INDEX "Activity_projectId_idx" ON "Activity"("projectId");
CREATE INDEX "Activity_userId_idx" ON "Activity"("userId");
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");

CREATE INDEX "AIRequest_userId_idx" ON "AIRequest"("userId");
CREATE INDEX "AIRequest_projectId_idx" ON "AIRequest"("projectId");
CREATE INDEX "AIRequest_createdAt_idx" ON "AIRequest"("createdAt");

