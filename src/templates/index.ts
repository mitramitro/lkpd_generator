import type { LKPDTemplate } from '../models/template'
import { modernBlue } from './modernBlue'
import { industrial } from './industrial'
import { minimal } from './minimal'
import { academic } from './academic'

export const TEMPLATES: LKPDTemplate[] = [modernBlue, industrial, minimal, academic]

export const DEFAULT_TEMPLATE_ID = modernBlue.id

export function getTemplateById(id: string): LKPDTemplate {
  return TEMPLATES.find((template) => template.id === id) ?? modernBlue
}
