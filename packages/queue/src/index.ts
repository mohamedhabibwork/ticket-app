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
  type ExcelExportJobData,
} from "./workers/excel-export.worker";
export {
  createExcelImportWorker,
  addExcelImportJob,
  closeExcelImportQueue,
  type ExcelImportJobData,
} from "./workers/excel-import.worker";
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
