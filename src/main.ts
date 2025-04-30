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
    
    const config = { recursionLimit: 50 };
    const inputs = { input: query };
    
    let step = 1;
    let lastState = {};

    for await (const event of await app.stream(inputs, config)) {
      // Store last state
      lastState = event.state;

      // Print event based on verbosity
      if (verbose) {
        const stateType = event.state?.response ? 'FINAL' : event.type;
        console.log(`\n📍 Step ${step++}: ${stateType}`);
        
        // Show what's changing
        if (event.state?.plan && event.state.plan.length > 0) {
          console.log(`\n📋 Current plan:`);
          event.state.plan.forEach((item: string, i: number) => {
            console.log(`  ${i+1}. ${item}`);
          });
        }
        
        if (event.state?.pastSteps && event.state.pastSteps.length > 0) {
          const lastStep = event.state.pastSteps[event.state.pastSteps.length - 1];
          if (lastStep) {
            console.log(`\n✅ Completed: ${lastStep[0]}`);
            console.log(`📊 Result: ${lastStep[1]}`);
          }
        }
      } else {
        // In non-verbose mode, show status updates
        if (event.state?.plan && event.state.plan.length > 0 && !event.state?.response) {
          const dots = ".".repeat(step % 4);
          process.stdout.write(`\rThinking${dots}   `);
        }
      }
      
      // Show final answer when available
      if (event.state?.response) {
        if (!verbose) process.stdout.write('\r                    \r'); // Clear thinking indicator
        console.log("\n✨ Answer: " + event.state.response + "\n");
      }
      
      step++;
    }
    
    // If we didn't get a response but ran out of steps
    if (!lastState?.response) {
      console.log("\n⚠️ No definitive answer was found within the step limit.");
    }
    
  } catch (error) {
    console.error("\n❌ Error during execution:", error);
  }
}

// Create CLI if this file is called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Check if query was passed as command line argument
  const queryArg = process.argv[2];
  
  if (queryArg) {
    // Process the command line argument
    await processQueryWithStreaming(queryArg, process.argv.includes('--verbose'));
  } else {
    // Interactive mode
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log("🤖 Welcome to the Plan-Execute Agent!");
    console.log("Type 'exit' to quit the program.\n");
    
    const promptQuestion = () => {
      rl.question("Enter your query: ", async (query) => {
        if (query.toLowerCase() === 'exit') {
          console.log("Goodbye! 👋");
          rl.close();
          return;
        }
        
        await processQueryWithStreaming(query, false);
        promptQuestion();
      });
    };
    
    promptQuestion();
  }
}
