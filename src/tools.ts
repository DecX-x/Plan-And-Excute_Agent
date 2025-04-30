import { tool } from "@langchain/core/tools";
import { z } from "zod";
import Exa from "exa-js";
import { config } from "dotenv";
config();

const apikey = process.env.EXA_API_KEY;
const exa = new Exa(apikey);

export const exa_search = tool(
    async ({ query }: { query: string }): Promise<any> => {
        const result = await exa.searchAndContents(
            query,
            {
                category: "news",
                numResults: 5,
                summary: true,
            }
        );
        return result;
    },
    {
        name: "exa_search",
        description: "Search for the latest news using Exa. Provide a 'query' string.",
        schema: z.object({  
            query: z.string().describe("The search query string"),
        }),
    }
);


