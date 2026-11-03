import bcrypt from "bcryptjs";
import crypto from "crypto";

function readPassword(promptText) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      console.error("Error: Standard input is not a TTY. Raw mode is unavailable.");
      process.exit(1);
    }

    process.stdout.write(promptText);

    let input = "";
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    function cleanup() {
      process.stdin.removeListener("data", onData);
      try {
        process.stdin.setRawMode(false);
      } catch {}
      process.stdin.pause();
    }

    function onData(chunk) {
      for (const char of chunk) {
        if (char === "\u0003") {
          // Ctrl-C
          cleanup();
          process.stdout.write("\n");
          process.exit(130);
        } else if (char === "\r" || char === "\n") {
          cleanup();
          process.stdout.write("\n");
          resolve(input);
          return;
        } else if (char === "\u007f" || char === "\b") {
          // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
          }
        } else if (char.charCodeAt(0) >= 32) {
          // Printable characters (single char or pasted chunk)
          input += char;
        }
      }
    }

    process.stdin.on("data", onData);
    process.stdin.on("error", (err) => {
      cleanup();
      reject(err);
    });
  });
}

async function main() {
  try {
    const password = await readPassword("Enter admin password: ");
    if (password.length < 16) {
      console.error("Error: Password must be at least 16 characters long.");
      process.exit(1);
    }
    if (Buffer.byteLength(password, "utf8") > 72) {
      console.error(
        "Error: Password must not exceed 72 bytes (bcrypt ignores characters beyond 72 bytes)."
      );
      process.exit(1);
    }

    const confirm = await readPassword("Confirm admin password: ");
    if (password !== confirm) {
      console.error("Error: Passwords do not match.");
      process.exit(1);
    }

    const salt = bcrypt.genSaltSync(12);
    const hash = bcrypt.hashSync(password, salt);
    const escapedHash = hash.replace(/\$/g, "\\$");
    const sessionSecret = crypto.randomBytes(32).toString("hex");

    console.log("\nGenerated Credentials:\n");
    console.log("ADMIN_PASSWORD_HASH (unescaped, e.g. for Vercel):");
    console.log(hash);
    console.log("\nADMIN_PASSWORD_HASH (escaped for .env.local):");
    console.log(escapedHash);
    console.log("\nSESSION_SECRET (32-byte hex):");
    console.log(sessionSecret);
    console.log("\nCopy these values into your environment. Do not commit them.\n");
  } catch (err) {
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
        process.stdin.pause();
      } catch {}
    }
    console.error("An unexpected error occurred:", err);
    process.exit(1);
  }
}

main();

