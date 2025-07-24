"use client";

import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { TemplateButtons } from "./TemplateButtons";
import { Textarea } from "./ui/textarea";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { BACKEND_URL, WORKER_API_URL } from "@/config";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function Prompt() {
  const [prompt, setPrompt] = useState("");
  const { getToken } = useAuth();
  const router = useRouter();

  const handleTemplateClick = (text: string) => {
    setPrompt(text);
  };

  const handleGenerate = async () => {
    try {
      const token = await getToken();
      // console.log("Auth token:", token);

      if (!token) {
        toast.error("You need to be signed in to generate a project");
        return;
      }

      const response = await axios.post(
        `${BACKEND_URL}/project`,
        { prompt },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Project created:", response.data);

      const workerResponse = await axios.post(`${WORKER_API_URL}/prompt`, {
        projectId: response.data.projectId,
        prompt,
      });

      console.log("Worker response:", workerResponse.data);

      router.push(`/project/${response.data.projectId}`);
    } catch (error: any) {
      console.error("Error generating project:", error);
      toast.error("Something went wrong. Check console.");
    }
  };

  return (
    <div className="relative">
      <Textarea
        placeholder="Create a chess application..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="py-4 pl-4 pr-12 min-h-28 max-h-40 overflow-auto"
      />
      {prompt && (
        <Button
          className="absolute top-4 right-4 cursor-pointer"
          onClick={handleGenerate}
        >
          <Send />
        </Button>
      )}
      <div className="max-w-2xl mx-auto pt-4">
        <TemplateButtons onTemplateClick={handleTemplateClick} />
      </div>
    </div>
  );
}
