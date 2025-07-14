// for authentication we are using clerk third party  
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export function authMiddleware(req: Request, res: Response , next: NextFunction){

    // extracts the Authorization header from the HTTP request.
    const authHeader = req.headers.authorization;   // bearer token 
    const token = authHeader && authHeader.split(" ")[1];

    if(!token){
        res.status(401).json({
            message : "Unauthorized"
        });
        return ;
    }
    //  process.env.JWT_PUBLIC_KEY can be undefine so i have added ! to this so typescript will not complain 
    const decoded = jwt.verify(token, process.env.JWT_PUBLIC_KEY! ,{
        algorithms: ["RS256"],
    });
    if(!decoded){
        res.status(401).json({
            message : "Unauthorized"
        });
        return ;
    }
    // get userId from decoded 
    const userId = (decoded as any).sub;

    if(!userId){
        res.status(401).json({
            message : "Unauthorized"
        });
        return ;
    }

    // if present then set userId in the req 
    req.userId=userId;
    next();
}