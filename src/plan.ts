import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { config } from "dotenv";
config();

const plan = zodToJsonSchema(
  z.object({
    steps: z
      .array(z.string())
      .describe("different steps to follow, should be in sorted order"),
  }),
);
const planFunction = {
  name: "plan",
  description: "This tool is used to plan the steps to follow",
  parameters: plan,
};

const planTool = {
  type: "function",
  function: planFunction,
};


const plannerPrompt = ChatPromptTemplate.fromTemplate(
  `For the given objective, come up with a simple step by step plan. \
This plan should involve individual tasks, that if executed correctly will yield the correct answer. Do not add any superfluous steps. \
The result of the final step should be the final answer. Make sure that each step has all the information needed - do not skip steps.
Respond with a JSON object containing a single key 'steps' which is an array of strings.

{objective}`,
);

const model = new ChatOpenAI({
  modelName: "qwen-turbo",
  apiKey: process.env.MODELSTUDIO_API_KEY,
  configuration: {
    baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  },
}).withStructuredOutput(planFunction);

const planner = plannerPrompt.pipe(model);
await planner.invoke({
    objective: "what is the latest qwen llm?",
  });

  import { JsonOutputToolsParser } from "@langchain/core/output_parsers/openai_tools";

  const response = zodToJsonSchema(
    z.object({
      response: z.string().describe("Response to user."),
    }),
  );
  
  const responseTool = {
    type: "function",
    function: {
      name: "response",
      description: "Response to user.",
      parameters: response,
    },
  };
  
  const replannerPrompt = ChatPromptTemplate.fromTemplate(
    `For the given objective, come up with a simple step by step plan. 
  This plan should involve individual tasks, that if executed correctly will yield the correct answer. Do not add any superfluous steps.
  The result of the final step should be the final answer. Make sure that each step has all the information needed - do not skip steps.
  
  Your objective was this:
  {input}
  
  Your original plan was this:
  {plan}
  
  You have currently done the follow steps:
  {pastSteps}
  
  Update your plan accordingly. If no more steps are needed and you can return to the user, then respond with that and use the 'response' function.
  Otherwise, fill out the plan.  
  Only add steps to the plan that still NEED to be done. Do not return previously done steps as part of the plan.
  Your response must be in JSON format.`,
  );
  
  const parser = new JsonOutputToolsParser();
  const replanner = replannerPrompt
    .pipe(
      new ChatOpenAI({
        modelName: "qwen-turbo",
        apiKey: process.env.MODELSTUDIO_API_KEY,
        configuration: {
          baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        },
      }))
    .pipe(parser);

export { planner, replanner };