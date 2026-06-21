export interface StepResult {
  message: string;
  nextStep: number | null;  // null = flow complete
  updatedData: Record<string, any>;
  result?: { action: string; entities: Record<string, any> };
}

export interface FlowHandler {
  readonly command: string;
  readonly totalSteps: number;
  handle(input: string, data: Record<string, any>, step: number): Promise<StepResult>;
}
