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
export type { Job } from "bullmq";
export type { Transporter } from "nodemailer";