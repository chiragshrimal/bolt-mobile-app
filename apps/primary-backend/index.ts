import {prismaClient} from  "db/client";

import express from "express";
import cors from "cors";
import { authMiddleware } from "./middleware";

const app=express();

app.use(express.json());

app.use(cors());

// for individual project 
app.post("/project",authMiddleware,async(req,res)=>{
    // console.log("hello from project");
    const {prompt} = req.body;
    // because userId can be undefine so added ! over here
    const userId= req.userId!;
    //TODO:  add logic to get a useful name for the project from the prompt
    const description = prompt.split("\n")[0];

    const project = await prismaClient.project.create({
        data: {description,userId},
    });
    res.json({projectId : project.id});
});

// for all the projects 
app.get("/projects",authMiddleware,async(req,res)=>{
    const userId = req.userId!;
    const project= await prismaClient.project.findFirst({
        where: {
            userId: userId
        }
    })
    res.json(project);
});

app.listen(8080,()=>{
    console.log("Server is running on port 8080");
});
