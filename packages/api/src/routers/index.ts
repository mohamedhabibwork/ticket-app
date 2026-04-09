import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { notificationsRouter } from "./notifications";
import { fileRouter } from "./files";
import { todoRouter } from "./todo";
import { slaPoliciesRouter } from "./slaPolicies";
import { ticketSlaRouter } from "./ticketSla";
import { csatSurveysRouter } from "./csatSurveys";
import { ticketMessagesRouter } from "./ticketMessages";
import { tagsRouter } from "./tags";
import { teamsRouter } from "./teams";
import { savedRepliesRouter } from "./savedReplies";
import { ticketAttachmentsRouter } from "./ticketAttachments";
import { ticketViewsRouter } from "./ticketViews";
import { ticketsRouter } from "./tickets";
import { kbCategoriesRouter } from "./kbCategories";
import { kbArticlesRouter } from "./kbArticles";
import { contactsRouter } from "./contacts";
import { mailboxesRouter } from "./mailboxes";
import { formsRouter } from "./forms";
import { channelsRouter } from "./channels";
import { workflowsRouter } from "./workflows";
import { workflowLogsRouter } from "./workflowLogs";
import { subscriptionsRouter } from "./subscriptions";
import { invoicesRouter } from "./invoices";
import { paymentMethodsRouter } from "./paymentMethods";
import { chatWidgetsRouter } from "./chatWidgets";
import { chatSessionsRouter } from "./chatSessions";
import { chatMessagesRouter } from "./chatMessages";
import { adminRouter } from "./admin";
import { ecommerceStoresRouter } from "./ecommerceStores";
import { ecommerceOrdersRouter } from "./ecommerceOrders";
import { socialAccountsRouter } from "./socialAccounts";
import { socialMessagesRouter } from "./socialMessages";
import { usersRouter } from "./users";
import { emailMessagesRouter } from "./emailMessages";
import { reportsRouter } from "./reports";
import { aiRouter } from "./ai";
import { sessionsRouter } from "./sessions";
import { tasksRouter } from "./tasks";
import { gdprRouter } from "./gdpr";
import { presenceRouter } from "./presence";
import { ticketForwardsRouter } from "./ticketForwards";
import { groupsRouter } from "./groups";
import { ticketCategoriesRouter } from "./ticketCategories";
import { disqusRouter } from "./disqus";
import { marketplaceRouter } from "./marketplace";
import { calendarRouter } from "./calendar";
import { customerAuthRouter } from "./customerAuth";
import { translationRouter } from "./translation";
import { mobileSdkRouter } from "./mobileSdk";
import { chatbotRouter } from "./chatbot";
import { onPremiseRouter } from "./onPremise";
import { organizationsRouter } from "./organizations";
import { authRouter } from "./auth";
import { excelRouter } from "./excel";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),
  notifications: notificationsRouter,
  files: fileRouter,
  todo: todoRouter,
  users: usersRouter,
  slaPolicies: slaPoliciesRouter,
  ticketSla: ticketSlaRouter,
  csatSurveys: csatSurveysRouter,
  ticketMessages: ticketMessagesRouter,
  tags: tagsRouter,
  teams: teamsRouter,
  savedReplies: savedRepliesRouter,
  ticketAttachments: ticketAttachmentsRouter,
  ticketViews: ticketViewsRouter,
  tickets: ticketsRouter,
  kbCategories: kbCategoriesRouter,
  kbArticles: kbArticlesRouter,
  contacts: contactsRouter,
  mailboxes: mailboxesRouter,
  forms: formsRouter,
  channels: channelsRouter,
  workflows: workflowsRouter,
  workflowLogs: workflowLogsRouter,
  subscriptions: subscriptionsRouter,
  invoices: invoicesRouter,
  paymentMethods: paymentMethodsRouter,
  chatWidgets: chatWidgetsRouter,
  chatSessions: chatSessionsRouter,
  chatMessages: chatMessagesRouter,
  admin: adminRouter,
  ecommerceStores: ecommerceStoresRouter,
  ecommerceOrders: ecommerceOrdersRouter,
  socialAccounts: socialAccountsRouter,
  socialMessages: socialMessagesRouter,
  emailMessages: emailMessagesRouter,
  reports: reportsRouter,
  ai: aiRouter,
  sessions: sessionsRouter,
  tasks: tasksRouter,
  gdpr: gdprRouter,
  presence: presenceRouter,
  ticketForwards: ticketForwardsRouter,
  groups: groupsRouter,
  ticketCategories: ticketCategoriesRouter,
  disqus: disqusRouter,
  marketplace: marketplaceRouter,
  calendar: calendarRouter,
  customerAuth: customerAuthRouter,
  translation: translationRouter,
  mobileSdk: mobileSdkRouter,
  chatbot: chatbotRouter,
  onPremise: onPremiseRouter,
  organizations: organizationsRouter,
  auth: authRouter,
  excel: excelRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
