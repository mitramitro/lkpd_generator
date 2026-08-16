import type { LKPDTemplate } from '../models/template'
import { modernBlue } from './modernBlue'
import { industrial } from './industrial'
import { minimal } from './minimal'
import { academic } from './academic'
import { background1, background2, background3, background4 } from './backgrounds'

export const TEMPLATES: LKPDTemplate[] = [modernBlue, industrial, minimal, academic, background1, background2, background3, background4]

export const DEFAULT_TEMPLATE_ID = modernBlue.id

export function getTemplateById(id: string): LKPDTemplate {
  return TEMPLATES.find((template) => template.id === id) ?? modernBlue
}
