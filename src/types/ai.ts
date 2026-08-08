export interface AiTestRequest {
  prompt: string
}

export interface AiSuccessResponse {
  success: true
  text: string
}

export interface AiErrorResponse {
  success: false
  error: string
}

export type AiTestResponse = AiSuccessResponse | AiErrorResponse

// M5.2 — AI Generate Soal.
export type AiRequestQuestionType = 'multiple_choice' | 'essay' | 'mixed'
export type AiDifficulty = 'easy' | 'medium' | 'hard'
export type AiQuestionType = 'multiple_choice' | 'essay'

export interface AiGenerateRequest {
  source: string
  questionType: AiRequestQuestionType
  count: number
  difficulty: AiDifficulty
  grade?: string
  language?: string
}

export interface AiOption {
  label: string
  text: string
}

export interface AiGeneratedMultipleChoiceQuestion {
  type: 'multiple_choice'
  text: string
  options: AiOption[]
  answer: string
  explanation?: string
}

export interface AiGeneratedEssayQuestion {
  type: 'essay'
  text: string
  answer?: string
  explanation?: string
}

export type AiGeneratedQuestion = AiGeneratedMultipleChoiceQuestion | AiGeneratedEssayQuestion

export interface AiGenerateQuestionsSuccessResponse {
  success: true
  questions: AiGeneratedQuestion[]
  count: number
}

export type AiGenerateQuestionsResponse = AiGenerateQuestionsSuccessResponse | AiErrorResponse
