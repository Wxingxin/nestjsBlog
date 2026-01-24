import prompts from "prompts";

const result = await prompts({
  type: "text",
  name: "projectName",
  message: "Project name?",
  initial: "my-app",
});

console.log(result.projectName);

const { port } = await prompts({
  type: "number",
  name: "port",
  message: "Server port?",
  initial: 3000,
  min: 1,
  max: 65535,
  validate: (value) => value.length < 3 && "Name must be at least 3 characters",
});
console.log(port)

const { framework } = await prompts({
  type: "select",
  name: "framework",
  message: "Choose a framework",
  choices: [
    { title: "React", value: "react" },
    { title: "Vue", value: "vue" },
    { title: "Svelte", value: "svelte" },
  ],
});
console.log(framework)

const { features } = await prompts({
  type: "multiselect",
  name: "features",
  message: "Select features",
  choices: [
    { title: "TypeScript", value: "ts" },
    { title: "ESLint", value: "eslint" },
    { title: "Prettier", value: "prettier" },
  ],
  min: 1,
});
console.log(features)

const { useDocker } = await prompts({
  type: "toggle",
  name: "useDocker",
  message: "Use Docker?",
  initial: true,
  active: "yes",
  inactive: "no",
});
console.log(useDocker)