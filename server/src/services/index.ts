import type { Core } from '@strapi/strapi';
import assistant from './assistant';
import desk from './desk';
import hub from './hub';
import inbox from './inbox';

const services: Record<string, (deps: { strapi: Core.Strapi }) => Record<string, unknown>> = { assistant, desk, hub, inbox };

export default services;
