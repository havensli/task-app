-- CreateTable
CREATE TABLE "PersonalTask" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "source" TEXT,
    "urgency" TEXT NOT NULL DEFAULT '中',
    "assignee" TEXT,
    "collaborator" TEXT,
    "status" TEXT NOT NULL DEFAULT '待处理',
    "notifyContent" TEXT,
    "sendNotify" BOOLEAN NOT NULL DEFAULT true,
    "extFields" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalTask_pkey" PRIMARY KEY ("id")
);
