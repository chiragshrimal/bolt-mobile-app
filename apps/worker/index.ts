import cors from "cors";
import express from "express";
import { prismaClient } from "db/client";
import Anthropic from '@anthropic-ai/sdk';
import { systemPrompt } from "./systemPrompt";
import { ArtifactProcessor } from "./parser";
import { onFileUpdate,onShellCommand } from "./os";
// import { RelayWebsocket } from "./ws";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/prompt", async (req, res) => {
  const { prompt, projectId } = req.body;
  const client = new Anthropic();
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

  // const { diff } = await RelayWebsocket.getInstance().sendAndAwaitResponse({
  //   event: "admin",
  //   data: {
  //     type: "prompt-start",
  //   }
  // }, promptDb.id);

  // if (diff) {
  //   await prismaClient.prompt.create({
  //     data: {
  //       content: `<bolt-user-diff>${diff}</bolt-user-diff>\n\n$`,
  //       projectId,
  //       type: "USER",
  //     },
  //   });
  // }

  const allPrompts = await prismaClient.prompt.findMany({
    where: {
      projectId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  project.type="REACT_NATIVE";

  let artifactProcessor = new ArtifactProcessor("",onFileUpdate, onShellCommand);
  let artifact = "";

  let response = client.messages.stream({
    messages: allPrompts.map((p: any) => ({
      role: p.type === "USER" ? "user" : "assistant",
      content: p.content,
    })),
    system: systemPrompt,
    model: "claude-3-7-sonnet-20250219",
    max_tokens: 8000,
  }).on('text', (text) => {
    artifactProcessor.append(text);
    // this below function hi command ko run krta hai and files wgr 
    // correct files m dalta hai
    artifactProcessor.parse();
    artifact += text;
  })
  .on('finalMessage', async (message) => {
    console.log("done!");
    await prismaClient.prompt.create({
      data: {
        content: artifact,
        projectId,
        type: "SYSTEM",
      },
    });

    // await prismaClient.action.create({
    //   data: {
    //     content: "Done!",
    //     projectId,
    //     promptId: promptDb.id,
    //   },
    // });
    // onPromptEnd(promptDb.id);
  })
  .on('error', (error) => {
    console.log("error", error);
  });

  res.json({ response });
});

app.listen(9091, () => {
  console.log("Server is running on port 9091");
});