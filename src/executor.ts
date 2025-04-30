import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { exa_search } from "./tools";
import { config } from "dotenv";
import { HumanMessage } from "@langchain/core/messages";
config();

const apikey = process.env.MODELSTUDIO_API_KEY;

const agentExecutor = createReactAgent({
  llm: new ChatOpenAI({ model: "qwen-turbo-latest",
    apiKey: apikey,
    configuration: {
        baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    }
   }),
  tools: [exa_search],
});

await agentExecutor.invoke({
    messages: [new HumanMessage("give me the latest news about qwen3")],
  });