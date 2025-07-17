import cors from "cors";
import express from "express";
import { prismaClient } from "db/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { systemPrompt } from "./systemPrompt";
import { ArtifactProcessor } from "./parser";
import { onFileUpdate, onPromptEnd, onShellCommand } from "./os";
import { RelayWebsocket } from "./ws";

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "<YOUR_GEMINI_API_KEY>");

app.post("/prompt", async (req, res) => {
  const { prompt, projectId } = req.body;
  const project = await prismaClient.project.findUnique({
    where: {
      id: projectId,
    },
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

  const { diff } = await RelayWebsocket.getInstance().sendAndAwaitResponse({
    event: "admin",
    data: {
      type: "prompt-start",
    }
  }, promptDb.id);

  if (diff) {
    await prismaClient.prompt.create({
      data: {
        content: `<bolt-user-diff>${diff}</bolt-user-diff>\n\n$`,
        projectId,
        type: "USER",
      },
    });
  }

  const allPrompts = await prismaClient.prompt.findMany({
    where: {
      projectId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  let artifactProcessor = new ArtifactProcessor(
    "",
    (filePath, fileContent) =>
      onFileUpdate(filePath, fileContent, projectId, promptDb.id, project.type),
    (shellCommand) =>
      onShellCommand(shellCommand, projectId, promptDb.id)
  );
  let artifact = "";

  try {
    const chat = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // Build Gemini style "contents"
    const contents = [
      { role: "user", parts: [{ text: systemPrompt(project.type) }] },
      ...allPrompts.map((p: any) => ({
        role: p.type === "USER" ? "user" : "model",
        parts: [{ text: p.content }],
      })),
    ];

    // Emulate .on('text') by streaming chunks
    const stream = await chat.generateContentStream({ contents });

    for await (const chunk of stream.stream) {
      const text = chunk.text();
      artifactProcessor.append(text);
      artifactProcessor.parse();
      artifact += text;
    }

    console.log("done!");
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
    onPromptEnd(promptDb.id);

    res.json({ response: artifact });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ error: "LLM error", details: error });
  }
});

app.listen(9091, () => {
  console.log("Server is running on port 9091");
});
