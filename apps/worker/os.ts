const BASE_WORKER_DIR = process.env.BASE_WORKER_DIR || "C:/Users/Chirag/tmp/bolty-worker";


// Ensure the directory exists
// await Bun.mkdir(BASE_WORKER_DIR, { recursive: true });

export async function onFileUpdate(filePath: string, fileContent: string) {
  const fullPath = `${BASE_WORKER_DIR}/${filePath}`;
  console.log(`[onFileUpdate] Writing file: ${fullPath}`);
  await Bun.write(fullPath, fileContent);
}
export async function onShellCommand(shellCommand: string) {
  console.log("[onShellCommand] Executing shell command");

  const commands = shellCommand.split("&&");

  for (const command of commands) {
    const trimmed = command.trim();
    console.log(`[onShellCommand] Running command: ${trimmed}`);

    const isWindows = process.platform === "win32";
    const cmdArgs = isWindows
      ? ["cmd.exe", "/c", trimmed]
      : ["sh", "-c", trimmed];

    const result = Bun.spawnSync({
      cmd: cmdArgs,
      cwd: BASE_WORKER_DIR,
    });

    const stdout = await new Response(result.stdout).text();
    const stderr = await new Response(result.stderr).text();

    console.log("[stdout]:", stdout);
    if (stderr.trim()) console.error("[stderr]:", stderr);
  }
}
