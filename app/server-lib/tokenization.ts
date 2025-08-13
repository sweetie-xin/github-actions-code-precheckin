import path from "node:path";
import { readFile } from "node:fs/promises";
import { spawn, ChildProcess } from "node:child_process";

interface WorkerWrapper {
  process: ChildProcess;
  busy: boolean;
  pendingResolve: ((value: any) => void) | null;
  pendingReject: ((error: any) => void) | null;
}

function removePunctuation(text: string): string {
  return text
    .replace(/[，、；：？！—…""''《》〈〉【】（）［］(){}\[\]<>\-·~`!@#$%^&*+=|\\:;"',\/?]/g, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

let STOP_WORDS: Set<string> | null = null;

// 长驻子进程池
class SegmentPool {
  private pool: WorkerWrapper[] = [];
  private queue: Array<{ text: string; stopWords: string[]; resolve: (value: any) => void; reject: (error: any) => void }> = [];
  private poolSize = 2;
  private initialized = false;

  constructor() {
    this.initPool();
  }

  private initPool() {
    if (this.initialized) return;
    this.initialized = true;

    for (let i = 0; i < this.poolSize; i++) {
      this.createWorker();
    }
  }

  private createWorker() {
    const scriptPath = path.join(process.cwd(), "app/scripts/segment-worker.cjs");
    const child = spawn(process.execPath, [scriptPath]);

    const worker = { process: child, busy: false, pendingResolve: null as any, pendingReject: null as any };

    let buffer = "";

    child.stdout.on('data', (data) => {
      if (worker.pendingResolve) {
        buffer += data.toString();

        // 尝试解析完整的JSON
        const lines = buffer.split('\n');
        buffer = lines.pop() || ""; // 保留最后一个可能不完整的行

        for (const line of lines) {
          if (line.trim()) {
            try {
              const result = JSON.parse(line);
              worker.pendingResolve(result);
              worker.pendingResolve = null;
              worker.pendingReject = null;
              worker.busy = false;
              this.processQueue();
              return;
            } catch (e) {
              // 继续尝试下一行
            }
          }
        }
      }
    });

    child.stderr.on('data', (data) => {
      console.error(`Worker stderr: ${data.toString()}`);
    });

    child.on('error', (error) => {
      console.error('Worker process error:', error);
      if (worker.pendingReject) {
        worker.pendingReject(error);
        worker.pendingReject = null;
        worker.pendingResolve = null;
        worker.busy = false;
      }
      this.replaceWorker(worker);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`Worker process exited with code ${code}`);
        if (worker.pendingReject) {
          worker.pendingReject(new Error(`Worker process exited with code ${code}`));
          worker.pendingReject = null;
          worker.pendingResolve = null;
          worker.busy = false;
        }
        this.replaceWorker(worker);
      }
    });

    this.pool.push(worker);
  }

  async segment(text: string, stopWords: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ text, stopWords, resolve, reject });
      this.processQueue();
    });
  }

  private processQueue() {
    if (this.queue.length === 0) return;

    const availableWorker = this.pool.find(w => !w.busy);
    if (!availableWorker) return;

    const task = this.queue.shift()!;
    availableWorker.busy = true;
    availableWorker.pendingResolve = task.resolve;
    availableWorker.pendingReject = task.reject;

    try {
      availableWorker.process.stdin!.write(
        JSON.stringify({
          text: task.text,
          stopWords: task.stopWords
        }) + '\n'
      );
    } catch (error) {
      console.error('Failed to write to worker process:', error);
      availableWorker.busy = false;
      availableWorker.pendingResolve = null;
      availableWorker.pendingReject = null;
      task.reject(error);
    }
  }

  private replaceWorker(oldWorker: any) {
    const index = this.pool.indexOf(oldWorker);
    if (index > -1) {
      try {
        oldWorker.process.kill();
      } catch (e) {
        // 忽略杀死进程的错误
      }
      this.pool.splice(index, 1);
      this.createWorker();
    }
  }

  destroy() {
    this.pool.forEach(worker => {
      try {
        worker.process.kill();
      } catch (e) {
        // 忽略错误
      }
    });
    this.pool = [];
    this.queue = [];
  }
}

let segmentPool: SegmentPool | null = null;

// 加载停用词
export async function loadStopWords(): Promise<Set<string>> {
  if (STOP_WORDS) return STOP_WORDS;
  const filePath = path.join(process.cwd(), "app/baidu_stopwords.txt");
  try {
    const content = await readFile(filePath, "utf-8");
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    STOP_WORDS = new Set(lines);
    console.log("停用词加载完成，数量:", STOP_WORDS.size);
  } catch (err) {
    console.error("加载停用词失败:", err);
    STOP_WORDS = new Set(); // fallback to empty set
  }
  return STOP_WORDS;
}

function isMostlyEnglish(text: string): boolean {
  const enCount = (text.match(/[a-zA-Z]/g) || []).length;
  const zhCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  return enCount > zhCount * 2;
}

export async function tokenization(text: string): Promise<string> {
  text = removePunctuation(text);

  if (isMostlyEnglish(text)) {
    console.log("检测为英文，跳过分词");
    return text;
  }

  const stopWords = await loadStopWords();

  // 初始化进程池（只初始化一次）
  if (!segmentPool) {
    segmentPool = new SegmentPool();
  }

  // console.log("使用进程池进行中文分词...");

  try {
    const result = await segmentPool.segment(text, [...stopWords]);
    if (result?.error) {
      throw new Error(result.error);
    }
    // console.log("分词完成，词数:", result.result.split(" ").length);
    return result.result;
  } catch (error) {
    console.error("分词失败:", error);
    throw error;
  }
}

/** 获取最近一句话起始位置，用于判断关键词是否出现在最近输入中 */
export function lastSentenceStart(text: string): number {
  const punctuation = /[。？！\n]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = punctuation.exec(text)) !== null) {
    lastIndex = punctuation.lastIndex;
  }
  return lastIndex;
}

// 优雅关闭进程池
process.on('SIGTERM', () => {
  if (segmentPool) {
    segmentPool.destroy();
  }
});

process.on('SIGINT', () => {
  if (segmentPool) {
    segmentPool.destroy();
  }
});
