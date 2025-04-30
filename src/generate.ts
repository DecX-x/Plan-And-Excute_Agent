import app from "./graph";
const config = { recursionLimit: 50 };
const inputs = {
  input: "what is the hometown of the 2024 Australian open winner?",
};

for await (const event of await app.stream(inputs, config)) {
  console.log(event);
}