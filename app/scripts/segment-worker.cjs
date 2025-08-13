const { Jieba } = require('@node-rs/jieba');
const { dict } = require('@node-rs/jieba/dict');
// 用官方默认词典初始化 Jieba 实例
const jieba = Jieba.withDict(dict);

const readline = require("readline");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.on("line", (input) => {
  try {
    const { text, stopWords } = JSON.parse(input);
    // 使用精确模式，分词
    const words = jieba.cut(text, false);
    const filtered = words.filter((w) => w.trim() && !stopWords.includes(w));
    console.log(JSON.stringify({ result: filtered.join(" ") }));
  } catch (err) {
    console.error("分词失败", err);
    console.log(JSON.stringify({ error: "分词失败" }));
  }
});
