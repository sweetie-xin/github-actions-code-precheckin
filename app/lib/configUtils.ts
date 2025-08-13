import fs from "fs";


// Define local config path


// Read Configuration
export function readConfig(filename:string) {
  try {
    if (fs.existsSync(filename)) {
      const data = fs.readFileSync(filename, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading:", error);
  }
  return null;
}

// Read Configuration (async)
export async function readConfigAsync(filename:string) {
  try {
    if (fs.existsSync(filename)) {
      const data = await fs.promises.readFile(filename, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading:", error);
  }
  return null;
}

// Write Configuration
export function writeConfig(config: object, filename:string) {
  try {
    fs.writeFileSync(filename, JSON.stringify(config, null, 4), "utf-8");
    return { success: true };
  } catch (error) {
    console.error("Error writing:", error);
    return { success: false, error };
  }
}

// Write Configuration (async)
export async function writeConfigAsync(config: object, filename:string) {
  try {
    await fs.promises.writeFile(filename, JSON.stringify(config, null, 4), "utf-8");
    return { success: true };
  } catch (error) {
    console.error("Error writing:", error);
    return { success: false, error };
  }
}
