import { END, START, StateGraph } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import PlanExecuteState from "./state";
import { HumanMessage } from "@langchain/core/messages";
import agentExecutor from "./executor";
import { planner, replanner } from "./plan";

async function executeStep(
  state: typeof PlanExecuteState.State,
  config?: RunnableConfig,
): Promise<Partial<typeof PlanExecuteState.State>> {
  const task = state.plan[0];
  const input = {
    messages: [new HumanMessage(task)],
  };
  const { messages } = await agentExecutor.invoke(input, config);

  return {
    pastSteps: [[task, messages[messages.length - 1].content.toString()]],
    plan: state.plan.slice(1),
  };
}

async function planStep(
  state: typeof PlanExecuteState.State,
): Promise<Partial<typeof PlanExecuteState.State>> {
  const plan = await planner.invoke({ objective: state.input });
  return { plan: plan.steps };
}

async function replanStep(
  state: typeof PlanExecuteState.State,
): Promise<Partial<typeof PlanExecuteState.State>> {
  const output = await replanner.invoke({
    input: state.input,
    plan: state.plan.join("\n"),
    pastSteps: state.pastSteps
      .map(([step, result]) => `${step}: ${result}`)
      .join("\n"),
  });
  const toolCall = output[0];

  if (toolCall.type == "response") {
    return { response: toolCall.args?.response };
  }

  return { plan: toolCall.args?.steps };
}

function shouldEnd(state: typeof PlanExecuteState.State) {
  return state.response ? "true" : "false";
}

const workflow = new StateGraph(PlanExecuteState)
  .addNode("planner", planStep)
  .addNode("agent", executeStep)
  .addNode("replan", replanStep)
  .addEdge(START, "planner")
  .addEdge("planner", "agent")
  .addEdge("agent", "replan")
  .addConditionalEdges("replan", shouldEnd, {
    true: END,
    false: "agent",
  });

// Finally, we compile it!
// This compiles it into a LangChain Runnable,
// meaning you can use it as you would any other runnable
const app = workflow.compile();
export default app;