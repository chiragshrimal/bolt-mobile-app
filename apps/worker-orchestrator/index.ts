// we want to comunicate with the auto-scaling in the aws 
// this library we have to add using bun
// it provides client so that we can comunicate with auto scaling 
// programatically hit the sutoscaling group

import express from "express";
import {EC2Client,DescribeInstancesCommand} from "@aws-sdk/client-ec2";
import { AutoScalingClient, SetDesiredCapacityCommand , DescribeAutoScalingInstancesCommand, TerminateInstanceInAutoScalingGroupCommand} from "@aws-sdk/client-auto-scaling";


const app=express();


const client = new AutoScalingClient({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_ACCESS_SECRET!,
  },
});

const ec2Client = new EC2Client({
  region: "ap-south-1", // change as needed
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_ACCESS_SECRET!,
  },
});

type Machine={
    ip: string,
    isUsed: boolean,
    assignedProject: string
} 

const ALL_MACHINES: Machine[]= [];

async function refreshInstances(){

  const command= new DescribeAutoScalingInstancesCommand();
  const data= await client.send(command);

    const ec2InstanceCommand = new DescribeInstancesCommand({
      InstanceIds: data.AutoScalingInstances?.map((x)=> x.InstanceId)
    });

    const ec2Response= await ec2Client.send(ec2InstanceCommand);
    // find ip of the machine 
    // console.log(JSON.stringify(ec2Response.Reservations[0]?.Instances[0]?.NetworkInterfaces[0].Association.PublicIp)); 
    // finding public dns of the machine 
    // console.log(JSON.stringify(data.Reservations[0]?.Instances[0]?.PublicDnsName)); 

    // access to all dns names and servers 
}


async function Setcapacity(){

  const input = { // SetDesiredCapacityType
  AutoScalingGroupName: "vscode-asg", // require
  // hme always kuch machine toh up phle se hi rakhni pdegi 
  DesiredCapacity: ALL_MACHINES.length +(5-ALL_MACHINES.filter(x=>x.isUsed===false).length)
};

const command = new SetDesiredCapacityCommand(input);

const response = await client.send(command);
}

setInterval(()=>{
   refreshInstances();
},10*1000);

// how to get all machiine 

// when ever any new  request comes you  have to assign a machine
//so we have to manage the state of machine 
app.get("/:projectId", (req,res)=>{

  const idealMachine= ALL_MACHINES.find(x=> x.isUsed === false);

  if(!idealMachine){
    // scale up the infra 
    res.status(404).send("no ideal machine is found");
  }

  idealMachine?.isUsed = true;

  // this will set the capacity of the infra again 
  Setcapacity();

  res.send({
    ip: idealMachine?.ip
  });

});


// this end point will hit by the worker 
// so we have to also protect this end point so that except worker anyone can not hit this end point 
app.post("/destroy",(req,res)=>{

  const machineId= req.body.machineId;

  // terminate the instance
  // ShouldDecrementDesiredCapacity this means that desire capacity will also redure 
  const command = new TerminateInstanceInAutoScalingGroupCommand({
    InstanceId: machineId,
    ShouldDecrementDesiredCapacity: true
  });

  client.send(command);
});

app.listen(9092);

