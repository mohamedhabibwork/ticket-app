export { getRedis, closeRedis } from "./redis";
export {
  emailQueue,
  addEmailJob,
  createEmailWorker,
  ticketQueue,
  addTicketJob,
  createTicketWorker,
  closeQueues,
  type EmailJobData,
  type TicketJobData,
} from "./queue";
export {
  getTransporter,
  sendEmail,
  verifyConnection,
  closeTransporter,
  type SendEmailOptions,
} from "./email";
export {
  createEmailFetchWorker,
  addEmailFetchJob,
  scheduleEmailFetchPoll,
  closeEmailFetchQueue,
  type EmailFetchJobData,
  type ParsedEmail,
} from "./workers/email-fetch.worker";
export {
  createEmailSendWorker,
  addEmailSendJob,
  handleBounceNotification,
  closeEmailSendQueue,
  type EmailSendJobData,
  type SendEmailResult,
} from "./workers/email-send.worker";
export {
  createSlaCheckWorker,
  addSlaCheckJob,
  scheduleSlaCheck,
  closeSlaCheckQueue,
  type SlaCheckJobData,
} from "./workers/sla-check.worker";
export {
  createCsatSurveyWorker,
  addCsatSurveyJob,
  scheduleCsatSurveys,
  getCsatStats,
  closeCsatSurveyQueue,
  type CsatSurveyJobData,
  type CsatSurveyConfig,
} from "./workers/csat-survey.worker";
export {
  createWorkflowExecuteWorker,
  addWorkflowExecuteJob,
  executeTicketTriggers,
  getWorkflowExecutionLogs,
  closeWorkflowExecuteQueue,
  type WorkflowExecuteJobData,
} from "./workers/workflow-execute.worker";
export {
  createExcelExportWorker,
  addExcelExportJob,
  closeExcelExportQueue,
} from "./workers/excel-export.worker";
export {
  createExcelImportWorker,
  addExcelImportJob,
  closeExcelImportQueue,
} from "./workers/excel-import.worker";
export {
  addLicenseVerificationJob,
  scheduleLicenseVerification,
  createLicenseVerificationWorker,
  closeLicenseVerificationQueue,
  type LicenseVerificationJobData,
} from "./workers/license-verification.worker";
export {
  excelExportQueue,
  excelImportQueue,
  addExcelExportJob as addExcelExportJobToQueue,
  addExcelImportJob as addExcelImportJobToQueue,
  createExcelExportWorker as createExcelExportQueueWorker,
  createExcelImportWorker as createExcelImportQueueWorker,
  closeQueues as closeAllExcelQueues,
  type ExcelExportJobData as ExcelExportQueueJobData,
  type ExcelImportJobData as ExcelImportQueueJobData,
} from "./queue";
export type { Job } from "bullmq";
export type { Transporter } from "nodemailer";
export {
  publishSocketEvent,
  publishTicketCreated,
  publishTicketUpdated,
  publishTicketAssigned,
  publishUserNotification,
  publishOrgNotification,
  type SocketEventMessage,
} from "./socket-publish";

export {
  getQueueDriver,
  resetQueueDriver,
  type QueueDriver,
  type QueueProvider,
  type JobOptions,
  type WorkerOptions,
  type Processor,
  type QueueJob,
  type QueueInterface,
  type WorkerInterface,
  type JobType,
  type RepeatOptions,
} from "./driver";

export {
  QUEUE_NAMES,
  type QueueName,
  type EmailJobData as EmailJobDataType,
  type WorkflowJobData as WorkflowJobDataType,
  type NotificationJobData as NotificationJobDataType,
  type DunningJobData as DunningJobDataType,
  type UsageCheckJobData as UsageCheckJobDataType,
  type CsatExpirationJobData as CsatExpirationJobDataType,
  type SpamCheckJobData as SpamCheckJobDataType,
  type AutoAssignJobData as AutoAssignJobDataType,
  type SlaCheckJobData as SlaCheckJobDataType,
  type ExcelExportJobData as ExcelExportJobDataType,
  type ExcelImportJobData as ExcelImportJobDataType,
  type EmailSendJobData as EmailSendJobDataType,
  type EmailFetchJobData as EmailFetchJobDataType,
  type LicenseVerificationJobData as LicenseVerificationJobDataType,
  type ChatbotEscalationJobData as ChatbotEscalationJobDataType,
  type GdprSlackCheckJobData as GdprSlackCheckJobDataType,
  type SocialSyncJobData as SocialSyncJobDataType,
  type EcommerceSyncJobData as EcommerceSyncJobDataType,
  type AmazonSyncJobData as AmazonSyncJobDataType,
  type DisqusSyncJobData as DisqusSyncJobDataType,
  type PushNotificationJobData as PushNotificationJobDataType,
  type TicketJobData as TicketJobDataType,
} from "./definitions";
