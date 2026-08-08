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
