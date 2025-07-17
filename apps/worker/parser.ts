/*
    <boltArtifact>
        <boltAction type="shell">
            npm run start
        </boltAction>
        <boltAction type="file" filePath="src/index.js">
            console.log("Hello, world!");
        </boltAction>
    </boltArtifact>
*/

// we have mede the class of ArtifactProcessor 
export class ArtifactProcessor {
    // this take current  string 
    public currentArtifact: string;
    private onFileContent: (filePath: string, fileContent: string) => void;
    private onShellCommand: (shellCommand: string) => void;

    constructor(currentArtifact: string, onFileContent: (filePath: string, fileContent: string) => void, onShellCommand: (shellCommand: string) => void) {
        this.currentArtifact = currentArtifact;
        this.onFileContent = onFileContent;
        this.onShellCommand = onShellCommand;
    }

    append(artifact: string) {
        this.currentArtifact += artifact;
    }
parse() {
  while (true) {
    const startIndex = this.currentArtifact.indexOf("<boltAction type=");
    const endIndex = this.currentArtifact.indexOf("</boltAction>");

    if (startIndex === -1 || endIndex === -1) break;

    const actionBlock = this.currentArtifact.slice(startIndex, endIndex + "</boltAction>".length);
    const typeMatch = actionBlock.match(/<boltAction type="(.*?)"/);
    const type = typeMatch?.[1];

    if (!type) break;

    if (type === "shell") {
      const command = actionBlock
        .split("\n")
        .slice(1, -1)
        .join("\n")
        .trim();
      this.onShellCommand(command);
    } else if (type === "file") {
      const filePathMatch = actionBlock.match(/filePath="(.*?)"/);
      const filePath = filePathMatch?.[1];
      const content = actionBlock
        .split("\n")
        .slice(1, -1)
        .join("\n")
        .trim();
      if (filePath) {
        this.onFileContent(filePath, content);
      }
    }

    // Remove processed block from currentArtifact
    this.currentArtifact = this.currentArtifact.slice(endIndex + "</boltAction>".length);
}
}
}
