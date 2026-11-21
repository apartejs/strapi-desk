import type { Core } from '@strapi/strapi';
import admin from './admin';
import chat from './chat';

const controllers: Record<string, (deps: { strapi: Core.Strapi }) => Record<string, unknown>> = { admin, chat };

export default controllers;
