import logger from "@/app/lib/logger";
import { execSync } from "child_process";
import path from "path";

// 判断是否处于开发模式
const isDev = process.env.NODE_ENV === "development";

interface SegmentResult {
  words: string | string[];
  error?: string;
}

function getResourcesPath(): string {
  return process.resourcesPath || process.env.RESOURCES_PATH || "";
}

function getPythonBin(): string {
  const resourcesPath = getResourcesPath();
  if (process.platform === "win32") {
    // Windows 平台：注意根据实际环境调整路径
    // return path.join(resourcesPath, "app", "thulac_env_windows", "Scripts", "python.exe");
    return path.join(resourcesPath, "app", "thulac_env_windows", "python.exe");
  } else {
    // macOS / Linux
    return path.join(resourcesPath, "app", "thulac_env_mac", "bin", "python");
  }
}

function getSegmentPy(): string {
  const resourcesPath = getResourcesPath();
  return isDev ? "segment.py" : path.join(resourcesPath, "app", "segment.py");
}

export function segment(text: string): string {
  try {
    // 根据环境确定 Python 可执行文件与 segment.py 的路径
    let pythonBin: string;
    let segmentPy: string;

    if (isDev) {
      pythonBin = "python3";
      segmentPy = "segment.py";
    } else {
      pythonBin = getPythonBin();
      segmentPy = getSegmentPy();
    }

    // 执行 Python 脚本，将文本作为命令行参数传入
    logger.info(`pythonBin: ${pythonBin} \n segmentPy: ${segmentPy}`);
    const rawOutput = execSync(`"${pythonBin}" "${segmentPy}" "${text}"`, {
      encoding: "utf8",
    }).trim();

    // 解析 Python 输出的 JSON，并断言其类型为 SegmentResult
    let parsedResult: SegmentResult;
    try {
      parsedResult = JSON.parse(rawOutput) as SegmentResult;
    } catch {
      logger.error(`Invalid JSON from THULAC: ${rawOutput}`);
      return text;
    }

    if (parsedResult.error) {
      logger.error(`Segmentation error: ${parsedResult.error}`);
      return text;
    }

    // 返回分词结果：如果是数组，用空格拼接；否则替换逗号为空格
    const segmentedText =
      Array.isArray(parsedResult.words)
        ? parsedResult.words.join(" ")
        : parsedResult.words.replace(/,/g, " ");

    return segmentedText;
  } catch (error) {
    logger.error(`Unexpected segmentation failure: ${error}`);
    return text;
  }
}
