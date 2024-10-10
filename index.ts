import { Input, Telegraf } from "telegraf";
import fs from "fs";
import https from "https";
import os from "os";
import path from "path";
import * as cheerio from "cheerio";

const bot = new Telegraf(process.env.BOT_TOKEN as string);

function downloadFile(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmpFilePath = path.join(os.tmpdir(), "downloaded_video.mp4");
    const file = fs.createWriteStream(tmpFilePath);

    https
      .get(url, (response) => {
        response.pipe(file);

        file.on("finish", () => {
          file.close(() => resolve(tmpFilePath));
        });
      })
      .on("error", (error) => {
        fs.unlink(tmpFilePath, () => {
          reject(error);
        });
      });
  });
}

bot.on("message", async (ctx) => {
  //   console.log(ctx.message);

  const msg = ctx.message;
  if ("text" in msg) {
    const url = msg.text;
    console.log(url);
    const fullUrl = `https://twitsave.com/info?url=${url}`;
    const response = await fetch(fullUrl);
    const data = await response.text();
    const $ = cheerio.load(data);
    const linksInLis = $("li a")
      .map((index, element) => ({
        text: $(element).text().trim(),
        href: $(element).attr("href"),
        parentLi: $(element).closest("li").text().trim(),
      }))
      .get();
    const downloadLink = linksInLis.filter((e) =>
      e.href?.includes("download")
    )[0].href;

    const filePath = await downloadFile(downloadLink as string);

    await ctx.replyWithVideo(
      Input.fromReadableStream(fs.createReadStream(filePath))
    );
  }
});

bot.launch();
