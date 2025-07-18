// worker.ts
import cors from "cors";
import express from "express";
import { prismaClient } from "db/client";
import { systemPrompt } from "./systemPrompt";
import { ArtifactProcessor } from "./parser";
import { onFileUpdate, onShellCommand} from "./os";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = "gemini-1.5-flash-latest";

app.post("/prompt", async (req, res) => {
  const { prompt, projectId } = req.body;

  console.log(prompt);

  const project = await prismaClient.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const promptDb = await prismaClient.prompt.create({
    data: {
      content: prompt,
      projectId,
      type: "USER",
    },
  });

  project.type="REACT_NATIVE";

  console.log("hii");
  const allPrompts = await prismaClient.prompt.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
  console.log(allPrompts);
  console.log("helllo");

  const geminiMessages = [
    {
      role: "user",
      parts: [
        {
          text:
            systemPrompt(project.type) +
            "\n\n" +
            allPrompts.map((p) => p.content).join("\n"),
        },
      ],
    },
  ];

  console.log(geminiMessages);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 20000,
        },
      }),
    }
  );

  const data = await response.json();
  console.log(data);

  if (!data.candidates || !data.candidates[0]) {
    res.status(500).json({ error: "No response from Gemini" });
    return;
  }

  const output = data.candidates[0].content.parts
    .map((p: any) => p.text)
    .join("");

  let artifact = "";

  const artifactProcessor = new ArtifactProcessor(
  "",
  async (filePath, fileContent) => {
    await onFileUpdate(filePath, fileContent);
  },
  async (shellCommand) => {
    await onShellCommand(shellCommand); // <-- critical fix
  }
);

  console.log(output);
  artifactProcessor.append(output);
  artifactProcessor.parse();
  artifact += output;
  // console.log(artifact);

  await prismaClient.prompt.create({
    data: {
      content: artifact,
      projectId,
      type: "SYSTEM",
    },
  });

  await prismaClient.action.create({
    data: {
      content: "Done!",
      projectId,
      promptId: promptDb.id,
    },
  });

  // onPromptEnd(promptDb.id);

  res.json({ output: artifact });
});

app.listen(9091, () => {
  console.log("Server is running on port 9091");
});
