import app from "./graph";
import { config } from "dotenv";
import readline from 'readline';

// Load environment variables
config();

/**
 * Processes a query using the plan-execute agent and streams the output
 * @param query The user query to process
 * @param verbose Whether to show detailed execution steps
 */
export async function processQueryWithStreaming(query: string, verbose: boolean = false): Promise<void> {
  try {
    console.log(`\n🔍 Processing query: "${query}"\n`);
    
    const streamConfig = { recursionLimit: 50 };
    const inputs = { input: query };
    
    let stepCounter = 1;
    let lastState: any = {}; // Use 'any' or a more specific type if available
    let finalAnswer = "";

    const stream = await app.stream(inputs, streamConfig);

    for await (const event of stream) {
      const keys = Object.keys(event);
      // Each event in the stream is a node being executed
      // We'll print the node name and the state changes
      for (const key of keys) {
        lastState = event[key]; // Update last state with the latest node's output
        
        if (verbose) {
          console.log(`\n--- Step ${stepCounter++}: Executing Node "${key}" ---`);
          console.log("State Changes:");
          console.log(JSON.stringify(event[key], null, 2)); // Print the state changes for this node
          
          // Specifically check for plan updates
          if (event[key]?.plan?.length > 0) {
            console.log("\n📋 Current Plan:");
            event[key].plan.forEach((item: string, i: number) => {
              console.log(`  ${i + 1}. ${item}`);
            });
          }
          // Check for completed steps
          if (event[key]?.pastSteps?.length > 0) {
             const lastStep = event[key].pastSteps[event[key].pastSteps.length - 1];
             if (lastStep) {
               console.log(`\n✅ Completed: ${lastStep[0]}`);
               console.log(`📊 Result: ${lastStep[1]?.substring(0, 200)}...`); // Truncate long results
             }
          }

        } else {
          // Non-verbose: Show thinking indicator
          const dots = ".".repeat(stepCounter % 4);
          process.stdout.write(`\rThinking${dots} [Step ${stepCounter}]   `);
        }

        // Check if the final response is available in the state
        if (event[key]?.response) {
          finalAnswer = event[key].response;
          // No need to break, let the stream finish naturally
        }
      }
      stepCounter++; // Increment step counter for each event chunk
    }
    
    // Clear thinking indicator after stream finishes
    if (!verbose) process.stdout.write('\r                          \r'); 
    
    // Print the final answer after the stream is complete
    if (finalAnswer) {
      console.log("\n✨ Final Answer:\n" + finalAnswer + "\n");
    } else if (lastState && !lastState.response) {
      // If stream finished but no response field was populated
      console.log("\n⚠️ Agent finished execution, but no final answer was generated within the step limit.");
      if (verbose && lastState) {
         console.log("\nFinal State:");
         console.log(JSON.stringify(lastState, null, 2));
      }
    } else {
       console.log("\n🏁 Stream finished."); // Fallback message
    }
    
  } catch (error) {
    console.error("\n❌ Error during execution:", error);
  }
}

// Create CLI if this file is called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Check if query was passed as command line argument
  const queryArg = process.argv.slice(2).filter(arg => !arg.startsWith('--')).join(' ');
  const verboseMode = process.argv.includes('--verbose');
  
  if (queryArg) {
    // Process the command line argument
    await processQueryWithStreaming(queryArg, verboseMode);
  } else {
    // Interactive mode
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log("🤖 Welcome to the Plan-Execute Agent!");
    console.log("Type 'exit' to quit. Add --verbose after your query for detailed logs.\n");
    
    const promptQuestion = () => {
      rl.question("Enter your query: ", async (input) => {
        if (input.toLowerCase() === 'exit') {
          console.log("Goodbye! 👋");
          rl.close();
          return;
        }
        
        const verbose = input.endsWith('--verbose');
        const query = verbose ? input.slice(0, -'--verbose'.length).trim() : input;
        
        if (query) {
          await processQueryWithStreaming(query, verbose);
        } else {
          console.log("Please enter a query.");
        }
        promptQuestion();
      });
    };
    
    promptQuestion();
  }
}
